"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Rss, ScrollText, Activity } from "lucide-react";

const NAV_ITEMS = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/status", label: "System Status", icon: Activity },
    { href: "/admin/feeds", label: "Feeds", icon: Rss },
    { href: "/admin/logs", label: "Logs", icon: ScrollText },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
            <header className="border-b bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <h1 className="text-xl font-bold tracking-tight">NewsX Admin</h1>
                        <nav className="flex items-center gap-1">
                            {NAV_ITEMS.map((item) => {
                                const isActive = pathname === item.href ||
                                    (item.href !== "/admin" && pathname?.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            }`}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                    <span className="text-sm text-gray-500">Internal Console</span>
                </div>
            </header>
            <main className="flex-1 p-6">{children}</main>
        </div>
    );
}

