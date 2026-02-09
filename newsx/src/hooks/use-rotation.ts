/**
 * useRotation Hook
 * Handles element rotation with mouse drag
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface UseRotationOptions {
    initialRotation?: number;
    snapIncrement?: number; // Degrees to snap to (e.g., 15)
    onRotationChange: (rotation: number) => void;
    onRotationEnd?: (rotation: number) => void;
}

interface UseRotationReturn {
    rotation: number;
    isRotating: boolean;
    startRotation: (e: React.MouseEvent, centerX: number, centerY: number) => void;
}

export function useRotation(options: UseRotationOptions): UseRotationReturn {
    const {
        initialRotation = 0,
        snapIncrement = 0,
        onRotationChange,
        onRotationEnd,
    } = options;

    const [rotation, setRotation] = useState(initialRotation);
    const [isRotating, setIsRotating] = useState(false);

    const rotationRef = useRef({
        centerX: 0,
        centerY: 0,
        startAngle: 0,
        startRotation: 0,
    });

    // Calculate angle from center point
    const calculateAngle = useCallback((x: number, y: number, centerX: number, centerY: number) => {
        const deltaX = x - centerX;
        const deltaY = y - centerY;
        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        angle += 90; // Adjust so 0 is at top
        if (angle < 0) angle += 360;
        return angle;
    }, []);

    const startRotation = useCallback((e: React.MouseEvent, centerX: number, centerY: number) => {
        e.preventDefault();
        e.stopPropagation();

        const startAngle = calculateAngle(e.clientX, e.clientY, centerX, centerY);

        rotationRef.current = {
            centerX,
            centerY,
            startAngle,
            startRotation: rotation,
        };

        setIsRotating(true);
        logger.debug('editor', 'Rotation started', { startAngle, centerX, centerY });
    }, [rotation, calculateAngle]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isRotating) return;

        const { centerX, centerY, startAngle, startRotation } = rotationRef.current;
        const currentAngle = calculateAngle(e.clientX, e.clientY, centerX, centerY);

        let newRotation = startRotation + (currentAngle - startAngle);

        // Normalize to 0-360
        newRotation = ((newRotation % 360) + 360) % 360;

        // Snap if shift is held or snapIncrement is set
        if (e.shiftKey || snapIncrement > 0) {
            const increment = e.shiftKey ? 15 : snapIncrement;
            newRotation = Math.round(newRotation / increment) * increment;
        }

        setRotation(newRotation);
        onRotationChange(newRotation);
    }, [isRotating, calculateAngle, snapIncrement, onRotationChange]);

    const handleMouseUp = useCallback(() => {
        if (isRotating) {
            setIsRotating(false);
            onRotationEnd?.(rotation);
            logger.debug('editor', 'Rotation ended', { rotation });
        }
    }, [isRotating, rotation, onRotationEnd]);

    // Attach global listeners when rotating
    useEffect(() => {
        if (isRotating) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isRotating, handleMouseMove, handleMouseUp]);

    // Sync with external rotation changes
    useEffect(() => {
        if (!isRotating) {
            setRotation(initialRotation);
        }
    }, [initialRotation, isRotating]);

    return {
        rotation,
        isRotating,
        startRotation,
    };
}

/**
 * Calculate element center in screen coordinates
 */
export function getElementCenter(element: HTMLElement): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
}
