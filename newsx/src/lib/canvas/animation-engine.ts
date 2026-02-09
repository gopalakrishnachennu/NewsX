import { CanvasElement } from '../stores/canvas-engine';

// ============================================================================
// TYPES
// ============================================================================

export type AnimationType =
    | 'fade-in'
    | 'fade-out'
    | 'slide-in-left'
    | 'slide-in-right'
    | 'slide-in-top'
    | 'slide-in-bottom'
    | 'scale-in'
    | 'scale-out'
    | 'none';

export interface AnimationConfig {
    type: AnimationType;
    duration: number; // seconds
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    delay?: number;
}

export interface ElementAnimation {
    entry?: AnimationConfig;
    exit?: AnimationConfig;
}

export interface AnimationState {
    opacity: number;
    translateX: number;
    translateY: number;
    scale: number;
}

// ============================================================================
// ANIMATION ENGINE
// ============================================================================

export class AnimationEngine {
    /**
     * Calculate animation state for an element at a given time
     */
    static getAnimationState(
        element: CanvasElement,
        currentTime: number,
        animations?: ElementAnimation
    ): AnimationState {
        const defaultState: AnimationState = {
            opacity: 1,
            translateX: 0,
            translateY: 0,
            scale: 1
        };

        if (!animations) return defaultState;

        const duration = element.endTime - element.startTime;
        const elapsed = currentTime - element.startTime;
        const timeRemaining = element.endTime - currentTime;

        // Entry animation
        if (animations.entry && elapsed < animations.entry.duration) {
            const progress = elapsed / animations.entry.duration;
            const easedProgress = this.applyEasing(progress, animations.entry.easing);
            return this.applyAnimation(animations.entry.type, easedProgress, false, element);
        }

        // Exit animation
        if (animations.exit && timeRemaining < animations.exit.duration) {
            const progress = timeRemaining / animations.exit.duration;
            const easedProgress = this.applyEasing(1 - progress, animations.exit.easing);
            return this.applyAnimation(animations.exit.type, easedProgress, true, element);
        }

        return defaultState;
    }

    /**
     * Apply specific animation type
     */
    private static applyAnimation(
        type: AnimationType,
        progress: number,
        isExit: boolean,
        element: CanvasElement
    ): AnimationState {
        const state: AnimationState = {
            opacity: 1,
            translateX: 0,
            translateY: 0,
            scale: 1
        };

        switch (type) {
            case 'fade-in':
            case 'fade-out':
                state.opacity = isExit ? 1 - progress : progress;
                break;

            case 'slide-in-left':
                state.translateX = isExit ? -element.width * progress : -element.width * (1 - progress);
                state.opacity = isExit ? 1 - progress : progress;
                break;

            case 'slide-in-right':
                state.translateX = isExit ? element.width * progress : element.width * (1 - progress);
                state.opacity = isExit ? 1 - progress : progress;
                break;

            case 'slide-in-top':
                state.translateY = isExit ? -element.height * progress : -element.height * (1 - progress);
                state.opacity = isExit ? 1 - progress : progress;
                break;

            case 'slide-in-bottom':
                state.translateY = isExit ? element.height * progress : element.height * (1 - progress);
                state.opacity = isExit ? 1 - progress : progress;
                break;

            case 'scale-in':
                state.scale = isExit ? 1 - progress * 0.5 : 0.5 + progress * 0.5;
                state.opacity = isExit ? 1 - progress : progress;
                break;

            case 'scale-out':
                state.scale = isExit ? 1 + progress * 0.5 : 1.5 - progress * 0.5;
                state.opacity = isExit ? 1 - progress : progress;
                break;

            case 'none':
            default:
                break;
        }

        return state;
    }

    /**
     * Apply easing function to progress
     */
    private static applyEasing(
        progress: number,
        easing: AnimationConfig['easing']
    ): number {
        switch (easing) {
            case 'linear':
                return progress;

            case 'ease-in':
                return progress * progress;

            case 'ease-out':
                return 1 - Math.pow(1 - progress, 2);

            case 'ease-in-out':
                return progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            default:
                return progress;
        }
    }

    /**
     * Get default entry animation for element type
     */
    static getDefaultAnimation(type: CanvasElement['type']): ElementAnimation {
        const baseEntry: AnimationConfig = {
            type: 'fade-in',
            duration: 0.3,
            easing: 'ease-out'
        };

        const baseExit: AnimationConfig = {
            type: 'fade-out',
            duration: 0.3,
            easing: 'ease-in'
        };

        switch (type) {
            case 'text':
                return {
                    entry: { ...baseEntry, type: 'slide-in-bottom', duration: 0.4 },
                    exit: baseExit
                };

            case 'image':
            case 'video':
                return {
                    entry: { ...baseEntry, type: 'scale-in', duration: 0.5 },
                    exit: baseExit
                };

            case 'shape':
                return {
                    entry: { ...baseEntry, duration: 0.2 },
                    exit: baseExit
                };

            default:
                return {
                    entry: baseEntry,
                    exit: baseExit
                };
        }
    }

    /**
     * Convert animation state to CSS transform string
     */
    static toCSSTransform(state: AnimationState, elementRotation: number = 0): string {
        const transforms: string[] = [];

        if (state.translateX !== 0 || state.translateY !== 0) {
            transforms.push(`translate(${state.translateX}px, ${state.translateY}px)`);
        }

        if (state.scale !== 1) {
            transforms.push(`scale(${state.scale})`);
        }

        if (elementRotation !== 0) {
            transforms.push(`rotate(${elementRotation}deg)`);
        }

        return transforms.join(' ') || 'none';
    }

    /**
     * Get CSS transition string for smooth animations
     */
    static getCSSTransition(duration: number = 0.1): string {
        return `all ${duration}s ease-out`;
    }
}
