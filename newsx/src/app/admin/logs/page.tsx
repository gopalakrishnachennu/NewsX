"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Info, AlertCircle, Bug } from "lucide-react";

type LogEntry = {
    id: string;
    level: string;
    message: string;
    context?: Record<string, any>;
    timestamp?: any;
};

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/logs?limit=50&ts=${Date.now()}`, {
                cache: "no-store",
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || []);
            }
        } catch (error) {
            console.error("Failed to load logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadLogs();
        const interval = setInterval(loadLogs, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const getLevelIcon = (level: string) => {
        switch (level) {
            case "error":
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case "warn":
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case "info":
                return <Info className="h-4 w-4 text-blue-500" />;
            default:
                return <Bug className="h-4 w-4 text-gray-400" />;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case "error":
                return "bg-red-50 border-red-200";
            case "warn":
                return "bg-yellow-50 border-yellow-200";
            case "info":
                return "bg-blue-50 border-blue-200";
            default:
                return "bg-gray-50 border-gray-200";
        }
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return "-";
        try {
            const date = ts._seconds
                ? new Date(ts._seconds * 1000)
                : new Date(ts);
            return date.toLocaleString();
        } catch {
            return "-";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">System Logs</h2>
                    <p className="text-sm text-gray-500">Real-time ingestion and processing logs</p>
                </div>
                <button
                    onClick={loadLogs}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {loading && logs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">Loading logs...</div>
            ) : logs.length === 0 ? (
                <div className="rounded-md border border-dashed p-12 text-center text-gray-500">
                    No logs yet. Logs will appear when feeds are swept or articles are processed.
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`rounded-md border p-4 ${getLevelColor(log.level)}`}
                        >
                            <div className="flex items-start gap-3">
                                {getLevelIcon(log.level)}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">{log.message}</span>
                                        <span className="text-xs text-gray-500">
                                            {formatTimestamp(log.timestamp)}
                                        </span>
                                    </div>
                                    {log.context && Object.keys(log.context).length > 0 && (
                                        <pre className="mt-2 overflow-auto rounded bg-white/50 p-2 text-xs text-gray-600">
                                            {JSON.stringify(log.context, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
