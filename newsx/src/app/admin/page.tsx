"use client";

import { QuotaDashboard } from "@/components/admin/QuotaDashboard";
import { SourceDistribution } from "@/components/admin/SourceDistribution";
import { KpiStats } from "@/components/admin/KpiStats";
import { LiveQueue } from "@/components/admin/LiveQueue";
import { TrendingClusters } from "@/components/admin/TrendingClusters";
import { RecentArticles } from "@/components/admin/RecentArticles";
import { ErrorInbox } from "@/components/admin/ErrorInbox";

export default function AdminDashboard() {
    return (
        <div className="space-y-8 bg-slate-50/50 p-6 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
                    <p className="mt-1 text-sm text-gray-500">Real-time overview of content ingestion and system health.</p>
                </div>
                <div className="flex gap-3">
                    <button className="rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                        View Logs
                    </button>
                    <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 shadow-md transition-all shadow-red-200">
                        PAUSE INGESTION
                    </button>
                </div>
            </div>

            <QuotaDashboard />
            <SourceDistribution />
            <KpiStats />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Live Operations</h3>
                            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full animate-pulse">Live</span>
                        </div>
                        <LiveQueue />
                    </section>

                    <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                            <h3 className="font-semibold text-gray-900">Latest Ingested Articles</h3>
                        </div>
                        <div className="p-6">
                            <RecentArticles />
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgent Attention</h3>
                        <ErrorInbox />
                    </section>

                    <section>
                        <TrendingClusters />
                    </section>
                </div>
            </div>
        </div>
    );
}
