/**
 * Performance optimization utilities for Canvas Intelligence Engine
 */

// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// ============================================================================
// ELEMENT VIRTUALIZATION
// ============================================================================

/**
 * Check if element is visible in viewport
 */
export function isElementInViewport(
    element: { x: number; y: number; width: number; height: number },
    viewport: { x: number; y: number; width: number; height: number },
    buffer: number = 100
): boolean {
    return (
        element.x + element.width >= viewport.x - buffer &&
        element.x <= viewport.x + viewport.width + buffer &&
        element.y + element.height >= viewport.y - buffer &&
        element.y <= viewport.y + viewport.height + buffer
    );
}

/**
 * Get elements visible in viewport (for virtualization)
 */
export function getVisibleElements<T extends { x: number; y: number; width: number; height: number }>(
    elements: T[],
    viewport: { x: number; y: number; width: number; height: number }
): T[] {
    return elements.filter(el => isElementInViewport(el, viewport));
}

// ============================================================================
// REQUEST ANIMATION FRAME BATCHING
// ============================================================================

type AnimationFrameCallback = () => void;

class RAFBatcher {
    private callbacks: Set<AnimationFrameCallback> = new Set();
    private rafId: number | null = null;

    add(callback: AnimationFrameCallback): void {
        this.callbacks.add(callback);

        if (!this.rafId) {
            this.rafId = requestAnimationFrame(() => this.flush());
        }
    }

    remove(callback: AnimationFrameCallback): void {
        this.callbacks.delete(callback);
    }

    private flush(): void {
        const callbacks = Array.from(this.callbacks);
        this.callbacks.clear();
        this.rafId = null;

        callbacks.forEach(cb => cb());
    }
}

export const rafBatcher = new RAFBatcher();

// ============================================================================
// MEMOIZATION
// ============================================================================

/**
 * Simple memoization for expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = keyGenerator
            ? keyGenerator(...args)
            : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = fn(...args);
        cache.set(key, result);

        // Limit cache size
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value as string | undefined;
            if (firstKey) cache.delete(firstKey);
        }

        return result;
    }) as T;
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();

    start(label: string): () => void {
        const startTime = performance.now();

        return () => {
            const duration = performance.now() - startTime;

            if (!this.metrics.has(label)) {
                this.metrics.set(label, []);
            }

            const times = this.metrics.get(label)!;
            times.push(duration);

            // Keep last 50 measurements
            if (times.length > 50) {
                times.shift();
            }
        };
    }

    getAverage(label: string): number | null {
        const times = this.metrics.get(label);
        if (!times || times.length === 0) return null;

        const sum = times.reduce((a, b) => a + b, 0);
        return sum / times.length;
    }

    getStats(label: string): { avg: number; min: number; max: number } | null {
        const times = this.metrics.get(label);
        if (!times || times.length === 0) return null;

        return {
            avg: times.reduce((a, b) => a + b, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times)
        };
    }

    clear(label?: string): void {
        if (label) {
            this.metrics.delete(label);
        } else {
            this.metrics.clear();
        }
    }

    log(): void {
        console.group('🎯 Performance Metrics');
        this.metrics.forEach((times, label) => {
            const stats = this.getStats(label);
            if (stats) {
                console.log(
                    `${label}: avg=${stats.avg.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms`
                );
            }
        });
        console.groupEnd();
    }
}

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// FPS COUNTER
// ============================================================================

export class FPSCounter {
    private frames: number[] = [];
    private lastTime: number = performance.now();

    tick(): number {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;

        const fps = 1000 / delta;
        this.frames.push(fps);

        // Keep last 60 frames
        if (this.frames.length > 60) {
            this.frames.shift();
        }

        return fps;
    }

    getAverage(): number {
        if (this.frames.length === 0) return 0;
        return this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    }

    clear(): void {
        this.frames = [];
        this.lastTime = performance.now();
    }
}
