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
    Cell
} from "recharts";
import { motion } from "framer-motion";
import { FolderOpen, Layers, Rss } from "lucide-react";

interface SourceStat {
    name: string;
    count: number;
}

export function SourceDistribution() {
    const [data, setData] = useState<SourceStat[]>([]);
    const [totalArticles, setTotalArticles] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await fetch("/api/admin/stats");
                const json = await res.json();
                if (json.articles) {
                    setData(json.articles.bySource || []);
                    setTotalArticles(json.articles.total || 0);
                }
            } catch (e) {
                console.error("Failed to load source stats", e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

    if (loading) return (
        <div className="h-80 w-full animate-pulse rounded-xl bg-gray-100/50 mt-8"></div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Total Articles Counter */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="col-span-1 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 p-6 text-white shadow-xl flex flex-col justify-between"
            >
                <div>
                    <div className="flex items-center gap-3 mb-4 opacity-80">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Layers className="w-5 h-5 text-indigo-300" />
                        </div>
                        <span className="text-sm font-semibold uppercase tracking-wider">Total Articles Ingested</span>
                    </div>
                    <div className="text-5xl font-extrabold tracking-tight mb-2">
                        {totalArticles.toLocaleString()}
                    </div>
                    <p className="text-indigo-200 text-sm">
                        Across {data.length} active sources
                    </p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-indigo-300">
                        <Rss className="w-4 h-4" />
                        <span>Live Sync Active</span>
                    </div>
                </div>
            </motion.div>

            {/* Source Distribution Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-1 lg:col-span-2 rounded-2xl bg-white border border-gray-100 p-6 shadow-sm"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FolderOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900">Articles by Source</h3>
                    </div>
                </div>

                <div className="h-[250px] w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 50, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                    label={{ position: 'right', fill: '#64748b', fontSize: 12, formatter: (value: any) => value.toLocaleString() }}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                            No source data available yet
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
