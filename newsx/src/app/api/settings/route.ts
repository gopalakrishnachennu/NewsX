import { NextResponse } from "next/server";
import { SettingsRepository } from "@/lib/repositories/settings";

export const runtime = "nodejs";

export async function GET() {
    try {
        const config = await SettingsRepository.getConfig();
        return NextResponse.json({ ok: true, config });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
