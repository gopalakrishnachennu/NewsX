"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Layout,
    Type,
    Image as ImageIcon,
    Sparkles,
    Check,
    ChevronRight,
    Wand2,
    AlertTriangle,
    Lock,
    Unlock,
    Layers
} from 'lucide-react';
import { TemplateList } from '@/components/admin/studio/TemplateList';
import { useEditorStore } from '@/lib/stores';

// Duplicate interface to avoid import issues
interface Template {
    id: string;
    name: string;
    type?: 'canvas' | 'video';
    thumbnail?: string;
    createdAt: string;
    dataFields?: {
        id: string;
        type: 'text' | 'image' | 'color';
        placeholder?: string;
        required?: boolean;
    }[];
    canvasState?: string;
}

function SetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sourceId = searchParams.get('source');

    const [headline, setHeadline] = useState('');
    const [summary, setSummary] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [highlightPhrase, setHighlightPhrase] = useState('');
    const [tone, setTone] = useState<'neutral' | 'formal' | 'editorial' | 'punchy'>('neutral');
    const [avoidSensationalism, setAvoidSensationalism] = useState(true);
    const [lockHeadline, setLockHeadline] = useState(false);
    const [lockSummary, setLockSummary] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
    const [loadingArticle, setLoadingArticle] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<'square' | 'portrait' | 'landscape'>('square');
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [bulkMessage, setBulkMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [showValidationWarning, setShowValidationWarning] = useState(false);

    const { createPostFromDynamicTemplate } = useEditorStore();

    // Helper to proxy images (duplicated from StudioPage to ensure immediate availability)
    const getProxiedUrl = (url: string) => {
        if (!url) return "";
        if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) return url;
        // Check if already proxied to avoid double-proxying
        if (url.includes("/api/proxy-image?url=")) return url;
        return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    };

    useEffect(() => {
        if (sourceId) {
            setLoadingArticle(true);
            fetch(`/api/articles/${sourceId}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setHeadline(data.title || '');
                        setSummary(data.summary || ''); // Or content snippet
                        setImageUrl(data.image || '');
                    }
                })
                .catch(err => console.error("Failed to load article", err))
                .finally(() => setLoadingArticle(false));
        }
    }, [sourceId]);

    const keyPhrases = useMemo(() => {
        const stop = new Set([
            "the", "and", "for", "with", "that", "this", "from", "have", "has", "are", "was", "were", "will", "their",
            "they", "them", "into", "over", "under", "about", "after", "before", "than", "then", "but", "not", "you",
            "your", "our", "out", "off", "its", "his", "her", "she", "him", "who", "what", "when", "where", "why", "how",
            "a", "an", "of", "to", "in", "on", "at", "by", "as", "is", "it"
        ]);
        const text = `${headline} ${summary}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
        const tokens = text.split(/\s+/).filter(t => t.length > 3 && !stop.has(t));
        const counts = new Map<string, number>();

        for (let i = 0; i < tokens.length; i++) {
            const unigram = tokens[i];
            counts.set(unigram, (counts.get(unigram) || 0) + 1);
            if (i < tokens.length - 1) {
                const bigram = `${tokens[i]} ${tokens[i + 1]}`;
                counts.set(bigram, (counts.get(bigram) || 0) + 1.5);
            }
        }

        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([phrase]) => phrase)
            .filter((phrase, idx, arr) => arr.findIndex(p => p === phrase) === idx)
            .slice(0, 5);
    }, [headline, summary]);

    useEffect(() => {
        if (!highlightPhrase && keyPhrases.length > 0) {
            setHighlightPhrase(keyPhrases[0]);
        }
    }, [keyPhrases, highlightPhrase]);

    const applyTone = (text: string, isHeadline: boolean) => {
        let next = text;
        const replaceAll = (pairs: Array<[RegExp, string]>) => {
            pairs.forEach(([r, v]) => { next = next.replace(r, v); });
        };

        if (avoidSensationalism) {
            replaceAll([
                [/!+/g, ""],
                [/\bshocking\b/gi, "notable"],
                [/\bexplosive\b/gi, "significant"],
                [/\bslam(s|med)?\b/gi, "criticize"],
                [/\bfirestorm\b/gi, "debate"],
                [/\bmassive\b/gi, "large"],
                [/\bhuge\b/gi, "large"],
                [/\bbreaking\b/gi, ""],
            ]);
        }

        if (tone === 'formal') {
            replaceAll([
                [/\bcan't\b/gi, "cannot"],
                [/\bwon't\b/gi, "will not"],
                [/\bdoesn't\b/gi, "does not"],
                [/\bdon't\b/gi, "do not"],
                [/\bkids\b/gi, "children"],
                [/\bcops\b/gi, "police"],
                [/\bgovt\b/gi, "government"],
            ]);
        }

        if (tone === 'editorial') {
            if (!isHeadline && !/^Analysis:/i.test(next)) {
                next = `Analysis: ${next}`;
            }
        }

        if (tone === 'punchy') {
            next = next.replace(/\s+/g, " ").trim();
            if (!isHeadline && next.length > 160) next = next.slice(0, 157).trim() + "...";
            if (isHeadline && next.length > 70) next = next.slice(0, 67).trim() + "...";
        }

        return next.replace(/\s{2,}/g, " ").trim();
    };

    const handleApplyTone = () => {
        if (headline) setHeadline(applyTone(headline, true));
        if (summary) setSummary(applyTone(summary, false));
    };

    const mapTemplateElements = (template: Template) => {
        if (!template?.canvasState) return [];
        try {
            const parsed = typeof template.canvasState === 'string' ? JSON.parse(template.canvasState) : template.canvasState;
            const elements = parsed.elements || [];
            return elements.map((el: any) => {
                const idName = `${el.id} ${el.name}`.toLowerCase();
                if (el.type === 'text') {
                    if (el.bindConfig?.fieldId === 'headline' || idName.includes('headline') || idName.includes('title')) {
                        return { ...el, text: headline || el.text };
                    }
                    if (el.bindConfig?.fieldId === 'summary' || idName.includes('summary') || idName.includes('body') || idName.includes('desc')) {
                        return { ...el, text: summary || el.text };
                    }
                    if (idName.includes('highlight')) {
                        return { ...el, text: highlightPhrase || el.text };
                    }
                }
                if (el.type === 'image') {
                    if (el.bindConfig?.fieldId === 'main-image' || idName.includes('image') || idName.includes('photo') || idName.includes('bg')) {
                        return { ...el, imageUrl: imageUrl || el.imageUrl };
                    }
                    if (el.bindConfig?.fieldId === 'logo' || idName.includes('logo')) {
                        return { ...el, imageUrl: logoUrl || el.imageUrl };
                    }
                }
                return el;
            });
        } catch {
            return [];
        }
    };

    const primaryTemplate = selectedTemplates.length > 0
        ? selectedTemplates[selectedTemplates.length - 1]
        : selectedTemplate;

    const requiredMissing = useMemo(() => {
        if (!primaryTemplate?.dataFields) return [];
        const missing: string[] = [];
        primaryTemplate.dataFields.forEach(field => {
            if (!field.required) return;
            if (field.type === "text" && field.id === "headline" && !headline.trim()) missing.push("headline");
            if (field.type === "text" && field.id === "summary" && !summary.trim()) missing.push("summary");
            if (field.type === "image" && field.id === "main-image" && !imageUrl) missing.push("main image");
            if (field.type === "image" && field.id === "logo" && !logoUrl) missing.push("logo");
        });
        return missing;
    }, [primaryTemplate, headline, summary, imageUrl, logoUrl]);

    const handleOpenStudio = () => {
        if (requiredMissing.length > 0) {
            setShowValidationWarning(true);
            return;
        }

        const params = new URLSearchParams();
        if (sourceId) params.set('source', sourceId);

        // Pass values even if empty strings, so Studio knows user explicitly cleared them.
        // If they are undefined/null (not interacted with), we might want to skip? 
        // But state in this component is initialized to ''.
        // To support "preserve template text if untouched", we'd need to know if touched.
        // For now, let's assume if it's NOT empty, pass it. If it IS empty, pass it as empty so Studio clears it?
        // Wait, current logic in Studio is: if null/undefined, preserve. If "", replace with "".
        // The user complaint was "what i saved ... not happening".
        // This implies they SAVED text, and it disappeared. 
        // OR they SAVED text in template, and it got overwritten by "Headline".

        // If I pass "", Studio makes it "".
        // If I don't pass anything, Studio preserves template.

        // BETTER UX: Only pass if NOT empty.
        if (headline.trim()) params.set('customTitle', headline);
        if (summary.trim()) params.set('customSummary', summary);
        if (imageUrl) params.set('customImage', imageUrl);
        if (logoUrl) params.set('customLogo', logoUrl);
        if (highlightPhrase) params.set('highlightPhrase', highlightPhrase);
        params.set('tone', tone);
        params.set('avoidSensationalism', avoidSensationalism ? '1' : '0');
        if (lockHeadline) params.set('lockHeadline', '1');
        if (lockSummary) params.set('lockSummary', '1');

        if (primaryTemplate) params.set('templateId', primaryTemplate.id);
        params.set('aspectRatio', aspectRatio);
        params.set('mode', 'create'); // Explicitly set mode to create

        console.log("Opening Studio with params:", params.toString());
        router.push(`/admin/studio?${params.toString()}`);
    };

    const handleBulkGenerate = async () => {
        if (selectedTemplates.length < 2) return;
        if (requiredMissing.length > 0) {
            setShowValidationWarning(true);
            return;
        }

        try {
            setIsBulkGenerating(true);
            setBulkProgress(0);
            const variables: Record<string, string> = {
                headline,
                summary,
                "main-image": imageUrl,
                logo: logoUrl,
                highlight_phrase: highlightPhrase
            };

            const batch = selectedTemplates.slice(0, 3);
            for (let i = 0; i < batch.length; i++) {
                const template = batch[i];
                if (!template.canvasState) continue;
                setBulkMessage(`Generating ${template.name}...`);
                await createPostFromDynamicTemplate(template.name, template.canvasState, variables);
                setBulkProgress(Math.round(((i + 1) / batch.length) * 100));
            }
            setBulkMessage(`Generated ${Math.min(selectedTemplates.length, 3)} drafts successfully.`);
            setShowToast(true);
        } catch (e) {
            console.error("Bulk generate failed", e);
            alert("Bulk generate failed. Check console for details.");
        } finally {
            setIsBulkGenerating(false);
            setTimeout(() => setShowToast(false), 2500);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-lg flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-indigo-400" />
                            Editorial Wizard
                        </h1>
                        <p className="text-xs text-slate-500 hidden md:block">Prepare your content before designing</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenStudio}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-indigo-500/25"
                    >
                        Open in Studio
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Column 1: Content */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <Type className="w-4 h-4" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider">Content</h2>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Headline</label>
                                <textarea
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    rows={3}
                                    placeholder="Enter a catchy headline..."
                                />
                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                    <span>{headline.length} chars</span>
                                    <button
                                        onClick={() => setLockHeadline(v => !v)}
                                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                                    >
                                        {lockHeadline ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        {lockHeadline ? "Locked" : "Lock in Studio"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex justify-between">
                                    Summary
                                    <button className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px]">
                                        <Sparkles className="w-3 h-3" /> AI Refine
                                    </button>
                                </label>
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    rows={5}
                                    placeholder="Brief summary of the article..."
                                />
                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                    <span>{summary.length} chars</span>
                                    <button
                                        onClick={() => setLockSummary(v => !v)}
                                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                                    >
                                        {lockSummary ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        {lockSummary ? "Locked" : "Lock in Studio"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Highlight Phrase</label>
                                <input
                                    value={highlightPhrase}
                                    onChange={(e) => setHighlightPhrase(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Pick a highlight phrase..."
                                />
                                {keyPhrases.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {keyPhrases.map((phrase) => (
                                            <button
                                                key={phrase}
                                                onClick={() => setHighlightPhrase(phrase)}
                                                className={`px-2 py-1 rounded-full text-[11px] border ${highlightPhrase === phrase ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10' : 'border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                            >
                                                {phrase}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Tone</label>
                                    <select
                                        value={tone}
                                        onChange={(e) => setTone(e.target.value as any)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="neutral">Neutral</option>
                                        <option value="formal">Formal</option>
                                        <option value="editorial">Editorial</option>
                                        <option value="punchy">Punchy</option>
                                    </select>
                                    <button
                                        onClick={handleApplyTone}
                                        className="mt-2 w-full px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700"
                                    >
                                        Apply Tone Rewrite
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <input
                                        id="avoid-sensational"
                                        type="checkbox"
                                        checked={avoidSensationalism}
                                        onChange={(e) => setAvoidSensationalism(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
                                    />
                                    <label htmlFor="avoid-sensational" className="text-xs text-slate-400">
                                        Avoid sensationalism
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Visuals */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <ImageIcon className="w-4 h-4" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider">Visuals</h2>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                            <div className={`relative bg-slate-950 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center overflow-hidden group ${aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'portrait' ? 'aspect-[4/5]' : 'aspect-video'}`}>
                                {imageUrl ? (
                                    <img
                                        src={getProxiedUrl(imageUrl)}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500">No image selected</p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button className="px-4 py-2 bg-white text-slate-900 rounded-full text-xs font-bold">
                                        Change Image
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Image URL</label>
                                <input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Paste image URL..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo URL (optional)</label>
                                <input
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="Paste logo URL..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['square', 'portrait', 'landscape'] as const).map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => setAspectRatio(ratio)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === ratio
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                        >
                                            {ratio.charAt(0).toUpperCase() + ratio.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Templates */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <Layout className="w-4 h-4" />
                            <h2 className="text-sm font-semibold uppercase tracking-wider">Templates</h2>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                            <div className="mb-4">
                                <button
                                    onClick={() => {
                                        setSelectedTemplate(null);
                                        setSelectedTemplates([]);
                                    }}
                                    className={`w-full p-4 rounded-lg border-2 border-dashed transition-all flex items-center justify-center gap-2 ${selectedTemplate === null
                                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                        : 'border-slate-800 hover:border-slate-700 text-slate-500'
                                        }`}
                                >
                                    <span className="text-sm font-medium">Blank Canvas</span>
                                    {selectedTemplate === null && <Check className="w-4 h-4" />}
                                </button>
                            </div>

                            <TemplateList
                                onSelect={(t) => setSelectedTemplate(t)}
                                onToggleSelect={(t) => {
                                    setSelectedTemplates(prev => {
                                        const exists = prev.find(p => p.id === t.id);
                                        if (exists) return prev.filter(p => p.id !== t.id);
                                        if (prev.length >= 3) return prev;
                                        return [...prev, t];
                                    });
                                }}
                                selectedIds={selectedTemplates.map(t => t.id)}
                                type="canvas"
                            />

                            {/* Highlight selected state in list? 
                               TemplateList component doesn't inherently support 'selected' prop styling yet.
                               For now, we just select it. 
                           */}
                            {(primaryTemplate || selectedTemplate) && (
                                <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg flex items-center justify-between">
                                    <div className="text-xs">
                                        <p className="text-indigo-300 font-medium">
                                            Selected: {(primaryTemplate || selectedTemplate)?.name}
                                        </p>
                                        {requiredMissing.length > 0 && (
                                            <p className="text-amber-300 mt-1 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Needs: {requiredMissing.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedTemplates.length > 1 && (
                                            <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                                                <Layers className="w-3 h-3" /> {selectedTemplates.length} selected
                                            </span>
                                        )}
                                        <Check className="w-4 h-4 text-indigo-400" />
                                    </div>
                                </div>
                            )}
                            {selectedTemplates.length > 1 && (
                                <button
                                    onClick={handleBulkGenerate}
                                    disabled={isBulkGenerating}
                                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium"
                                >
                                    {isBulkGenerating ? `Generating... ${bulkProgress}%` : `Bulk Generate (${Math.min(selectedTemplates.length, 3)})`}
                                </button>
                            )}

                            {showValidationWarning && requiredMissing.length > 0 && (
                                <div className="mt-4 p-3 bg-amber-900/30 border border-amber-500/40 rounded-lg text-xs text-amber-200">
                                    This template requires: {requiredMissing.join(', ')}.
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            onClick={() => setShowValidationWarning(false)}
                                            className="px-3 py-1 rounded bg-slate-800 text-slate-200"
                                        >
                                            Fix now
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowValidationWarning(false);
                                                const params = new URLSearchParams();
                                                if (sourceId) params.set('source', sourceId);
                                                if (headline.trim()) params.set('customTitle', headline);
                                                if (summary.trim()) params.set('customSummary', summary);
                                                if (imageUrl) params.set('customImage', imageUrl);
                                                if (logoUrl) params.set('customLogo', logoUrl);
                                                if (highlightPhrase) params.set('highlightPhrase', highlightPhrase);
                                                params.set('tone', tone);
                                                params.set('avoidSensationalism', avoidSensationalism ? '1' : '0');
                                                if (lockHeadline) params.set('lockHeadline', '1');
                                                if (lockSummary) params.set('lockSummary', '1');
                                                if (primaryTemplate) params.set('templateId', primaryTemplate.id);
                                                params.set('aspectRatio', aspectRatio);
                                                params.set('mode', 'create');
                                                router.push(`/admin/studio?${params.toString()}`);
                                            }}
                                            className="px-3 py-1 rounded bg-amber-500 text-slate-900"
                                        >
                                            Open anyway
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            {primaryTemplate && (
                <div className="px-6 pb-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-slate-200">Live Template Preview</h3>
                                <span className="text-[11px] text-slate-500">Updates with current content</span>
                            </div>
                            <div className="relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden mx-auto"
                                style={{ width: aspectRatio === 'square' ? 360 : aspectRatio === 'portrait' ? 300 : 420, height: aspectRatio === 'square' ? 360 : aspectRatio === 'portrait' ? 420 : 240 }}>
                                {(() => {
                                    const rendered = mapTemplateElements(primaryTemplate);
                                    if (!rendered.length) {
                                        return primaryTemplate.thumbnail ? (
                                            <img src={primaryTemplate.thumbnail} alt="Preview" className="w-full h-full object-cover opacity-90" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No preview available</div>
                                        );
                                    }
                                    return rendered.map((el: any) => (
                                        <div
                                            key={el.id}
                                            className="absolute"
                                            style={{
                                                left: `${el.x}%`,
                                                top: `${el.y}%`,
                                                width: `${el.width}%`,
                                                height: `${el.height}%`,
                                                transform: `rotate(${el.rotation || 0}deg)`
                                            }}
                                        >
                                            {el.type === 'image' && el.imageUrl && (
                                                <img src={el.imageUrl} alt="" className="w-full h-full object-cover rounded-sm" />
                                            )}
                                            {el.type === 'text' && (
                                                <div style={{
                                                    fontSize: `${Math.max(10, (el.fontSize || 18) * 0.5)}px`,
                                                    fontWeight: el.fontWeight || 400,
                                                    color: el.color || '#fff',
                                                    textAlign: el.textAlign || 'left',
                                                    lineHeight: el.lineHeight || 1.3,
                                                    textShadow: el.textShadow?.enabled ? `${el.textShadow.offsetX || 0}px ${el.textShadow.offsetY || 0}px ${el.textShadow.blur || 8}px ${el.textShadow.color || 'rgba(0,0,0,0.5)'}` : undefined,
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {el.text}
                                                </div>
                                            )}
                                            {el.type === 'shape' && (
                                                <div className="w-full h-full" style={{ background: el.fillColor || '#334155', borderRadius: el.borderRadius || 0 }} />
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showToast && (
                <div className="fixed bottom-6 right-6 bg-slate-900 text-slate-100 border border-slate-700 rounded-lg px-4 py-3 shadow-lg text-sm">
                    {bulkMessage}
                </div>
            )}
        </div>
    );
}

export default function WizardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Wizard...</div>}>
            <SetupContent />
        </Suspense>
    );
}
