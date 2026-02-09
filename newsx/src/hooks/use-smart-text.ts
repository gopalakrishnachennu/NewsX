import { useEffect, useCallback } from 'react';
import { useCanvasEngine, CanvasElement } from '@/lib/stores/canvas-engine';
import { textEngine, TextProperties } from '@/lib/canvas/text-engine';

/**
 * Hook for smart text element management
 */
export function useSmartText(elementId: string | null) {
    const { elements, updateElement, width: canvasWidth } = useCanvasEngine();

    /**
     * Update text content with auto-sizing
     */
    const updateText = useCallback((newText: string) => {
        if (!elementId) return;

        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'text') return;

        const updates = textEngine.updateTextElement(element, newText, canvasWidth);
        updateElement(elementId, updates);
    }, [elementId, elements, canvasWidth, updateElement]);

    /**
     * Update text properties with readability enforcement
     */
    const updateTextProperties = useCallback((properties: Partial<TextProperties>) => {
        if (!elementId) return;

        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'text') return;

        // Enforce readability
        const safeProperties = textEngine.enforceReadability({
            ...element.data,
            ...properties
        });

        updateElement(elementId, {
            data: safeProperties
        });
    }, [elementId, elements, updateElement]);

    /**
     * Auto-resize text container to fit content
     */
    const autoResize = useCallback(() => {
        if (!elementId) return;

        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'text') return;

        const { width, height } = textEngine.calculateContainerSize(
            element.data?.text || '',
            element.data,
            canvasWidth * 0.8
        );

        updateElement(elementId, { width, height });
    }, [elementId, elements, canvasWidth, updateElement]);

    /**
     * Optimize font size for current container
     */
    const optimizeFontSize = useCallback(() => {
        if (!elementId) return;

        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'text') return;

        const fontSize = textEngine.calculateOptimalFontSize(
            element.data?.text || '',
            element.width,
            element.height,
            element.data
        );

        updateElement(elementId, {
            data: {
                ...element.data,
                fontSize
            }
        });
    }, [elementId, elements, updateElement]);

    /**
     * Check if current text is readable
     */
    const checkReadability = useCallback((): boolean => {
        if (!elementId) return false;

        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'text') return false;

        // Assuming dark canvas background
        const backgroundColor = '#000000';
        const textColor = element.data?.color || '#ffffff';

        return textEngine.isReadable(textColor, backgroundColor);
    }, [elementId, elements]);

    return {
        updateText,
        updateTextProperties,
        autoResize,
        optimizeFontSize,
        checkReadability
    };
}

/**
 * Hook for text wrapping calculations
 */
export function useTextWrap(elementId: string | null): string[] {
    const { elements } = useCanvasEngine();

    const element = elements.find(el => el.id === elementId);
    if (!element || element.type !== 'text') return [];

    const lines = textEngine.wrapText(
        element.data?.text || '',
        element.width,
        element.data
    );

    return lines;
}
