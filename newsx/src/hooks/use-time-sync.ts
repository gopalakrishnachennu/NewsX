import { useEffect, useState, useCallback } from 'react';
import { useCanvasEngine, CanvasElement } from '@/lib/stores/canvas-engine';
import { useVideoStore } from '@/lib/stores/video-store';

/**
 * Hook to sync canvas elements with timeline playhead
 * Elements appear/disappear based on their startTime/endTime
 */
export function useTimeSync() {
    const { currentTime, isPlaying } = useVideoStore();
    const { elements, updateElement } = useCanvasEngine();
    const [visibleElementIds, setVisibleElementIds] = useState<Set<string>>(new Set());

    /**
     * Check if element should be visible at current time
     */
    const isElementVisible = useCallback((element: CanvasElement, time: number): boolean => {
        return time >= element.startTime && time <= element.endTime;
    }, []);

    /**
     * Update element visibility based on current time
     */
    useEffect(() => {
        const newVisibleIds = new Set<string>();

        elements.forEach(element => {
            const shouldBeVisible = isElementVisible(element, currentTime);

            if (shouldBeVisible) {
                newVisibleIds.add(element.id);
            }

            // Update element visibility if it changed
            if (element.visible !== shouldBeVisible) {
                updateElement(element.id, { visible: shouldBeVisible });
            }
        });

        setVisibleElementIds(newVisibleIds);
    }, [currentTime, elements, isElementVisible, updateElement]);

    /**
     * Get elements that are visible at current time
     */
    const getVisibleElements = useCallback((): CanvasElement[] => {
        return elements.filter(el => visibleElementIds.has(el.id));
    }, [elements, visibleElementIds]);

    /**
     * Get elements that should appear soon (for preloading)
     */
    const getUpcomingElements = useCallback((lookaheadSeconds: number = 2): CanvasElement[] => {
        const futureTime = currentTime + lookaheadSeconds;
        return elements.filter(el =>
            el.startTime > currentTime && el.startTime <= futureTime
        );
    }, [currentTime, elements]);

    /**
     * Check if element is currently transitioning (entering/exiting)
     */
    const isElementTransitioning = useCallback((elementId: string): boolean => {
        const element = elements.find(el => el.id === elementId);
        if (!element) return false;

        const transitionDuration = 0.3; // 300ms
        const timeSinceStart = currentTime - element.startTime;
        const timeUntilEnd = element.endTime - currentTime;

        return timeSinceStart < transitionDuration || timeUntilEnd < transitionDuration;
    }, [currentTime, elements]);

    return {
        visibleElements: getVisibleElements(),
        upcomingElements: getUpcomingElements(),
        isElementVisible,
        isElementTransitioning,
        currentTime,
        isPlaying
    };
}

/**
 * Hook to scrub through timeline and update canvas instantly
 */
export function useTimelineScrub() {
    const { setCurrentTime } = useVideoStore();
    const [isScrubbing, setIsScrubbing] = useState(false);

    const startScrub = useCallback(() => {
        setIsScrubbing(true);
    }, []);

    const updateScrub = useCallback((time: number) => {
        setCurrentTime(time);
    }, [setCurrentTime]);

    const endScrub = useCallback(() => {
        setIsScrubbing(false);
    }, []);

    return {
        isScrubbing,
        startScrub,
        updateScrub,
        endScrub
    };
}

/**
 * Hook to get element's visibility progress (0 to 1)
 * Useful for animations
 */
export function useElementProgress(elementId: string): number {
    const { currentTime } = useVideoStore();
    const { elements } = useCanvasEngine();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const element = elements.find(el => el.id === elementId);
        if (!element) {
            setProgress(0);
            return;
        }

        const duration = element.endTime - element.startTime;
        const elapsed = currentTime - element.startTime;

        if (currentTime < element.startTime) {
            setProgress(0);
        } else if (currentTime > element.endTime) {
            setProgress(1);
        } else {
            setProgress(Math.max(0, Math.min(1, elapsed / duration)));
        }
    }, [currentTime, elementId, elements]);

    return progress;
}
