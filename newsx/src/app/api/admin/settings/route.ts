import { NextResponse } from "next/server";
import { SettingsRepository } from "@/lib/repositories/settings";

export async function GET(request: Request) {
    try {
        const config = await SettingsRepository.getConfig();
        return NextResponse.json({ ok: true, config });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate input
        if (typeof body.defaultFetchInterval !== 'number') {
            return NextResponse.json({ ok: false, error: "Invalid defaultFetchInterval" }, { status: 400 });
        }
        if (body.timeZone && typeof body.timeZone !== "string") {
            return NextResponse.json({ ok: false, error: "Invalid timeZone" }, { status: 400 });
        }
        if (body.defaultNewsLimit !== undefined && typeof body.defaultNewsLimit !== "number") {
            return NextResponse.json({ ok: false, error: "Invalid defaultNewsLimit" }, { status: 400 });
        }

        await SettingsRepository.setConfig({
            ...body,
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
