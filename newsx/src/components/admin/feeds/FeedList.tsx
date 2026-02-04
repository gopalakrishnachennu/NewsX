"use client";

import { useEffect, useState } from "react";
import { Feed } from "@/types";
import { RefreshCw, Trash2, Globe, Activity, RotateCcw, Play, AlertTriangle, Eraser, Clock, Bug } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useDebugMode } from "@/hooks/useDebugMode";
import { CheckCircle, XCircle } from "lucide-react";

type FeedRow = Feed & { id: string };

type SweepResult = {
    feedId: string;
    sourceId: string;
    created: number;
    error?: string;
};

function SweepResultsModal({ results, onClose, summary }: { results: SweepResult[], onClose: () => void, summary?: any }) {
    const failed = results.filter(r => r.error);
    const success = results.filter(r => !r.error);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Sweep Results</h3>
                        {summary && (
                            <p className="text-sm text-gray-500">
                                Created {summary.totalCreated} articles. Failed {summary.failed}.
                            </p>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto p-0 flex-1">
                    {/* Failures First */}
                    {failed.length > 0 && (
                        <div className="p-4 bg-red-50 border-b border-red-100">
                            <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Failed Feeds ({failed.length})
                            </h4>
                            <div className="space-y-2">
                                {failed.map((r, i) => (
                                    <div key={i} className="bg-white p-3 rounded border border-red-200 shadow-sm text-sm">
                                        <div className="font-medium text-gray-900">{r.sourceId}</div>
                                        <div className="text-red-600 font-mono text-xs mt-1 break-all bg-red-50 p-1 rounded">
                                            {r.error}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success List */}
                    <div className="p-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" /> Successful Feeds ({success.length})
                        </h4>
                        <div className="space-y-1">
                            {success.map((r, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded border border-gray-100">
                                    <span className="font-medium text-gray-700">{r.sourceId}</span>
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                        +{r.created} new
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export function FeedList({ initialFeeds = [], refreshKey, onForceRefresh }: { initialFeeds?: Feed[], refreshKey?: number, onForceRefresh?: () => void }) {
    const [feeds, setFeeds] = useState<FeedRow[]>(initialFeeds.map(f => ({ ...f, id: f.id || '' })));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [sweepResults, setSweepResults] = useState<{ results: SweepResult[], summary: any } | null>(null);

    const { isEnabled: isDebugMode, toggle: toggleDebugMode } = useDebugMode();

    const handleForceRefresh = async () => {
        if (!confirm("Force refresh ALL feeds? This ignores fetch intervals.")) return;

        setActionMessage("Starting Forced Sweep...");
        setProgress({ active: true, stage: 'sweeping', total: 0, processed: 0, feedId: 'ALL', message: "Force Sweep Initiated..." });
        setSweepResults(null);

        try {
            const res = await fetch("/api/cron/sweep-all?force=true", { method: "POST" });

            let data;
            try {
                data = await res.json();
            } catch {
                if (!res.ok) throw new Error(res.statusText);
            }

            // Show results modal regardless of status if we have results
            if (data?.results) {
                setSweepResults({ results: data.results, summary: data });
            }

            if (res.ok || (data && data.ok)) { // Allow 200 with partial failures
                const created = data?.totalCreated || 0;
                setActionMessage(`Force Sweep Complete. Created: ${created}`);
                if (onForceRefresh) onForceRefresh(); // Trigger stream refresh
                void loadFeeds(); // Reload list
            } else {
                setError(data?.error || "Force sweep failed");
            }
        } catch (e: any) {
            setError(`Error during force sweep: ${e.message || e}`);
        } finally {
            setTimeout(() => setProgress({ active: false, stage: 'done', total: 0, processed: 0, feedId: null }), 2000);
        }
    };

    // Detailed progress state for the sweep/process operation
    const [progress, setProgress] = useState<{
        active: boolean;
        stage: 'sweeping' | 'processing' | 'done' | 'error';
        total: number;
        processed: number;
        feedId: string | null;
        message?: string;
    }>({ active: false, stage: 'done', total: 0, processed: 0, feedId: null });

    const [globalInterval, setGlobalInterval] = useState(30);

    const loadFeeds = async () => {
        setLoading(true);
        setError("");
        if (!progress.active) setActionMessage("");
        try {
            // Parallel fetch: Feeds + Global Config
            const [feedsRes, configRes] = await Promise.all([
                fetch(`/api/feeds?ts=${Date.now()}`, { cache: "no-store" }),
                fetch("/api/admin/settings") // New endpoint
            ]);

            if (!feedsRes.ok) {
                // Try to parse error details
                try {
                    const errData = await feedsRes.json();
                    throw new Error(errData.error || "Failed to load feeds");
                } catch (e) {
                    // If JSON parse fails (e.g. fatal 500 HTML), assume generic
                    if (e instanceof Error && e.message !== "Failed to load feeds") throw e;
                    throw new Error("Failed to load feeds");
                }
            }
            const feedsData = await feedsRes.json();
            setFeeds(feedsData.feeds || []);

            if (configRes.ok) {
                const configData = await configRes.json();
                if (configData.config?.defaultFetchInterval) {
                    setGlobalInterval(configData.config.defaultFetchInterval);
                }
            }

        } catch (err: any) {
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadFeeds();
    }, [refreshKey]);

    const handleSweep = async (id: string, force = false) => {
        // Reset previous action messages
        setActionMessage("");

        // 1. Start Sweep Phase
        setProgress({
            active: true,
            stage: 'sweeping',
            total: 0,
            processed: 0,
            feedId: id,
            message: force ? "Force refreshing feed..." : "Sweeping RSS feed..."
        });

        const sweepUrl = force ? `/api/feeds/${id}/sweep?force=true` : `/api/feeds/${id}/sweep`;
        const response = await fetch(sweepUrl, { method: "POST" });

        if (!response.ok) {
            const text = await response.text();
            let errorMsg = "Sweep failed";
            try {
                const errData = JSON.parse(text);
                errorMsg = errData.error || text;
            } catch { errorMsg = text; }

            setProgress({ active: false, stage: 'error', total: 0, processed: 0, feedId: id, message: `❌ ${errorMsg}` });
            return;
        }

        const data = await response.json();
        const totalNew = data?.created ?? 0;

        if (totalNew === 0) {
            setProgress({
                active: false,
                stage: 'done',
                total: 0,
                processed: 0,
                feedId: id,
                message: "✅ Sweep complete. No new articles found."
            });
            await loadFeeds();
            return;
        }

        // 2. Start Processing Phase
        setProgress({
            active: true,
            stage: 'processing',
            total: totalNew,
            processed: 0,
            feedId: id,
            message: `Found ${totalNew} articles. Queuing for processing...`
        });

        let processedCount = 0;
        const maxLoops = 100; // Allow 100 loops (approx 50s-100s)
        let loops = 0;

        // Loop to process the batch until done
        while (processedCount < totalNew && loops < maxLoops) {
            try {
                // Fetch batch with limit=20 for faster feedback
                const processRes = await fetch("/api/articles/process-queue?limit=20", { method: "POST" });
                if (!processRes.ok) break;

                const processData = await processRes.json();
                const batchProcessed = processData.processed || 0;

                // If no items were processed, the queue is effectively empty or blocked
                if (batchProcessed === 0) break;

                processedCount += batchProcessed;
                const percent = Math.round((processedCount / totalNew) * 100);

                setProgress(prev => ({
                    ...prev,
                    processed: Math.min(processedCount, totalNew),
                    message: `Processing... (${Math.min(processedCount, totalNew)} / ${totalNew})`
                }));

                // Small delay to prevent hammering if it's super fast, and give UI time to update
                await new Promise(r => setTimeout(r, 500));
                loops++;
            } catch (e) {
                console.error(e);
                break;
            }
        }

        setProgress({
            active: false,
            stage: 'done',
            total: totalNew,
            processed: processedCount,
            feedId: id,
            message: `✅ Job Complete! Added ${totalNew} articles, processed ${processedCount}.`
        });

        await loadFeeds();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will delete the feed AND ALL associated articles. This cannot be undone.")) {
            return;
        }

        setActionMessage("Deleting feed and articles...");
        const response = await fetch(`/api/feeds/${id}`, { method: "DELETE" });
        if (response.ok) {
            setActionMessage("✅ Feed deleted successfully");
        } else {
            setActionMessage("❌ Failed to delete feed");
        }
        await loadFeeds();
    };

    const handleReEnable = async (id: string) => {
        setActionMessage("Re-enabling feed...");
        try {
            const response = await fetch(`/api/feeds/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    health: {
                        status: "healthy",
                        consecutiveFailures: 0,
                        reliabilityScore: 50,
                        lastError: null,
                    },
                }),
            });
            if (response.ok) {
                setActionMessage("✅ Feed re-enabled. Try sweeping again.");
            } else {
                setActionMessage("Failed to re-enable feed");
            }
        } catch {
            setActionMessage("Failed to re-enable feed");
        }
        await loadFeeds();
    };

    const handleCleanup = async () => {
        if (!confirm("Run cleanup? This will compare all articles against active feeds and delete any orphans. This might take a moment.")) return;

        setActionMessage("Running system cleanup...");
        try {
            const res = await fetch("/api/admin/cleanup", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setActionMessage(`✅ System Cleanup: Removed ${data.deleted} orphaned articles.`);
            } else {
                setActionMessage(`❌ Cleanup failed: ${data.error}`);
            }
        } catch (e: any) {
            setActionMessage(`❌ Cleanup failed: ${e.message}`);
        }
    };

    // Render the Progress Bar Component
    const renderProgress = () => {
        if (!progress.message && !actionMessage) return null;

        // Decide what message to show: Progress message takes precedence if active
        const displayMessage = (progress.active || progress.message) ? progress.message : actionMessage;
        if (!displayMessage) return null;

        const isProgressing = progress.active;
        const percentage = (progress.total > 0 && progress.stage === 'processing')
            ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
            : 0;

        const isError = progress.stage === 'error' || (actionMessage && actionMessage.startsWith("❌"));

        return (
            <div className={`px-6 py-4 border-b transition-colors duration-300 ${isError ? 'bg-red-50' : 'bg-blue-50/50'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {isProgressing && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
                        <span className={`text-sm font-medium ${isError ? "text-red-700" : "text-blue-700"}`}>
                            {displayMessage}
                        </span>
                    </div>
                    {isProgressing && progress.stage === 'processing' && (
                        <span className="text-xs font-bold text-blue-600">{percentage}%</span>
                    )}
                </div>

                {/* Visual Progress Bar */}
                {isProgressing && progress.stage === 'processing' && (
                    <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden mb-1">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                )}

                {/* Indeterminate bar for sweeping phase */}
                {isProgressing && progress.stage === 'sweeping' && (
                    <div className="w-full bg-blue-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-blue-600 h-1 rounded-full animate-progress-indeterminate origin-left" />
                    </div>
                )}
            </div>
        );
    };

    // ... imports

    // ... inside FeedList component

    // Smart Timer: Counts down to the NEXT scheduled fetch
    const [timeToNextFetch, setTimeToNextFetch] = useState<string>("--:--");

    useEffect(() => {
        if (progress.active) {
            setTimeToNextFetch("Processing...");
            return;
        }

        const intervalId = setInterval(() => {
            if (feeds.length === 0) {
                setTimeToNextFetch("No Feeds");
                return;
            }

            // Find the earliest next run time across all feeds
            let minNextRun = Infinity;
            const now = Date.now();

            feeds.forEach(feed => {
                const interval = (feed.fetchIntervalMinutes || globalInterval) * 60 * 1000;
                const last = feed.lastFetchedAt ? (feed.lastFetchedAt._seconds * 1000) : 0;
                const next = last + interval;
                if (next < minNextRun) minNextRun = next;
            });

            const diff = minNextRun - now;

            if (diff <= 0) {
                setTimeToNextFetch("Due Now");
                // If we hit 0 (and aren't already loading), we could trigger a refresh
                // But let's verify we don't loop. We'll rely on the user or a slow poll.
                // Or better: Trigger a reload once when we cross zero? 
                // For simplicity/safety: Just show "Due Now" and let the user click or wait for a background poll.
                // Actually, let's keep a background 30s poll for separate UI freshness?
                // No, let's just trigger loadFeeds() if we are 'Due Now' for more than a few seconds?
                // Let's safe-guard:
                if (diff > -5000 && !loading) { // Trigger once just after passing 0
                    void loadFeeds();
                }
            } else {
                // Format MM:SS or HH:MM:SS
                const seconds = Math.floor((diff / 1000) % 60);
                const minutes = Math.floor((diff / 1000 / 60) % 60);
                const hours = Math.floor(diff / 1000 / 3600);

                if (hours > 0) {
                    setTimeToNextFetch(`${hours}h ${minutes}m`);
                } else {
                    setTimeToNextFetch(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
                }
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [feeds, globalInterval, progress.active, loading]);

    // Keep strict 30s background poll just to define 'loading' check? 
    // No, better to purely rely on the countdown + manual 'Refresh' buttons usually.
    // But to satisfy the "refreshing" need without a visible timer:
    useEffect(() => {
        const bgPoll = setInterval(() => {
            if (!loading && !progress.active) void loadFeeds();
        }, 30000);
        return () => clearInterval(bgPoll);
    }, [loading, progress.active]);


    const formatInterval = (minutes?: number) => {
        if (!minutes || minutes === 30) return "30m";
        if (minutes < 60) return `${minutes}m`;
        if (minutes === 60) return "1h";
        if (minutes === 360) return "6h";
        if (minutes === 1440) return "Daily";
        return `${Math.round(minutes / 60)}h`;
    };

    return (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            {/* Toolbar */}
            <div className="border-b border-gray-200 bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Sources</h3>

                    {/* System Interval Badge */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200" title="Global Fetch Frequency">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600">System: {formatInterval(globalInterval)}</span>
                    </div>

                    {/* Auto-Refresh Timer */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100" title="Time until next system update">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-xs font-medium text-blue-700">Next Fetch In: {timeToNextFetch}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleDebugMode}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors border ${isDebugMode
                            ? "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-transparent"
                            }`}
                        title={isDebugMode ? "Disable Debug Mode" : "Enable Debug Mode (Inspecting Articles)"}
                    >
                        <Bug className="w-4 h-4" />
                        {isDebugMode && <span className="hidden sm:inline">Debug ON</span>}
                    </button>

                    <button
                        onClick={handleForceRefresh}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                        title="Force refresh all feeds immediately (ignores schedule)"
                    >
                        <Play className="w-4 h-4" />
                        Force Refresh All
                    </button>
                    <button
                        onClick={handleCleanup}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                        title="Cleanup orphaned articles"
                    >
                        <Eraser className="w-4 h-4" />
                    </button>
                    {/* ... other buttons ... */}
                </div>
            </div>

            {/* Status / Progress Bar Area */}
            {renderProgress()}
            {/* ... error ... */}

            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source / URL</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Schedule</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Health</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {feeds.map((feed) => {
                        const health = feed.health || {
                            status: "warning",
                            reliabilityScore: 0,
                            lastCheck: new Date(),
                            errorCount24h: 0,
                        };
                        const feedId = (feed as any).id || (feed as any).feedId || (feed as any).docId || "";

                        // Disable buttons...
                        const isGlobalProcessing = progress.active;
                        const isThisRowActive = progress.feedId === feedId;
                        const disableActions = isGlobalProcessing;

                        // Calculate effective interval
                        const hasOverride = typeof feed.fetchIntervalMinutes === 'number' && feed.fetchIntervalMinutes > 0;
                        const effectiveInterval = hasOverride ? feed.fetchIntervalMinutes! : globalInterval;

                        let lastFetched: Date | null = null;
                        if ((feed as any).lastFetchedAt) {
                            const val = (feed as any).lastFetchedAt;
                            if (val._seconds) {
                                lastFetched = new Date(val._seconds * 1000);
                            } else {
                                lastFetched = new Date(val);
                            }
                        }
                        let nextRunText = "Pending";

                        if (lastFetched) {
                            const nextRun = new Date(lastFetched.getTime() + effectiveInterval * 60000);
                            if (nextRun < new Date()) nextRunText = "Due Now";
                            else nextRunText = formatDistanceToNow(nextRun, { addSuffix: true });
                        }

                        return (
                            <tr key={feedId || feed.url} className={isThisRowActive && progress.active ? "bg-blue-50/40" : ""}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Globe className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900 capitalize">{feed.sourceId}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{feed.url}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800 uppercase">
                                        {feed.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className={`text-sm font-medium ${hasOverride ? "text-blue-700" : "text-gray-900"}`}>
                                            {formatInterval(effectiveInterval)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {hasOverride ? "Custom" : "Global Default"}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1" title="Next scheduled run check">
                                            Next: {nextRunText}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        {health.status === 'disabled' ? (
                                            <AlertTriangle className="mr-2 h-4 w-4 text-gray-500" />
                                        ) : (
                                            <Activity className={`mr-2 h-4 w-4 ${health.status === 'healthy' ? 'text-green-500' :
                                                health.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                                                }`} />
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-700">
                                                {health.status === 'disabled' ? 'Disabled' : `${health.reliabilityScore}% Reliability`}
                                            </span>
                                            {lastFetched && (
                                                <span className="text-xs text-gray-400">
                                                    Checked {formatDistanceToNow(lastFetched, { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        {/* ... buttons ... */}
                                        {health.status === 'disabled' && (
                                            <button
                                                className="text-green-600 hover:text-green-900 disabled:opacity-30 disabled:cursor-not-allowed"
                                                onClick={() => handleReEnable(feedId)}
                                                title="Re-enable this feed"
                                                disabled={!feedId || disableActions}
                                            >
                                                <Play className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            className={`text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all ${isThisRowActive && progress.active ? "text-blue-600 scale-110" : ""}`}
                                            onClick={() => handleSweep(feedId)}
                                            title="Sweep feed now"
                                            disabled={!feedId || health.status === 'disabled' || disableActions}
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isThisRowActive && progress.active ? "animate-spin" : ""}`} />
                                        </button>
                                        <button
                                            className="text-amber-600 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed"
                                            onClick={() => handleSweep(feedId, true)}
                                            title="Force refresh"
                                            disabled={!feedId || health.status === 'disabled' || disableActions}
                                        >
                                            <RotateCcw className={`h-4 w-4 ${isThisRowActive && progress.active ? "animate-spin" : ""}`} />
                                        </button>
                                        <button
                                            className="text-red-600 hover:text-red-900 disabled:opacity-30 disabled:cursor-not-allowed"
                                            onClick={() => handleDelete(feedId)}
                                            title="Delete feed"
                                            disabled={!feedId || disableActions}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {sweepResults && (
                <SweepResultsModal
                    results={sweepResults.results}
                    summary={sweepResults.summary}
                    onClose={() => setSweepResults(null)}
                />
            )}
        </div>
    );
}
