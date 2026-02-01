"use client";

import { KpiStats } from "@/components/admin/KpiStats";
import { LiveQueue } from "@/components/admin/LiveQueue";
import { TrendingClusters } from "@/components/admin/TrendingClusters";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AdminDashboard() {
    const { role } = useAuth();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
                {role === 'owner' && (
                    <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                        PAUSE INGESTION
                    </button>
                )}
            </div>

            <KpiStats />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <LiveQueue />

                    {/* Feed Health Heatmap placeholder */}
                    <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-semibold">Feed Health Heatmap</h3>
                        <div className="flex h-32 items-center justify-center rounded bg-gray-50 text-gray-400">
                            Heatmap Visualization Not Connected
                        </div>
                    </div>
                </div>

                <div>
                    <TrendingClusters />

                    {/* Error Inbox placeholder */}
                    <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
                        <h3 className="mb-3 font-semibold text-red-600">Error Inbox</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex justify-between">
                                <span>CNN RSS Timeout</span>
                                <span className="text-xs text-gray-400">2m ago</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Invalid XML (BBC)</span>
                                <span className="text-xs text-gray-400">15m ago</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
