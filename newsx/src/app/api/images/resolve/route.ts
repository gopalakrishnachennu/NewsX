import { NextResponse } from "next/server";
import { ImageResolver } from "@/lib/services/image-resolver";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    try {
        const result = await ImageResolver.resolveImage(id);
        if (result) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: "No image found" }, { status: 404 });
        }
    } catch (e: any) {
        console.error("Image Resolution Failed", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
