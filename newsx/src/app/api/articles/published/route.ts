import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTICLES = "articles";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 2000);
    const showAll = url.searchParams.get("all") === "true";

    try {
        const db = dbAdmin();

        // fetch large pool to satisfy "7 days of data" requirement
        // We rely on createdAt for initial fetch, then filter by 7-day window
        const poolLimit = 2000;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        const snapshot = await db
            .collection(ARTICLES)
            .orderBy("createdAt", "desc")
            .limit(poolLimit)
            .get();

        // 1. Map to objects
        // 2. Filter by Lifecycle
        // 3. Filter by 7-Day Window
        let articles = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    url: data.url,
                    sourceId: data.sourceId,
                    image: data.image || null,
                    summary: data.summary || null,
                    lifecycle: data.lifecycle,
                    publishedAt: data.publishedAt?.toDate?.()?.toISOString() || null,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
                    author: data.author || null,
                    category: data.category || null,
                    readingTime: data.readingTime || null,
                    keywords: data.keywords || null,
                    qualityScore: data.qualityScore || null,
                };
            })
            .filter((a) => {
                if (!showAll && a.lifecycle === "blocked") return false;

                // Enforce 7-Day Window (Rolling)
                // Use publishedAt if available, else createdAt
                const pDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
                const cDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const effectiveDate = pDate || cDate;

                // If older than 7 days, exclude
                if (effectiveDate < sevenDaysAgo) return false;

                return true;
            });

        // STRICT SORTING: Sort by Published Date (descending)
        articles.sort((a, b) => {
            const getTimestamp = (item: any) => {
                if (item.publishedAt) return new Date(item.publishedAt).getTime();
                if (item.createdAt) return new Date(item.createdAt).getTime();
                return 0;
            };
            return getTimestamp(b) - getTimestamp(a);
        });

        // Return only the requested amount (client controls pagination)
        return NextResponse.json({ articles: articles.slice(0, limit) });
    } catch (error: any) {
        console.error("Failed to fetch articles", error);
        return NextResponse.json({ error: error.message, articles: [] }, { status: 500 });
    }
}

