import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { unstable_cache } from "next/cache";

// Core fetch logic (SQLite)
async function fetchRecentArticles(limit: number) {
    const { ArticleRepository } = await import("@/lib/repositories/articles");
    return ArticleRepository.findRecent(limit);
}

// Cached wrapper
const getCachedArticles = unstable_cache(
    fetchRecentArticles,
    ["recent-articles"], // Cache Key
    { revalidate: 60 }   // TTL: 60 seconds
);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const force = url.searchParams.get("force") === "true";

    try {
        const articles = force
            ? await fetchRecentArticles(limit)
            : await getCachedArticles(limit);

        return NextResponse.json({ articles });
    } catch (error: any) {
        console.error("Failed to load recent articles", error);
        return NextResponse.json({ error: error.message, articles: [] }, { status: 500 });
    }
}
