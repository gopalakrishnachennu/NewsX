"use client";

import { formatDistanceToNow, format } from "date-fns";
import { Bug, X, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useDebugMode } from "@/hooks/useDebugMode";
import { useSettings } from "@/components/providers/SettingsProvider";

export type NewsArticle = {
    id: string;
    title: string;
    url: string;
    sourceId: string;
    image?: string | null;
    summary?: string | null;
    publishedAt?: string | null;
    createdAt?: string | null;
    category?: string | null;
    readingTime?: number | null;
    keywords?: string[] | null;
    qualityScore?: number | null;
    content?: string | null;
    lifecycle?: string | null;
    // Extended Metadata
    fetchError?: string | null;
    lastFetchedAt?: string | null;
    guid?: string | null;
    lang?: string | null;
    author?: string | null;
    imageSource?: string | null;
    imageAttribution?: string | null;
    imageLicenseUrl?: string | null;
    imagePrompt?: string | null;
};

// Placeholder images based on source
const PLACEHOLDER_IMAGES: Record<string, string> = {
    default: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
    tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    business: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
    sports: "https://images.unsplash.com/photo-1461896836934-ber79gw84bf?w=800&q=80",
};

function getPlaceholderImage(sourceId: string): string {
    const lower = sourceId.toLowerCase();
    if (lower.includes("tech") || lower.includes("verge") || lower.includes("wired")) {
        return PLACEHOLDER_IMAGES.tech;
    }
    if (lower.includes("business") || lower.includes("bloomberg") || lower.includes("finance")) {
        return PLACEHOLDER_IMAGES.business;
    }
    return PLACEHOLDER_IMAGES.default;
}

// Format date with timezone support
function formatExactDate(dateStr: string | null | undefined, timeZone: string, locale: string): string {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);

        return new Intl.DateTimeFormat(locale || "en-IN", {
            timeZone: timeZone || "Asia/Kolkata",
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
        }).format(date);
    } catch {
        return "";
    }
}

function DebugModal({ article, onClose }: { article: NewsArticle; onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(article, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50">
                    <div className="flex items-center gap-2 text-amber-500">
                        <Bug className="w-5 h-5" />
                        <span className="font-mono text-sm font-bold">Debug Inspector</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Copy JSON"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-0 overflow-auto max-h-[calc(85vh-50px)]">
                    <pre className="p-4 text-xs font-mono text-emerald-400 bg-[#0d1117] overflow-x-auto">
                        {JSON.stringify(article, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
}

export function HeroCard({ article }: { article: NewsArticle }) {
    const image = article.image || getPlaceholderImage(article.sourceId);
    const { isEnabled: isDebug } = useDebugMode();
    const [showDebug, setShowDebug] = useState(false);
    const { timeZone, locale } = useSettings();

    return (
        <>
            <a
                href={`/news/${article.id}`}
                className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl transition-all duration-500 hover:shadow-blue-500/20 hover:scale-[1.01]"
            >
                <div className="relative aspect-[16/9] md:aspect-[21/9]">
                    <img
                        src={image}
                        alt={article.title}
                        className="h-full w-full object-cover opacity-60 transition-all duration-500 group-hover:opacity-40 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                    {/* Debug Button */}
                    {isDebug && (
                        <div className="absolute top-4 right-4 z-20">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowDebug(true);
                                }}
                                className="p-2 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-colors"
                                title="Inspect JSON"
                            >
                                <Bug className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 backdrop-blur-sm border border-blue-500/30">
                                {article.category || article.sourceId}
                            </span>
                            {(article.publishedAt || article.createdAt) && (
                                <span className="text-sm text-gray-400">
                                    {formatExactDate(article.publishedAt || article.createdAt, timeZone, locale)}
                                </span>
                            )}
                        </div>

                        <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3 line-clamp-3 group-hover:text-blue-200 transition-colors">
                            {article.title}
                        </h2>

                        {article.summary && (
                            <p className="text-gray-300 text-sm md:text-base line-clamp-2 max-w-3xl">
                                {article.summary}
                            </p>
                        )}

                        {article.author && (
                            <p className="mt-4 text-sm text-gray-400">
                                By <span className="text-white font-medium">{article.author}</span>
                            </p>
                        )}
                    </div>
                </div>
            </a>
            {showDebug && <DebugModal article={article} onClose={() => setShowDebug(false)} />}
        </>
    );
}

export function NewsCard({ article, featured = false }: { article: NewsArticle; featured?: boolean }) {
    const image = article.image || getPlaceholderImage(article.sourceId);
    const { isEnabled: isDebug } = useDebugMode();
    const [showDebug, setShowDebug] = useState(false);
    const { timeZone, locale } = useSettings();

    if (featured) {
        return (
            <>
                <a
                    href={`/news/${article.id}`}
                    className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200 transition-all duration-300 hover:shadow-xl hover:ring-blue-200 relative"
                >
                    <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                            src={image}
                            alt={article.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Debug Button */}
                    {isDebug && (
                        <div className="absolute top-2 right-2 z-20">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowDebug(true);
                                }}
                                className="p-1.5 rounded-full bg-amber-500 text-white shadow hover:bg-amber-600 transition-colors"
                            >
                                <Bug className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex-1 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                {article.sourceId.toUpperCase()}
                            </span>
                            {(article.publishedAt || article.createdAt) && (
                                <span className="text-xs text-gray-500">
                                    {formatExactDate(article.publishedAt || article.createdAt, timeZone, locale)}
                                </span>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 line-clamp-3 group-hover:text-blue-600 transition-colors">
                            {article.title}
                        </h3>

                        {article.author && (
                            <p className="mt-3 text-sm text-gray-500">
                                {article.author}
                            </p>
                        )}
                    </div>
                </a>
                {showDebug && <DebugModal article={article} onClose={() => setShowDebug(false)} />}
            </>
        );
    }

    return (
        <>
            <a
                href={`/news/${article.id}`}
                className="group flex gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-all duration-200 hover:shadow-md hover:ring-blue-200 hover:bg-blue-50/30 relative"
            >
                <div className="relative h-24 w-24 md:h-28 md:w-28 flex-shrink-0 overflow-hidden rounded-lg">
                    <img
                        src={image}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                </div>

                {/* Debug Button */}
                {isDebug && (
                    <div className="absolute top-2 right-2 z-20">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowDebug(true);
                            }}
                            className="p-1.5 rounded-full bg-amber-500 text-white shadow hover:bg-amber-600 transition-colors"
                        >
                            <Bug className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {article.sourceId.toUpperCase()}
                        </span>
                        {(article.publishedAt || article.createdAt) && (
                            <span className="text-xs text-gray-400">
                                {formatExactDate(article.publishedAt || article.createdAt, timeZone, locale)}
                            </span>
                        )}
                    </div>

                    <h3 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {article.title}
                    </h3>

                    {article.author && (
                        <p className="mt-2 text-xs text-gray-500">
                            {article.author}
                        </p>
                    )}
                </div>
            </a>
            {showDebug && <DebugModal article={article} onClose={() => setShowDebug(false)} />}
        </>
    );
}

export function SkeletonCard() {
    return (
        <div className="animate-pulse flex gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="h-24 w-24 md:h-28 md:w-28 flex-shrink-0 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                    <div className="h-4 w-16 rounded-full bg-gray-200" />
                    <div className="h-4 w-24 rounded-full bg-gray-200" />
                </div>
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-3/4 rounded bg-gray-200" />
            </div>
        </div>
    );
}
