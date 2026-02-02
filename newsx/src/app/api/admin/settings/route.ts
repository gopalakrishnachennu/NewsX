
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";

const SETTINGS_COLLECTION = "system";
const CONFIG_DOC = "config";

export async function GET(request: Request) {
    try {
        const db = dbAdmin();
        const doc = await db.collection(SETTINGS_COLLECTION).doc(CONFIG_DOC).get();
        const config = doc.exists ? doc.data() : { defaultFetchInterval: 60 };
        return NextResponse.json({ ok: true, config });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const db = dbAdmin();
        const body = await request.json();

        // Validate input
        if (typeof body.defaultFetchInterval !== 'number') {
            return NextResponse.json({ ok: false, error: "Invalid defaultFetchInterval" }, { status: 400 });
        }

        await db.collection(SETTINGS_COLLECTION).doc(CONFIG_DOC).set(
            { ...body, updatedAt: new Date() },
            { merge: true }
        );

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
