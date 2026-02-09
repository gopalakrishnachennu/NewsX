import { create } from 'zustand';

export type ContextMenuType = 'clip' | 'track' | 'timeline' | 'text' | 'default';

interface ContextMenuState {
    isOpen: boolean;
    position: { x: number; y: number };
    type: ContextMenuType;
    data: any; // ID or object related to the target
    openMenu: (position: { x: number; y: number }, type: ContextMenuType, data?: any) => void;
    closeMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
    isOpen: false,
    position: { x: 0, y: 0 },
    type: 'default',
    data: null,
    openMenu: (position, type, data) => set({ isOpen: true, position, type, data }),
    closeMenu: () => set({ isOpen: false }),
}));
