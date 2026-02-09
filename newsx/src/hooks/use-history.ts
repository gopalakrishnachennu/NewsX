import { useCallback, useEffect, useRef } from 'react';
import { useCanvasEngine } from '@/lib/stores/canvas-engine';
import { historyManager, HistoryState } from '@/lib/canvas/history-manager';

/**
 * Hook for undo/redo functionality
 */
export function useHistory() {
    const { elements, selectedElementIds, updateElement, removeElement, addElement } = useCanvasEngine();
    const lastStateRef = useRef<HistoryState | null>(null);

    /**
     * Create state snapshot
     */
    const createSnapshot = useCallback((): HistoryState => {
        return {
            elements: JSON.parse(JSON.stringify(elements)),
            selectedElementIds: [...selectedElementIds],
            timestamp: Date.now()
        };
    }, [elements, selectedElementIds]);

    /**
     * Record action to history
     */
    const recordAction = useCallback((actionType: string, description: string) => {
        const currentState = createSnapshot();

        if (lastStateRef.current) {
            historyManager.record(
                lastStateRef.current,
                currentState,
                actionType,
                description
            );
        }

        lastStateRef.current = currentState;
    }, [createSnapshot]);

    /**
     * Restore state from snapshot
     */
    const restoreState = useCallback((state: HistoryState) => {
        // Clear current elements
        const currentIds = new Set(elements.map(el => el.id));
        const stateIds = new Set(state.elements.map(el => el.id));

        // Remove elements that don't exist in snapshot
        currentIds.forEach(id => {
            if (!stateIds.has(id)) {
                removeElement(id);
            }
        });

        // Add or update elements from snapshot
        state.elements.forEach(el => {
            if (currentIds.has(el.id)) {
                // Update existing element
                updateElement(el.id, el);
            } else {
                // Add new element (restore deleted one)
                addElement(el);
            }
        });

        lastStateRef.current = state;
    }, [elements, updateElement, removeElement, addElement]);

    /**
     * Undo last action
     */
    const undo = useCallback(() => {
        const previousState = historyManager.undo();
        if (previousState) {
            restoreState(previousState);
        }
    }, [restoreState]);

    /**
     * Redo last undone action
     */
    const redo = useCallback(() => {
        const nextState = historyManager.redo();
        if (nextState) {
            restoreState(nextState);
        }
    }, [restoreState]);

    /**
     * Keyboard shortcuts
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return {
        undo,
        redo,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo(),
        recordAction,
        currentDescription: historyManager.getCurrentDescription(),
        undoDescription: historyManager.getUndoDescription(),
        redoDescription: historyManager.getRedoDescription()
    };
}
