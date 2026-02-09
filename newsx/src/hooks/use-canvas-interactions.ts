/**
 * useCanvasInteractions Hook
 * Handles all canvas mouse/keyboard interactions:
 * - Mouse wheel zoom (Ctrl+Wheel)
 * - Spacebar pan
 * - Grid toggle (G key)
 * - Rotation with drag
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { ultraLogger } from '@/lib/ultra-logger';

export interface CanvasInteractionOptions {
    // Element refs
    canvasRef: React.RefObject<HTMLDivElement | null>;

    // Current state
    zoom: number;
    panX: number;
    panY: number;
    isSpacePressed: boolean;

    // Callbacks
    onZoomChange: (zoom: number) => void;
    onPanChange: (x: number, y: number) => void;
    onSpacePressedChange: (pressed: boolean) => void;
    onGridToggle?: () => void;

    // Feature flags
    wheelZoomEnabled?: boolean;
    spacebarPanEnabled?: boolean;
    gridShortcutEnabled?: boolean;
}

export interface CanvasInteractionState {
    isPanning: boolean;
    cursorStyle: string;
}

export function useCanvasInteractions(options: CanvasInteractionOptions): CanvasInteractionState {
    const {
        canvasRef,
        zoom,
        panX,
        panY,
        isSpacePressed,
        onZoomChange,
        onPanChange,
        onSpacePressedChange,
        onGridToggle,
        wheelZoomEnabled = true,
        spacebarPanEnabled = true,
        gridShortcutEnabled = true,
    } = options;

    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    // Calculate cursor style
    const cursorStyle = isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default';

    // Handle wheel zoom (Ctrl+Wheel or Cmd+Wheel)
    const handleWheel = useCallback((e: WheelEvent) => {
        if (!wheelZoomEnabled) return;

        // Zoom with Ctrl/Cmd + Wheel
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();

            const delta = -e.deltaY * 0.001;
            const newZoom = Math.max(0.1, Math.min(5, zoom + delta));

            onZoomChange(newZoom);

            ultraLogger.info('canvas-zoom',
                `User zoomed canvas using ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+Wheel gesture. ` +
                `Previous zoom: ${(zoom * 100).toFixed(0)}%, New zoom: ${(newZoom * 100).toFixed(0)}%. ` +
                `Zoom delta: ${delta > 0 ? 'in' : 'out'} (${Math.abs(delta * 100).toFixed(1)}%). ` +
                `User is ${newZoom > zoom ? 'zooming in to see more detail' : 'zooming out for overview'}. ` +
                `Canvas is now ${newZoom > 1.5 ? 'very zoomed in' : newZoom < 0.5 ? 'very zoomed out' : 'at normal zoom'}.`,
                {
                    previousZoom: zoom,
                    newZoom,
                    delta,
                    direction: delta > 0 ? 'in' : 'out',
                    zoomPercent: (newZoom * 100).toFixed(0) + '%'
                }
            );
        }
        // Pan with just wheel (when space not pressed)
        else if (!isSpacePressed) {
            // Optional: Scroll to pan
            // onPanChange(panX - e.deltaX, panY - e.deltaY);
        }
    }, [wheelZoomEnabled, zoom, isSpacePressed, onZoomChange]);

    // Handle keyboard for spacebar pan and grid toggle
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if in input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        // Spacebar - enable pan mode
        if (e.code === 'Space' && spacebarPanEnabled && !isSpacePressed) {
            e.preventDefault();
            onSpacePressedChange(true);
            ultraLogger.info('canvas-pan',
                'User pressed Spacebar to enable pan mode. ' +
                'User can now click and drag to move around the canvas. ' +
                'Current canvas position: (' + panX + ', ' + panY + ') at ' + (zoom * 100).toFixed(0) + '% zoom. ' +
                'Pan mode will stay enabled until Spacebar is released. ' +
                'This is typically used when user wants to reposition view without affecting elements.',
                { panX, panY, zoom, mode: 'pan-enabled' }
            );
        }

        // G key - toggle grid
        if (e.key === 'g' && gridShortcutEnabled && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onGridToggle?.();
            ultraLogger.info('canvas-grid',
                'User pressed "G" key to toggle canvas grid. ' +
                'Grid helps with precise element alignment and positioning. ' +
                'User pressed G key instead of using UI button - indicates keyboard power user. ' +
                'Grid state will toggle (if visible, will hide; if hidden, will show).',
                { shortcut: 'G', action: 'grid-toggle', method: 'keyboard' }
            );
        }
    }, [spacebarPanEnabled, isSpacePressed, gridShortcutEnabled, onSpacePressedChange, onGridToggle]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        // Spacebar released - disable pan mode
        if (e.code === 'Space' && spacebarPanEnabled) {
            onSpacePressedChange(false);
            setIsPanning(false);
            ultraLogger.info('canvas-pan',
                'User released Spacebar - pan mode disabled. ' +
                'User can no longer drag to pan (back to normal interaction mode). ' +
                'Final canvas position: (' + panX + ', ' + panY + ') at ' + (zoom * 100).toFixed(0) + '% zoom.',
                { panX, panY, zoom, mode: 'pan-disabled' }
            );
        }
    }, [spacebarPanEnabled, onSpacePressedChange]);

    // Handle mouse for panning when spacebar is pressed
    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (isSpacePressed && spacebarPanEnabled) {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                panX,
                panY,
            };
            ultraLogger.info('canvas-pan',
                'User started panning canvas by clicking and dragging while holding Spacebar. ' +
                'Starting position: mouse at (' + e.clientX + ', ' + e.clientY + '), canvas at (' + panX + ', ' + panY + '). ' +
                'User will drag to reposition the canvas view. ' +
                'Pan will continue until mouse button is released.',
                {
                    mouseStart: { x: e.clientX, y: e.clientY },
                    canvasStart: { x: panX, y: panY },
                    action: 'pan-start'
                }
            );
        }
    }, [isSpacePressed, spacebarPanEnabled, panX, panY]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isPanning && isSpacePressed) {
            const deltaX = e.clientX - panStartRef.current.x;
            const deltaY = e.clientY - panStartRef.current.y;

            onPanChange(
                panStartRef.current.panX + deltaX,
                panStartRef.current.panY + deltaY
            );
        }
    }, [isPanning, isSpacePressed, onPanChange]);

    const handleMouseUp = useCallback(() => {
        if (isPanning) {
            setIsPanning(false);
            const deltaX = panX - panStartRef.current.panX;
            const deltaY = panY - panStartRef.current.panY;
            ultraLogger.info('canvas-pan',
                'User finished panning canvas (released mouse button). ' +
                'Pan delta: (' + deltaX.toFixed(0) + 'px, ' + deltaY.toFixed(0) + 'px). ' +
                'Final canvas position: (' + panX + ', ' + panY + ') at ' + (zoom * 100).toFixed(0) + '% zoom. ' +
                'User panned ' + (Math.abs(deltaX) > Math.abs(deltaY) ? 'mostly horizontally' : 'mostly vertically') + '.',
                {
                    delta: { x: deltaX, y: deltaY },
                    finalPosition: { x: panX, y: panY },
                    zoom,
                    action: 'pan-end'
                }
            );
        }
    }, [isPanning]);

    // Attach event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Wheel events with passive: false to allow preventDefault
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        // Mouse events for panning
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // Keyboard events
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        logger.debug('editor', 'Canvas interactions attached');

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [canvasRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp]);

    return {
        isPanning,
        cursorStyle,
    };
}

/**
 * Pinch zoom support for trackpad
 */
export function usePinchZoom(
    ref: React.RefObject<HTMLDivElement | null>,
    zoom: number,
    onZoomChange: (zoom: number) => void,
    enabled = true
) {
    useEffect(() => {
        if (!enabled) return;

        const element = ref.current;
        if (!element) return;

        let lastDistance = 0;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastDistance = Math.sqrt(dx * dx + dy * dy);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();

                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (lastDistance > 0) {
                    const scale = distance / lastDistance;
                    const newZoom = Math.max(0.1, Math.min(5, zoom * scale));
                    onZoomChange(newZoom);
                }

                lastDistance = distance;
            }
        };

        const handleTouchEnd = () => {
            lastDistance = 0;
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: false });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [ref, zoom, onZoomChange, enabled]);
}
