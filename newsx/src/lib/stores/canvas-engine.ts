import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CanvasElement {
    id: string;
    type: 'video' | 'image' | 'text' | 'audio' | 'shape';

    // Position (in canvas coordinates)
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number; // degrees

    // Time-based properties
    startTime: number; // seconds
    endTime: number;   // seconds

    // Visual properties
    opacity: number;
    zIndex: number;

    // Constraints
    locked: boolean;
    visible: boolean;
    aspectRatioLocked: boolean;

    // Type-specific data
    data: any;
}

export interface Guide {
    id: string;
    type: 'vertical' | 'horizontal';
    position: number; // x for vertical, y for horizontal
    color?: string;
    temporary?: boolean; // Auto-hide after action
}

export interface CanvasState {
    // Canvas dimensions (project settings)
    width: number;
    height: number;
    aspectRatio: number; // width / height

    // View state
    zoom: number; // 0.1 to 4.0 (10% to 400%)
    pan: { x: number; y: number };

    // Elements on canvas
    elements: CanvasElement[];
    selectedElementIds: string[];

    // Guides & Snapping
    guides: Guide[];
    snapEnabled: boolean;
    snapThreshold: number; // pixels

    // Actions
    setCanvasSize: (width: number, height: number) => void;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;

    // Element actions
    addElement: (element: Omit<CanvasElement, 'id' | 'zIndex'>) => string;
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    removeElement: (id: string) => void;
    selectElement: (id: string, multi?: boolean) => void;
    clearSelection: () => void;

    // Guide actions
    addGuide: (guide: Omit<Guide, 'id'>) => void;
    removeGuide: (id: string) => void;
    clearTemporaryGuides: () => void;

    // Canvas utilities
    getCanvasCenter: () => { x: number; y: number };
    isWithinBounds: (element: Partial<CanvasElement>) => boolean;
    constrainToBounds: (element: CanvasElement) => CanvasElement;
}

// ============================================================================
// CANVAS ENGINE STORE
// ============================================================================

export const useCanvasEngine = create<CanvasState>()(
    persist(
        (set, get) => ({
            // Default canvas: 1080x1920 (Portrait, TikTok/Instagram Reels)
            width: 1080,
            height: 1920,
            aspectRatio: 1080 / 1920,

            // Default view state
            zoom: 1.0, // 100% fit-to-screen
            pan: { x: 0, y: 0 },

            // Empty canvas
            elements: [],
            selectedElementIds: [],

            // Snapping configuration
            guides: [],
            snapEnabled: true,
            snapThreshold: 8, // 8px feels magnetic

            // ================================================================
            // CANVAS CONFIGURATION
            // ================================================================

            setCanvasSize: (width, height) => set((state) => {
                const aspectRatio = width / height;

                return {
                    width,
                    height,
                    aspectRatio,
                    // Reset zoom to fit new size
                    zoom: 1.0,
                    pan: { x: 0, y: 0 }
                };
            }),

            setZoom: (zoom) => set({
                zoom: Math.max(0.1, Math.min(4.0, zoom))
            }),

            setPan: (x, y) => set((state) => {
                // Only allow pan when zoomed in
                if (state.zoom <= 1.0) {
                    return { pan: { x: 0, y: 0 } };
                }
                return { pan: { x, y } };
            }),

            // ================================================================
            // ELEMENT MANAGEMENT
            // ================================================================

            addElement: (element) => {
                const id = nanoid();
                const state = get();

                // Auto-assign z-index (newest on top)
                const maxZ = Math.max(0, ...state.elements.map(e => e.zIndex));

                const newElement: CanvasElement = {
                    id,
                    zIndex: maxZ + 1,
                    opacity: 1,
                    rotation: 0,
                    locked: false,
                    visible: true,
                    aspectRatioLocked: true,
                    ...element
                };

                // Constrain to bounds
                const constrainedElement = state.constrainToBounds(newElement);

                set((state) => ({
                    elements: [...state.elements, constrainedElement]
                }));

                return id;
            },

            updateElement: (id, updates) => set((state) => {
                const elements = state.elements.map(el => {
                    if (el.id !== id) return el;

                    const updated = { ...el, ...updates };

                    // Re-constrain to bounds after update
                    return state.constrainToBounds(updated);
                });

                return { elements };
            }),

            removeElement: (id) => set((state) => ({
                elements: state.elements.filter(e => e.id !== id),
                selectedElementIds: state.selectedElementIds.filter(sid => sid !== id)
            })),

            selectElement: (id, multi = false) => set((state) => {
                if (multi) {
                    // Multi-select (toggle)
                    const isSelected = state.selectedElementIds.includes(id);
                    return {
                        selectedElementIds: isSelected
                            ? state.selectedElementIds.filter(sid => sid !== id)
                            : [...state.selectedElementIds, id]
                    };
                } else {
                    // Single select
                    return { selectedElementIds: [id] };
                }
            }),

            clearSelection: () => set({ selectedElementIds: [] }),

            // ================================================================
            // GUIDE MANAGEMENT
            // ================================================================

            addGuide: (guide) => set((state) => ({
                guides: [...state.guides, { ...guide, id: nanoid() }]
            })),

            removeGuide: (id) => set((state) => ({
                guides: state.guides.filter(g => g.id !== id)
            })),

            clearTemporaryGuides: () => set((state) => ({
                guides: state.guides.filter(g => !g.temporary)
            })),

            // ================================================================
            // CANVAS UTILITIES
            // ================================================================

            getCanvasCenter: () => {
                const state = get();
                return {
                    x: state.width / 2,
                    y: state.height / 2
                };
            },

            isWithinBounds: (element) => {
                const state = get();

                if (!element.x || !element.y || !element.width || !element.height) {
                    return true; // Can't validate incomplete element
                }

                const left = element.x;
                const right = element.x + element.width;
                const top = element.y;
                const bottom = element.y + element.height;

                return (
                    left >= 0 &&
                    right <= state.width &&
                    top >= 0 &&
                    bottom <= state.height
                );
            },

            constrainToBounds: (element) => {
                const state = get();

                let { x, y, width, height } = element;

                // Constrain position to keep element within canvas
                x = Math.max(0, Math.min(x, state.width - width));
                y = Math.max(0, Math.min(y, state.height - height));

                // If element is larger than canvas, constrain size
                if (width > state.width) {
                    width = state.width;
                }
                if (height > state.height) {
                    height = state.height;
                }

                return { ...element, x, y, width, height };
            }
        }),
        {
            name: 'canvas-engine-storage',
            partialize: (state) => ({
                width: state.width,
                height: state.height,
                elements: state.elements,
                // Don't persist view state (zoom, pan)
                // Don't persist selection or guides
            })
        }
    )
);

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).__CANVAS_DEBUG__ = {
        state: () => useCanvasEngine.getState(),
        elements: () => {
            const { elements } = useCanvasEngine.getState();
            console.table(elements.map(e => ({
                id: e.id.slice(0, 8),
                type: e.type,
                x: e.x,
                y: e.y,
                width: e.width,
                height: e.height,
                zIndex: e.zIndex
            })));
        },
        center: () => console.log(useCanvasEngine.getState().getCanvasCenter()),
        zoom: (z: number) => useCanvasEngine.getState().setZoom(z)
    };
    console.log('🎨 Canvas Debug: window.__CANVAS_DEBUG__');
}
