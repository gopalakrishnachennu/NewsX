
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const firestore = dbAdmin();
        const docSnap = await firestore.collection("templates").doc(id).get();

        if (!docSnap.exists) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const data = docSnap.data() || {};
        return NextResponse.json({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || null,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || null,
        });
    } catch (error: any) {
        console.error("Error fetching template:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const firestore = dbAdmin();
        await firestore.collection("templates").doc(id).delete();

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error("Error deleting template:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
