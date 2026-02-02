"use client";

import { FeedList } from "@/components/admin/feeds/FeedList";
import { Plus, Zap } from "lucide-react";
import { useState } from "react";

export default function AdminFeedsPage() {
    const [showForm, setShowForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [globalInterval, setGlobalInterval] = useState(30);
    const [sourceId, setSourceId] = useState("");
    const [url, setUrl] = useState("");
    const [type, setType] = useState("");
    const [fetchIntervalMinutes, setFetchIntervalMinutes] = useState(0); // 0 = Use System Default
    const [active, setActive] = useState(true);
    const [autoSweep, setAutoSweep] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [progress, setProgress] = useState({ active: false, total: 0, processed: 0 });

    const handleForceRefreshTrigger = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ defaultFetchInterval: globalInterval }),
            });
            setShowSettings(false);
            setStatus("✅ Global settings updated!");
            setRefreshKey((prev) => prev + 1); // Trigger list refresh
        } catch (e) {
            setError("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setStatus("");
        setProgress({ active: false, total: 0, processed: 0 });

        try {
            // Step 1: Create feed
            setStatus("Creating feed...");
            const response = await fetch("/api/feeds", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceId,
                    url,
                    type: type || undefined,
                    active,
                    fetchIntervalMinutes
                }),
            });
            if (!response.ok) throw new Error("Failed to add feed");
            const feedData = await response.json();
            const feedId = feedData.id;

            // Step 2: Auto-sweep if enabled
            if (autoSweep && feedId) {
                setStatus("Sweeping feed...");
                const sweepRes = await fetch(`/api/feeds/${feedId}/sweep`, { method: "POST" });

                if (sweepRes.ok) {
                    const sweepData = await sweepRes.json();
                    const totalNew = sweepData.created || 0;
                    setStatus(`Found ${totalNew} articles. Processing...`);

                    if (totalNew > 0) {
                        // Start Processing Loop
                        setProgress({ active: true, total: totalNew, processed: 0 });

                        let processedCount = 0;
                        let loops = 0;
                        const maxLoops = 50;

                        while (processedCount < totalNew && loops < maxLoops) {
                            try {
                                const processRes = await fetch("/api/articles/process-queue?limit=50", { method: "POST" });
                                if (!processRes.ok) break;

                                const processData = await processRes.json();
                                const batchProcessed = processData.processed || 0;

                                if (batchProcessed === 0) break; // Queue empty

                                processedCount += batchProcessed;
                                loops++;

                                setProgress({
                                    active: true,
                                    total: totalNew,
                                    processed: Math.min(processedCount, totalNew)
                                });
                                setStatus(`Processing... (${Math.min(processedCount, totalNew)}/${totalNew})`);

                                await new Promise(r => setTimeout(r, 500));
                            } catch (e) {
                                console.error(e);
                                break;
                            }
                        }
                    }

                    setStatus(`✅ Done! Added ${sweepData.created || 0} articles.`);
                }
            } else {
                setStatus("✅ Feed saved!");
            }

            setSourceId("");
            setUrl("");
            setType("");
            setActive(true);
            setProgress({ active: false, total: 0, processed: 0 });
            setShowForm(false);
            setRefreshKey((prev) => prev + 1);
        } catch (err: any) {
            setError(err.message || "Failed to add feed");
            setProgress({ active: false, total: 0, processed: 0 });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Feed Manager</h2>
                    <p className="text-sm text-gray-500">Manage your RSS, Atom, and Sitemap sources</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="flex items-center gap-2 rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => setShowSettings((prev) => !prev)}
                    >
                        <Zap className="h-4 w-4" />
                        Settings
                    </button>
                    <button
                        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        onClick={() => setShowForm((prev) => !prev)}
                    >
                        <Plus className="h-4 w-4" />
                        {showForm ? "Close" : "Add New Source"}
                    </button>
                </div>
            </div>

            {/* Global Settings Modal */}
            {showSettings && (
                <div className="mb-6 rounded-lg border bg-gray-50 p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-2">Global System Settings</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Set the default fetch interval for the entire system. Any feed without a specific override will follow this schedule.
                    </p>
                    <div className="flex items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Fetch Interval</label>
                            <select
                                value={globalInterval}
                                onChange={(e) => setGlobalInterval(Number(e.target.value))}
                                className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
                            >
                                <option value="5">Every 5 minutes (Fast)</option>
                                <option value="15">Every 15 minutes</option>
                                <option value="30">Every 30 minutes (Standard)</option>
                                <option value="60">Every hour</option>
                                <option value="360">Every 6 hours</option>
                            </select>
                        </div>
                        <button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save System Defaults"}
                        </button>
                    </div>
                </div>
            )}

            {status && (
                <div className={`rounded-md px-4 py-3 text-sm transition-all ${status.includes("✅") ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                    <div className="flex items-center gap-2">
                        {progress.active && <Zap className="h-4 w-4 animate-spin text-blue-600" />}
                        <span className="font-medium">{status}</span>
                    </div>

                    {progress.active && progress.total > 0 && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{Math.round((progress.processed / progress.total) * 100)}%</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${Math.min(100, (progress.processed / progress.total) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="rounded-lg border bg-white p-4 shadow-sm"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Source ID</label>
                            <input
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                placeholder="cnn, bbc, techcrunch"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            >
                                <option value="">Auto-detect</option>
                                <option value="rss">RSS</option>
                                <option value="atom">Atom</option>
                                <option value="sitemap">Sitemap</option>
                                <option value="html">HTML</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fetch Schedule</label>
                                <select
                                    value={fetchIntervalMinutes}
                                    onChange={(e) => setFetchIntervalMinutes(Number(e.target.value))}
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="0">Use System Default</option>
                                    <option value="5">Every 5 minutes (Fast)</option>
                                    <option value="15">Every 15 minutes</option>
                                    <option value="30">Every 30 minutes (Standard)</option>
                                    <option value="60">Every hour</option>
                                    <option value="360">Every 6 hours</option>
                                    <option value="1440">Daily</option>
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Feed URL</label>
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/rss.xml"
                                required
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={active}
                                onChange={(e) => setActive(e.target.checked)}
                            />
                            Active
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={autoSweep}
                                onChange={(e) => setAutoSweep(e.target.checked)}
                                className="accent-blue-600"
                            />
                            <Zap className="h-4 w-4 text-amber-500" />
                            Auto-sweep & process on add
                        </label>
                    </div>
                    {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
                    <div className="mt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {saving ? "Processing..." : autoSweep ? "Save & Process" : "Save Feed"}
                        </button>
                    </div>
                </form>
            )}

            <FeedList refreshKey={refreshKey} onForceRefresh={handleForceRefreshTrigger} />
        </div>
    );
}
