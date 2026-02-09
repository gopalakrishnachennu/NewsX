import { useCallback } from 'react';
import { useCanvasEngine, CanvasElement } from '@/lib/stores/canvas-engine';
import { collisionEngine, CollisionInfo, DistributionSuggestion } from '@/lib/canvas/collision-engine';

/**
 * Hook for collision detection and auto-arrangement
 */
export function useCollisionDetection() {
    const { elements, updateElement, width, height } = useCanvasEngine();

    /**
     * Check collisions for a specific element
     */
    const checkElementCollisions = useCallback((elementId: string): CollisionInfo[] => {
        const element = elements.find(el => el.id === elementId);
        if (!element) return [];

        return collisionEngine.getCollisions(element, elements);
    }, [elements]);

    /**
     * Find free position for element
     */
    const findFreePosition = useCallback((elementId: string): { x: number; y: number } | null => {
        const element = elements.find(el => el.id === elementId);
        if (!element) return null;

        return collisionEngine.findFreePosition(element, elements, width, height);
    }, [elements, width, height]);

    /**
     * Auto-distribute all elements to avoid overlaps
     */
    const autoDistribute = useCallback((): DistributionSuggestion[] => {
        const suggestions = collisionEngine.distributeElements(elements, width, height);

        // Apply suggestions
        suggestions.forEach(suggestion => {
            updateElement(suggestion.elementId, {
                x: suggestion.suggestedX,
                y: suggestion.suggestedY
            });
        });

        return suggestions;
    }, [elements, width, height, updateElement]);

    /**
     * Arrange elements in grid layout
     */
    const arrangeInGrid = useCallback((columns: number = 3): void => {
        const suggestions = collisionEngine.suggestGridLayout(elements, width, height, columns);

        suggestions.forEach(suggestion => {
            updateElement(suggestion.elementId, {
                x: suggestion.suggestedX,
                y: suggestion.suggestedY
            });
        });
    }, [elements, width, height, updateElement]);

    /**
     * Move element to free space if overlapping
     */
    const resolveOverlap = useCallback((elementId: string): boolean => {
        const collisions = checkElementCollisions(elementId);

        if (collisions.length === 0) return false;

        const freePos = findFreePosition(elementId);
        if (freePos) {
            updateElement(elementId, freePos);
            return true;
        }

        return false;
    }, [checkElementCollisions, findFreePosition, updateElement]);

    /**
     * Check if element is near canvas edge
     */
    const checkEdgeProximity = useCallback((elementId: string) => {
        const element = elements.find(el => el.id === elementId);
        if (!element) return null;

        return collisionEngine.isNearEdge(element, width, height);
    }, [elements, width, height]);

    /**
     * Get all current collisions in canvas
     */
    const getAllCollisions = useCallback((): CollisionInfo[] => {
        const allCollisions: CollisionInfo[] = [];
        const checkedPairs = new Set<string>();

        elements.forEach(el1 => {
            if (!el1.visible) return;

            elements.forEach(el2 => {
                if (!el2.visible || el1.id === el2.id) return;

                const pairKey = [el1.id, el2.id].sort().join('-');
                if (checkedPairs.has(pairKey)) return;

                if (collisionEngine.checkCollision(el1, el2)) {
                    const overlapArea = collisionEngine.calculateOverlapArea(el1, el2);
                    allCollisions.push({
                        element1: el1,
                        element2: el2,
                        overlapArea,
                        overlapPercentage: (overlapArea / (el1.width * el1.height)) * 100
                    });
                    checkedPairs.add(pairKey);
                }
            });
        });

        return allCollisions;
    }, [elements]);

    return {
        checkElementCollisions,
        findFreePosition,
        autoDistribute,
        arrangeInGrid,
        resolveOverlap,
        checkEdgeProximity,
        getAllCollisions
    };
}
