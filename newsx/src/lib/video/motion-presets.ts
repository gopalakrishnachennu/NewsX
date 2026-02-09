import { Easing } from "remotion";

// --- Schema ---

export type AnimationType = "enter" | "exit" | "idle";

export interface MotionPreset {
    id: string;
    name: string;
    type: AnimationType;
    description?: string;
    // Function that returns style object based on progress (0 to 1)
    // progress: 0 (start) -> 1 (end of animation window)
    apply: (progress: number) => React.CSSProperties;
    durationInFrames: number; // Default duration
}

export const EASINGS = {
    linear: (t: number) => t,
    easeOut: Easing.out(Easing.cubic),
    easeIn: Easing.in(Easing.cubic),
    easeInOut: Easing.inOut(Easing.cubic),
    bounce: Easing.out(Easing.bounce),
    elastic: Easing.out(Easing.elastic(1)),
};

// --- Presets Registry ---

export const ENTER_PRESETS: MotionPreset[] = [
    {
        id: "none",
        name: "None",
        type: "enter",
        durationInFrames: 0,
        apply: () => ({ opacity: 1 }),
    },
    {
        id: "fade-in",
        name: "Fade In",
        type: "enter",
        durationInFrames: 15, // 0.5s at 30fps
        apply: (p) => ({ opacity: p }),
    },
    {
        id: "slide-up",
        name: "Slide Up (News)",
        type: "enter",
        durationInFrames: 20,
        apply: (p) => {
            const eased = EASINGS.easeOut(p);
            return {
                transform: `translateY(${100 * (1 - eased)}%)`,
                opacity: p,
            };
        },
    },
    {
        id: "pop",
        name: "Pop",
        type: "enter",
        durationInFrames: 15,
        apply: (p) => {
            const eased = EASINGS.elastic(p);
            return {
                transform: `scale(${eased})`,
                opacity: 1,
            };
        },
    },
    {
        id: "zoom-in",
        name: "Zoom In",
        type: "enter",
        durationInFrames: 30,
        apply: (p) => {
            const eased = EASINGS.easeOut(p);
            return {
                transform: `scale(${0.5 + (0.5 * eased)})`,
                opacity: p, // Fade in while zooming
            };
        },
    },
];

export const EXIT_PRESETS: MotionPreset[] = [
    {
        id: "none",
        name: "None",
        type: "exit",
        durationInFrames: 0,
        apply: () => ({ opacity: 1 }),
    },
    {
        id: "fade-out",
        name: "Fade Out",
        type: "exit",
        durationInFrames: 15,
        apply: (p) => ({ opacity: 1 - p }),
    },
    {
        id: "slide-down",
        name: "Slide Down",
        type: "exit",
        durationInFrames: 20,
        apply: (p) => {
            const eased = EASINGS.easeIn(p);
            return {
                transform: `translateY(${100 * eased}%)`,
                opacity: 1 - p,
            };
        },
    },
];

export const IDLE_PRESETS: MotionPreset[] = [
    {
        id: "none",
        name: "Static",
        type: "idle",
        durationInFrames: 0,
        apply: () => ({}),
    },
    {
        id: "slow-zoom",
        name: "Slow Zoom (Ken Burns)",
        type: "idle",
        durationInFrames: 0, // Continuous
        apply: (p) => ({
            transform: `scale(${1 + (0.1 * p)})`, // Scales from 1x to 1.1x over the whole clip
        }),
    },
    {
        id: "pulse",
        name: "Pulse",
        type: "idle",
        durationInFrames: 0,
        apply: (p) => {
            // Pulse every 1 second (30 frames) based on global progress might be tricky, 
            // but for 'idle' p is usually clip progress 0-1.
            // Let's make it pulse once per clip for MVP or use sin wave
            const scale = 1 + (Math.sin(p * Math.PI * 2) * 0.05);
            return { transform: `scale(${scale})` };
        },
    },
];

export const ANIMATION_REGISTRY = {
    enter: ENTER_PRESETS,
    exit: EXIT_PRESETS,
    idle: IDLE_PRESETS
};

export function getAnimationStyles(
    clipDuration: number,
    currentFrameInClip: number,
    enterId?: string,
    exitId?: string,
    idleId?: string
): React.CSSProperties {
    let style: React.CSSProperties = { opacity: 1 }; // Base style

    // 1. Enter Animation
    if (enterId) {
        const preset = ENTER_PRESETS.find(p => p.id === enterId);
        if (preset && currentFrameInClip < preset.durationInFrames) {
            const progress = Math.min(1, Math.max(0, currentFrameInClip / preset.durationInFrames));
            style = { ...style, ...preset.apply(progress) };
        }
    }

    // 2. Exit Animation
    if (exitId) {
        const preset = EXIT_PRESETS.find(p => p.id === exitId);
        if (preset) {
            const exitStartFrame = clipDuration - preset.durationInFrames;
            if (currentFrameInClip >= exitStartFrame) {
                const progress = Math.min(1, Math.max(0, (currentFrameInClip - exitStartFrame) / preset.durationInFrames));
                // Merge carefully, exit usually overrides transform/opacity
                const exitStyle = preset.apply(progress);
                style = { ...style, ...exitStyle };

                // If both define transform, we might have a conflict (e.g. zoom + slide out).
                // For MVP, exit wins or we compose transforms manually.
                // Ideally: string concatenation of transforms.
            }
        }
    }

    // 3. Idle Animation (Applied continuously, simplest integration is mixing transform)
    if (idleId) {
        const preset = IDLE_PRESETS.find(p => p.id === idleId);
        if (preset) {
            const progress = currentFrameInClip / clipDuration;
            const idleStyle = preset.apply(progress);

            // Transform Composition Hack for MVP
            if (style.transform && idleStyle.transform) {
                style.transform = `${style.transform} ${idleStyle.transform}`;
            } else {
                style = { ...style, ...idleStyle };
            }
        }
    }

    return style;
}
