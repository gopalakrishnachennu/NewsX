import { useEffect, useRef } from 'react';
import { useCanvasEngine } from '@/lib/stores/canvas-engine';

/**
 * Hook for Canvas Zoom functionality
 * Handles mouse wheel zoom and keyboard shortcuts
 */
export function useCanvasZoom() {
    const { zoom, setZoom } = useCanvasEngine();
    const canvasRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Mouse Wheel Zoom
        const handleWheel = (e: WheelEvent) => {
            // Only zoom if Ctrl (Windows) or Cmd (Mac) is pressed
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();

                const delta = e.deltaY * -0.001; // Invert and scale
                const newZoom = zoom + delta;

                setZoom(newZoom);
            }
        };

        // Keyboard Shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '=':
                    case '+':
                        e.preventDefault();
                        setZoom(Math.min(4.0, zoom + 0.1));
                        break;
                    case '-':
                    case '_':
                        e.preventDefault();
                        setZoom(Math.max(0.1, zoom - 0.1));
                        break;
                    case '0':
                        e.preventDefault();
                        setZoom(1.0); // Fit to screen
                        break;
                }
            }
        };

        // Pinch Zoom (Trackpad)
        let lastTouchDistance: number | null = null;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && lastTouchDistance !== null) {
                e.preventDefault();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                const delta = (currentDistance - lastTouchDistance) * 0.01;
                setZoom(zoom + delta);

                lastTouchDistance = currentDistance;
            }
        };

        const handleTouchEnd = () => {
            lastTouchDistance = null;
        };

        // Add listeners
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('keydown', handleKeyDown);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [zoom, setZoom]);

    return {
        canvasRef: (element: HTMLElement | null) => {
            canvasRef.current = element;
        },
        zoom
    };
}
