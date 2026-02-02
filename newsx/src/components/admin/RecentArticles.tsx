"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Loader2, CheckCircle, XCircle, Clock, Ban } from "lucide-react";

type ArticleRow = {
    id: string;
    title: string;
    url: string;
    sourceId: string;
    lifecycle: string;
    qualityScore?: number;
    fetchError?: string;
    createdAt?: any;
};

export function RecentArticles() {
    const [articles, setArticles] = useState<ArticleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [processResult, setProcessResult] = useState<string | null>(null);

    const loadArticles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/articles/recent?limit=20&ts=${Date.now()}`, {
                cache: "no-store",
            });
            if (response.ok) {
                const data = await response.json();
                setArticles(data.articles || []);
            }
        } catch (error) {
            console.error("Failed to load articles", error);
        } finally {
            setLoading(false);
        }
    };

    const processQueue = async () => {
        setProcessing(true);
        setProcessResult(null);
        try {
            const response = await fetch("/api/articles/process-queue", {
                method: "POST",
            });
            const data = await response.json();
            if (data.ok) {
                setProcessResult(`Processed: ${data.processed}, Skipped: ${data.skipped}, Failed: ${data.failed}`);
            } else {
                setProcessResult(`Error: ${data.error}`);
            }
            await loadArticles();
        } catch (error: any) {
            setProcessResult(`Error: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        void loadArticles();
    }, []);

    const getLifecycleIcon = (lifecycle: string) => {
        switch (lifecycle) {
            case "queued":
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case "processed":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "blocked":
                return <Ban className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getLifecycleColor = (lifecycle: string) => {
        switch (lifecycle) {
            case "queued":
                return "bg-yellow-100 text-yellow-800";
            case "processed":
                return "bg-green-100 text-green-800";
            case "blocked":
                return "bg-red-100 text-red-800";
            case "published":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={processQueue}
                        disabled={processing}
                        className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {processing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Process Queue
                    </button>
                    <button
                        onClick={loadArticles}
                        disabled={loading}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Refresh
                    </button>
                </div>
                {processResult && (
                    <span
                        className={`text-sm ${processResult.startsWith("Error") ? "text-red-600" : "text-green-600"}`}
                    >
                        {processResult}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="py-8 text-center text-gray-500">Loading articles...</div>
            ) : articles.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-gray-500">
                    No articles yet. Add a feed and click Sweep to import articles.
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                                    Title
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                                    Source
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                                    Quality
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {articles.map((article) => (
                                <tr key={article.id}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-start gap-2">
                                            {getLifecycleIcon(article.lifecycle)}
                                            <div className="min-w-0">
                                                <a
                                                    href={article.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block truncate text-sm font-medium text-gray-900 hover:text-blue-600"
                                                    title={article.title}
                                                >
                                                    {article.title || article.url}
                                                </a>
                                                {article.fetchError && (
                                                    <span className="text-xs text-red-500">
                                                        Error: {article.fetchError}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {article.sourceId}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getLifecycleColor(article.lifecycle)}`}
                                        >
                                            {article.lifecycle}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {article.qualityScore ?? "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
