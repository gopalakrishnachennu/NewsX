import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LogService } from "@/lib/services/logs";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const start = Date.now();

    // Determine base URL for self-pings
    const url = new URL(request.url);
    const origin = url.origin;

    try {
        // 1. Database & Storage Stats
        const dbPath = path.join(process.cwd(), "local.db");
        let dbSize = 0;
        try {
            const stats = fs.statSync(dbPath);
            dbSize = stats.size;
        } catch (e) {
            console.error("Failed to stat local.db", e);
        }

        // 2. Parallel Data Fetching
        const [
            queueResult,
            feedResult,
            logErrorsResult,
            logActivityResult
        ] = await Promise.all([
            // Queue Stats
            db.execute("SELECT lifecycle, count(*) as count FROM articles GROUP BY lifecycle"),

            // Feed Stats
            db.execute(`
                SELECT 
                    count(*) as total, 
                    avg(coalesce(health_reliability_score, 100)) as reliability, 
                    sum(case when active = 0 then 1 else 0 end) as inactive
                FROM feeds
            `),

            // Error Rate (Last 1 hour)
            db.execute(`
                SELECT count(*) as count 
                FROM logs 
                WHERE level = 'error' 
                AND timestamp > datetime('now', '-1 hour')
            `),

            // System Pulse (Last 5 mins)
            db.execute(`
                SELECT count(*) as count 
                FROM logs 
                WHERE timestamp > datetime('now', '-5 minutes')
            `)
        ]);

        // Process Queue Data
        const queueStats = {
            queued: 0,
            processing: 0,
            published: 0,
            error: 0,
            blocked: 0
        };

        queueResult.rows.forEach((row: any) => {
            const type = row.lifecycle as keyof typeof queueStats;
            if (queueStats.hasOwnProperty(type)) {
                queueStats[type] = Number(row.count);
            }
        });

        // Process Feed Data
        const feedRow = feedResult.rows[0] as any;
        const feedStats = {
            total: Number(feedRow.total || 0),
            reliability: Math.round(Number(feedRow.reliability || 100)),
            items_inactive: Number(feedRow.inactive || 0)
        };

        // 3. Route Health Pings (Parallel)
        const routes = [
            { name: "Home", path: "/" },
            { name: "News", path: "/news" },
            { name: "Viral", path: "/viral" },
            { name: "API", path: "/api/health" }
        ];

        const routePings = await Promise.all(
            routes.map(async (route) => {
                const routeStart = Date.now();
                let status = 500;
                try {
                    const res = await fetch(`${origin}${route.path}`, {
                        method: "HEAD", // Lightweight check
                        cache: "no-store",
                        headers: { "User-Agent": "NewsX-Monitor/1.0" }
                    });
                    status = res.status;
                } catch (e) {
                    status = 599; // Network error
                }
                return {
                    name: route.name,
                    path: route.path,
                    status,
                    latency: Date.now() - routeStart
                };
            })
        );

        // 4. Calculate Global Health Score
        // Base 100
        // -10 for each route down
        // -1 for each recent error (capped at -20)
        // Adjust by feed reliability
        let healthScore = 100;

        const failedRoutes = routePings.filter(r => r.status >= 400).length;
        healthScore -= (failedRoutes * 10);

        const errorCount = Number(logErrorsResult.rows[0].count);
        healthScore -= Math.min(errorCount, 20);

        // Weight feed reliability (30% impact)
        // If feeds are 50% reliable, score drops by 15 points
        const reliabilityFactor = feedStats.reliability / 100; // 0.5
        const reliabilityPenalty = 30 * (1 - reliabilityFactor); // 30 * 0.5 = 15
        healthScore -= reliabilityPenalty;

        healthScore = Math.max(0, Math.round(healthScore));

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            health_score: healthScore,
            storage: {
                db_size_bytes: dbSize
            },
            queue: queueStats,
            feeds: feedStats,
            activity: {
                errors_1h: errorCount,
                logs_5m: Number(logActivityResult.rows[0].count)
            },
            routes: routePings,
            duration_ms: Date.now() - start
        });

    } catch (error: any) {
        console.error("Monitoring API Error:", error);
        return NextResponse.json(
            { error: "Monitoring failed", details: error.message },
            { status: 500 }
        );
    }
}
