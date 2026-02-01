"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login?redirect=/admin");
            } else if (!['owner', 'editor', 'analyst'].includes(role || '')) {
                // Simple role check, can be more robust
                router.push("/unauthorized");
            }
        }
    }, [user, role, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    if (!user || !role) {
        return null; // Will redirect
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
            <header className="border-b bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight">Admin Control Room</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                            {user.email} ({role})
                        </span>
                        {/* Add Logout button here */}
                    </div>
                </div>
            </header>
            <main className="flex-1 p-6">
                {children}
            </main>
        </div>
    );
}
