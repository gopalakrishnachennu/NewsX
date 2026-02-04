"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Filter, Calendar, Star, Layers, RefreshCw } from "lucide-react";
import { NewsCard, NewsArticle } from "@/components/news/NewsCard";

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    localArticles: NewsArticle[];
}

interface SourceOption {
    name: string;
    count: number;
}

export function SearchOverlay({ isOpen, onClose, localArticles }: SearchOverlayProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(false);

    // Search Mode: 'cloud' (Deep DB Search) vs 'local' (Client Side)
    const [searchMode, setSearchMode] = useState<'cloud' | 'local'>('cloud');

    // Filters
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState("24h"); // 24h, 7d, 30d
    const [minQuality, setMinQuality] = useState(0);
    const [showFilters, setShowFilters] = useState(true);

    // Metadata
    const [availableSources, setAvailableSources] = useState<SourceOption[]>([]);

    useEffect(() => {
        // Fetch available sources for the filter list
        fetch("/api/admin/stats")
            .then(res => res.json())
            .then(data => {
                if (data.articles?.bySource) {
                    setAvailableSources(data.articles.bySource);
                }
            })
            .catch(err => console.error("Failed to load sources", err));
    }, []);

    const handleSearch = async () => {
        setLoading(true);
        try {
            if (searchMode === 'local') {
                // LOCAL SEARCH (Zero Latency, Zero Cost)
                const now = new Date();
                let filtered = localArticles.filter(article => {
                    // 1. Text Match
                    const q = query.toLowerCase();
                    const textMatch = !q ||
                        article.title.toLowerCase().includes(q) ||
                        article.summary?.toLowerCase().includes(q) ||
                        article.keywords?.some(k => k.toLowerCase().includes(q));

                    if (!textMatch) return false;

                    // 2. Source Match
                    if (selectedSources.length > 0 && !selectedSources.includes(article.sourceId)) return false;

                    // 3. Quality Match
                    if ((article.qualityScore || 0) < minQuality) return false;

                    // 4. Date Match
                    const pubDate = new Date(article.publishedAt || article.createdAt || 0);
                    const diffHours = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);

                    if (dateRange === "24h" && diffHours > 24) return false;
                    if (dateRange === "7d" && diffHours > 24 * 7) return false;
                    if (dateRange === "30d" && diffHours > 24 * 30) return false;

                    return true;
                });

                setResults(filtered);
                // Artificial delay for UX consistency (optional, effectively 0)
                await new Promise(r => setTimeout(r, 100));

            } else {
                // CLOUD SEARCH (DB Hits, Full History)
                const params = new URLSearchParams();
                if (query) params.append("q", query);
                if (selectedSources.length > 0) params.append("source", selectedSources.join(","));
                params.append("minQuality", minQuality.toString());

                // Date Logic
                const now = new Date();
                if (dateRange === "24h") now.setDate(now.getDate() - 1);
                if (dateRange === "7d") now.setDate(now.getDate() - 7);
                if (dateRange === "30d") now.setDate(now.getDate() - 30);
                params.append("from", now.toISOString());

                const res = await fetch(`/api/articles/search?${params.toString()}`);
                const data = await res.json();
                setResults(data.articles || []);
            }
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setLoading(false);
        }
    };

    // Auto-search on filter change (debounce query)
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            handleSearch();
        }, 500);
        return () => clearTimeout(timer);
    }, [query, selectedSources, dateRange, minQuality, isOpen, searchMode]);

    const toggleSource = (source: string) => {
        setSelectedSources(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 sm:pt-24 px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header / Search Bar */}
                        <div className="p-4 sm:p-6 border-b border-gray-100 bg-white z-10">
                            {/* Top Bar: Search + Toggles */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4">
                                    <Search className="w-6 h-6 text-gray-400" />
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={searchMode === 'cloud' ? "Search entire history..." : "Filter loaded articles..."}
                                        className="flex-1 text-xl font-medium placeholder-gray-300 border-none outline-none ring-0"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        <Filter className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    {/* Mode Toggle */}
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setSearchMode('local')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${searchMode === 'local'
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Quick Filter (0 DB)
                                        </button>
                                        <button
                                            onClick={() => setSearchMode('cloud')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${searchMode === 'cloud'
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Deep Cloud Search
                                        </button>
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">
                                        {searchMode === 'cloud' ? 'Searching full database history' : 'Filtering only loaded articles'}
                                    </span>
                                </div>
                            </div>

                            {/* Filters Area */}
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-6 pb-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Date Filter */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3" /> Time Range
                                                </label>
                                                <div className="flex gap-2">
                                                    {['24h', '7d', '30d'].map(range => (
                                                        <button
                                                            key={range}
                                                            onClick={() => setDateRange(range)}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${dateRange === range
                                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last Week' : 'Last Month'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Quality Filter */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Star className="w-3 h-3" /> Quality Score
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="90"
                                                        step="10"
                                                        value={minQuality}
                                                        onChange={(e) => setMinQuality(parseInt(e.target.value))}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                    <span className="text-sm font-bold text-gray-700 w-8">{minQuality}+</span>
                                                </div>
                                            </div>

                                            {/* Sources Filter */}
                                            <div className="space-y-2 md:col-span-3">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Layers className="w-3 h-3" /> Sources
                                                </label>
                                                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto pr-2 custom-scrollbar">
                                                    {availableSources.map(src => (
                                                        <button
                                                            key={src.name}
                                                            onClick={() => toggleSource(src.name)}
                                                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selectedSources.includes(src.name)
                                                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            {src.name}
                                                        </button>
                                                    ))}
                                                    {availableSources.length === 0 && (
                                                        <span className="text-xs text-gray-400 italic">Loading sources...</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                                    <p>Searching universe...</p>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {results.map(article => (
                                        <NewsCard key={article.id} article={article} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
                                    <Search className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-lg font-medium text-gray-500">No results found</p>
                                    <p className="text-sm">Try adjusting your filters or keyword.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Status */}
                        <div className="bg-white border-t border-gray-100 px-6 py-3 text-xs text-gray-400 flex justify-between items-center">
                            <span>Found {results.length} results</span>
                            <span className={`font-semibold ${searchMode === 'cloud' ? 'text-blue-600' : 'text-gray-600'}`}>
                                {searchMode.toUpperCase()} SEARCH ACTIVE
                            </span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
