import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
        }

        const result = await db.execute({
            sql: "SELECT * FROM articles WHERE id = ?",
            args: [id]
        });

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        const article = result.rows[0];

        return NextResponse.json(article);
    } catch (error: any) {
        console.error("Error fetching article:", error);
        return NextResponse.json(
            { error: "Failed to fetch article", details: error.message },
            { status: 500 }
        );
    }
}
