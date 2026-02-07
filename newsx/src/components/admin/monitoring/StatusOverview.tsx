"use client";

import { motion } from "framer-motion";
import { Activity, ShieldCheck, AlertTriangle, CloudRain, ServerCrash } from "lucide-react";

interface StatusOverviewProps {
    healthScore: number;
    metrics: {
        errors_1h: number;
        logs_5m: number;
    };
    feedReliability: number;
}

export function StatusOverview({ healthScore, metrics, feedReliability }: StatusOverviewProps) {
    const isHealthy = healthScore > 90;
    const isDegraded = healthScore > 70 && healthScore <= 90;
    const isCritical = healthScore <= 70;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Health Score Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`col-span-1 md:col-span-2 relative overflow-hidden rounded-2xl p-8 shadow-lg text-white flex items-center justify-between ${isHealthy
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                        : isDegraded
                            ? "bg-gradient-to-r from-amber-500 to-orange-600"
                            : "bg-gradient-to-r from-red-600 to-rose-700"
                    }`}
            >
                <div>
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        {isHealthy ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="font-semibold uppercase tracking-wider text-sm">System Status</span>
                    </div>
                    <h2 className="text-4xl font-bold mb-2">
                        {isHealthy ? "All Systems Operational" : isDegraded ? "Performance Degraded" : "Critical System Issues"}
                    </h2>
                    <p className="opacity-80 max-w-md">
                        {isHealthy
                            ? "Pipeline processing normally. No critical errors detected in the last hour."
                            : "System is experiencing elevated error rates or latency. Check logs for details."}
                    </p>
                </div>

                <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/20" />
                        <motion.circle
                            initial={{ strokeDasharray: "0 1000" }}
                            animate={{ strokeDasharray: `${(healthScore / 100) * 351} 1000` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{healthScore}%</span>
                        <span className="text-xs uppercase opacity-80">Health</span>
                    </div>
                </div>

                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            </motion.div>

            {/* Quick Stats Column */}
            <div className="space-y-4">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Activity (5m)</p>
                            <h4 className="text-2xl font-bold text-gray-900">{metrics.logs_5m}</h4>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${metrics.errors_1h > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"}`}>
                            <ServerCrash className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Errors (1h)</p>
                            <h4 className={`text-2xl font-bold ${metrics.errors_1h > 0 ? "text-red-600" : "text-gray-900"}`}>
                                {metrics.errors_1h}
                            </h4>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                            <CloudRain className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Feed Reliability</p>
                            <h4 className="text-2xl font-bold text-gray-900">{feedReliability}%</h4>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
