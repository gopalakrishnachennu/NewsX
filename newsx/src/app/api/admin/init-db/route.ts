import { NextResponse } from "next/server";
import { initDB } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
    try {
        await initDB();
        return NextResponse.json({ ok: true, message: "Database initialized" });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
