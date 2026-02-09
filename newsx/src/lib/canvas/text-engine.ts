import { CanvasElement } from '../stores/canvas-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface TextProperties {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: number | string;
    color: string;
    textAlign: 'left' | 'center' | 'right';
    lineHeight: number;
    letterSpacing: number;
    padding: number;
    maxLines?: number;
}

export interface TextMetrics {
    width: number;
    height: number;
    lineCount: number;
    isTruncated: boolean;
}

// ============================================================================
// TEXT ENGINE
// ============================================================================

export class TextEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // Constraints
    private readonly MIN_FONT_SIZE = 12;
    private readonly MAX_FONT_SIZE = 200;
    private readonly DEFAULT_PADDING = 16;
    private readonly MIN_LINE_HEIGHT = 1.2;
    private readonly MAX_LINE_HEIGHT = 2.0;

    constructor() {
        // Create offscreen canvas for text measurement
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
    }

    // ========================================================================
    // AUTO-SIZING
    // ========================================================================

    /**
     * Calculate optimal font size to fit text in container
     */
    calculateOptimalFontSize(
        text: string,
        containerWidth: number,
        containerHeight: number,
        options: Partial<TextProperties> = {}
    ): number {
        const {
            fontFamily = 'Inter, sans-serif',
            fontWeight = 600,
            padding = this.DEFAULT_PADDING,
            lineHeight = 1.4,
            maxLines
        } = options;

        const availableWidth = containerWidth - (padding * 2);
        const availableHeight = containerHeight - (padding * 2);

        // Binary search for optimal font size
        let minSize = this.MIN_FONT_SIZE;
        let maxSize = this.MAX_FONT_SIZE;
        let optimalSize = minSize;

        while (minSize <= maxSize) {
            const testSize = Math.floor((minSize + maxSize) / 2);
            const metrics = this.measureText(text, {
                ...options,
                fontSize: testSize,
                fontFamily,
                fontWeight,
                lineHeight,
                padding: 0 // Already accounted for in available space
            }, availableWidth);

            // Check if text fits
            const fitsWidth = metrics.width <= availableWidth;
            const fitsHeight = metrics.height <= availableHeight;
            const fitsLines = !maxLines || metrics.lineCount <= maxLines;

            if (fitsWidth && fitsHeight && fitsLines) {
                optimalSize = testSize;
                minSize = testSize + 1; // Try larger
            } else {
                maxSize = testSize - 1; // Try smaller
            }
        }

        return Math.max(this.MIN_FONT_SIZE, optimalSize);
    }

    // ========================================================================
    // TEXT MEASUREMENT
    // ========================================================================

    /**
     * Measure text dimensions with wrapping
     */
    measureText(
        text: string,
        properties: Partial<TextProperties>,
        maxWidth: number
    ): TextMetrics {
        const {
            fontSize = 24,
            fontFamily = 'Inter, sans-serif',
            fontWeight = 600,
            lineHeight = 1.4,
            padding = this.DEFAULT_PADDING
        } = properties;

        // Set font for measurement
        this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

        const words = text.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        // Wrap text
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = this.ctx.measureText(testLine);

            if (metrics.width > maxWidth - (padding * 2) && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        // Calculate dimensions
        const lineHeightPx = fontSize * lineHeight;
        const totalHeight = lines.length * lineHeightPx;

        let maxLineWidth = 0;
        for (const line of lines) {
            const metrics = this.ctx.measureText(line);
            maxLineWidth = Math.max(maxLineWidth, metrics.width);
        }

        return {
            width: maxLineWidth + (padding * 2),
            height: totalHeight + (padding * 2),
            lineCount: lines.length,
            isTruncated: false
        };
    }

    // ========================================================================
    // TEXT WRAPPING
    // ========================================================================

    /**
     * Wrap text to fit within width
     */
    wrapText(
        text: string,
        maxWidth: number,
        properties: Partial<TextProperties> = {}
    ): string[] {
        const {
            fontSize = 24,
            fontFamily = 'Inter, sans-serif',
            fontWeight = 600,
            padding = this.DEFAULT_PADDING
        } = properties;

        this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

        const availableWidth = maxWidth - (padding * 2);
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = this.ctx.measureText(testLine);

            if (metrics.width > availableWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    // ========================================================================
    // AUTO-SIZING CONTAINER
    // ========================================================================

    /**
     * Calculate ideal container size for text
     */
    calculateContainerSize(
        text: string,
        properties: Partial<TextProperties> = {},
        maxWidth?: number
    ): { width: number; height: number } {
        const {
            fontSize = 24,
            fontFamily = 'Inter, sans-serif',
            fontWeight = 600,
            lineHeight = 1.4,
            padding = this.DEFAULT_PADDING
        } = properties;

        const constrainedWidth = maxWidth || 800; // Default max width

        const metrics = this.measureText(text, properties, constrainedWidth);

        return {
            width: Math.min(metrics.width, constrainedWidth),
            height: metrics.height
        };
    }

    // ========================================================================
    // READABILITY CONSTRAINTS
    // ========================================================================

    /**
     * Ensure text properties meet readability standards
     */
    enforceReadability(properties: Partial<TextProperties>): TextProperties {
        const defaults: TextProperties = {
            text: '',
            fontSize: 24,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.4,
            letterSpacing: 0,
            padding: this.DEFAULT_PADDING
        };

        const merged = { ...defaults, ...properties };

        // Enforce constraints
        return {
            ...merged,
            fontSize: Math.max(this.MIN_FONT_SIZE, Math.min(this.MAX_FONT_SIZE, merged.fontSize)),
            lineHeight: Math.max(this.MIN_LINE_HEIGHT, Math.min(this.MAX_LINE_HEIGHT, merged.lineHeight)),
            padding: Math.max(8, merged.padding)
        };
    }

    /**
     * Check if text is readable on given background
     */
    isReadable(textColor: string, backgroundColor: string): boolean {
        // Calculate contrast ratio (simplified)
        const contrast = this.getContrastRatio(textColor, backgroundColor);
        return contrast >= 4.5; // WCAG AA standard
    }

    private getContrastRatio(color1: string, color2: string): number {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);

        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    private getLuminance(color: string): number {
        // Convert hex to RGB
        const rgb = this.hexToRgb(color);
        if (!rgb) return 0;

        // Apply gamma correction
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
            const normalized = val / 255;
            return normalized <= 0.03928
                ? normalized / 12.92
                : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // ========================================================================
    // SMART TEXT UPDATES
    // ========================================================================

    /**
     * Update element with smart text sizing
     */
    updateTextElement(
        element: CanvasElement,
        newText: string,
        canvasWidth: number
    ): Partial<CanvasElement> {
        const maxWidth = canvasWidth * 0.8; // Max 80% of canvas width

        // Calculate new container size
        const { width, height } = this.calculateContainerSize(
            newText,
            element.data,
            maxWidth
        );

        // Recalculate font size if needed
        const fontSize = this.calculateOptimalFontSize(
            newText,
            width,
            height,
            element.data
        );

        return {
            width,
            height,
            data: {
                ...element.data,
                text: newText,
                fontSize
            }
        };
    }
}

// Singleton instance
export const textEngine = new TextEngine();
