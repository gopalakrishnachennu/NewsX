import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        await db.execute({
            sql: `UPDATE feeds 
                  SET health_status = 'healthy', 
                      health_consecutive_failures = 0,
                      health_error_count_24h = 0,
                      active = 1
                  WHERE health_status = 'disabled' OR health_status = 'error'`,
            args: []
        });

        // Also reset active feeds that might be stuck with high failure counts but not disabled yet
        await db.execute({
            sql: `UPDATE feeds 
                  SET health_consecutive_failures = 0
                  WHERE active = 1`,
            args: []
        });

        return NextResponse.json({ ok: true, message: "Resetted all feed health statuses." });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
