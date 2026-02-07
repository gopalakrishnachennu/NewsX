"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Globe } from "lucide-react";

interface RouteMonitorProps {
    routes: {
        name: string;
        path: string;
        status: number;
        latency: number;
    }[];
}

export function RouteMonitor({ routes }: RouteMonitorProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {routes.map((route, index) => {
                const isHealthy = route.status >= 200 && route.status < 300;
                return (
                    <motion.div
                        key={route.path}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative overflow-hidden rounded-xl border p-4 shadow-sm backdrop-blur-sm ${isHealthy
                                ? "bg-white/80 border-green-100"
                                : "bg-red-50/80 border-red-100"
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${isHealthy ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{route.name}</h4>
                                    <p className="text-[10px] text-gray-400 font-mono">{route.path}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>
                                {isHealthy ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                <span>{route.status}</span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs">
                            <span className="text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Latency
                            </span>
                            <span className={`font-mono font-bold ${route.latency < 200 ? "text-green-600" : route.latency < 500 ? "text-amber-600" : "text-red-600"
                                }`}>
                                {route.latency}ms
                            </span>
                        </div>

                        {/* Animated Latency Bar */}
                        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (route.latency / 500) * 100)}%` }}
                                className={`h-full rounded-full ${route.latency < 200 ? "bg-green-500" : route.latency < 500 ? "bg-amber-500" : "bg-red-500"
                                    }`}
                            />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
