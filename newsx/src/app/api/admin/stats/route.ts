import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const db = dbAdmin();

        // Parallel data fetching for speed
        const [feedsSnap, articlesSnap, logsSnap] = await Promise.all([
            db.collection("feeds").get(),
            db.collection("articles")
                .orderBy("createdAt", "desc")
                .limit(100)
                .get(), // Limit to 100 for recent stats calculation
            db.collection("system_logs")
                .orderBy("timestamp", "desc")
                .limit(10)
                .get()
        ]);

        // Process Feeds Stats
        const feeds = feedsSnap.docs.map(doc => doc.data());
        const totalFeeds = feeds.length;
        const activeFeeds = feeds.filter(f => f.active).length;
        const disabledFeeds = feeds.filter(f => f.health?.status === 'disabled').length;
        const errorFeeds = feeds.filter(f => f.health?.status === 'error').length;

        // Calculate Feed Health Score (0-100)
        const avgReliability = feeds.length > 0
            ? feeds.reduce((acc, f) => acc + (f.health?.reliabilityScore || 0), 0) / feeds.length
            : 100;

        // Process Articles Stats
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Note: For total count, we would typically rely on a distributed counter or metadata
        // For this MVP, we'll use a rough estimation or just the recent snapshot analysis

        // In a real production app with millions of docs, don't do .get().size without filters
        // For the purpose of this demo, we'll assume the collection isn't massive yet or use the recent 100 as sample

        const recentArticles = articlesSnap.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                // Convert Timestamp to Date
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                publishedAt: data.publishedAt?.toDate ? data.publishedAt.toDate() : null
            };
        });

        const articlesToday = recentArticles.filter(a => a.createdAt >= startOfDay).length;

        // Calculate Ingest Rate (articles per hour based on recent sample)
        let ingestRatePerHour = 0;
        if (recentArticles.length > 1) {
            const newest = recentArticles[0].createdAt.getTime();
            const oldest = recentArticles[recentArticles.length - 1].createdAt.getTime();
            const hoursDiff = (newest - oldest) / (1000 * 60 * 60);
            if (hoursDiff > 0) {
                ingestRatePerHour = Math.round(recentArticles.length / hoursDiff);
            }
        }

        // Process Logs/Errors
        const recentErrors = logsSnap.docs
            .map(doc => doc.data())
            .filter(log => log.level === 'error')
            .map(log => ({
                message: log.message,
                timestamp: log.timestamp?.toDate().toISOString(),
                context: log.context
            }));

        return NextResponse.json({
            feeds: {
                total: totalFeeds,
                active: activeFeeds,
                disabled: disabledFeeds,
                error: errorFeeds,
                avgReliability: Math.round(avgReliability)
            },
            articles: {
                today: articlesToday, // Only from the recent sample, might be inaccurate if >100 today
                ingestRatePerHour
            },
            system: {
                health: errorFeeds > 0 ? (disabledFeeds > 0 ? 'degraded' : 'warning') : 'healthy',
                recentErrors
            }
        });

    } catch (error: any) {
        console.error("Stats API Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
