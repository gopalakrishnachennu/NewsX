/**
 * Edge case handlers for Canvas Intelligence Engine
 */

import { CanvasElement } from '../stores/canvas-engine';

// ============================================================================
// EDGE CASE VALIDATORS
// ============================================================================

export class EdgeCaseHandler {
    /**
     * Handle very small canvas sizes
     */
    validateCanvasSize(width: number, height: number): { width: number; height: number } {
        const MIN_WIDTH = 100;
        const MIN_HEIGHT = 100;

        return {
            width: Math.max(MIN_WIDTH, width),
            height: Math.max(MIN_HEIGHT, height)
        };
    }

    /**
     * Handle elements larger than canvas
     */
    constrainElementToCanvas(
        element: CanvasElement,
        canvasWidth: number,
        canvasHeight: number
    ): Partial<CanvasElement> {
        let { width, height, x, y } = element;

        // Scale down if larger than canvas
        if (width > canvasWidth || height > canvasHeight) {
            const scale = Math.min(
                canvasWidth / width,
                canvasHeight / height
            );
            width = width * scale * 0.9; // 90% to add padding
            height = height * scale * 0.9;
        }

        // Constrain position
        x = Math.max(0, Math.min(x, canvasWidth - width));
        y = Math.max(0, Math.min(y, canvasHeight - height));

        return { width, height, x, y };
    }

    /**
     * Handle rapid undo/redo
     */
    throttleHistoryAction(callback: () => void, delay: number = 100): () => void {
        let timeout: NodeJS.Timeout | null = null;

        return () => {
            if (timeout) return;

            callback();
            timeout = setTimeout(() => {
                timeout = null;
            }, delay);
        };
    }

    /**
     * Handle network delays for stock assets
     */
    async loadAssetWithRetry(
        url: string,
        maxRetries: number = 3
    ): Promise<string> {
        let lastError: Error | null = null;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return url;
                }
                throw new Error(`HTTP ${response.status}`);
            } catch (error) {
                lastError = error as Error;

                // Wait before retry
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }

        throw lastError || new Error('Failed to load asset');
    }

    /**
     * Handle many elements (100+)
     */
    optimizeForManyElements(elements: CanvasElement[]): {
        shouldVirtualize: boolean;
        shouldThrottle: boolean;
        recommendedBatchSize: number;
    } {
        const count = elements.length;

        return {
            shouldVirtualize: count > 100,
            shouldThrottle: count > 50,
            recommendedBatchSize: Math.min(50, Math.ceil(count / 10))
        };
    }

    /**
     * Handle browser zoom level
     */
    getBrowserZoom(): number {
        if (typeof window === 'undefined') return 1;

        return window.devicePixelRatio || 1;
    }

    /**
     * Normalize coordinates for different DPI
     */
    normalizeCoordinates(
        x: number,
        y: number,
        dpi: number = 1
    ): { x: number; y: number } {
        return {
            x: x / dpi,
            y: y / dpi
        };
    }

    /**
     * Handle extremely long text
     */
    truncateText(text: string, maxLength: number = 10000): string {
        if (text.length <= maxLength) return text;

        return text.substring(0, maxLength) + '...';
    }

    /**
     * Validate element data integrity
     */
    validateElement(element: Partial<CanvasElement>): boolean {
        return !!(
            element.id &&
            element.type &&
            typeof element.x === 'number' &&
            typeof element.y === 'number' &&
            typeof element.width === 'number' &&
            typeof element.height === 'number' &&
            element.width > 0 &&
            element.height > 0
        );
    }

    /**
     * Handle zero-duration elements
     */
    fixElementDuration(element: CanvasElement): Partial<CanvasElement> {
        const MIN_DURATION = 0.1; // 100ms minimum

        if (element.endTime - element.startTime < MIN_DURATION) {
            return {
                endTime: element.startTime + MIN_DURATION
            };
        }

        return {};
    }

    /**
     * Handle NaN or Infinity values
     */
    sanitizeNumber(value: number, fallback: number = 0): number {
        if (!isFinite(value) || isNaN(value)) {
            return fallback;
        }
        return value;
    }

    /**
     * Handle circular references in element data
     */
    sanitizeElementData(data: any): any {
        try {
            // Deep clone to detect circular refs
            return JSON.parse(JSON.stringify(data));
        } catch (error) {
            console.warn('Circular reference detected in element data', error);
            return {};
        }
    }
}

export const edgeCaseHandler = new EdgeCaseHandler();
