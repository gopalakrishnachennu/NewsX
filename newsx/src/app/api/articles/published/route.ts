import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTICLES = "articles";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const showAll = url.searchParams.get("all") === "true";

    try {
        // SQLite Migration: Read from local DB
        const { ArticleRepository } = await import("@/lib/repositories/articles");
        // Allow higher limits from UI (use pagination in UI for truly unlimited)
        const safeLimit = Math.max(1, Math.min(limit, 2000));
        const articles = await ArticleRepository.findPublished(safeLimit);

        // Return only the requested amount
        return NextResponse.json({ articles });


    } catch (error: any) {
        console.error("Failed to fetch articles", error);
        return NextResponse.json({ error: error.message, articles: [] }, { status: 500 });
    }
}
