/**
 * Editor Keyboard Shortcuts Hook
 * Centralized keyboard shortcut handling for the canvas editor
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardAction {
    // Element actions
    deleteElement?: () => void;
    duplicateElement?: () => void;
    copyElement?: () => void;
    pasteElement?: () => void;
    cutElement?: () => void;
    selectAll?: () => void;
    deselectAll?: () => void;

    // Layer actions
    bringToFront?: () => void;
    sendToBack?: () => void;
    bringForward?: () => void;
    sendBackward?: () => void;

    // Editing actions
    undo?: () => void;
    redo?: () => void;

    // Navigation
    zoomIn?: () => void;
    zoomOut?: () => void;
    zoomReset?: () => void;

    // Lock/Unlock
    toggleLock?: () => void;

    // Save/Export
    save?: () => void;
    exportDesign?: () => void;

    // Grouping
    groupElements?: () => void;
    ungroupElements?: () => void;

    // Movement (arrow keys)
    moveUp?: () => void;
    moveDown?: () => void;
    moveLeft?: () => void;
    moveRight?: () => void;
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
    hasSelection?: boolean;
}

export function useKeyboardShortcuts(
    actions: KeyboardAction,
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true, hasSelection = false } = options;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Check if we're in an input field - don't handle shortcuts
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? e.metaKey : e.ctrlKey;
        const shiftKey = e.shiftKey;

        // Delete / Backspace - Delete selected element
        if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput && hasSelection) {
            e.preventDefault();
            actions.deleteElement?.();
            return;
        }

        // Escape - Deselect all
        if (e.key === 'Escape') {
            e.preventDefault();
            actions.deselectAll?.();
            return;
        }

        // Cmd/Ctrl + A - Select all
        if (cmdKey && e.key === 'a' && !isInput) {
            e.preventDefault();
            actions.selectAll?.();
            return;
        }

        // Cmd/Ctrl + C - Copy
        if (cmdKey && e.key === 'c' && !isInput && hasSelection) {
            e.preventDefault();
            actions.copyElement?.();
            return;
        }

        // Cmd/Ctrl + X - Cut
        if (cmdKey && e.key === 'x' && !isInput && hasSelection) {
            e.preventDefault();
            actions.cutElement?.();
            return;
        }

        // Cmd/Ctrl + V - Paste
        if (cmdKey && e.key === 'v' && !isInput) {
            e.preventDefault();
            actions.pasteElement?.();
            return;
        }

        // Cmd/Ctrl + D - Duplicate
        if (cmdKey && e.key === 'd' && hasSelection) {
            e.preventDefault();
            actions.duplicateElement?.();
            return;
        }

        // Cmd/Ctrl + Z - Undo
        if (cmdKey && e.key === 'z' && !shiftKey) {
            e.preventDefault();
            actions.undo?.();
            return;
        }

        // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y - Redo
        if ((cmdKey && shiftKey && e.key === 'z') || (cmdKey && e.key === 'y')) {
            e.preventDefault();
            actions.redo?.();
            return;
        }

        // Cmd/Ctrl + S - Save
        if (cmdKey && e.key === 's') {
            e.preventDefault();
            actions.save?.();
            return;
        }

        // Cmd/Ctrl + E - Export
        if (cmdKey && e.key === 'e') {
            e.preventDefault();
            actions.exportDesign?.();
            return;
        }

        // Cmd/Ctrl + L - Toggle Lock
        if (cmdKey && e.key === 'l' && hasSelection) {
            e.preventDefault();
            actions.toggleLock?.();
            return;
        }

        // Cmd/Ctrl + G - Group elements
        if (cmdKey && e.key === 'g' && !shiftKey && hasSelection) {
            e.preventDefault();
            actions.groupElements?.();
            return;
        }

        // Cmd/Ctrl + Shift + G - Ungroup elements
        if (cmdKey && shiftKey && e.key.toLowerCase() === 'g' && hasSelection) {
            e.preventDefault();
            actions.ungroupElements?.();
            return;
        }

        // Cmd/Ctrl + ] - Bring to Front
        if (cmdKey && e.key === ']' && hasSelection) {
            e.preventDefault();
            if (shiftKey) {
                actions.bringToFront?.();
            } else {
                actions.bringForward?.();
            }
            return;
        }

        // Cmd/Ctrl + [ - Send to Back
        if (cmdKey && e.key === '[' && hasSelection) {
            e.preventDefault();
            if (shiftKey) {
                actions.sendToBack?.();
            } else {
                actions.sendBackward?.();
            }
            return;
        }

        // Cmd/Ctrl + Plus - Zoom In
        if (cmdKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            actions.zoomIn?.();
            return;
        }

        // Cmd/Ctrl + Minus - Zoom Out
        if (cmdKey && e.key === '-') {
            e.preventDefault();
            actions.zoomOut?.();
            return;
        }

        // Cmd/Ctrl + 0 - Reset Zoom
        if (cmdKey && e.key === '0') {
            e.preventDefault();
            actions.zoomReset?.();
            return;
        }

        // Arrow keys - Move element (with or without shift for larger steps)
        if (!isInput && hasSelection) {
            const step = shiftKey ? 10 : 1;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                for (let i = 0; i < step; i++) actions.moveUp?.();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                for (let i = 0; i < step; i++) actions.moveDown?.();
                return;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                for (let i = 0; i < step; i++) actions.moveLeft?.();
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                for (let i = 0; i < step; i++) actions.moveRight?.();
                return;
            }
        }
    }, [enabled, hasSelection, actions]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

// Keyboard shortcut display helper
export const KEYBOARD_SHORTCUTS = {
    delete: { key: 'Delete', label: 'Delete' },
    copy: { key: '⌘C', label: 'Copy' },
    cut: { key: '⌘X', label: 'Cut' },
    paste: { key: '⌘V', label: 'Paste' },
    duplicate: { key: '⌘D', label: 'Duplicate' },
    undo: { key: '⌘Z', label: 'Undo' },
    redo: { key: '⌘⇧Z', label: 'Redo' },
    save: { key: '⌘S', label: 'Save' },
    export: { key: '⌘E', label: 'Export' },
    lock: { key: '⌘L', label: 'Lock/Unlock' },
    bringToFront: { key: '⌘⇧]', label: 'Bring to Front' },
    sendToBack: { key: '⌘⇧[', label: 'Send to Back' },
    zoomIn: { key: '⌘+', label: 'Zoom In' },
    zoomOut: { key: '⌘-', label: 'Zoom Out' },
    selectAll: { key: '⌘A', label: 'Select All' },
    deselect: { key: 'Esc', label: 'Deselect' },
    group: { key: '⌘G', label: 'Group' },
    ungroup: { key: '⌘⇧G', label: 'Ungroup' },
};
