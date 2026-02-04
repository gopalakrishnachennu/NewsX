import { NextResponse } from "next/server";
import { authAdmin } from "@/lib/firebase-admin";
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
        const role = defaultRole;
        const email = decoded.email || "";
        const lastLoginMs = Date.now();

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
