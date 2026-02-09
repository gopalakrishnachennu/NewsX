import { useEffect } from 'react';
import { useVideoStore } from '@/lib/stores/video-store';

export function useVideoShortcuts() {
    const store = useVideoStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

            const isCtrl = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;

            switch (e.key) {
                case ' ': // Play/Pause
                    e.preventDefault();
                    if (store.isPlaying) store.pause();
                    else store.play();
                    break;

                case 'ArrowLeft': // Rewind / Previous Frame
                    e.preventDefault();
                    if (isShift) {
                        // Fine scrubbing (0.1s)
                        store.seek(store.currentTime - 0.1);
                    } else if (isCtrl && store.selectedClipId) {
                        // Nudge Clip Left
                        store.moveClip(store.selectedClipId, Math.max(0, getCurrentClipStartTime(store) - 0.1));
                    } else {
                        // Normal rewind (1s)
                        store.seek(store.currentTime - 1);
                    }
                    break;

                case 'ArrowRight': // Forward / Next Frame
                    e.preventDefault();
                    if (isShift) {
                        // Fine scrubbing (0.1s)
                        store.seek(store.currentTime + 0.1);
                    } else if (isCtrl && store.selectedClipId) {
                        // Nudge Clip Right
                        store.moveClip(store.selectedClipId, getCurrentClipStartTime(store) + 0.1);
                    } else {
                        // Normal forward (1s)
                        store.seek(store.currentTime + 1);
                    }
                    break;

                case 'Home': // Jump to Start
                    e.preventDefault();
                    store.seek(0);
                    break;

                case 'End': // Jump to End
                    e.preventDefault();
                    store.seek(store.duration);
                    break;

                case 'k': // Split (Ctrl + K)
                case 'K':
                    if (isCtrl && store.selectedClipId) {
                        e.preventDefault();
                        store.splitClip(store.selectedClipId, store.currentTime);
                    }
                    break;

                case 'Delete': // Delete Clip
                case 'Backspace':
                    if (store.selectedClipId) {
                        e.preventDefault();
                        store.removeClip(store.selectedClipId);
                        store.setSelectedClip(null);
                    }
                    break;

                case 'Escape': // Deselect
                    e.preventDefault();
                    store.setSelectedClip(null);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [store]);
}

// Helper to get start time of selected clip directly from store state
function getCurrentClipStartTime(store: any): number {
    if (!store.selectedClipId) return 0;
    for (const track of store.tracks) {
        const clip = track.clips.find((c: any) => c.id === store.selectedClipId);
        if (clip) return clip.start;
    }
    return 0;
}
