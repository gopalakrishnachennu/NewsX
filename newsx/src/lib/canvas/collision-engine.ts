import { CanvasElement } from '../stores/canvas-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface CollisionInfo {
    element1: CanvasElement;
    element2: CanvasElement;
    overlapArea: number;
    overlapPercentage: number; // 0-100
}

export interface DistributionSuggestion {
    elementId: string;
    suggestedX: number;
    suggestedY: number;
    reason: 'spacing' | 'alignment' | 'overlap';
}

// ============================================================================
// COLLISION ENGINE
// ============================================================================

export class CollisionEngine {
    /**
     * Check if two elements overlap
     */
    checkCollision(el1: CanvasElement, el2: CanvasElement): boolean {
        return (
            el1.x < el2.x + el2.width &&
            el1.x + el1.width > el2.x &&
            el1.y < el2.y + el2.height &&
            el1.y + el1.height > el2.y
        );
    }

    /**
     * Calculate overlap area between two elements
     */
    calculateOverlapArea(el1: CanvasElement, el2: CanvasElement): number {
        if (!this.checkCollision(el1, el2)) return 0;

        const xOverlap = Math.min(el1.x + el1.width, el2.x + el2.width) - Math.max(el1.x, el2.x);
        const yOverlap = Math.min(el1.y + el1.height, el2.y + el2.height) - Math.max(el1.y, el2.y);

        return xOverlap * yOverlap;
    }

    /**
     * Get all collisions for an element
     */
    getCollisions(element: CanvasElement, allElements: CanvasElement[]): CollisionInfo[] {
        const collisions: CollisionInfo[] = [];

        for (const other of allElements) {
            if (other.id === element.id || !other.visible) continue;

            if (this.checkCollision(element, other)) {
                const overlapArea = this.calculateOverlapArea(element, other);
                const element1Area = element.width * element.height;
                const overlapPercentage = (overlapArea / element1Area) * 100;

                collisions.push({
                    element1: element,
                    element2: other,
                    overlapArea,
                    overlapPercentage
                });
            }
        }

        return collisions.sort((a, b) => b.overlapArea - a.overlapArea);
    }

    /**
     * Find nearest free position for element
     */
    findFreePosition(
        element: CanvasElement,
        allElements: CanvasElement[],
        canvasWidth: number,
        canvasHeight: number
    ): { x: number; y: number } | null {
        const step = 20;
        const maxAttempts = 50;

        // Spiral search pattern
        for (let i = 1; i <= maxAttempts; i++) {
            const offsets = [
                { x: i * step, y: 0 },
                { x: -i * step, y: 0 },
                { x: 0, y: i * step },
                { x: 0, y: -i * step },
                { x: i * step, y: i * step },
                { x: -i * step, y: i * step },
                { x: i * step, y: -i * step },
                { x: -i * step, y: -i * step }
            ];

            for (const offset of offsets) {
                const testX = element.x + offset.x;
                const testY = element.y + offset.y;

                // Check bounds
                if (
                    testX >= 0 &&
                    testY >= 0 &&
                    testX + element.width <= canvasWidth &&
                    testY + element.height <= canvasHeight
                ) {
                    // Check collisions
                    const testElement = { ...element, x: testX, y: testY };
                    const hasCollision = allElements.some(
                        other => other.id !== element.id && other.visible && this.checkCollision(testElement, other)
                    );

                    if (!hasCollision) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Auto-distribute elements to avoid overlaps
     */
    distributeElements(
        elements: CanvasElement[],
        canvasWidth: number,
        canvasHeight: number,
        spacing: number = 20
    ): DistributionSuggestion[] {
        const suggestions: DistributionSuggestion[] = [];
        const visibleElements = elements.filter(el => el.visible);

        // Sort by z-index (keep front elements in place)
        const sorted = [...visibleElements].sort((a, b) => b.zIndex - a.zIndex);

        for (let i = 1; i < sorted.length; i++) {
            const element = sorted[i];
            const collisions = this.getCollisions(element, sorted.slice(0, i));

            if (collisions.length > 0) {
                const freePos = this.findFreePosition(
                    element,
                    sorted.slice(0, i),
                    canvasWidth,
                    canvasHeight
                );

                if (freePos) {
                    suggestions.push({
                        elementId: element.id,
                        suggestedX: freePos.x,
                        suggestedY: freePos.y,
                        reason: 'overlap'
                    });
                }
            }
        }

        return suggestions;
    }

    /**
     * Suggest grid layout
     */
    suggestGridLayout(
        elements: CanvasElement[],
        canvasWidth: number,
        canvasHeight: number,
        columns: number = 3
    ): DistributionSuggestion[] {
        const suggestions: DistributionSuggestion[] = [];
        const visibleElements = elements.filter(el => el.visible);

        const padding = 20;
        const rows = Math.ceil(visibleElements.length / columns);

        visibleElements.forEach((element, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);

            const cellWidth = (canvasWidth - padding * (columns + 1)) / columns;
            const cellHeight = (canvasHeight - padding * (rows + 1)) / rows;

            const x = padding + col * (cellWidth + padding) + (cellWidth - element.width) / 2;
            const y = padding + row * (cellHeight + padding) + (cellHeight - element.height) / 2;

            suggestions.push({
                elementId: element.id,
                suggestedX: x,
                suggestedY: y,
                reason: 'alignment'
            });
        });

        return suggestions;
    }

    /**
     * Check if element is too close to canvas edges
     */
    isNearEdge(
        element: CanvasElement,
        canvasWidth: number,
        canvasHeight: number,
        threshold: number = 10
    ): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
        return {
            top: element.y < threshold,
            right: element.x + element.width > canvasWidth - threshold,
            bottom: element.y + element.height > canvasHeight - threshold,
            left: element.x < threshold
        };
    }
}

// Singleton instance
export const collisionEngine = new CollisionEngine();
