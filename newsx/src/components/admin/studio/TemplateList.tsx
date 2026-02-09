"use client";

import { useState, useEffect } from 'react';
import { Trash2, FileImage, Video, PenSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Template {
    id: string;
    name: string;
    type?: 'canvas' | 'video';
    thumbnail?: string;
    createdAt: string; // Updated to match API response
    dataFields?: any[];
    canvasState?: string;
}

interface TemplateListProps {
    onSelect: (template: Template) => void;
    type?: 'canvas' | 'video';
    onToggleSelect?: (template: Template) => void;
    selectedIds?: string[];
}

export function TemplateList({ onSelect, type = 'canvas', onToggleSelect, selectedIds = [] }: TemplateListProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/admin/templates');
            const data = await res.json();
            console.log("[TemplateList] Fetched data:", data);

            if (data.error) {
                console.error("[TemplateList] API Error:", data.error);
                return;
            }

            // Filter by type client-side for now
            const filtered = data.filter((t: Template) => (t.type || 'canvas') === type);
            console.log(`[TemplateList] Filtering by type '${type}'. Total: ${data.length}, Filtered: ${filtered.length}`);
            setTemplates(filtered);
        } catch (e) {
            console.error("Failed to fetch templates", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            console.error("Failed to delete", e);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [type]);

    if (loading) return <div className="p-4 text-center text-gray-500">Loading templates...</div>;

    if (templates.length === 0) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-500">No saved templates found.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
                (() => {
                    const isSelected = selectedIds.includes(template.id);
                    return (
                <div
                    key={template.id}
                    onClick={() => {
                        if (onToggleSelect) return onToggleSelect(template);
                        return onSelect(template);
                    }}
                    className={`group relative border rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-md transition-all bg-white ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-gray-200'}`}
                >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                        {template.thumbnail ? (
                            <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-400">
                                {template.type === 'video' ? <Video size={32} /> : <FileImage size={32} />}
                            </div>
                        )}

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold transform scale-90 group-hover:scale-100 transition-transform">
                                {onToggleSelect ? (isSelected ? 'Selected' : 'Select') : 'Use Template'}
                            </span>
                        </div>
                    </div>

                    <div className="p-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-medium text-gray-900 text-sm truncate pr-2" title={template.name}>
                                    {template.name}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatDistanceToNow(new Date(template.createdAt || Date.now()), { addSuffix: true })}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <a
                                    href={`/admin/studio?templateId=${template.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-400 hover:text-indigo-500 transition-colors p-1"
                                    title="Edit Template"
                                >
                                    <PenSquare size={14} />
                                </a>
                                <button
                                    onClick={(e) => handleDelete(e, template.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Delete Template"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                    );
                })()
            ))}
        </div>
    );
}
