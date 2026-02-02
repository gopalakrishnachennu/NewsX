import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "articles";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);

    try {
        const db = dbAdmin();
        // Use createdAt to avoid needing composite index
        const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
        const articles = snapshot.docs.map((doc) => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                title: data?.title || "",
                url: data?.url || "",
                sourceId: data?.sourceId || "",
                image: data?.image || null,
                summary: data?.summary || null,
                author: data?.author || null,
                publishedAt: data?.publishedAt || null,
                lifecycle: data?.lifecycle || "queued",
                qualityScore: data?.qualityScore || null,
                fetchError: data?.fetchError || null,
                createdAt: data?.createdAt?.toMillis?.() || Date.now(),
            };
        });

        return NextResponse.json({ articles });
    } catch (error: any) {
        console.error("Failed to load recent articles", error);
        return NextResponse.json({ error: error.message, articles: [] }, { status: 500 });
    }
}

