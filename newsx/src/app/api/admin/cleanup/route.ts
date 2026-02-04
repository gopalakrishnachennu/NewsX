import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FeedRepository } from "@/lib/repositories/feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTICLES = "articles";
const FEEDS = "feeds";

export async function POST() {
    try {
        // 1. Get all active source IDs from feeds (SQLite)
        const feeds = await FeedRepository.getAll();
        const activeSourceIds = new Set<string>(
            feeds.filter((f) => f.active && f.sourceId).map((f) => f.sourceId)
        );

        console.log("Active source IDs:", Array.from(activeSourceIds));

        // 2. Delete orphaned articles in SQLite
        let deletedCount = 0;
        if (activeSourceIds.size > 0) {
            const placeholders = Array.from(activeSourceIds).map(() => "?").join(",");
            const result = await db.execute({
                sql: `DELETE FROM articles WHERE source_id NOT IN (${placeholders}) AND source_id IS NOT NULL`,
                args: Array.from(activeSourceIds),
            });
            deletedCount = result.rowsAffected ?? 0;
        } else {
            const result = await db.execute(`DELETE FROM articles WHERE source_id IS NOT NULL`);
            deletedCount = result.rowsAffected ?? 0;
        }

        return NextResponse.json({
            ok: true,
            deleted: deletedCount,
            message: `Cleaned up ${deletedCount} orphaned articles`
        });

    } catch (error: any) {
        console.error("Cleanup failed", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
