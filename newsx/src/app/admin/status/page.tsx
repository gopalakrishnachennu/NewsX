"use client";

import { useEffect, useState } from "react";
import { ServicePipeline } from "@/components/admin/monitoring/ServicePipeline";
import { RouteMonitor } from "@/components/admin/monitoring/RouteMonitor";
import { StatusOverview } from "@/components/admin/monitoring/StatusOverview";
import { RefreshCcw } from "lucide-react";

export default function ServiceStatusPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/admin/monitoring");
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Failed to fetch monitoring data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // 5s poll
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                    <p className="text-gray-500 font-medium">Initializing Monitoring Probe...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto p-2">

            {/* Header & Controls */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                        System Operations Center
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live Monitoring • {lastUpdated?.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all active:rotate-180"
                >
                    <RefreshCcw className="w-5 h-5" />
                </button>
            </div>

            {/* 1. Hero Overview */}
            <StatusOverview
                healthScore={data.health_score}
                metrics={data.activity}
                feedReliability={data.feeds.reliability}
            />

            {/* 2. Visual Pipeline */}
            <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20" />
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    Data Pipeline
                    <span className="text-xs font-normal text-gray-400 px-2 py-0.5 bg-gray-50 rounded-full border">End-to-End Flow</span>
                </h3>
                <ServicePipeline data={data} />
            </section>

            {/* 3. Route Health */}
            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-bold text-gray-900">Route Availability</h3>
                    <span className="text-xs text-gray-500">Latency Check (Headless)</span>
                </div>
                <RouteMonitor routes={data.routes} />
            </section>

        </div>
    );
}
