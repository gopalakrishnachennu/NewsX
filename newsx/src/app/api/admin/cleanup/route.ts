import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTICLES = "articles";
const FEEDS = "feeds";

export async function POST() {
    try {
        const db = dbAdmin();

        // 1. Get all active source IDs from feeds
        const feedsSnap = await db.collection(FEEDS).get();
        const activeSourceIds = new Set<string>();
        feedsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.sourceId) activeSourceIds.add(data.sourceId);
        });

        console.log("Active source IDs:", Array.from(activeSourceIds));

        // 2. Scan articles and check if their sourceId exists in active set
        // Note: For large datasets, this should be paginated/batched. 
        // For now, we'll scan in chunks.

        const articlesRef = db.collection(ARTICLES);
        const snapshot = await articlesRef.select('sourceId').get();

        let deletedCount = 0;
        const batchSize = 500;
        let batch = db.batch();
        let operationCount = 0;

        for (const doc of snapshot.docs) {
            const articleSourceId = doc.data().sourceId;

            // If article has a sourceId but it's not in our active list -> DELETE IT
            if (articleSourceId && !activeSourceIds.has(articleSourceId)) {
                batch.delete(doc.ref);
                operationCount++;
                deletedCount++;

                if (operationCount >= batchSize) {
                    await batch.commit();
                    batch = db.batch();
                    operationCount = 0;
                }
            }
        }

        if (operationCount > 0) {
            await batch.commit();
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
