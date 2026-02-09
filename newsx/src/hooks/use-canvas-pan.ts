import { useEffect, useRef, useState } from 'react';
import { useCanvasEngine } from '@/lib/stores/canvas-engine';

/**
 * Hook for Canvas Pan functionality
 * Handles click-and-drag panning when zoomed in
 */
export function useCanvasPan() {
    const { zoom, pan, setPan } = useCanvasEngine();
    const canvasRef = useRef<HTMLElement | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Only allow panning when zoomed in
        if (zoom <= 1.0) return;

        const handleMouseDown = (e: MouseEvent) => {
            // Middle mouse button or Space + Left click
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                e.preventDefault();
                setIsPanning(true);
                setLastMousePos({ x: e.clientX, y: e.clientY });
                canvas.style.cursor = 'grabbing';
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isPanning) return;

            const deltaX = e.clientX - lastMousePos.x;
            const deltaY = e.clientY - lastMousePos.y;

            setPan(pan.x + deltaX, pan.y + deltaY);

            setLastMousePos({ x: e.clientX, y: e.clientY });
        };

        const handleMouseUp = () => {
            setIsPanning(false);
            canvas.style.cursor = zoom > 1.0 ? 'grab' : 'default';
        };

        // Set cursor based on zoom
        canvas.style.cursor = zoom > 1.0 ? 'grab' : 'default';

        // Add listeners
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [zoom, pan, setPan, isPanning, lastMousePos]);

    return {
        canvasRef: (element: HTMLElement | null) => {
            canvasRef.current = element;
        },
        isPanning,
        pan
    };
}
