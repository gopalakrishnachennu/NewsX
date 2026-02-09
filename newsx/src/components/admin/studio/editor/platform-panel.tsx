import { useState } from "react";
import { Monitor, Smartphone, Layout, Check, Plus, Trash2, Smartphone as MobileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformVariant } from "@/lib/templates";

export const PLATFORM_PRESETS = [
    { id: 'instagram-post', name: 'Instagram Post', width: 1080, height: 1080, icon: Layout },
    { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920, icon: MobileIcon },
    { id: 'twitter-post', name: 'Twitter Post', width: 1600, height: 900, icon: Monitor },
    { id: 'linkedin-post', name: 'LinkedIn Post', width: 1200, height: 627, icon: Layout },
];

interface PlatformPanelProps {
    activePlatformId: string | null;
    variants: PlatformVariant[];
    onSelectPlatform: (platformId: string | null) => void;
    onCreateVariant: (presetId: string) => void;
    onDeleteVariant: (platformId: string) => void;
}

export function PlatformPanel({
    activePlatformId,
    variants,
    onSelectPlatform,
    onCreateVariant,
    onDeleteVariant
}: PlatformPanelProps) {

    return (
        <div className="p-4 space-y-6">
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Platform Variants</h3>
                <p className="text-xs text-gray-500 mb-4">
                    Create specific layouts for different social media platforms.
                </p>

                <div className="space-y-2">
                    {/* Master Layout */}
                    <button
                        onClick={() => onSelectPlatform(null)}
                        className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border transition text-sm",
                            activePlatformId === null
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4" />
                            <span>Master Layout</span>
                        </div>
                        {activePlatformId === null && <Check className="w-4 h-4" />}
                    </button>

                    {/* Existing Variants */}
                    {variants.map((variant) => {
                        const preset = PLATFORM_PRESETS.find(p => p.id === variant.id) || PLATFORM_PRESETS[0];
                        const Icon = preset.icon;

                        return (
                            <div key={variant.id} className="relative group">
                                <button
                                    onClick={() => onSelectPlatform(variant.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-3 rounded-xl border transition text-sm",
                                        activePlatformId === variant.id
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span>{variant.name}</span>
                                    </div>
                                    {activePlatformId === variant.id && <Check className="w-4 h-4" />}
                                </button>

                                {/* Delete Action */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteVariant(variant.id); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                    title="Delete Variant"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add New Variant */}
            <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Add Variant</h4>
                <div className="grid grid-cols-2 gap-2">
                    {PLATFORM_PRESETS.filter(p => !variants.find(v => v.id === p.id)).map(preset => {
                        const Icon = preset.icon;
                        return (
                            <button
                                key={preset.id}
                                onClick={() => onCreateVariant(preset.id)}
                                className="flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-indigo-200 hover:shadow-sm rounded-xl transition text-gray-600 hover:text-indigo-600"
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-xs font-medium">{preset.name}</span>
                            </button>
                        );
                    })}
                    {PLATFORM_PRESETS.every(p => variants.find(v => v.id === p.id)) && (
                        <div className="col-span-2 text-center py-4 text-xs text-gray-400">
                            All presets added
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
