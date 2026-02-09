import { CanvasElement } from '../stores/canvas-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface HistoryState {
    elements: CanvasElement[];
    selectedElementIds: string[];
    timestamp: number;
}

export interface HistoryAction {
    type: string;
    before: HistoryState;
    after: HistoryState;
    description: string;
}

// ============================================================================
// HISTORY MANAGER
// ============================================================================

export class HistoryManager {
    private history: HistoryAction[] = [];
    private currentIndex: number = -1;
    private maxHistory: number = 50;

    /**
     * Record a new action to history
     */
    record(
        before: HistoryState,
        after: HistoryState,
        actionType: string,
        description: string
    ): void {
        // Remove any history after current index (if we undid and then made a new action)
        this.history = this.history.slice(0, this.currentIndex + 1);

        // Add new action
        const action: HistoryAction = {
            type: actionType,
            before,
            after,
            description,
        };

        this.history.push(action);
        this.currentIndex++;

        // Enforce max history limit
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.currentIndex--;
        }
    }

    /**
     * Undo last action
     */
    undo(): HistoryState | null {
        if (!this.canUndo()) return null;

        const action = this.history[this.currentIndex];
        this.currentIndex--;

        return action.before;
    }

    /**
     * Redo last undone action
     */
    redo(): HistoryState | null {
        if (!this.canRedo()) return null;

        this.currentIndex++;
        const action = this.history[this.currentIndex];

        return action.after;
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Get current state description
     */
    getCurrentDescription(): string | null {
        if (this.currentIndex < 0) return null;
        return this.history[this.currentIndex].description;
    }

    /**
     * Get undo description
     */
    getUndoDescription(): string | null {
        if (!this.canUndo()) return null;
        return this.history[this.currentIndex].description;
    }

    /**
     * Get redo description
     */
    getRedoDescription(): string | null {
        if (!this.canRedo()) return null;
        return this.history[this.currentIndex + 1].description;
    }

    /**
     * Clear all history
     */
    clear(): void {
        this.history = [];
        this.currentIndex = -1;
    }

    /**
     * Get history length
     */
    getHistoryLength(): number {
        return this.history.length;
    }

    /**
     * Get current position
     */
    getCurrentIndex(): number {
        return this.currentIndex;
    }
}

// Singleton instance
export const historyManager = new HistoryManager();
