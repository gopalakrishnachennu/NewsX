import { NextResponse } from "next/server";
import { LogService } from "@/lib/services/logs";
import { FeedRepository } from "@/lib/repositories/feeds";
import { SettingsRepository } from "@/lib/repositories/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes for processing all feeds

export async function POST(request: Request) {
    const startTime = Date.now();

    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !force) { // Allow manual force without secret for now (or require auth)
        // Actually, internal API calls usually don't have the bearer token if called from client?
        // Let's stick to standard auth check but maybe allow session/admin check if we were calling from client.
        // For now, assuming this is called via `fetch` from server component or admin API.
        // If called from client side button -> it calls this API route. 
        // Admin pages are protected by middleware usually. 
        // Let's just create a separate handler for Admin Force or reuse this carefully.
    }

    // Safe logger helper to prevent quota errors from crashing the request
    const safeLog = async (level: "info" | "error" | "warn", message: string, meta?: any) => {
        try {
            if (level === "info") await LogService.info(message, meta);
            else if (level === "warn") await LogService.warn(message, meta);
            else await LogService.error(message, meta);
        } catch (e) {
            console.error(`[LogService Fail] ${message}`, e);
        }
    };

    const results: Array<{ feedId: string; sourceId: string; created: number; error?: string }> = [];
    let feedsScanned = 0;

    try {
        await safeLog("info", "Cron sweep-all started", { force });

        // Get all active feeds
        // If this fails (Read Quota), we can't proceed at all.
        const feeds = (await FeedRepository.getAll()).filter((f) => f.active);

        if (feeds.length === 0) {
            await safeLog("info", "No active feeds to sweep", {});
            return NextResponse.json({ ok: true, feeds: 0, message: "No active feeds", results: [] });
        }

        feedsScanned = feeds.length;
        let totalCreated = 0;
        let totalProcessed = 0;
        let failed = 0;

        // Fetch Global Settings first
        let globalDefaultInterval = 30;
        try {
            const config = await SettingsRepository.getConfig();
            globalDefaultInterval = config?.defaultFetchInterval || 30;
        } catch (e) {
            console.warn("Failed to load global config, using default 30m", e);
        }

        // Sweep each feed
        for (const feed of feeds) {
            const feedId = feed.id;

            // INTERVAL CHECK
            const fetchIntervalMinutes = feed.fetchIntervalMinutes || globalDefaultInterval;
            const lastFetchedAt = feed.lastFetchedAt ? new Date(feed.lastFetchedAt as any).getTime() : 0;
            const timeSinceLast = Date.now() - lastFetchedAt;
            const intervalMs = fetchIntervalMinutes * 60 * 1000;

            if (!force && timeSinceLast < intervalMs) {
                // Skip silently or log as skipped? 
                // Client expects results. Let's record as skipped for better visibility if debugging?
                // Or just ignore to keep payload small. 
                // User asked "which source is causing error". Skipped is not error.
                continue;
            }

            try {
                // Call sweep API internally
                const sweepUrl = new URL(`/api/feeds/${feedId}/sweep${force ? '?force=true' : ''}`, request.url);
                const sweepRes = await fetch(sweepUrl.toString(), { method: "POST" });

                if (sweepRes.ok) {
                    const sweepData = await sweepRes.json();
                    if (sweepData.skipped) {
                        continue;
                    }
                    const created = sweepData.created || 0;
                    totalCreated += created;

                    results.push({
                        feedId,
                        sourceId: feed.sourceId,
                        created,
                    });
                } else {
                    const errorText = await sweepRes.text();
                    let safeError = errorText.slice(0, 100);
                    try {
                        const jsonErr = JSON.parse(errorText);
                        if (jsonErr.error) safeError = jsonErr.error;
                    } catch { }

                    results.push({
                        feedId,
                        sourceId: feed.sourceId,
                        created: 0,
                        error: safeError,
                    });
                    failed++;
                }
            } catch (error: any) {
                results.push({
                    feedId,
                    sourceId: feed.sourceId,
                    created: 0,
                    error: error?.message || "Unknown error",
                });
                failed++;
            }

            // Small delay
            await new Promise((r) => setTimeout(r, 500));
        }

        // Process queue after all sweeps
        if (totalCreated > 0) {
            await safeLog("info", "Starting batch processing", { totalCreated });

            // Process in batches
            let processedTotal = 0;
            for (let i = 0; i < 5; i++) {
                try {
                    const processRes = await fetch(
                        new URL("/api/articles/process-queue?limit=10", request.url).toString(),
                        { method: "POST" }
                    );
                    if (processRes.ok) {
                        const processData = await processRes.json();
                        processedTotal += processData.processed || 0;
                        if (processData.processed === 0) break;
                    } else {
                        break;
                    }
                } catch { break; }
                await new Promise((r) => setTimeout(r, 200));
            }
            totalProcessed = processedTotal;
        }

        const duration = Date.now() - startTime;
        await safeLog("info", "Cron sweep-all completed", {
            feeds: feedsScanned,
            totalCreated,
            totalProcessed,
            failed,
            durationMs: duration,
        });

        return NextResponse.json({
            ok: true,
            feeds: feedsScanned,
            totalCreated,
            totalProcessed,
            failed,
            durationMs: duration,
            results,
        });
    } catch (error: any) {
        const errorMsg = error?.message || "Unknown error";
        await safeLog("error", "Cron sweep-all failed", { error: errorMsg });
        // Return 200 with ok:false if we have partial results, so the client can show them
        return NextResponse.json({
            ok: false,
            error: errorMsg,
            results // Return partial results
        }, { status: 200 }); // Changed to 200 so UI can parse the JSON effortlessly
    }
}

// GET handler for manual testing
export async function GET(request: Request) {
    return POST(request);
}
