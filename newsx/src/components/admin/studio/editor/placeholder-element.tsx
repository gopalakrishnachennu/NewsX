"use client";

import { Image, Type, Fingerprint, Plus } from "lucide-react";

interface PlaceholderElementProps {
    type: 'text' | 'image' | 'logo' | 'all';
    width: number;
    height: number;
    label?: string;
    isActive?: boolean;
    onClick?: () => void;
}

export function PlaceholderElement({ type, width, height, label, isActive, onClick }: PlaceholderElementProps) {
    const getIcon = () => {
        switch (type) {
            case 'image': return <Image className="w-8 h-8 opacity-50" />;
            case 'text': return <Type className="w-8 h-8 opacity-50" />;
            case 'logo': return <Fingerprint className="w-8 h-8 opacity-50" />;
            default: return <Plus className="w-8 h-8 opacity-50" />;
        }
    };

    const getLabel = () => {
        if (label) return label;
        switch (type) {
            case 'image': return 'Drop Image Here';
            case 'text': return 'Text Slot';
            case 'logo': return 'Logo Placeholder';
            default: return 'Content Slot';
        }
    };

    return (
        <div
            onClick={onClick}
            className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors cursor-pointer
                ${isActive ? 'border-indigo-500 bg-transparent' : 'border-gray-300 bg-transparent hover:border-gray-400'}`}
        >
            <div className={`rounded-full ${isActive ? 'text-indigo-500' : 'text-gray-500'}`}>
                {getIcon()}
            </div>
            {/* Label removed as per user request to avoid "cream layer bottom" look */}
            {/* <span className={`text-xs font-medium uppercase tracking-wide ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                {getLabel()}
            </span> */}
        </div>
    );
}
