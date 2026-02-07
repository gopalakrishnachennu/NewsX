"use client";

import { motion } from "framer-motion";
import { LucideIcon, CheckCircle2, AlertTriangle, AlertOctagon, Activity } from "lucide-react";

interface ServiceNodeProps {
    title: string;
    status: "operational" | "degraded" | "down" | "maintenance";
    icon: LucideIcon;
    metrics?: Record<string, string | number>;
    description?: string;
    delay?: number;
}

const statusColors = {
    operational: "bg-green-500 shadow-green-200",
    degraded: "bg-amber-500 shadow-amber-200",
    down: "bg-red-500 shadow-red-200",
    maintenance: "bg-blue-500 shadow-blue-200",
};

const statusText = {
    operational: "text-green-700 bg-green-50",
    degraded: "text-amber-700 bg-amber-50",
    down: "text-red-700 bg-red-50",
    maintenance: "text-blue-700 bg-blue-50",
};

export function ServiceNode({ title, status, icon: Icon, metrics, description, delay = 0 }: ServiceNodeProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="group relative flex w-64 flex-col items-center"
        >
            {/* Connection Line (Left) */}
            <div className="absolute top-1/2 -left-8 h-1 w-8 bg-gray-200 -z-10 group-first:hidden" />

            {/* Status Pulse */}
            <div className="absolute -top-1 right-2">
                <span className={`relative flex h-3 w-3`}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColors[status].split(' ')[0]}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColors[status].split(' ')[0]}`}></span>
                </span>
            </div>

            {/* Card Content */}
            <div className="w-full rounded-xl border border-gray-100 bg-white p-5 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm bg-white/80">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-lg ${statusText[status]} bg-opacity-50`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
                {description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{description}</p>}

                {/* Metrics Grid */}
                {metrics && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-50/50">
                        {Object.entries(metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center text-xs">
                                <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="font-mono font-medium text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded">{value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Status Footer */}
                <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusText[status]}`}>
                    {status === 'operational' && <CheckCircle2 className="w-3 h-3" />}
                    {status === 'degraded' && <AlertTriangle className="w-3 h-3" />}
                    {status === 'down' && <AlertOctagon className="w-3 h-3" />}
                    {status}
                </div>
            </div>

            {/* Connection Line (Right) */}
            <div className="absolute top-1/2 -right-8 h-1 w-8 bg-gray-200 -z-10 group-last:hidden" />
        </motion.div>
    );
}
