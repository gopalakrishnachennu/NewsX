"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Share2, ExternalLink, Clock, User, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSettings } from "@/components/providers/SettingsProvider";

export default function ArticleDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resolvedImage, setResolvedImage] = useState<any>(null);
    const { timeZone, locale } = useSettings();

    useEffect(() => {
        if (!id) return;

        const fetchArticle = async () => {
            // 1. Fetch Article Data (we can use the search API or add a specific get-by-id API)
            // For now, let's use the search API with ID filter if supported, or just fetch all and find (not efficient but verifying first).
            // Actually, we should add a specific GET endpoint or use the recent/search one.
            // We'll trust the ImageResolver to verify ID or we fetch from /api/articles/published if we can.
            // Let's assume we can fetch via /api/articles/published or similar.
            // Actually, the Image Resolver API returns image data, not full article. 
            // We need a way to get the single article.
            // Let's fetch from the SQLite Search or Published API.
            // Or better, let's just use the `ImageResolver` logic which verifies ID exists.
            // Wait, we need title/content.
            // Let's implement a quick fetch logic using the Search API with ID if supported or just filter client side for now from "Recent".
            // Actually, since this is a new page, I should likely have created an API for it. 
            // For this MVP, I will assume the Search API supports ID or I'll add a helper.
            // Let's try fetching from /api/articles/search?q=ID if supported? No.
            // Let's fetch the Image Resolver first, it confirms existence.

            // Check if we have a "Get Single Article" API. We don't really.
            // I'll add a fetch here to `api/articles/search` using the ID as a keyword? Unreliable.
            // I'll use the /api/articles/published list and find it. If not found, show error.
            // This is temporary until we add `GET /api/articles/[id]`.

            try {
                // Fetch Image Resolution (Lazy Load)
                fetch(`/api/images/resolve?id=${id}`).then(res => res.json()).then(setResolvedImage).catch(console.error);

                // Fetch Article Content directly via ID API
                const res = await fetch(`/api/articles/${id}`);

                if (res.ok) {
                    const data = await res.json();
                    setArticle(data);
                } else {
                    console.error("Article fetch failed:", res.status);
                    setArticle(null);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-gray-800">Article not found</h1>
                <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    const displayedImage = resolvedImage?.url || article.image;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Hero Image */}
            <div className="relative h-[40vh] md:h-[60vh] w-full overflow-hidden bg-slate-900">
                {displayedImage ? (
                    <img
                        src={displayedImage}
                        alt={article.title}
                        className="w-full h-full object-cover opacity-90"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <ImageIcon className="w-20 h-20 text-slate-700" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-6 left-6 p-2 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors z-20"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                {/* Hero Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-4xl mx-auto z-10">
                    <div className="flex flex-wrap gap-3 mb-4">
                        <span className="px-3 py-1 rounded-full bg-blue-600/90 text-white text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-sm">
                            {article.sourceId}
                        </span>
                        {article.category && (
                            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                {article.category}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 drop-shadow-xl font-serif">
                        {article.title}
                    </h1>

                    <div className="flex items-center gap-6 text-gray-300 text-sm md:text-base">
                        {article.author && (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-white">{article.author}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>
                                {article.publishedAt ? formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }) : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 mb-8">
                    {/* Attribution Banner if resolved from Commons */}
                    {resolvedImage?.source === 'wikimedia' && (
                        <div className="mb-8 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3 text-xs text-gray-500">
                            <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium text-gray-700">Verified Image Source</p>
                                <p>
                                    This image is from <a href={resolvedImage.licenseUrl} target="_blank" className="underline hover:text-blue-600">Wikimedia Commons</a>.
                                    Attribution: {resolvedImage.attribution || "Unknown Author"}.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Summary / Content */}
                    <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed font-serif">
                        <p className="text-xl md:text-2xl leading-normal font-medium text-gray-600 mb-8">
                            {article.summary}
                        </p>

                        {/* We don't pull full content yet, so we show a "Read More" CTA */}
                        <div className="my-12 p-8 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
                            <p className="text-gray-600 mb-6 italic">
                                "This is a summarized version of the story. Read the full detailed coverage on the publisher's website."
                            </p>
                            <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-lg shadow-blue-600/20"
                            >
                                Read Full Story <ExternalLink className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Metadata */}
                <div className="text-center text-gray-400 text-sm pb-10">
                    <p>ID: {article.id} • Fetched via {article.sourceId}</p>
                </div>
            </main>
        </div>
    );
}
