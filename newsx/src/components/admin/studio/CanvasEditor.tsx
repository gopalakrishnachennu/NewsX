"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';

export interface CanvasLayer {
    id: string;
    type: 'text' | 'image' | 'rect' | 'gradient';
    name: string;
    visible: boolean;
    locked: boolean;
    object?: fabric.FabricObject;
}

export interface CanvasEditorProps {
    width?: number;
    height?: number;
    backgroundColor?: string;
    gradientColors?: [string, string];
    headline?: string;
    bodyText?: string;
    brandText?: string;
    brandColor?: string;
    textColor?: string;
    imageUrl?: string;
    watermarkText?: string;
    showWatermark?: boolean;
    onLayersChange?: (layers: CanvasLayer[]) => void;
    onSelectionChange?: (selected: fabric.FabricObject | null) => void;
    canvasRef?: React.MutableRefObject<fabric.Canvas | null>;
}

export function CanvasEditor({
    width = 1080,
    height = 1080,
    backgroundColor = '#1a1a2e',
    gradientColors = ['#000000', '#1a1a2e'],
    headline = 'Breaking News',
    bodyText = '',
    brandText = 'NEWS X',
    brandColor = '#e11d48',
    textColor = '#ffffff',
    imageUrl,
    watermarkText = 'NewsX Studio',
    showWatermark = false,
    onLayersChange,
    onSelectionChange,
    canvasRef: externalCanvasRef,
}: CanvasEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const internalCanvasRef = useRef<fabric.Canvas | null>(null);
    const [layers, setLayers] = useState<CanvasLayer[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize Fabric canvas
    useEffect(() => {
        if (!containerRef.current || isInitialized) return;

        const canvasElement = document.createElement('canvas');
        canvasElement.id = 'fabric-canvas';
        containerRef.current.appendChild(canvasElement);

        const canvas = new fabric.Canvas(canvasElement, {
            width,
            height,
            backgroundColor,
            selection: true,
            preserveObjectStacking: true,
        });

        internalCanvasRef.current = canvas;
        if (externalCanvasRef) {
            externalCanvasRef.current = canvas;
        }

        setupCanvas(canvas);
        setIsInitialized(true);

        canvas.on('selection:created', (e) => onSelectionChange?.(e.selected?.[0] || null));
        canvas.on('selection:updated', (e) => onSelectionChange?.(e.selected?.[0] || null));
        canvas.on('selection:cleared', () => onSelectionChange?.(null));

        return () => {
            canvas.dispose();
            if (containerRef.current && canvasElement) {
                containerRef.current.removeChild(canvasElement);
            }
        };
    }, []);

    const setupCanvas = useCallback(async (canvas: fabric.Canvas) => {
        const newLayers: CanvasLayer[] = [];

        // 1. Background Gradient
        const gradient = new fabric.Rect({
            width, height,
            selectable: false, evented: false,
            fill: new fabric.Gradient({
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: 0, y2: height },
                colorStops: [
                    { offset: 0, color: gradientColors[0] },
                    { offset: 1, color: gradientColors[1] },
                ],
            }),
        });
        (gradient as any).name = 'background';
        canvas.add(gradient);
        newLayers.push({ id: 'bg', type: 'gradient', name: 'Background', visible: true, locked: true, object: gradient });

        // 2. Image Layer (if provided)
        if (imageUrl) {
            try {
                const img = await fabric.FabricImage.fromURL(imageUrl, {
                    crossOrigin: 'anonymous'
                });
                // Scale to cover
                const scale = Math.max(width / img.width!, height / img.height!);
                img.set({
                    scaleX: scale,
                    scaleY: scale,
                    left: (width - img.width! * scale) / 2,
                    top: (height - img.height! * scale) / 2,
                    opacity: 0.5
                });
                (img as any).name = 'article-image';
                canvas.add(img);
                newLayers.push({ id: 'img', type: 'image', name: 'Article Image', visible: true, locked: false, object: img });
            } catch (e) {
                console.error("Failed to load image", e);
            }
        }

        // 3. Gradient Overlay
        const overlay = new fabric.Rect({
            width,
            height: height * 0.6,
            top: height * 0.4,
            selectable: false, evented: false,
            fill: new fabric.Gradient({
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: 0, y2: height * 0.6 },
                colorStops: [
                    { offset: 0, color: 'rgba(0,0,0,0)' },
                    { offset: 1, color: 'rgba(0,0,0,0.9)' },
                ],
            }),
        });
        canvas.add(overlay);

        // 4. Headline
        const headlineText = new fabric.Textbox(headline, {
            left: 50,
            top: height - 250,
            width: width - 100,
            fontSize: 64,
            fontWeight: 'bold',
            fill: textColor,
            fontFamily: 'Inter',
            lineHeight: 1.1,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 10, offsetX: 2, offsetY: 2 })
        });
        (headlineText as any).name = 'headline';
        canvas.add(headlineText);
        newLayers.push({ id: 'headline', type: 'text', name: 'Headline', visible: true, locked: false, object: headlineText });

        // 5. Brand Badge
        const brandBadge = new fabric.Textbox(brandText, {
            left: 50,
            top: 50,
            fontSize: 24,
            fontWeight: 'bold',
            fill: '#ffffff',
            backgroundColor: brandColor,
            padding: 12,
            width: 150,
            textAlign: 'center',
            rx: 5, ry: 5
        });
        canvas.add(brandBadge);

        setLayers(newLayers);
        onLayersChange?.(newLayers);
        canvas.renderAll();
    }, [width, height, gradientColors, headline, brandText, brandColor, textColor, imageUrl]);


    // Effect to update headline dynamically
    useEffect(() => {
        if (!internalCanvasRef.current || !isInitialized) return;
        const canvas = internalCanvasRef.current;
        const obj = canvas.getObjects().find((o) => (o as any).name === 'headline') as fabric.Textbox;
        if (obj && obj.text !== headline) {
            obj.set('text', headline);
            canvas.renderAll();
        }
    }, [headline, isInitialized]);

    // Effect to update background image dynamically
    useEffect(() => {
        // Complex logic to replace image - for now we just re-render setup if critical props change widely
        // In a real app we'd swap the image object specifically
    }, [imageUrl]);

    return (
        <div className="relative flex justify-center items-center bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-gray-800">
            <div ref={containerRef} />
        </div>
    );
}

export async function exportCanvas(canvas: fabric.Canvas): Promise<string> {
    return canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
    });
}
