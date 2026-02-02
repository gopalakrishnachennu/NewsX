import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COLLECTION = "feeds";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const body = await request.json();
        const updates = { ...body, updatedAt: FieldValue.serverTimestamp() };
        const db = dbAdmin();
        await db.collection(COLLECTION).doc(id).set(updates, { merge: true });
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
        const updates = { ...body, updatedAt: FieldValue.serverTimestamp() };
        const db = dbAdmin();
        await db.collection(COLLECTION).doc(id).set(updates, { merge: true });
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
        const db = dbAdmin();
        const feedRef = db.collection(COLLECTION).doc(id);

        // 1. Get feed to find sourceId
        const feedSnap = await feedRef.get();
        if (!feedSnap.exists) {
            return NextResponse.json({ ok: true, message: "Feed already deleted" });
        }

        const feedData = feedSnap.data();
        const sourceId = feedData?.sourceId;

        // 2. Delete all associated articles
        if (sourceId) {
            const articlesRef = db.collection("articles");
            let deletedCount = 0;

            // Delete in batches (Firestore limit 500)
            while (true) {
                const snapshot = await articlesRef
                    .where("sourceId", "==", sourceId)
                    .limit(500)
                    .get();

                if (snapshot.empty) break;

                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                deletedCount += snapshot.size;
                console.log(`Deleted article batch: ${snapshot.size}`);
            }
            console.log(`Deleted total ${deletedCount} articles for source ${sourceId}`);
        }

        // 3. Delete the feed itself
        await feedRef.delete();

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error("Failed to delete feed", error);
        return new NextResponse(`Failed to delete feed: ${error.message}`, { status: 500 });
    }
}


