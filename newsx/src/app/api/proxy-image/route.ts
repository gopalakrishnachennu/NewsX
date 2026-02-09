import { NextRequest, NextResponse } from "next/server";
import { getRandomUserAgent } from "@/lib/utils/user-agents";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing URL parameter", { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": getRandomUserAgent(),
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Referer": new URL(url).origin + "/", // Fake referer as origin
            },
        });

        if (!response.ok) {
            console.error(`Proxy failed for ${url}: ${response.status} ${response.statusText}`);
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const blob = await response.blob();
        const headers = new Headers();
        headers.set("Content-Type", blob.type);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("Access-Control-Allow-Origin", "*"); // Enable CORS for canvas

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error("Image proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
