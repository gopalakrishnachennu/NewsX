import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type MediaType = 'video' | 'image' | 'audio';

export interface MediaAsset {
    id: string;
    file: File | null; // Not persisted, re-hydrated or null on reload
    url: string; // Blob URL or remote URL
    name: string;
    type: MediaType;
    size: number;
    mimeType: string;
    dimensions?: { width: number; height: number }; // For video/image
    duration?: number; // For video/audio
    hasAudio?: boolean;
    format?: string; // e.g. "mp4", "mov"
    createdAt: number;
    uploadStatus: 'uploading' | 'ready' | 'error';
    uploadProgress: number; // 0-100
}

interface MediaState {
    assets: MediaAsset[];

    // Actions
    addAsset: (asset: Omit<MediaAsset, 'id' | 'createdAt' | 'uploadStatus' | 'uploadProgress'>) => string;
    removeAsset: (id: string) => void;
    updateAsset: (id: string, updates: Partial<MediaAsset>) => void;
    setUploadProgress: (id: string, progress: number) => void;
    setUploadStatus: (id: string, status: MediaAsset['uploadStatus']) => void;
}

export const useMediaStore = create<MediaState>()(
    persist(
        (set, get) => ({
            assets: [],

            addAsset: (asset) => {
                const id = nanoid();
                set((state) => ({
                    assets: [
                        {
                            ...asset,
                            id,
                            createdAt: Date.now(),
                            uploadStatus: 'ready', // Default to ready for now until real upload logic
                            uploadProgress: 100,
                        },
                        ...state.assets,
                    ],
                }));
                return id;
            },

            removeAsset: (id) => {
                const state = get();
                const asset = state.assets.find(a => a.id === id);

                if (asset) {
                    // Import and access video store to remove all clips using this asset
                    // We use dynamic import to avoid circular dependency issues
                    import('./video-store').then(({ useVideoStore }) => {
                        const videoStore = useVideoStore.getState();
                        videoStore.removeClipsBySource(asset.url);
                    });
                }

                set((state) => ({
                    assets: state.assets.filter((a) => a.id !== id),
                }));
            },

            updateAsset: (id, updates) => set((state) => ({
                assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
            })),

            setUploadProgress: (id, progress) => set((state) => ({
                assets: state.assets.map((a) =>
                    a.id === id ? { ...a, uploadProgress: progress } : a
                ),
            })),

            setUploadStatus: (id, status) => set((state) => ({
                assets: state.assets.map((a) =>
                    a.id === id ? { ...a, uploadStatus: status } : a
                ),
            })),
        }),
        {
            name: 'media-storage',
            partialize: (state) => ({
                assets: state.assets.map(a => ({
                    ...a,
                    file: null, // Don't persist File objects
                    url: a.url // Caution: Blob URLs expire. Real app needs Cloud storage or IndexedDB.
                })),
            }),
        }
    )
);
