import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { ArticleRepository } = await import("@/lib/repositories/articles");
        const { FeedRepository } = await import("@/lib/repositories/feeds");
        const { LogRepository } = await import("@/lib/repositories/logs");

        const [feeds, totalArticlesCount, sourceStats, recentArticles, recentLogs] = await Promise.all([
            FeedRepository.getAll(),
            ArticleRepository.countTotal(),
            ArticleRepository.getSourceStats(),
            ArticleRepository.findRecent(100),
            LogRepository.getRecent(50)
        ]);

        const totalFeeds = feeds.length;
        const activeFeeds = feeds.filter((f) => f.active).length;
        const disabledFeeds = feeds.filter((f) => f.health?.status === "disabled").length;
        const errorFeeds = feeds.filter((f) => f.health?.status === "error").length;

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

        const articlesToday = recentArticles.filter((a: any) => {
            const created = a.createdAt ? new Date(a.createdAt as any) : new Date();
            return created >= startOfDay;
        }).length;

        // Calculate Ingest Rate (articles per hour based on recent sample)
        let ingestRatePerHour = 0;
        if (recentArticles.length > 1) {
            const newest = new Date(recentArticles[0].createdAt as any).getTime();
            const oldest = new Date(recentArticles[recentArticles.length - 1].createdAt as any).getTime();
            const hoursDiff = (newest - oldest) / (1000 * 60 * 60);
            if (hoursDiff > 0) {
                ingestRatePerHour = Math.round(recentArticles.length / hoursDiff);
            }
        }

        // Process Logs/Errors
        const recentErrors = recentLogs
            .filter((log: any) => log.level === "error")
            .map((log: any) => ({
                message: log.message,
                timestamp: log.timestamp,
                context: log.context
            }));

        // Quota Estimation logic
        // Quota Estimation logic
        const dailyFeedsCalls = 24 * activeFeeds;

        // Fix: Don't extrapolate burst speed to 24h.
        // Instead: Actuals (so far) + Steady State Projection (for remaining hours)

        const currentHour = new Date().getHours();
        const remainingHours = 24 - currentHour;
        const steadyStateRate = activeFeeds * 0.5; // Expect ~0.5 articles per feed per hour on average

        // If current sample rate is lower than steady state, use steady state (it's quieter at night etc)
        // If current sample is HUGE (burst), ignore it for projection, assume we go back to steady state.

        // Note: articlesToday is limited by our sample size of 100. 
        // For a proper app, we'd use a counter or aggregation query, but to save reads we stick to estimation.
        const estimatedDailyWrites = (ingestRatePerHour > 200)
            ? (activeFeeds * 24 * 1) // Cap at 24 articles/day/feed if bursting
            : Math.max(articlesToday + (remainingHours * steadyStateRate), activeFeeds * 5);

        // Unoptimized: 
        // Without hash check, we would read the DB for every item in the feed, every time.
        // Approx 30 items per feed * 24 checks.
        const estimatedReadsUnoptimized = dailyFeedsCalls * 30 + dailyFeedsCalls;

        // Optimized:
        // 1. Feed Fetch (24 * activeFeeds)
        // 2. Hash Check (0 Reads)
        // 3. Write/Read only new items
        const estimatedReadsOptimized = dailyFeedsCalls + (estimatedDailyWrites * 1.1);

        const estimatedWrites = estimatedDailyWrites;

        return NextResponse.json({
            feeds: {
                total: totalFeeds,
                active: activeFeeds,
                disabled: disabledFeeds,
                error: errorFeeds,
                avgReliability: Math.round(avgReliability)
            },
            articles: {
                total: totalArticlesCount, // NEW field
                today: articlesToday,
                ingestRatePerHour,
                bySource: sourceStats // NEW field
            },
            quota: {
                reads: {
                    limit: 50000,
                    projected: Math.round(estimatedReadsOptimized),
                    saved: Math.round(estimatedReadsUnoptimized - estimatedReadsOptimized),
                    unoptimized: Math.round(estimatedReadsUnoptimized)
                },
                writes: {
                    limit: 20000,
                    projected: Math.round(estimatedWrites)
                }
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
