"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CloudLightning, Database, Rss, Layers, CheckCircle } from "lucide-react";

type DashboardStats = {
    feeds: {
        total: number;
        active: number;
        disabled: number;
        error: number;
        avgReliability: number;
    };
    articles: {
        today: number;
        ingestRatePerHour: number;
    };
    system: {
        health: string;
        recentErrors: any[];
    };
};

export function KpiStats() {
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/stats");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        // Refresh every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const stats = [
        {
            label: "Total Feeds",
            value: loading ? "..." : data?.feeds.total || 0,
            subValue: `${data?.feeds.active || 0} active`,
            icon: Rss,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            label: "Feed Health",
            value: loading ? "..." : `${data?.feeds.avgReliability || 0}%`,
            subValue: `${data?.feeds.error || 0} failing`,
            icon: Activity,
            color: data?.feeds.avgReliability && data.feeds.avgReliability < 80 ? "text-red-500" : "text-green-600",
            bg: data?.feeds.avgReliability && data.feeds.avgReliability < 80 ? "bg-red-50" : "bg-green-50"
        },
        {
            label: "Ingestion Rate",
            value: loading ? "..." : `~${data?.articles.ingestRatePerHour || 0}/hr`,
            subValue: "Articles processed",
            icon: CloudLightning,
            color: "text-amber-600",
            bg: "bg-amber-50"
        },
        {
            label: "Articles Today",
            value: loading ? "..." : data?.articles.today || 0,
            subValue: "Recent sample",
            icon: Layers,
            color: "text-indigo-600",
            bg: "bg-indigo-50"
        },
        {
            label: "System Status",
            value: loading ? "..." : (data?.system.health === 'healthy' ? 'Healthy' : 'Degraded'),
            subValue: "Operational",
            icon: data?.system.health === 'healthy' ? CheckCircle : AlertTriangle,
            color: data?.system.health === 'healthy' ? "text-emerald-600" : "text-red-600",
            bg: data?.system.health === 'healthy' ? "bg-emerald-50" : "bg-red-50"
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            {stats.map((stat) => (
                <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <h3 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{stat.value}</h3>
                        </div>
                        <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                        <span className={`font-medium ${stat.color}`}>
                            {stat.subValue}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
