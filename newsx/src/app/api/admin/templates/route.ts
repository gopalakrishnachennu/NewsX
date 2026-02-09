
import { NextResponse } from "next/server";
import { dbAdmin, initAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    console.log("[API] /api/admin/templates called");
    try {
        const firestore = dbAdmin();
        const templatesRef = firestore.collection('templates');

        console.log("[API] Querying Firestore collection 'templates' (no sort)...");
        const snapshot = await templatesRef.get();
        console.log(`[API] Snapshot empty? ${snapshot.empty}, Size: ${snapshot.size}`);

        if (snapshot.empty) {
            console.warn("[API] No templates found in Firestore.");
            return NextResponse.json([]);
        }

        const templates = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure dates are serializable
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        console.log(`[API] Returning ${templates.length} templates`);
        return NextResponse.json(templates);
    } catch (error: any) {
        console.error("[API] Error fetching templates:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, ...templateData } = body;

        console.log(`[API] Saving template via Admin SDK: ${name}`);

        const firestore = dbAdmin();
        // Use provided ID or generate a new one
        const docId = id || firestore.collection('templates').doc().id;
        const templateRef = firestore.collection('templates').doc(docId);

        // Ensure no undefined values (JSON.stringify strips them)
        // Add server timestamps manually since we are not using client SDK
        const cleanData = JSON.parse(JSON.stringify({
            id: docId,
            name,
            ...templateData,
            createdAt: new Date(),
            updatedAt: new Date()
        }));

        await templateRef.set(cleanData, { merge: true });

        console.log(`[API] Template saved successfully: ${docId}`);
        return NextResponse.json({ success: true, id: docId });
    } catch (error: any) {
        console.error("[API] Error saving template:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
