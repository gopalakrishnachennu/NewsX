"use client";

import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Line
} from "recharts";
import { motion } from "framer-motion";
import { Database, TrendingDown, ShieldCheck, Zap, AlertTriangle, Activity } from "lucide-react";

interface QuotaData {
    reads: {
        limit: number;
        projected: number;
        saved: number;
        unoptimized: number;
    };
    writes: {
        limit: number;
        projected: number;
    };
}

export function QuotaDashboard() {
    const [data, setData] = useState<QuotaData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await fetch("/api/admin/stats");
                const json = await res.json();
                if (json.quota) {
                    setData(json.quota);
                }
            } catch (e) {
                console.error("Failed to load quota stats", e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    if (loading) return (
        <div className="h-64 w-full animate-pulse rounded-xl bg-gray-100/50"></div>
    );

    if (!data) return null;

    const readUsagePercent = (data.reads.projected / data.reads.limit) * 100;
    const writeUsagePercent = (data.writes.projected / data.writes.limit) * 100;

    // Mock data for the "Savings" graph
    const savingsData = [
        { name: '00:00', unoptimized: 2000, optimized: 50 },
        { name: '04:00', unoptimized: 4000, optimized: 100 },
        { name: '08:00', unoptimized: 15000, optimized: 300 }, // Morning rush
        { name: '12:00', unoptimized: 25000, optimized: 450 },
        { name: '16:00', unoptimized: 35000, optimized: 600 },
        { name: '20:00', unoptimized: 42000, optimized: 750 },
        { name: '23:59', unoptimized: data.reads.unoptimized, optimized: data.reads.projected },
    ];

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Quota Overview */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Database className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Firestore Quota Health</h3>
                                <p className="text-sm text-gray-500">Free Tier Usage Estimation (Daily)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-bold text-green-700">OPTIMIZED MODE</span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Reads Progress */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-gray-700">Reads ({data.reads.projected.toLocaleString()} / {data.reads.limit.toLocaleString()})</span>
                                <span className="font-bold text-blue-600">{readUsagePercent.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${readUsagePercent}%` }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                    className={`h-full rounded-full ${readUsagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                                Saving <strong>{data.reads.saved.toLocaleString()}</strong> reads/day via caching & deduplication
                            </p>
                        </div>

                        {/* Writes Progress */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-gray-700">Writes ({data.writes.projected.toLocaleString()} / {data.writes.limit.toLocaleString()})</span>
                                <span className="font-bold text-purple-600">{writeUsagePercent.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${writeUsagePercent}%` }}
                                    transition={{ duration: 1, delay: 0.4 }}
                                    className="h-full bg-purple-500 rounded-full"
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Logging disabled (Console only). Queue optimized.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Savings Graph */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-semibold text-gray-900">Optimization Impact</h4>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                <span className="text-gray-500">Without Optimization</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                <span className="text-gray-900 font-medium">Actual Usage</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={savingsData}>
                                <defs>
                                    <linearGradient id="colorUnopt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="unoptimized"
                                    stroke="#f87171"
                                    strokeDasharray="5 5"
                                    fillOpacity={1}
                                    fill="url(#colorUnopt)"
                                    name="Unoptimized (Projected)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="optimized"
                                    stroke="#22c55e"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorOpt)"
                                    name="Actual Usage"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Quick Stats Cards */}
            <div className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Reads Saved</span>
                        </div>
                        <div className="text-3xl font-extrabold mb-1">
                            {((data.reads.saved / data.reads.unoptimized) * 100).toFixed(0)}%
                        </div>
                        <p className="text-indigo-100 text-sm">
                            Reduction in database load
                        </p>
                    </div>
                    {/* Decorative bg circles */}
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                    <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-3 text-gray-500">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Total DB Hits</span>
                    </div>
                    <div className="text-4xl font-extrabold text-gray-900 mb-2">
                        {data.reads.projected.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        <span>{readUsagePercent.toFixed(2)}% of Quota Utilized</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="p-6 rounded-2xl bg-amber-50 border border-amber-100"
                >
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-amber-900 text-sm">Optimization Active</h4>
                            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                                Feeds are now using hash-based deduplication. Logs are redirected to console. Caching is enabled on read APIs.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
