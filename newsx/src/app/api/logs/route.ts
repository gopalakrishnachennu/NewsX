import { NextResponse } from "next/server";
import { LogService } from "@/lib/services/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    try {
        const logs = await LogService.getRecent(limit);
        return NextResponse.json({ logs });
    } catch (error: any) {
        console.error("Failed to fetch logs", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
