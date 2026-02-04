import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const sources = url.searchParams.get("source") ? url.searchParams.get("source")!.split(",") : [];
    const fromStr = url.searchParams.get("from");
    const minQuality = parseInt(url.searchParams.get("minQuality") || "0");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

    try {
        const { ArticleRepository } = await import("@/lib/repositories/articles");

        const articles = await ArticleRepository.search({
            q: q || undefined,
            sources: sources.length > 0 ? sources : undefined,
            minQuality: minQuality || undefined,
            from: fromStr || undefined,
            limit: limit
        });

        return NextResponse.json({
            articles: articles,
            count: articles.length
        });

    } catch (error: any) {
        console.error("Search API Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
