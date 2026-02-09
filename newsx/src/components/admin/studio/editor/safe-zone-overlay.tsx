"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SafeZoneOverlayProps {
    platformId?: string; // e.g. 'instagram-post', 'instagram-story'
    visible: boolean;
    width: number;
    height: number;
}

export function SafeZoneOverlay({ platformId = 'instagram-post', visible, width, height }: SafeZoneOverlayProps) {
    if (!visible) return null;

    // Define safe zones as percentages (top, bottom, left, right insets)
    const zones: Record<string, { top: number, bottom: number, left: number, right: number }> = {
        'instagram-story': { top: 14, bottom: 20, left: 0, right: 0 }, // Stories have huge header/footer zones
        'instagram-reel': { top: 15, bottom: 25, left: 2, right: 15 }, // Reels have side icons
        'instagram-post': { top: 0, bottom: 0, left: 0, right: 0 },     // 1:1 usually safe, maybe 1% padding
        'tiktok': { top: 15, bottom: 20, left: 2, right: 15 },
    };

    const zone = zones[platformId] || zones['instagram-post'];

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {/* Danger Zones (Semi-transparent Red) */}

            {/* Top Header Zone */}
            {zone.top > 0 && (
                <div
                    className="absolute top-0 left-0 right-0 bg-red-500/10 border-b border-red-500/30 flex items-center justify-center text-[10px] text-red-500 font-mono uppercase tracking-widest"
                    style={{ height: `${zone.top}%` }}
                >
                    System UI
                </div>
            )}

            {/* Bottom Footer Zone */}
            {zone.bottom > 0 && (
                <div
                    className="absolute bottom-0 left-0 right-0 bg-red-500/10 border-t border-red-500/30 flex items-center justify-center text-[10px] text-red-500 font-mono uppercase tracking-widest"
                    style={{ height: `${zone.bottom}%` }}
                >
                    Keyboard / Caption
                </div>
            )}

            {/* Right Action Zone (Reels/TikTok) */}
            {zone.right > 0 && (
                <div
                    className="absolute top-0 bottom-0 right-0 bg-red-500/10 border-l border-red-500/30 flex items-center justify-center text-[10px] text-red-500 font-mono uppercase tracking-widest writing-vertical-rl"
                    style={{ width: `${zone.right}%`, top: `${zone.top}%`, bottom: `${zone.bottom}%` }}
                >
                    Actions
                </div>
            )}

            {/* Safe Area Border */}
            <div
                className="absolute border-2 border-emerald-500/30 border-dashed m-1 rounded-lg"
                style={{
                    top: `${zone.top}%`,
                    bottom: `${zone.bottom}%`,
                    left: `${zone.left}%`,
                    right: `${zone.right}%`
                }}
            >
                <div className="absolute top-2 left-2 text-[10px] text-emerald-500 font-mono bg-emerald-500/10 px-1 rounded">
                    SAFE ZONE
                </div>
            </div>
        </div>
    );
}
