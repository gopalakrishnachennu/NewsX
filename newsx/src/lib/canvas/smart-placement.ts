import { CanvasElement } from '../stores/canvas-engine';

/**
 * Smart element placement engine
 * Determines optimal position and size for new elements
 */
export class SmartPlacement {
    private canvasWidth: number;
    private canvasHeight: number;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Calculate smart default position and size for new element
     */
    place(
        type: CanvasElement['type'],
        existingElements: CanvasElement[],
        data?: any
    ): { x: number; y: number; width: number; height: number } {
        // Get default size for element type
        const size = this.getDefaultSize(type, data);

        // Get canvas center
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;

        // Position at center (adjusted for size)
        let x = centerX - size.width / 2;
        let y = centerY - size.height / 2;

        // Check if center is occupied
        if (this.isPositionOccupied(x, y, size.width, size.height, existingElements)) {
            // Find alternative position with slight offset
            const offset = this.findNearestFreePosition(
                x,
                y,
                size.width,
                size.height,
                existingElements
            );
            x = offset.x;
            y = offset.y;
        }

        return {
            x: Math.max(0, Math.min(x, this.canvasWidth - size.width)),
            y: Math.max(0, Math.min(y, this.canvasHeight - size.height)),
            ...size
        };
    }

    /**
     * Get sensible default size based on element type
     */
    private getDefaultSize(
        type: CanvasElement['type'],
        data?: any
    ): { width: number; height: number } {
        switch (type) {
            case 'text':
                // Text: 60% of canvas width, auto height
                return {
                    width: this.canvasWidth * 0.6,
                    height: 100 // Will auto-adjust to text content
                };

            case 'image':
                // Image: Use original dimensions if available, else fit to 70% of canvas
                if (data?.width && data?.height) {
                    const scale = Math.min(
                        (this.canvasWidth * 0.7) / data.width,
                        (this.canvasHeight * 0.7) / data.height,
                        1 // Don't upscale
                    );
                    return {
                        width: data.width * scale,
                        height: data.height * scale
                    };
                }
                return {
                    width: this.canvasWidth * 0.7,
                    height: this.canvasHeight * 0.7
                };

            case 'video':
                // Video: Fit to canvas (letterbox if needed)
                if (data?.width && data?.height) {
                    const aspectRatio = data.width / data.height;
                    const canvasAspect = this.canvasWidth / this.canvasHeight;

                    if (aspectRatio > canvasAspect) {
                        // Video is wider than canvas
                        return {
                            width: this.canvasWidth,
                            height: this.canvasWidth / aspectRatio
                        };
                    } else {
                        // Video is taller than canvas
                        return {
                            width: this.canvasHeight * aspectRatio,
                            height: this.canvasHeight
                        };
                    }
                }
                // Default: Fill canvas
                return {
                    width: this.canvasWidth,
                    height: this.canvasHeight
                };

            case 'shape':
                // Shape: 15% of canvas (square)
                const size = Math.min(this.canvasWidth, this.canvasHeight) * 0.15;
                return {
                    width: size,
                    height: size
                };

            case 'audio':
                // Audio: visual waveform placeholder
                return {
                    width: this.canvasWidth * 0.8,
                    height: 60
                };

            default:
                return {
                    width: this.canvasWidth * 0.5,
                    height: this.canvasHeight * 0.5
                };
        }
    }

    /**
     * Check if a position is occupied by existing elements
     */
    private isPositionOccupied(
        x: number,
        y: number,
        width: number,
        height: number,
        elements: CanvasElement[],
        threshold: number = 50 // Overlap threshold in pixels
    ): boolean {
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        for (const el of elements) {
            const elCenterX = el.x + el.width / 2;
            const elCenterY = el.y + el.height / 2;

            const distance = Math.sqrt(
                Math.pow(centerX - elCenterX, 2) + Math.pow(centerY - elCenterY, 2)
            );

            if (distance < threshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * Find nearest free position with spiral search
     */
    private findNearestFreePosition(
        startX: number,
        startY: number,
        width: number,
        height: number,
        elements: CanvasElement[]
    ): { x: number; y: number } {
        const step = 30; // Offset step
        const maxAttempts = 20;

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
                const testX = startX + offset.x;
                const testY = startY + offset.y;

                // Check if within canvas
                if (
                    testX >= 0 &&
                    testY >= 0 &&
                    testX + width <= this.canvasWidth &&
                    testY + height <= this.canvasHeight
                ) {
                    // Check if free
                    if (!this.isPositionOccupied(testX, testY, width, height, elements)) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }

        // Fallback: return original position
        return { x: startX, y: startY };
    }

    /**
     * Suggest optimal alignment for element
     */
    suggestAlignment(
        element: CanvasElement,
        otherElements: CanvasElement[]
    ): 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | null {
        // Find most common alignment among other elements
        const alignments = {
            left: 0,
            center: 0,
            right: 0,
            top: 0,
            middle: 0,
            bottom: 0
        };

        const threshold = 10;

        for (const other of otherElements) {
            // Horizontal
            if (Math.abs(element.x - other.x) < threshold) alignments.left++;
            if (Math.abs(element.x + element.width / 2 - (other.x + other.width / 2)) < threshold) alignments.center++;
            if (Math.abs(element.x + element.width - (other.x + other.width)) < threshold) alignments.right++;

            // Vertical
            if (Math.abs(element.y - other.y) < threshold) alignments.top++;
            if (Math.abs(element.y + element.height / 2 - (other.y + other.height / 2)) < threshold) alignments.middle++;
            if (Math.abs(element.y + element.height - (other.y + other.height)) < threshold) alignments.bottom++;
        }

        // Return most common alignment
        const max = Math.max(...Object.values(alignments));
        if (max === 0) return null;

        return Object.entries(alignments).find(([_, count]) => count === max)?.[0] as any;
    }
}
