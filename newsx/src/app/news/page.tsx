"use client";

import { useEffect, useState, useMemo } from "react";
import { HeroCard, NewsCard, SkeletonCard, NewsArticle } from "@/components/news/NewsCard";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { RefreshCw, Newspaper, TrendingUp, Zap, ArrowUpDown, Clock, SortAsc, SortDesc, Star, Flame, Globe, Search } from "lucide-react";
import { sortArticles, SortOption } from "@/lib/utils/sorting";
import { useSettings } from "@/components/providers/SettingsProvider";

const CATEGORIES = [
    { id: "all", label: "For You", icon: Zap },
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "tech", label: "Tech", icon: null },
    { id: "business", label: "Business", icon: null },
    { id: "politics", label: "Politics", icon: null },
    { id: "sports", label: "Sports", icon: null },
];

const SORT_OPTIONS = [
    { id: "latest", label: "Date (Latest)", icon: Clock },
    { id: "oldest", label: "Date (Oldest)", icon: Clock },
    { id: "trending", label: "Trending", icon: Flame },
    { id: "quality", label: "Top Quality", icon: Star },
    { id: "a-z", label: "A → Z", icon: SortAsc },
    { id: "z-a", label: "Z → A", icon: SortDesc },
];

const LIMIT_OPTIONS = [30, 50, 100, 200, 500, 1000, 2000, 5000];

export default function NewsPage() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("all");
    const [sortBy, setSortBy] = useState("latest");
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const { defaultNewsLimit } = useSettings();
    const [limit, setLimit] = useState(100);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);

    const loadArticles = async (newLimit?: number) => {
        setLoading(true);
        try {
            const currentLimit = newLimit || limit;
            const response = await fetch(`/api/articles/published?limit=${currentLimit}&ts=${Date.now()}`, {
                cache: "no-store",
            });
            if (response.ok) {
                const data = await response.json();
                setArticles(data.articles || []);
                setHasMore((data.articles || []).length >= currentLimit);
            }
        } catch (error) {
            console.error("Failed to load articles", error);
        } finally {
            setLoading(false);
        }
    };

    const updateFeeds = async (force = false) => {
        if (updating) return;
        setUpdating(true);
        setUpdateStatus(force ? "Updating feeds..." : "Syncing feeds...");
        try {
            await fetch(`/api/cron/sweep-all${force ? "?force=true" : ""}`, { method: "POST" });
            await fetch(`/api/articles/process-queue?limit=${force ? 50 : 10}`, { method: "POST" });
        } catch (e) {
            console.error("Failed to update feeds", e);
        } finally {
            setUpdating(false);
            setTimeout(() => setUpdateStatus(null), 1500);
        }
    };

    const loadMore = async () => {
        setLoadingMore(true);
        const newLimit = limit + 50;
        setLimit(newLimit);
        try {
            const response = await fetch(`/api/articles/published?limit=${newLimit}&ts=${Date.now()}`, {
                cache: "no-store",
            });
            if (response.ok) {
                const data = await response.json();
                setArticles(data.articles || []);
                setHasMore((data.articles || []).length >= newLimit);
            }
        } catch (error) {
            console.error("Failed to load more", error);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        void loadArticles();
    }, []);

    useEffect(() => {
        if (!defaultNewsLimit) return;
        setLimit(defaultNewsLimit);
        void loadArticles(defaultNewsLimit);
    }, [defaultNewsLimit]);

    // Background refresh (non-blocking) every 15 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            void updateFeeds(false);
        }, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Sort articles using robust sorting utility
    const sortedArticles = useMemo(() => {
        return sortArticles(articles, sortBy as SortOption);
    }, [articles, sortBy]);

    const heroArticle = sortedArticles[0];
    const featuredArticles = sortedArticles.slice(1, 5);
    const remainingArticles = sortedArticles.slice(5);

    const currentSort = SORT_OPTIONS.find((s) => s.id === sortBy) || SORT_OPTIONS[0];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <SearchOverlay
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                localArticles={articles}
            />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                                <Newspaper className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    NewsX
                                </h1>
                                <p className="text-xs text-gray-500 -mt-0.5">Your News, Curated</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Viral Mode */}
                            <a
                                href="/viral"
                                className="flex items-center gap-2 rounded-full bg-rose-50 border border-rose-100 px-3 sm:px-4 py-2 text-sm font-bold text-rose-600 transition-all hover:bg-rose-100 hover:shadow-sm"
                            >
                                <Flame className="h-4 w-4" />
                                <span className="hidden sm:inline">Viral</span>
                            </a>

                            {/* Search Trigger */}
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-blue-300 hover:text-blue-600 hover:shadow-sm"
                            >
                                <Search className="h-4 w-4" />
                                <span className="hidden sm:inline">Search</span>
                            </button>

                            <div className="h-6 w-px bg-gray-200 mx-1"></div>

                            {/* Sort Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                    className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200"
                                >
                                    <ArrowUpDown className="h-4 w-4" />
                                    <span className="hidden md:inline">{currentSort.label}</span>
                                </button>
                                {/* ... (Sort dropdown content) */}
                                {showSortDropdown && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowSortDropdown(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 py-1">
                                            {SORT_OPTIONS.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        setSortBy(option.id);
                                                        setShowSortDropdown(false);
                                                    }}
                                                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${sortBy === option.id
                                                        ? "bg-blue-50 text-blue-700 font-medium"
                                                        : "text-gray-700 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    <option.icon className="h-4 w-4" />
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => updateFeeds(true)}
                                disabled={updating}
                                className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Zap className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
                                <span className="hidden md:inline">Update Feeds</span>
                            </button>

                            <button
                                onClick={() => loadArticles()}
                                disabled={loading}
                                className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                                <span className="hidden md:inline">Refresh</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Category Pills */}
            <nav className="sticky top-16 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${activeCategory === cat.id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                {cat.icon && <cat.icon className="h-4 w-4" />}
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {updateStatus && (
                    <div className="mb-4 rounded-lg bg-blue-50 text-blue-700 px-4 py-2 text-sm">
                        {updateStatus}
                    </div>
                )}
                {loading ? (
                    <div className="space-y-4">
                        <div className="h-64 md:h-96 animate-pulse rounded-2xl bg-gray-200" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
                            ))}
                        </div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    </div>
                ) : sortedArticles.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                            <Newspaper className="h-10 w-10 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">No articles yet</h2>
                        <p className="mt-2 text-gray-500">
                            Add some RSS feeds and process articles to see them here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Hero Section */}
                        {heroArticle && <HeroCard article={heroArticle} />}

                        {/* Featured Grid */}
                        {featuredArticles.length > 0 && (
                            <section>
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                    Top Stories
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {featuredArticles.map((article) => (
                                        <NewsCard key={article.id} article={article} featured />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Latest News Stream */}
                        {remainingArticles.length > 0 && (
                            <section>
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-amber-500" />
                                    Latest
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({sortedArticles.length} articles)
                                    </span>
                                </h2>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {remainingArticles.map((article) => (
                                        <NewsCard key={article.id} article={article} />
                                    ))}
                                </div>

                                {/* Load More Button */}
                                {hasMore && (
                                    <div className="mt-8 text-center">
                                        <button
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-xl disabled:opacity-50"
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    Load More Articles
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t bg-gray-50 py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                    <p>© 2026 NewsX. Powered by AI-curated news aggregation.</p>
                </div>
            </footer>
        </div>
    );
}
