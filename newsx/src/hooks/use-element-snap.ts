import { useEffect, useRef, useState } from 'react';
import { useCanvasEngine, CanvasElement } from '@/lib/stores/canvas-engine';
import { snapEngine, SnapResult } from '@/lib/canvas/snap-engine';

/**
 * Hook to enable snapping behavior during element drag
 */
export function useElementSnap(elementId: string | null) {
    const { elements, updateElement, width, height, snapEnabled, addGuide, clearTemporaryGuides } = useCanvasEngine();
    const [isSnapping, setIsSnapping] = useState(false);
    const lastSnapResult = useRef<SnapResult | null>(null);

    /**
     * Apply snapping to element position during drag
     */
    const applySnap = (element: CanvasElement, proposedX: number, proposedY: number) => {
        if (!snapEnabled) {
            return { x: proposedX, y: proposedY };
        }

        // Create a temporary element with proposed position
        const tempElement: CanvasElement = {
            ...element,
            x: proposedX,
            y: proposedY
        };

        // Get snap suggestions
        const snapResult = snapEngine.calculateSnap(
            tempElement,
            elements,
            width,
            height
        );

        // Clear previous guides
        clearTemporaryGuides();

        // Add new guides
        if (snapResult.activeGuides.length > 0) {
            setIsSnapping(true);
            lastSnapResult.current = snapResult;

            // Add visual guides
            snapResult.activeGuides.forEach(guide => {
                addGuide({
                    type: guide.type,
                    position: guide.position,
                    temporary: true,
                    color: guide.source === 'canvas-center' ? '#818CF8' : '#A78BFA'
                });
            });

            // Apply snap positions
            return {
                x: snapResult.snappedX !== null ? snapResult.snappedX : proposedX,
                y: snapResult.snappedY !== null ? snapResult.snappedY : proposedY
            };
        } else {
            setIsSnapping(false);
            lastSnapResult.current = null;
            return { x: proposedX, y: proposedY };
        }
    };

    /**
     * Clean up guides when drag ends
     */
    const endSnap = () => {
        clearTemporaryGuides();
        setIsSnapping(false);
        lastSnapResult.current = null;
    };

    return {
        applySnap,
        endSnap,
        isSnapping,
        snapOffset: lastSnapResult.current?.offset || { x: 0, y: 0 }
    };
}

/**
 * Hook for snapping during resize operations
 */
export function useResizeSnap(elementId: string | null) {
    const { elements, width, height, snapEnabled, addGuide, clearTemporaryGuides } = useCanvasEngine();

    const applyResizeSnap = (
        element: CanvasElement,
        proposedWidth: number,
        proposedHeight: number,
        edge: 'left' | 'right' | 'top' | 'bottom'
    ) => {
        if (!snapEnabled) {
            return { width: proposedWidth, height: proposedHeight };
        }

        // Create temp element with new dimensions
        const tempElement: CanvasElement = {
            ...element,
            width: proposedWidth,
            height: proposedHeight
        };

        // Calculate resize snap
        const snapResult = snapEngine.calculateResizeSnap(
            tempElement,
            elements,
            width,
            height,
            edge
        );

        // Clear and add guides
        clearTemporaryGuides();
        snapResult.activeGuides.forEach(guide => {
            addGuide({
                type: guide.type,
                position: guide.position,
                temporary: true
            });
        });

        // Apply snapped dimensions
        if (edge === 'right' && snapResult.snappedX !== null) {
            return { width: snapResult.snappedX, height: proposedHeight };
        }

        return { width: proposedWidth, height: proposedHeight };
    };

    const endResizeSnap = () => {
        clearTemporaryGuides();
    };

    return {
        applyResizeSnap,
        endResizeSnap
    };
}
