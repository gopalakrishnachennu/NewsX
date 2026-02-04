import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getCachedViral = unstable_cache(
    async (limit: number, hours: number, minSources: number) => {
        const { ArticleRepository } = await import("@/lib/repositories/articles");
        return ArticleRepository.getViralRepetitive({ limit, hours, minSources });
    },
    ["viral-repetitive"],
    { revalidate: 60 * 15 } // 15 min
);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 2000);
    const hours = Math.min(parseInt(url.searchParams.get("hours") || "72"), 168);
    const minSources = Math.min(parseInt(url.searchParams.get("minSources") || "2"), 10);

    try {
        const articles = await getCachedViral(limit, hours, minSources);
        return NextResponse.json({ articles, count: articles.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, articles: [] }, { status: 500 });
    }
}
