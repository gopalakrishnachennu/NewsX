import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const start = Date.now();

    try {
        // Basic verification - try to list collections or just valid init
        // Since we can't easily list collections in admin SDK without privileges/setup,
        // we just verify the db instance exists.
        const result = await db.execute("SELECT 1 as ok");
        const isDbReady = !!result.rows?.length;

        const duration = Date.now() - start;

        logger.info("Health check initiated", {
            endpoint: "/api/health",
            durationMs: duration,
            dbReady: isDbReady
        });

        return NextResponse.json(
            {
                status: "ok",
                timestamp: new Date().toISOString(),
                services: {
                    database: isDbReady ? "connected" : "disconnected"
                }
            },
            { status: 200 }
        );
    } catch (error) {
        logger.error("Health check failed", error);
        return NextResponse.json(
            { status: "error", message: "Internal System Error" },
            { status: 500 }
        );
    }
}
