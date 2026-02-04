import { NextResponse } from "next/server";
import { dbAdminFeedsBackup } from "@/lib/firebase-admin";
import type { Feed } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION = "feeds";

// PUT for full updates
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { FeedRepository } = await import("@/lib/repositories/feeds");
        const existing = await FeedRepository.getById(id);
        if (!existing) {
            return new NextResponse("Feed not found", { status: 404 });
        }

        // DUAL WRITE: Update SQLite
        const merged: Feed = {
            ...existing,
            ...body,
            id,
            updatedAt: new Date(),
        };
        await FeedRepository.upsert(merged);

        // Firebase backup (feeds only)
        try {
            const db = dbAdminFeedsBackup();
            await db.collection(COLLECTION).doc(id).set({ ...body, updatedAt: new Date() }, { merge: true });
        } catch (e) {
            console.warn("Firebase feed backup failed:", e);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Failed to update feed", error);
        return new NextResponse("Failed to update feed", { status: 500 });
    }
}

// PATCH for partial updates (e.g., re-enabling a disabled feed)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { FeedRepository } = await import("@/lib/repositories/feeds");
        const existing = await FeedRepository.getById(id);
        if (!existing) {
            return new NextResponse("Feed not found", { status: 404 });
        }

        // DUAL WRITE: Update SQLite
        const merged: Feed = {
            ...existing,
            ...body,
            id,
            updatedAt: new Date(),
        };
        await FeedRepository.upsert(merged);

        // Firebase backup (feeds only)
        try {
            const db = dbAdminFeedsBackup();
            await db.collection(COLLECTION).doc(id).set({ ...body, updatedAt: new Date() }, { merge: true });
        } catch (e) {
            console.warn("Firebase feed backup failed:", e);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Failed to patch feed", error);
        return new NextResponse("Failed to patch feed", { status: 500 });
    }
}

// Cascading delete - removes feed AND all its articles
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const { FeedRepository } = await import("@/lib/repositories/feeds");
        const { ArticleRepository } = await import("@/lib/repositories/articles");

        const feed = await FeedRepository.getById(id);
        if (!feed) {
            return NextResponse.json({ ok: true, message: "Feed already deleted" });
        }

        const sourceId = feed.sourceId;

        await FeedRepository.delete(id);
        if (sourceId) {
            await ArticleRepository.deleteBySourceId(sourceId);
        }

        // Firebase backup (feeds only)
        try {
            const db = dbAdminFeedsBackup();
            await db.collection(COLLECTION).doc(id).delete();
        } catch (e) {
            console.warn("Firebase feed backup delete failed:", e);
        }

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Failed to delete feed", error);
        return new NextResponse(`Failed to delete feed: ${error.message}`, { status: 500 });
    }
}

