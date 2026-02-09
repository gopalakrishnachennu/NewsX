import { create } from 'zustand';

export interface LogEntry {
    id: string;
    timestamp: number;
    category: 'audio' | 'anim' | 'system';
    message: string;
    data?: any;
}

interface DebugState {
    logs: LogEntry[];
    isEnabled: boolean;
    toggleDebug: () => void;
    addLog: (category: LogEntry['category'], message: string, data?: any) => void;
    clearLogs: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
    logs: [],
    isEnabled: false, // Default off
    toggleDebug: () => set(state => ({ isEnabled: !state.isEnabled })),
    addLog: (category, message, data) => set(state => {
        if (!state.isEnabled) return {};

        const newEntry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            category,
            message,
            data
        };

        // Keep last 50 logs to prevent memory overflow
        return { logs: [newEntry, ...state.logs].slice(0, 50) };
    }),
    clearLogs: () => set({ logs: [] })
}));
