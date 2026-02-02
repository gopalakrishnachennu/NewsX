import { NextResponse } from "next/server";
import { authAdmin, dbAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Role } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defaultRole: Role = "owner";

function getBearerToken(authHeader: string | null) {
    if (!authHeader) return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

export async function GET(request: Request) {
    try {
        const token = getBearerToken(request.headers.get("authorization"));
        if (!token) {
            return new NextResponse("Missing Authorization header", { status: 401 });
        }

        const decoded = await authAdmin().verifyIdToken(token);
        const db = dbAdmin();
        const userRef = db.collection("users").doc(decoded.uid);
        const userSnap = await userRef.get();

        const existing = userSnap.exists ? (userSnap.data() as any) : null;
        const role = (existing?.role as Role) || defaultRole;
        const email = existing?.email || decoded.email || "";
        const lastLoginMs = existing?.lastLogin?.toMillis
            ? existing.lastLogin.toMillis()
            : Date.now();

        await userRef.set(
            {
                uid: decoded.uid,
                email,
                role,
                lastLogin: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return NextResponse.json({
            user: {
                uid: decoded.uid,
                email,
                role,
                lastLogin: lastLoginMs,
            },
        });
    } catch (error: any) {
        console.error("Failed to resolve user profile", error);
        return new NextResponse("Unauthorized", { status: 401 });
    }
}
