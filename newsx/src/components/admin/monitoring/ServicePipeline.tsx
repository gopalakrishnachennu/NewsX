"use client";

import { motion } from "framer-motion";
import { ServiceNode } from "./ServiceNode";
import { Globe, Server, Database, Zap, Rss, Layers } from "lucide-react";

interface ServicePipelineProps {
    data: any;
}

export function ServicePipeline({ data }: ServicePipelineProps) {
    if (!data) return null;

    const { queue, feeds, storage, routes } = data;

    // Determine status for each node
    const feedStatus = feeds.reliability > 90 ? "operational" : feeds.reliability > 70 ? "degraded" : "down";
    const queueStatus = queue.error > 10 ? "degraded" : queue.blocked > 50 ? "maintenance" : "operational";
    const dbStatus = storage.db_size_bytes > 0 ? "operational" : "down";

    // Check API route specifically for API status
    const apiRoute = routes.find((r: any) => r.path === "/api/health");
    const apiStatus = apiRoute?.status === 200 ? "operational" : "down";

    return (
        <div className="w-full overflow-x-auto pb-8 pt-4">
            <div className="min-w-[1000px] flex items-center justify-between px-10 relative">

                {/* Connecting Line Background */}
                <div className="absolute top-1/2 left-20 right-20 h-1 bg-gray-100 -z-20 rounded-full" />

                {/* Animated Data Flow Particles */}
                <motion.div
                    initial={{ x: "0%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-20 right-20 h-1 -z-10 overflow-hidden"
                >
                    <div className="w-20 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent rounded-full" />
                </motion.div>

                <ServiceNode
                    title="News Sources"
                    status={feedStatus}
                    icon={Globe}
                    description="External RSS/Atom feeds"
                    metrics={{
                        "total sources": feeds.total,
                        "reliability": `${feeds.reliability}%`,
                        "inactive": feeds.items_inactive
                    }}
                    delay={0.1}
                />

                <ServiceNode
                    title="Ingestion"
                    status={queueStatus}
                    icon={Rss}
                    description="Fetching & Normalization"
                    metrics={{
                        "queued": queue.queued,
                        "processing": queue.processing,
                        "blocked": queue.blocked
                    }}
                    delay={0.2}
                />

                <ServiceNode
                    title="Processing"
                    status="operational"
                    icon={Layers}
                    description="NLP Analysis & Enrichment"
                    metrics={{
                        "completed": queue.published,
                        "errors": queue.error
                    }}
                    delay={0.3}
                />

                <ServiceNode
                    title="Database"
                    status={dbStatus}
                    icon={Database}
                    description="SQLite + Filesystem"
                    metrics={{
                        "size": `${(storage.db_size_bytes / 1024 / 1024).toFixed(2)} MB`,
                        "type": "WAL Mode"
                    }}
                    delay={0.4}
                />

                <ServiceNode
                    title="API Gateway"
                    status={apiStatus}
                    icon={Server}
                    description="Next.js Server Actions"
                    metrics={{
                        "latency": `${apiRoute?.latency || 0}ms`,
                        "status": apiRoute?.status || 500
                    }}
                    delay={0.5}
                />

                <ServiceNode
                    title="Client"
                    status="operational"
                    icon={Zap}
                    description="Web & Mobile Apps"
                    metrics={{
                        "ver": "v1.2.0"
                    }}
                    delay={0.6}
                />
            </div>
        </div>
    );
}
