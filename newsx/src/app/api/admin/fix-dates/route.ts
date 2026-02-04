import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const countResult = await db.execute({
            sql: `SELECT COUNT(*) as count FROM articles WHERE lifecycle = 'processed' AND (published_at IS NULL OR published_at = '')`,
        });
        const count = (countResult.rows[0]?.count as number) || 0;

        if (count > 0) {
            await db.execute({
                sql: `UPDATE articles SET lifecycle = 'published', published_at = COALESCE(published_at, created_at, CURRENT_TIMESTAMP)
                      WHERE lifecycle = 'processed' AND (published_at IS NULL OR published_at = '')`,
            });
        }

        return NextResponse.json({ ok: true, fixed: count });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
