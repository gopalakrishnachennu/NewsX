import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TrackType = 'video' | 'audio' | 'text' | 'image';

export type EffectType = 'color' | 'distortion' | 'blur' | 'blend';

export interface Effect {
    id: string;
    type: EffectType;
    name: string;
    params: Record<string, number | string>;
    isEnabled: boolean;
}

export interface AudioKeyframe {
    id: string;
    time: number; // Relative to clip start
    volume: number; // 0 to 1+
    easing?: 'linear' | 'ease';
}

export interface AudioEffects {
    compressor?: { threshold: number; ratio: number; enabled: boolean };
    eq?: { low: number; mid: number; high: number; enabled: boolean };
    reverb?: { mix: number; decay: number; enabled: boolean };
}

export interface Clip {
    id: string;
    start: number; // Start time in seconds relative to timeline
    end: number;   // End time in seconds relative to timeline
    offset: number; // Offset into the source media (for trimming)
    duration: number; // Duration of the clip itself
    src: string;
    type: TrackType;
    name: string;
    properties: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        scale?: number;
        rotation?: number;
        opacity?: number;
        text?: string;
        fontSize?: number;
        color?: string;
        backgroundColor?: string;
        volume?: number;
        playbackRate?: number; // 1 = 1x, 0.5 = 0.5x, 2 = 2x

        // --- Advanced Audio ---
        mute?: boolean;
        solo?: boolean;
        pan?: number; // -1 to 1
        fadeInDuration?: number;
        fadeOutDuration?: number;
        keyframes?: AudioKeyframe[];
        audioEffects?: AudioEffects;

        // Ducking Logic
        isDuckingSource?: boolean; // If true, other clips duck when this plays
        duckingTarget?: boolean;   // If true, this clip ducks when source plays
        sidechainIntensity?: number; // 0 to 1 (How much to duck)
        // ----------------------

        // Visual Filters (Legacy - to be migrated or used as base)
        filter?: {
            brightness?: number; // 1 = 100%
            contrast?: number;   // 1 = 100%
            saturate?: number;   // 1 = 100%
            grayscale?: number;  // 0 = 0% - 1 = 100%
            blur?: number;       // 0px
        };
        // Advanced Effects Pipeline
        effects?: Effect[];
        blendingMode?: 'normal' | 'screen' | 'multiply' | 'overlay' | 'darken' | 'lighten' | 'difference' | 'exclusion';

        // Text/Motion Properties
        // Text/Motion Properties
        animation?: {
            enter?: {
                type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'typewriter' | 'wipe' | 'blur';
                duration: number;
                direction?: 'left' | 'right' | 'top' | 'bottom';
                easing?: 'linear' | 'ease-out' | 'ease-in-out' | 'elastic';
            };
            exit?: {
                type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'typewriter' | 'wipe' | 'blur';
                duration: number;
                direction?: 'left' | 'right' | 'top' | 'bottom';
                easing?: 'linear' | 'ease-out' | 'ease-in-out' | 'elastic';
            };
            // idle?: { id: string; duration?: number }; // Future
        };
        textStyle?: {
            fontFamily?: string;
            fontSize?: number;
            fontWeight?: string;
            color?: string;
            align?: 'left' | 'center' | 'right';

            // Advanced Styling
            shadow?: {
                color: string;
                blur: number;
                offsetX: number;
                offsetY: number;
            };
            outline?: {
                color: string;
                width: number;
            };
            background?: {
                color: string;
                opacity: number;
                padding: number;
                borderRadius: number;
            };
            gradient?: {
                enabled: boolean;
                colors: string[]; // [start, end]
                direction: number; // deg
            };
            spacing?: number; // letter-spacing
            lineHeight?: number;
        };
    };
}

export interface Track {
    id: string;
    name: string;
    type: TrackType;
    clips: Clip[];
    isMuted?: boolean;
    isHidden?: boolean;
    isVoiceTrack?: boolean;
    isLocked?: boolean;
}

export interface VideoState {
    // Timeline State
    currentTime: number;
    duration: number; // Total timeline duration in seconds
    isPlaying: boolean;

    // Content State
    tracks: Track[];
    selectedClipId: string | null;

    // Canvas State
    canvasSize: { width: number; height: number };

    // Actions
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setDuration: (duration: number) => void;

    addTrack: (type: TrackType) => void;
    removeTrack: (id: string) => void;

    addClip: (trackId: string, clip: Partial<Clip>) => void;
    updateClip: (clipId: string, updates: Partial<Clip>) => void;
    removeClip: (clipId: string) => void;
    removeClipsBySource: (src: string) => void;

    setSelectedClip: (id: string | null) => void;
    setCanvasSize: (width: number, height: number) => void;

    // View State
    zoom: number; // 1 = 100%
    setZoom: (zoom: number) => void;

    // Missing actions from Health Check
    moveClip: (clipId: string, newStart: number) => void;
    moveClipToTrack: (clipId: string, targetTrackId: string, newStart: number) => void;
    splitClip: (clipId: string, splitTime: number) => void;
    resizeClip: (clipId: string, newDuration: number) => void;
    resizeClipLeft: (clipId: string, newStart: number) => void;

    // Project Management
    loadProject: (state: Partial<VideoState>) => void;

    // Layout properties (optional specific override or derive from canvasSize)
    width?: number;
    height?: number;
    fps?: number; // Add FPS if needed
    durationInFrames?: number; // Add durationInFrames if needed
}

export const useVideoStore = create<VideoState>()(
    persist(
        (set, get) => ({
            currentTime: 0,
            duration: 10, // Default 10s (smartly expands)
            fps: 30,
            durationInFrames: 30 * 30, // 900 frames
            isPlaying: false,
            tracks: [
                { id: 'track-main', name: 'Main Video', type: 'video', clips: [] },
                { id: 'track-text', name: 'Overlays', type: 'text', clips: [] },
                { id: 'track-audio', name: 'Audio', type: 'audio', clips: [] },
            ], // Initial tracks
            selectedClipId: null,
            canvasSize: { width: 1080, height: 1920 }, // Vertical Default
            zoom: 1,

            play: () => set({ isPlaying: true }),
            pause: () => set({ isPlaying: false }),
            seek: (time) => set({ currentTime: Math.max(0, Math.min(time, get().duration)) }),
            setDuration: (duration) => set((state) => ({
                duration,
                durationInFrames: Math.ceil(duration * (state.fps || 30))
            })),
            setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),
            setZoom: (zoom) => set({ zoom }),

            addTrack: (type) => set((state) => ({
                tracks: [
                    ...state.tracks,
                    { id: nanoid(), name: `${type} Track`, type, clips: [] }
                ]
            })),

            removeTrack: (id) => set((state) => ({
                tracks: state.tracks.filter(t => t.id !== id)
            })),

            addClip: (trackId, clip) => set((state) => {
                const track = state.tracks.find(t => t.id === trackId);
                const lastClip = track?.clips ? [...track.clips].sort((a, b) => b.end - a.end)[0] : undefined;
                const startTime = lastClip ? lastClip.end : 0;

                // Get actual duration from clip or use sensible defaults
                const clipDuration = clip.duration || (clip.type === 'image' ? 5 : clip.type === 'text' ? 5 : 10);

                const newClip: Clip = {
                    id: nanoid(),
                    start: startTime,
                    end: startTime + clipDuration,
                    offset: 0,
                    duration: clipDuration,
                    src: '',
                    type: 'video',
                    name: 'New Clip',
                    properties: {},
                    ...clip
                };

                const newEnd = newClip.start + newClip.duration;
                // Ensure end time matches start + duration
                newClip.end = newEnd;

                // Check if this is the first clip being added to the entire project
                const hasExistingClips = state.tracks.some(t => t.clips.length > 0);

                let newDuration = state.duration;

                if (!hasExistingClips) {
                    // If it's the first clip, SNAP the duration to exactly this clip's length.
                    // This solves the "Why is my 10s video playing for 30s?" issue.
                    newDuration = newEnd;
                } else {
                    // Otherwise only expand if needed
                    newDuration = Math.max(state.duration, newEnd);
                }

                return {
                    duration: newDuration,
                    tracks: state.tracks.map(track => {
                        if (track.id === trackId) {
                            return { ...track, clips: [...track.clips, newClip] };
                        }
                        return track;
                    })
                };
            }),

            updateClip: (clipId, updates) => set((state) => ({
                tracks: state.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(clip =>
                        clip.id === clipId ? { ...clip, ...updates } : clip
                    )
                }))
            })),

            removeClip: (clipId) => set((state) => ({
                tracks: state.tracks.map(track => ({
                    ...track,
                    clips: track.clips.filter(c => c.id !== clipId)
                }))
            })),

            removeClipsBySource: (src) => set((state) => ({
                tracks: state.tracks.map(track => ({
                    ...track,
                    clips: track.clips.filter(c => c.src !== src)
                }))
            })),

            setSelectedClip: (id: string | null) => set({ selectedClipId: id }),

            moveClip: (clipId, newStart) => set((state) => ({
                tracks: state.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(c =>
                        c.id === clipId ? { ...c, start: Math.max(0, newStart), end: Math.max(0, newStart) + c.duration } : c
                    )
                }))
            })),

            moveClipToTrack: (clipId, targetTrackId, newStart) => set((state) => {
                // 1. Find the clip and remove it from old track
                let clipToMove: Clip | null = null;
                const newTracks = state.tracks.map(track => {
                    const found = track.clips.find(c => c.id === clipId);
                    if (found) {
                        clipToMove = { ...found, start: Math.max(0, newStart), end: Math.max(0, newStart) + found.duration };
                        return { ...track, clips: track.clips.filter(c => c.id !== clipId) };
                    }
                    return track;
                });

                if (!clipToMove) return { tracks: state.tracks };

                // 2. Add to new track
                return {
                    tracks: newTracks.map(track => {
                        if (track.id === targetTrackId) {
                            return { ...track, clips: [...track.clips, clipToMove!] };
                        }
                        return track;
                    })
                };
            }),

            splitClip: (clipId, splitTime) => set((state) => {
                let newClipToAdd: Clip | null = null;
                let targetTrackId: string | null = null;

                const newTracks = state.tracks.map(track => {
                    const originalClipIndex = track.clips.findIndex(c => c.id === clipId);
                    if (originalClipIndex === -1) return track;

                    const originalClip = track.clips[originalClipIndex];

                    // Validate split point
                    if (splitTime <= originalClip.start || splitTime >= originalClip.end) {
                        return track; // Split point outside clip
                    }

                    // 1. Calculate properties
                    const relativeSplit = splitTime - originalClip.start;
                    const firstHalfDuration = relativeSplit;
                    const secondHalfDuration = originalClip.duration - relativeSplit;

                    // 2. Modify original clip (First Half)
                    const updatedOriginal = {
                        ...originalClip,
                        duration: firstHalfDuration,
                        end: originalClip.start + firstHalfDuration
                    };

                    // 3. Create new clip (Second Half)
                    newClipToAdd = {
                        ...originalClip,
                        id: nanoid(),
                        start: splitTime,
                        end: splitTime + secondHalfDuration,
                        duration: secondHalfDuration,
                        offset: originalClip.offset + firstHalfDuration, // Important for Video/Audio sync
                        name: `${originalClip.name} (Split)`
                    };

                    targetTrackId = track.id;

                    // Replace original with updated version
                    const updatedClips = [...track.clips];
                    updatedClips[originalClipIndex] = updatedOriginal;

                    return { ...track, clips: updatedClips };
                });

                if (newClipToAdd && targetTrackId) {
                    return {
                        tracks: newTracks.map(track => {
                            if (track.id === targetTrackId) {
                                return { ...track, clips: [...track.clips, newClipToAdd!] };
                            }
                            return track;
                        })
                    };
                }

                return { tracks: newTracks };
            }),

            resizeClip: (clipId, newDuration) => set((state) => ({
                tracks: state.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(c =>
                        c.id === clipId ? { ...c, duration: Math.max(0.1, newDuration), end: c.start + Math.max(0.1, newDuration) } : c
                    )
                }))
            })),

            resizeClipLeft: (clipId, newStart) => set((state) => ({
                tracks: state.tracks.map(track => ({
                    ...track,
                    clips: track.clips.map(c => {
                        if (c.id !== clipId) return c;

                        const delta = newStart - c.start;
                        const newDuration = c.duration - delta;
                        const newOffset = c.offset + delta;

                        // Validation: Min Duration (0.1s) and Min Offset (0)
                        if (newDuration < 0.1 || newOffset < 0) return c;

                        return {
                            ...c,
                            start: newStart,
                            duration: newDuration,
                            offset: newOffset,
                            end: newStart + newDuration
                        };
                    })
                }))
            })),

            loadProject: (projectState) => set(() => ({
                tracks: projectState.tracks || [],
                duration: projectState.duration || 30,
                fps: projectState.fps || 30,
                // We don't restore UI state like 'isPlaying' or 'currentTime' to avoid confusion upon load
                currentTime: 0,
                totalFrames: (projectState.duration || 30) * (projectState.fps || 30)
            })),
        }),
        {
            name: 'video-editor-storage',
            partialize: (state) => ({
                tracks: state.tracks,
                duration: state.duration
            }), // Persist tracks but not playback state
        }
    )
);
