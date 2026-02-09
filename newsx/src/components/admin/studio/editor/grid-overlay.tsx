/**
 * Grid Overlay Component
 * Renders a visual grid over the canvas for alignment
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GridOverlayProps {
    visible: boolean;
    gridSize: number;
    width: number;
    height: number;
    color?: string;
    opacity?: number;
}

export function GridOverlay({
    visible,
    gridSize,
    width,
    height,
    color = '#ffffff',
    opacity = 0.1,
}: GridOverlayProps) {
    if (!visible) return null;

    // Calculate number of lines
    const verticalLines = Math.ceil(width / gridSize);
    const horizontalLines = Math.ceil(height / gridSize);

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="grid-pattern"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.5"
                        strokeOpacity={opacity}
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
    );
}

/**
 * Center Lines Component
 * Shows horizontal and vertical center lines
 */
interface CenterLinesProps {
    visible: boolean;
    width: number;
    height: number;
    color?: string;
}

export function CenterLines({
    visible,
    width,
    height,
    color = '#6366f1',
}: CenterLinesProps) {
    if (!visible) return null;

    return (
        <svg
            className="absolute inset-0 pointer-events-none"
            width={width}
            height={height}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Horizontal center line */}
            <line
                x1="0"
                y1={height / 2}
                x2={width}
                y2={height / 2}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeOpacity="0.5"
            />
            {/* Vertical center line */}
            <line
                x1={width / 2}
                y1="0"
                x2={width / 2}
                y2={height}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeOpacity="0.5"
            />
        </svg>
    );
}

/**
 * Safe Area Indicator
 * Shows padding zones for social media safe areas
 */
interface SafeAreaProps {
    visible: boolean;
    width: number;
    height: number;
    padding: number; // percentage
    color?: string;
}

export function SafeAreaIndicator({
    visible,
    width,
    height,
    padding = 5,
    color = '#ef4444',
}: SafeAreaProps) {
    if (!visible) return null;

    const paddingPx = (padding / 100) * Math.min(width, height);

    return (
        <div
            className="absolute pointer-events-none border-2 border-dashed"
            style={{
                top: paddingPx,
                left: paddingPx,
                right: paddingPx,
                bottom: paddingPx,
                borderColor: color,
                opacity: 0.3,
            }}
        />
    );
}

/**
 * Selection Handles Component
 * Renders 8 resize handles + rotation handle
 */
interface SelectionHandlesProps {
    onResizeStart: (handle: string, e: React.MouseEvent) => void;
    onRotateStart?: (e: React.MouseEvent) => void;
    showRotation?: boolean;
    locked?: boolean;
}

export function SelectionHandles({
    onResizeStart,
    onRotateStart,
    showRotation = true,
    locked = false,
}: SelectionHandlesProps) {
    if (locked) return null;

    const handles = [
        { id: 'nw', position: '-top-1.5 -left-1.5', cursor: 'nw-resize' },
        { id: 'n', position: '-top-1.5 left-1/2 -translate-x-1/2', cursor: 'n-resize' },
        { id: 'ne', position: '-top-1.5 -right-1.5', cursor: 'ne-resize' },
        { id: 'w', position: 'top-1/2 -left-1.5 -translate-y-1/2', cursor: 'w-resize' },
        { id: 'e', position: 'top-1/2 -right-1.5 -translate-y-1/2', cursor: 'e-resize' },
        { id: 'sw', position: '-bottom-1.5 -left-1.5', cursor: 'sw-resize' },
        { id: 's', position: '-bottom-1.5 left-1/2 -translate-x-1/2', cursor: 's-resize' },
        { id: 'se', position: '-bottom-1.5 -right-1.5', cursor: 'se-resize' },
    ];

    return (
        <>
            {/* Selection border */}
            <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

            {/* Resize handles */}
            {handles.map((handle) => (
                <div
                    key={handle.id}
                    className={cn(
                        'absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm',
                        handle.position
                    )}
                    style={{ cursor: handle.cursor }}
                    onMouseDown={(e) => onResizeStart(handle.id, e)}
                />
            ))}

            {/* Rotation handle */}
            {showRotation && onRotateStart && (
                <>
                    {/* Line connecting to rotation handle */}
                    <div
                        className="absolute left-1/2 -top-8 w-px h-6 bg-blue-500 -translate-x-1/2"
                    />
                    {/* Rotation circle */}
                    <div
                        className="absolute left-1/2 -top-10 w-4 h-4 bg-white border-2 border-blue-500 rounded-full -translate-x-1/2 cursor-pointer hover:bg-blue-100"
                        style={{ cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236366f1\' stroke-width=\'2\'%3E%3Cpath d=\'M21 12a9 9 0 1 1-9-9\'/%3E%3Cpath d=\'m15 3 3 3-3 3\'/%3E%3C/svg%3E") 12 12, pointer' }}
                        onMouseDown={onRotateStart}
                        title="Rotate"
                    />
                </>
            )}
        </>
    );
}

/**
 * Rotation utility - calculate angle from center
 */
export function calculateRotationAngle(
    centerX: number,
    centerY: number,
    mouseX: number,
    mouseY: number
): number {
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    // Calculate angle in radians, then convert to degrees
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Adjust so 0 degrees is at the top
    angle += 90;

    // Normalize to 0-360
    if (angle < 0) angle += 360;

    return angle;
}

/**
 * Snap angle to increments
 */
export function snapAngle(angle: number, increment: number = 15): number {
    return Math.round(angle / increment) * increment;
}
