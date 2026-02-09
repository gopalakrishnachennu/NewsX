/**
 * Enhanced Snapping Utility
 * Uses Canvas Intelligence Engine snap-engine
 */

export interface SnapResult {
    x: number;
    y: number;
    guides: {
        vertical?: number;
        horizontal?: number;
    };
}

interface SnapTarget {
    type: 'vertical' | 'horizontal';
    position: number;
    source: 'canvas-center' | 'canvas-edge' | 'element-edge' | 'element-center';
    strength: number;
}

export interface Element {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Advanced snapping calculation with element-to-element support
 */
export function calculateSnapping(
    x: number,
    y: number,
    width: number,
    height: number,
    canvasWidth: number,
    canvasHeight: number,
    threshold: number = 10,
    otherElements: Element[] = [] // NEW: Support element-to-element snapping
): SnapResult {
    const result: SnapResult = { x, y, guides: {} };

    // Center points
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const rightEdge = x + width;
    const bottomEdge = y + height;

    // Canvas Center
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    // Collect all snap targets
    const verticalTargets: SnapTarget[] = [
        // Canvas center (highest priority)
        { type: 'vertical', position: canvasCenterX, source: 'canvas-center', strength: 100 },
        // Canvas edges
        { type: 'vertical', position: 0, source: 'canvas-edge', strength: 50 },
        { type: 'vertical', position: canvasWidth, source: 'canvas-edge', strength: 50 },
    ];

    const horizontalTargets: SnapTarget[] = [
        // Canvas center (highest priority)
        { type: 'horizontal', position: canvasCenterY, source: 'canvas-center', strength: 100 },
        // Canvas edges
        { type: 'horizontal', position: 0, source: 'canvas-edge', strength: 50 },
        { type: 'horizontal', position: canvasHeight, source: 'canvas-edge', strength: 50 },
    ];

    // Add element-to-element snap targets
    otherElements.forEach(el => {
        const elCenterX = el.x + el.width / 2;
        const elCenterY = el.y + el.height / 2;

        // Vertical targets (X-axis alignment)
        verticalTargets.push(
            { type: 'vertical', position: elCenterX, source: 'element-center', strength: 90 },
            { type: 'vertical', position: el.x, source: 'element-edge', strength: 80 },
            { type: 'vertical', position: el.x + el.width, source: 'element-edge', strength: 80 }
        );

        // Horizontal targets (Y-axis alignment)
        horizontalTargets.push(
            { type: 'horizontal', position: elCenterY, source: 'element-center', strength: 90 },
            { type: 'horizontal', position: el.y, source: 'element-edge', strength: 80 },
            { type: 'horizontal', position: el.y + el.height, source: 'element-edge', strength: 80 }
        );
    });

    // Find best vertical snap
    let bestVerticalSnap: { offset: number; position: number; strength: number } | null = null as { offset: number; position: number; strength: number } | null;

    // Check center alignment
    verticalTargets.forEach(target => {
        const deltaCenterToTarget = Math.abs(centerX - target.position);
        if (deltaCenterToTarget < threshold) {
            const score = deltaCenterToTarget - target.strength * 0.1;
            if (!bestVerticalSnap || score < bestVerticalSnap.offset) {
                bestVerticalSnap = {
                    offset: deltaCenterToTarget,
                    position: target.position - width / 2, // Adjust x for center alignment
                    strength: target.strength
                };
                result.guides.vertical = target.position;
            }
        }

        // Also check left edge alignment
        const deltaLeftToTarget = Math.abs(x - target.position);
        if (deltaLeftToTarget < threshold && target.source === 'element-edge') {
            const score = deltaLeftToTarget - target.strength * 0.1;
            if (!bestVerticalSnap || score < bestVerticalSnap.offset) {
                bestVerticalSnap = {
                    offset: deltaLeftToTarget,
                    position: target.position,
                    strength: target.strength
                };
                result.guides.vertical = target.position;
            }
        }

        // Check right edge alignment  
        const deltaRightToTarget = Math.abs(rightEdge - target.position);
        if (deltaRightToTarget < threshold && target.source === 'element-edge') {
            const score = deltaRightToTarget - target.strength * 0.1;
            if (!bestVerticalSnap || score < bestVerticalSnap.offset) {
                bestVerticalSnap = {
                    offset: deltaRightToTarget,
                    position: target.position - width,
                    strength: target.strength
                };
                result.guides.vertical = target.position;
            }
        }
    });

    if (bestVerticalSnap) {
        result.x = bestVerticalSnap.position;
    }

    // Find best horizontal snap
    let bestHorizontalSnap: { offset: number; position: number; strength: number } | null = null as { offset: number; position: number; strength: number } | null;

    horizontalTargets.forEach(target => {
        const deltaCenterToTarget = Math.abs(centerY - target.position);
        if (deltaCenterToTarget < threshold) {
            const score = deltaCenterToTarget - target.strength * 0.1;
            if (!bestHorizontalSnap || score < bestHorizontalSnap.offset) {
                bestHorizontalSnap = {
                    offset: deltaCenterToTarget,
                    position: target.position - height / 2,
                    strength: target.strength
                };
                result.guides.horizontal = target.position;
            }
        }

        // Top edge
        const deltaTopToTarget = Math.abs(y - target.position);
        if (deltaTopToTarget < threshold && target.source === 'element-edge') {
            const score = deltaTopToTarget - target.strength * 0.1;
            if (!bestHorizontalSnap || score < bestHorizontalSnap.offset) {
                bestHorizontalSnap = {
                    offset: deltaTopToTarget,
                    position: target.position,
                    strength: target.strength
                };
                result.guides.horizontal = target.position;
            }
        }

        // Bottom edge
        const deltaBottomToTarget = Math.abs(bottomEdge - target.position);
        if (deltaBottomToTarget < threshold && target.source === 'element-edge') {
            const score = deltaBottomToTarget - target.strength * 0.1;
            if (!bestHorizontalSnap || score < bestHorizontalSnap.offset) {
                bestHorizontalSnap = {
                    offset: deltaBottomToTarget,
                    position: target.position - height,
                    strength: target.strength
                };
                result.guides.horizontal = target.position;
            }
        }
    });

    if (bestHorizontalSnap) {
        result.y = bestHorizontalSnap.position;
    }

    return result;
}

/**
 * Simple snapping (backwards compatible - no element targets)
 */
export function calculateSimpleSnapping(
    x: number,
    y: number,
    width: number,
    height: number,
    canvasWidth: number,
    canvasHeight: number,
    threshold: number = 10
): SnapResult {
    return calculateSnapping(x, y, width, height, canvasWidth, canvasHeight, threshold, []);
}
