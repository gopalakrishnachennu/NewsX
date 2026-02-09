import { CanvasElement } from '../stores/canvas-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface SnapTarget {
    type: 'vertical' | 'horizontal';
    position: number; // x for vertical, y for horizontal
    source: 'canvas-center' | 'canvas-edge' | 'element-edge' | 'element-center';
    strength: number; // Priority (higher = more important)
    elementId?: string; // If from another element
}

export interface SnapResult {
    snappedX: number | null;
    snappedY: number | null;
    activeGuides: SnapTarget[];
    offset: { x: number; y: number }; // How much we snapped
}

// ============================================================================
// SNAP ENGINE
// ============================================================================

export class SnapEngine {
    private threshold: number;

    constructor(threshold: number = 8) {
        this.threshold = threshold;
    }

    /**
     * Calculate snap position for an element being dragged
     */
    calculateSnap(
        draggedElement: CanvasElement,
        allElements: CanvasElement[],
        canvasWidth: number,
        canvasHeight: number
    ): SnapResult {
        const targets: SnapTarget[] = [];

        // Get element bounds
        const elLeft = draggedElement.x;
        const elRight = draggedElement.x + draggedElement.width;
        const elTop = draggedElement.y;
        const elBottom = draggedElement.y + draggedElement.height;
        const elCenterX = draggedElement.x + draggedElement.width / 2;
        const elCenterY = draggedElement.y + draggedElement.height / 2;

        // ================================================================
        // CANVAS SNAP TARGETS
        // ================================================================

        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;

        // Canvas center (highest priority)
        targets.push({
            type: 'vertical',
            position: canvasCenterX,
            source: 'canvas-center',
            strength: 100
        });
        targets.push({
            type: 'horizontal',
            position: canvasCenterY,
            source: 'canvas-center',
            strength: 100
        });

        // Canvas edges (lower priority)
        targets.push(
            { type: 'vertical', position: 0, source: 'canvas-edge', strength: 50 },
            { type: 'vertical', position: canvasWidth, source: 'canvas-edge', strength: 50 },
            { type: 'horizontal', position: 0, source: 'canvas-edge', strength: 50 },
            { type: 'horizontal', position: canvasHeight, source: 'canvas-edge', strength: 50 }
        );

        // ================================================================
        // ELEMENT SNAP TARGETS
        // ================================================================

        const otherElements = allElements.filter(el => el.id !== draggedElement.id && el.visible);

        for (const other of otherElements) {
            const otherLeft = other.x;
            const otherRight = other.x + other.width;
            const otherTop = other.y;
            const otherBottom = other.y + other.height;
            const otherCenterX = other.x + other.width / 2;
            const otherCenterY = other.y + other.height / 2;

            // VERTICAL SNAP TARGETS (X-axis alignment)

            // Center to Center (high priority)
            targets.push({
                type: 'vertical',
                position: otherCenterX,
                source: 'element-center',
                strength: 90,
                elementId: other.id
            });

            // Edge to Edge
            targets.push(
                { type: 'vertical', position: otherLeft, source: 'element-edge', strength: 80, elementId: other.id },
                { type: 'vertical', position: otherRight, source: 'element-edge', strength: 80, elementId: other.id }
            );

            // HORIZONTAL SNAP TARGETS (Y-axis alignment)

            // Center to Center (high priority)
            targets.push({
                type: 'horizontal',
                position: otherCenterY,
                source: 'element-center',
                strength: 90,
                elementId: other.id
            });

            // Edge to Edge
            targets.push(
                { type: 'horizontal', position: otherTop, source: 'element-edge', strength: 80, elementId: other.id },
                { type: 'horizontal', position: otherBottom, source: 'element-edge', strength: 80, elementId: other.id }
            );
        }

        // ================================================================
        // FIND BEST SNAP MATCHES
        // ================================================================

        let snappedX: number | null = null;
        let snappedY: number | null = null;
        const activeGuides: SnapTarget[] = [];

        // Check vertical alignment (X-axis)
        const verticalTargets = targets.filter(t => t.type === 'vertical');
        const bestVertical = this.findBestSnap(
            elCenterX,
            verticalTargets.map(t => ({ position: t.position, target: t }))
        );

        if (bestVertical) {
            snappedX = bestVertical.target.position - draggedElement.width / 2;
            activeGuides.push(bestVertical.target);
        }

        // Check horizontal alignment (Y-axis)
        const horizontalTargets = targets.filter(t => t.type === 'horizontal');
        const bestHorizontal = this.findBestSnap(
            elCenterY,
            horizontalTargets.map(t => ({ position: t.position, target: t }))
        );

        if (bestHorizontal) {
            snappedY = bestHorizontal.target.position - draggedElement.height / 2;
            activeGuides.push(bestHorizontal.target);
        }

        // Also check edge snapping for both left/right and top/bottom
        const leftSnap = this.findBestSnap(
            elLeft,
            verticalTargets.map(t => ({ position: t.position, target: t }))
        );
        if (leftSnap && !snappedX) {
            snappedX = leftSnap.target.position;
            activeGuides.push(leftSnap.target);
        }

        const rightSnap = this.findBestSnap(
            elRight,
            verticalTargets.map(t => ({ position: t.position, target: t }))
        );
        if (rightSnap && !snappedX) {
            snappedX = rightSnap.target.position - draggedElement.width;
            activeGuides.push(rightSnap.target);
        }

        const topSnap = this.findBestSnap(
            elTop,
            horizontalTargets.map(t => ({ position: t.position, target: t }))
        );
        if (topSnap && !snappedY) {
            snappedY = topSnap.target.position;
            activeGuides.push(topSnap.target);
        }

        const bottomSnap = this.findBestSnap(
            elBottom,
            horizontalTargets.map(t => ({ position: t.position, target: t }))
        );
        if (bottomSnap && !snappedY) {
            snappedY = bottomSnap.target.position - draggedElement.height;
            activeGuides.push(bottomSnap.target);
        }

        return {
            snappedX,
            snappedY,
            activeGuides,
            offset: {
                x: snappedX !== null ? snappedX - draggedElement.x : 0,
                y: snappedY !== null ? snappedY - draggedElement.y : 0
            }
        };
    }

    /**
     * Find the best snap target within threshold
     */
    private findBestSnap(
        currentPosition: number,
        targets: Array<{ position: number; target: SnapTarget }>
    ): { position: number; target: SnapTarget } | null {
        let bestMatch: { position: number; target: SnapTarget } | null = null;
        let bestDistance = Infinity;

        for (const { position, target } of targets) {
            const distance = Math.abs(currentPosition - position);

            if (distance <= this.threshold) {
                // Prioritize by strength, then by distance
                const score = distance - (target.strength * 0.1);

                if (score < bestDistance) {
                    bestDistance = score;
                    bestMatch = { position, target };
                }
            }
        }

        return bestMatch;
    }

    /**
     * Get snap suggestions for resize operation
     */
    calculateResizeSnap(
        element: CanvasElement,
        allElements: CanvasElement[],
        canvasWidth: number,
        canvasHeight: number,
        resizeEdge: 'left' | 'right' | 'top' | 'bottom'
    ): SnapResult {
        // Similar to calculateSnap but only for the edge being resized
        const targets: SnapTarget[] = [];

        // Add canvas and element targets for the specific edge
        const otherElements = allElements.filter(el => el.id !== element.id && el.visible);

        for (const other of otherElements) {
            if (resizeEdge === 'left' || resizeEdge === 'right') {
                targets.push({
                    type: 'vertical',
                    position: other.x,
                    source: 'element-edge',
                    strength: 80,
                    elementId: other.id
                });
                targets.push({
                    type: 'vertical',
                    position: other.x + other.width,
                    source: 'element-edge',
                    strength: 80,
                    elementId: other.id
                });
            } else {
                targets.push({
                    type: 'horizontal',
                    position: other.y,
                    source: 'element-edge',
                    strength: 80,
                    elementId: other.id
                });
                targets.push({
                    type: 'horizontal',
                    position: other.y + other.height,
                    source: 'element-edge',
                    strength: 80,
                    elementId: other.id
                });
            }
        }

        // Calculate snap based on edge
        let snappedX: number | null = null;
        let snappedY: number | null = null;
        const activeGuides: SnapTarget[] = [];

        if (resizeEdge === 'right') {
            const edgePos = element.x + element.width;
            const verticalTargets = targets.filter(t => t.type === 'vertical');
            const snap = this.findBestSnap(
                edgePos,
                verticalTargets.map(t => ({ position: t.position, target: t }))
            );
            if (snap) {
                snappedX = snap.position - element.x;
                activeGuides.push(snap.target);
            }
        }

        // Similar for other edges...

        return {
            snappedX,
            snappedY,
            activeGuides,
            offset: { x: snappedX !== null ? snappedX - element.width : 0, y: 0 }
        };
    }
}

// Singleton instance
export const snapEngine = new SnapEngine(8);
