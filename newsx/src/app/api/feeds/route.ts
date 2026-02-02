import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Feed } from "@/types";

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
        const db = dbAdmin();
        const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
        const feeds = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
            feedId: doc.id,
        }));
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

        const db = dbAdmin();
        const docRef = await db.collection(COLLECTION).add({
            sourceId,
            url,
            type,
            active,
            health: {
                status: "healthy",
                reliabilityScore: 100,
                lastCheck: FieldValue.serverTimestamp(),
                errorCount24h: 0,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ id: docRef.id });
    } catch (error: any) {
        console.error("Failed to create feed", error);
        return new NextResponse("Failed to create feed", { status: 500 });
    }
}
