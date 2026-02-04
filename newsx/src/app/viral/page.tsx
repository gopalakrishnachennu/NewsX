"use client";

import { useEffect, useState } from "react";
import { NewsArticle } from "@/components/news/NewsCard";
import { Flame, TrendingUp, Sparkles, Share2 } from "lucide-react";
import { motion } from "framer-motion";

// Helper to format large numbers
const formatRun = (n: number) => {
    if (n > 1000) return (n / 1000).toFixed(1) + 'k';
    return n;
};

export default function ViralPage() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch viral articles
        // leveraging the search API for flexibility or a dedicated optimized query
        const fetchViral = async () => {
            // We can use the Advanced Search API we just built!
            // It already supports filtering. We just set minQuality=0 to catch raw viral stuff
            // and keyword match for safety or just fetch recent.

            // Ideally we want: collection("articles").where("category", "==", "viral")
            // But let's reuse api/articles/published?category=viral if we update it, 
            // OR use the Search API which is powerful.
            // Let's use Search API for now as it's cleaner.
            const res = await fetch("/api/viral?limit=50&hours=72&minSources=2");
            const data = await res.json();
            setArticles(data.articles || []);
            setLoading(false);
        };

        fetchViral();
    }, []);

    const handleShare = async (article: any) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: article.title,
                    text: article.summary,
                    url: article.url,
                });
            } catch (err) {
                console.error("Share failed", err);
            }
        } else {
            // Fallback: Copy to clipboard
            await navigator.clipboard.writeText(article.url);
            alert("Link copied to clipboard! 📋");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-rose-500 selection:text-white">
            {/* High Energy Header */}
            <header className="fixed top-0 inset-x-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-tr from-rose-500 to-orange-500 p-2 rounded-lg">
                            <Flame className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Viral<span className="text-rose-500">India</span></span>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-12 px-2 sm:px-4 max-w-7xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                        What's Trending Now
                    </h1>
                    <p className="text-gray-400">The pulse of Indian social media. Real-time updates.</p>
                </div>

                {loading ? (
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-gray-900 rounded-2xl h-64 animate-pulse break-inside-avoid" />
                        ))}
                    </div>
                ) : (
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                        {articles.map((article, i) => (
                            <motion.div
                                key={article.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="break-inside-avoid group relative bg-gray-900 rounded-2xl overflow-hidden hover:ring-2 hover:ring-rose-500 transition-all duration-300"
                            >
                                {/* Image */}
                                <div className="relative aspect-[3/4]">
                                    {article.image ? (
                                        <img
                                            src={article.image}
                                            alt={article.title}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                            <TrendingUp className="w-10 h-10 text-gray-700" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                    {/* Viral Badge */}
                                    <div className="absolute top-3 right-3 bg-rose-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        VIRAL
                                    </div>
                                </div>

                                {/* Content Overlay */}
                                <div className="absolute bottom-0 inset-x-0 p-4">
                                    <div className="flex items-center gap-2 mb-2 text-rose-400 text-xs font-medium">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>Trending</span>
                                    </div>
                                    <h3 className="text-white font-bold leading-tight mb-2 line-clamp-3">
                                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-rose-500">
                                            {article.title}
                                        </a>
                                    </h3>
                                    <div className="flex items-center justify-between text-gray-400 text-xs">
                                        <span>{article.sourceId}</span>
                                        <button
                                            onClick={() => handleShare(article)}
                                            className="hover:text-white transition-colors p-1"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
