"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Save, Loader2, FileImage, Tag, Folder } from "lucide-react";

interface SaveTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (templateData: TemplateFormData) => Promise<void>;
    thumbnailUrl?: string;
}

export interface TemplateFormData {
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPro: boolean;
}

const CATEGORIES = [
    { id: 'quote', name: 'Quote Posts', icon: '💬' },
    { id: 'news', name: 'News & Headlines', icon: '📰' },
    { id: 'story', name: 'Story Format', icon: '📖' },
    { id: 'announcement', name: 'Announcements', icon: '📢' },
    { id: 'interview', name: 'Interviews', icon: '🎙️' },
    { id: 'promo', name: 'Promotions & Sales', icon: '🏷️' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'business', name: 'Business', icon: '💼' },
];

const SUGGESTED_TAGS = [
    'minimalist', 'bold', 'corporate', 'creative', 'vibrant',
    'dark', 'light', 'tech', 'food', 'lifestyle', 'sports',
    'finance', 'education', 'health', 'travel'
];

export function SaveTemplateModal({ isOpen, onClose, onSave, thumbnailUrl }: SaveTemplateModalProps) {
    const [formData, setFormData] = useState<TemplateFormData>({
        name: '',
        description: '',
        category: 'quote',
        tags: [],
        isPro: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const handleSave = async () => {
        if (!formData.name.trim()) return;

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
            // Reset form
            setFormData({
                name: '',
                description: '',
                category: 'quote',
                tags: [],
                isPro: false,
            });
        } catch (error) {
            console.error("Failed to save template", error);
        } finally {
            setIsSaving(false);
        }
    };

    const addTag = (tag: string) => {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag && !formData.tags.includes(normalizedTag)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, normalizedTag]
            }));
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tag)
        }));
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="relative h-32 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-end overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />

                        <div className="relative z-10 w-full p-6">
                            <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium mb-1">
                                <Sparkles className="w-4 h-4" />
                                CREATE TEMPLATE
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                Save as Template
                            </h2>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                        {/* Thumbnail Preview */}
                        <div className="flex gap-6">
                            <div className="w-32 h-40 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border-2 border-dashed border-gray-200">
                                {thumbnailUrl ? (
                                    <img
                                        src={thumbnailUrl}
                                        alt="Template preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <FileImage className="w-8 h-8 mb-2" />
                                        <span className="text-xs">Preview</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-4">
                                {/* Template Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Template Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Bold Quote Card"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Brief description of this template..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Folder className="w-4 h-4 inline mr-1" />
                                Category
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${formData.category === cat.id
                                                ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                                                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        <span>{cat.icon}</span>
                                        <span className="truncate">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Tag className="w-4 h-4 inline mr-1" />
                                Tags
                            </label>

                            {/* Current tags */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="hover:text-indigo-900"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Tag input */}
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                placeholder="Type a tag and press Enter..."
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm"
                            />

                            {/* Suggested tags */}
                            <div className="flex flex-wrap gap-1 mt-2">
                                {SUGGESTED_TAGS.filter(t => !formData.tags.includes(t)).slice(0, 8).map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => addTag(tag)}
                                        className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs hover:bg-gray-200 transition"
                                    >
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pro Toggle */}
                        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <div>
                                <h4 className="font-medium text-amber-800">Premium Template</h4>
                                <p className="text-sm text-amber-600">Only available for Pro users</p>
                            </div>
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, isPro: !prev.isPro }))}
                                className={`w-12 h-6 rounded-full transition-colors ${formData.isPro ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.isPro ? 'translate-x-6' : 'translate-x-0.5'
                                    }`} />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !formData.name.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/30"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Template
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
