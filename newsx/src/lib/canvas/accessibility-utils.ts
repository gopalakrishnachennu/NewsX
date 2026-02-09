/**
 * Accessibility utilities for Canvas Intelligence Engine
 */

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
    // Canvas navigation
    DELETE: 'Delete',
    BACKSPACE: 'Backspace',
    ESCAPE: 'Escape',

    // Selection
    SELECT_ALL: 'ctrl+a',
    DESELECT: 'Escape',

    // Undo/Redo
    UNDO: 'ctrl+z',
    REDO: 'ctrl+shift+z',

    // Zoom
    ZOOM_IN: 'ctrl+=',
    ZOOM_OUT: 'ctrl+-',
    ZOOM_RESET: 'ctrl+0',

    // Element manipulation
    DUPLICATE: 'ctrl+d',
    COPY: 'ctrl+c',
    PASTE: 'ctrl+v',
    CUT: 'ctrl+x',

    // Alignment (with Shift as modifier)
    LOCK_AXIS: 'Shift', // Hold while dragging
    UNLOCK_ASPECT: 'Shift', // Hold while resizing
    SNAP_ROTATION: 'Shift', // Hold while rotating

    // Arrow keys for nudging
    NUDGE_LEFT: 'ArrowLeft',
    NUDGE_RIGHT: 'ArrowRight',
    NUDGE_UP: 'ArrowUp',
    NUDGE_DOWN: 'ArrowDown',
} as const;

/**
 * Check if keyboard shortcut matches event
 */
export function matchesShortcut(
    event: KeyboardEvent,
    shortcut: string
): boolean {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

    if (event.key.toLowerCase() !== key) return false;

    const hasCtrl = modifiers.includes('ctrl');
    const hasShift = modifiers.includes('shift');
    const hasAlt = modifiers.includes('alt');

    return (
        (!hasCtrl || event.ctrlKey || event.metaKey) &&
        (!hasShift || event.shiftKey) &&
        (!hasAlt || event.altKey)
    );
}

// ============================================================================
// ARIA LABELS & ROLES
// ============================================================================

export interface AriaProps {
    role: string;
    'aria-label': string;
    'aria-describedby'?: string;
    'aria-selected'?: boolean;
    'aria-disabled'?: boolean;
    tabIndex?: number;
}

/**
 * Get ARIA properties for canvas element
 */
export function getElementAriaProps(
    element: { id: string; type: string; name: string },
    isSelected: boolean,
    isLocked: boolean
): AriaProps {
    return {
        role: 'button',
        'aria-label': `${element.type} element: ${element.name}`,
        'aria-selected': isSelected,
        'aria-disabled': isLocked,
        tabIndex: 0
    };
}

/**
 * Get ARIA properties for canvas container
 */
export function getCanvasAriaProps(): AriaProps {
    return {
        role: 'application',
        'aria-label': 'Video editor canvas',
        'aria-describedby': 'canvas-instructions',
        tabIndex: -1
    };
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

export class FocusManager {
    private focusableElements: HTMLElement[] = [];
    private currentIndex: number = -1;

    register(element: HTMLElement): void {
        if (!this.focusableElements.includes(element)) {
            this.focusableElements.push(element);
        }
    }

    unregister(element: HTMLElement): void {
        const index = this.focusableElements.indexOf(element);
        if (index !== -1) {
            this.focusableElements.splice(index, 1);
        }
    }

    next(): void {
        if (this.focusableElements.length === 0) return;

        this.currentIndex = (this.currentIndex + 1) % this.focusableElements.length;
        this.focusableElements[this.currentIndex]?.focus();
    }

    previous(): void {
        if (this.focusableElements.length === 0) return;

        this.currentIndex = this.currentIndex <= 0
            ? this.focusableElements.length - 1
            : this.currentIndex - 1;
        this.focusableElements[this.currentIndex]?.focus();
    }

    clear(): void {
        this.focusableElements = [];
        this.currentIndex = -1;
    }
}

export const focusManager = new FocusManager();

// ============================================================================
// SCREEN READER ANNOUNCEMENTS
// ============================================================================

export class ScreenReaderAnnouncer {
    private element: HTMLDivElement | null = null;

    constructor() {
        if (typeof document !== 'undefined') {
            this.element = document.createElement('div');
            this.element.setAttribute('role', 'status');
            this.element.setAttribute('aria-live', 'polite');
            this.element.setAttribute('aria-atomic', 'true');
            this.element.className = 'sr-only';
            this.element.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(this.element);
        }
    }

    announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        if (!this.element) return;

        this.element.setAttribute('aria-live', priority);
        this.element.textContent = message;

        // Clear after announcement
        setTimeout(() => {
            if (this.element) {
                this.element.textContent = '';
            }
        }, 1000);
    }
}

export const screenReaderAnnouncer = new ScreenReaderAnnouncer();

// ============================================================================
// COLOR CONTRAST
// ============================================================================

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsContrastRequirement(
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA'
): boolean {
    const ratio = getContrastRatio(foreground, background);
    const threshold = level === 'AAA' ? 7 : 4.5;
    return ratio >= threshold;
}

function getContrastRatio(color1: string, color2: string): number {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color: string): number {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        const normalized = val / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        }
        : null;
}
