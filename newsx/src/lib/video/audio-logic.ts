import { Clip, Track, VideoState } from "@/lib/stores/video-store";

export function getAudioVolume(
    currentFrame: number,
    clip: Clip,
    track: Track,
    allTracks: Track[],
    allClips: Record<string, Clip>
): number {
    if (track.isMuted) return 0;

    let volume = clip.properties?.volume ?? 1;
    const padding = 5; // Frames to smooth ducking transition (optional)

    // 1. Fade In / Out logic
    const relativeFrame = currentFrame - clip.start;

    // Fade In
    // TODO: Add fadeInDuration to Clip properties
    // if (clip.properties?.fadeInDuration && relativeFrame < clip.properties.fadeInDuration) {
    //    volume *= (relativeFrame / clip.properties.fadeInDuration);
    // }

    // Fade Out
    const framesUntilEnd = clip.duration - relativeFrame;
    // TODO: Add fadeOutDuration to Clip properties
    // if (clip.properties?.fadeOutDuration && framesUntilEnd < clip.properties.fadeOutDuration) {
    //    volume *= (framesUntilEnd / clip.properties.fadeOutDuration);
    // }

    // 2. Auto-Ducking Logic
    // If this track is NOT a voice track, we check if ANY voice track is active right now
    if (!track.isVoiceTrack) {
        const isVoiceActive = allTracks.some(t => {
            if (t.id === track.id) return false; // Don't duck self
            if (!t.isVoiceTrack || t.isMuted) return false;

            // Check if any clip on this voice track covers the current frame
            return t.clips.some(c => {
                // In new store, tracks.clips is an array of Clip objects, NOT ids
                // so we can use 'c' directly.
                return (
                    currentFrame >= c.start &&
                    currentFrame < (c.start + c.duration)
                );
            });
        });

        if (isVoiceActive) {
            volume *= 0.2; // Ducking Factor (20% volume)
        }
    }

    return Math.max(0, Math.min(1, volume)); // Clamp 0-1
}
