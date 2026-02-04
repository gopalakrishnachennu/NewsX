import { NextResponse } from "next/server";
import type { Feed } from "@/types";
import crypto from "crypto";
import { dbAdminFeedsBackup } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION = "feeds";

function inferType(url: string): Feed["type"] {
    const lower = url.toLowerCase();
    if (lower.includes("sitemap")) return "sitemap";
    if (lower.includes("atom")) return "atom";
    if (lower.includes("rss") || lower.includes("/feed")) return "rss";
    return "rss";
}

function inferSourceId(url: string) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, "");
        const parts = hostname.split(".");
        return parts.length > 1 ? parts[0] : hostname;
    } catch {
        return "source";
    }
}

export async function GET() {
    try {
        const { FeedRepository } = await import("@/lib/repositories/feeds");

        let feeds = await FeedRepository.getAll();

        // READ-THROUGH CACHE
        // If local DB is empty, sync from Firebase
        if (feeds.length === 0) {
            console.log("Local feeds empty, syncing from Firebase...");
            const count = await FeedRepository.syncFromFirebase();
            if (count && count > 0) {
                feeds = await FeedRepository.getAll();
            }
        }

        return NextResponse.json({ feeds });
    } catch (error: any) {
        console.error("Failed to fetch feeds", error);
        return NextResponse.json({ feeds: [], error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const url = String(body?.url || "").trim();
        if (!url) {
            return new NextResponse("Missing url", { status: 400 });
        }

        const sourceId = String(body?.sourceId || "").trim() || inferSourceId(url);
        const type = (body?.type as Feed["type"]) || inferType(url);
        const active = body?.active !== false;
        const fetchIntervalMinutes = typeof body?.fetchIntervalMinutes === "number" ? body.fetchIntervalMinutes : undefined;

        const feedId = crypto.randomUUID();

        // DUAL WRITE: Update SQLite Cache
        const { FeedRepository } = await import("@/lib/repositories/feeds");
        const newFeed: Feed = {
            id: feedId,
            sourceId,
            url,
            type,
            active,
            health: {
                status: "healthy",
                reliabilityScore: 100,
                lastCheck: new Date(),
                errorCount24h: 0,
                consecutiveFailures: 0
            },
            fetchIntervalMinutes,
            updatedAt: new Date()
        };
        await FeedRepository.upsert(newFeed);

        // Firebase backup (feeds only)
        try {
            const db = dbAdminFeedsBackup();
            await db.collection(COLLECTION).doc(feedId).set({
                sourceId,
                url,
                type,
                active,
                fetchIntervalMinutes: fetchIntervalMinutes ?? null,
                health: {
                    status: "healthy",
                    reliabilityScore: 100,
                    lastCheck: new Date(),
                    errorCount24h: 0,
                    consecutiveFailures: 0,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true });
        } catch (e) {
            console.warn("Firebase feed backup failed:", e);
        }

        return NextResponse.json({ id: feedId });
    } catch (error: any) {
        console.error("Failed to create feed", error);
        return new NextResponse("Failed to create feed", { status: 500 });
    }
}
