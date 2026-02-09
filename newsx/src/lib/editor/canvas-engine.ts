/**
 * Canvas Engine - Core Canvas Logic
 * Enterprise-level canvas management with feature tracking
 */

import { logger } from '@/lib/logger';

// Feature flags for the editor
export interface EditorFeatures {
    mouseWheelZoom: boolean;
    trackpadPinchZoom: boolean;
    spacebarPan: boolean;
    gridOverlay: boolean;
    snapToGrid: boolean;
    snapToGuides: boolean;
    rulers: boolean;
    rotationHandle: boolean;
    multiSelect: boolean;
    grouping: boolean;
    inlineTextEdit: boolean;
    imageFilters: boolean;
    animations: boolean;
}

// Default feature configuration
export const DEFAULT_FEATURES: EditorFeatures = {
    mouseWheelZoom: true,
    trackpadPinchZoom: true,
    spacebarPan: true,
    gridOverlay: true,
    snapToGrid: true,
    snapToGuides: false,
    rulers: false,
    rotationHandle: true,
    multiSelect: false,
    grouping: false,
    inlineTextEdit: false,
    imageFilters: false,
    animations: false,
};

// Canvas element interface
export interface CanvasElement {
    id: string;
    type: 'text' | 'image' | 'shape' | 'group';
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    locked: boolean;
    visible: boolean;
    flipX: boolean;
    flipY: boolean;
    opacity: number;
    // Text specific
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
    letterSpacing?: number;
    color?: string;
    backgroundColor?: string;
    textHighlight?: boolean;
    textTransform?: 'uppercase' | 'lowercase' | 'none';
    textShadow?: {
        enabled?: boolean;
        color?: string;
        blur?: number;
        offsetX?: number;
        offsetY?: number;
    };
    textOutline?: {
        enabled?: boolean;
        width?: number;
        color?: string;
    };
    gradient?: string;
    // Image specific
    imageUrl?: string;
    borderRadius?: number;
    filters?: ImageFilters;
    // Shape specific
    shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star' | 'heart' | 'polygon';
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    // Group specific
    children?: string[];
    // Smart Layouts
    autoScale?: boolean; // Text: auto-resize font to fit width
    anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    relativeTo?: string; // ID of element this is anchored to
    // Inset / PiP specific
    isInset?: boolean;
    insetAnchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    maskShape?: string; // e.g. 'star', 'circle', 'hexagon'
    shapeParam?: number; // e.g. Star points
    // Placeholders (Phase 28)
    isPlaceholder?: boolean;
    placeholderType?: 'text' | 'image' | 'logo' | 'all';
    // Shadow
    shadow?: {
        enabled: boolean;
        color: string;
        blur: number;
        offsetX: number;
        offsetY: number;
    };
}

// Image filters
export interface ImageFilters {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    grayscale: number;
    sepia: number;
    hueRotate: number;
}

// Canvas state
export interface CanvasState {
    elements: CanvasElement[];
    selectedIds: string[];
    zoom: number;
    panX: number;
    panY: number;
    backgroundColor: string;
    backgroundImage: string | null;
    gridVisible: boolean;
    gridSize: number;
    rulersVisible: boolean;
    safeZonesVisible: boolean;
    guides: { type: 'horizontal' | 'vertical'; position: number }[];
    isPanning: boolean;
    isSpacePressed: boolean;
}

// Canvas action types
export type CanvasAction =
    | { type: 'SET_ZOOM'; payload: number }
    | { type: 'SET_PAN'; payload: { x: number; y: number } }
    | { type: 'ADD_ELEMENT'; payload: CanvasElement }
    | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
    | { type: 'DELETE_ELEMENT'; payload: string }
    | { type: 'SET_SELECTION'; payload: string[] }
    | { type: 'TOGGLE_GRID'; payload?: boolean }
    | { type: 'SET_GRID_SIZE'; payload: number }
    | { type: 'TOGGLE_RULERS'; payload?: boolean }
    | { type: 'ADD_GUIDE'; payload: { type: 'horizontal' | 'vertical'; position: number } }
    | { type: 'REMOVE_GUIDE'; payload: number }
    | { type: 'SET_BACKGROUND_COLOR'; payload: string }
    | { type: 'SET_BACKGROUND_IMAGE'; payload: string | null }
    | { type: 'SET_PANNING'; payload: boolean }
    | { type: 'SET_SPACE_PRESSED'; payload: boolean }
    | { type: 'REORDER_ELEMENTS'; payload: { from: number; to: number } }
    | { type: 'BRING_TO_FRONT'; payload: string }
    | { type: 'SEND_TO_BACK'; payload: string }
    | { type: 'GROUP_ELEMENTS'; payload: string[] }
    | { type: 'UNGROUP_ELEMENT'; payload: string };

// Initial canvas state
export const initialCanvasState: CanvasState = {
    elements: [],
    selectedIds: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    backgroundColor: '#1a1a2e',
    backgroundImage: null,
    gridVisible: false,
    gridSize: 20,
    rulersVisible: false,
    safeZonesVisible: false, // New: Social Media Safe Zones
    guides: [],
    isPanning: false,
    isSpacePressed: false,
};

/**
 * Canvas Engine - Enterprise-level canvas management
 */
export class CanvasEngine {
    private state: CanvasState;
    private history: CanvasState[] = [];
    private historyIndex = -1;
    private maxHistory = 50;
    private features: EditorFeatures;
    private listeners: Set<(state: CanvasState) => void> = new Set();

    constructor(initialState?: Partial<CanvasState>, features?: Partial<EditorFeatures>) {
        this.state = { ...initialCanvasState, ...initialState };
        this.features = { ...DEFAULT_FEATURES, ...features };
        this.saveToHistory();

        logger.info('editor', 'CanvasEngine initialized', {
            elementCount: this.state.elements.length,
            features: Object.keys(this.features).filter(k => this.features[k as keyof EditorFeatures]),
        });
    }

    // State management
    getState(): CanvasState {
        return { ...this.state };
    }

    getFeatures(): EditorFeatures {
        return { ...this.features };
    }

    isFeatureEnabled(feature: keyof EditorFeatures): boolean {
        return this.features[feature];
    }

    subscribe(listener: (state: CanvasState) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach((listener) => listener(this.getState()));
    }

    private setState(newState: Partial<CanvasState>, saveHistory = true): void {
        this.state = { ...this.state, ...newState };
        if (saveHistory) this.saveToHistory();
        this.notify();
    }

    // History management
    private saveToHistory(): void {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push({ ...this.state, elements: this.state.elements.map(e => ({ ...e })) });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    canUndo(): boolean {
        return this.historyIndex > 0;
    }

    canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
    }

    undo(): void {
        if (!this.canUndo()) return;
        this.historyIndex--;
        this.state = { ...this.history[this.historyIndex] };
        this.notify();
        logger.debug('editor', 'Canvas undo', { historyIndex: this.historyIndex });
    }

    redo(): void {
        if (!this.canRedo()) return;
        this.historyIndex++;
        this.state = { ...this.history[this.historyIndex] };
        this.notify();
        logger.debug('editor', 'Canvas redo', { historyIndex: this.historyIndex });
    }

    // Zoom controls
    setZoom(zoom: number): void {
        const clampedZoom = Math.max(0.1, Math.min(5, zoom));
        this.setState({ zoom: clampedZoom }, false);
        logger.debug('editor', 'Zoom changed', { zoom: clampedZoom });
    }

    zoomIn(step = 0.1): void {
        this.setZoom(this.state.zoom + step);
    }

    zoomOut(step = 0.1): void {
        this.setZoom(this.state.zoom - step);
    }

    zoomToFit(): void {
        this.setZoom(1);
        this.setState({ panX: 0, panY: 0 }, false);
    }

    // Pan controls
    setPan(x: number, y: number): void {
        this.setState({ panX: x, panY: y }, false);
    }

    pan(deltaX: number, deltaY: number): void {
        if (!this.features.spacebarPan) return;
        this.setState({
            panX: this.state.panX + deltaX,
            panY: this.state.panY + deltaY
        }, false);
    }

    setIsPanning(isPanning: boolean): void {
        this.setState({ isPanning }, false);
    }

    setSpacePressed(isPressed: boolean): void {
        this.setState({ isSpacePressed: isPressed }, false);
    }

    // Element CRUD
    addElement(element: Partial<CanvasElement>): string {
        const id = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newElement: CanvasElement = {
            id,
            type: 'text',
            name: 'New Element',
            x: 20,
            y: 20,
            width: 30,
            height: 10,
            rotation: 0,
            locked: false,
            visible: true,
            flipX: false,
            flipY: false,
            opacity: 1,
            ...element,
        };

        this.setState({
            elements: [...this.state.elements, newElement],
            selectedIds: [id],
        });

        logger.info('editor', 'Element added', { id, type: newElement.type, name: newElement.name });
        return id;
    }

    updateElement(id: string, updates: Partial<CanvasElement>): void {
        let elements = this.state.elements.map(el =>
            el.id === id ? { ...el, ...updates } : el
        );

        // --- Smart Layout Logic ---
        const targetEl = elements.find(el => el.id === id);
        if (targetEl) {
            // 1. Auto-Scale Text
            if (targetEl.type === 'text' && targetEl.autoScale && (updates.text || updates.width || updates.fontSize)) {
                // Approximate scaling logic since checking actual text metrics requires canvas
                // A better approach would be to do this in the component level, but logic belongs here for consistency.
                // We'll perform a heuristic check: if charCount * charWidth > width, reduce fontSize

                // Heuristic: Average char width is roughly fontSize * 0.6
                const fontSize = targetEl.fontSize || 24;
                const text = targetEl.text || "";
                const width = targetEl.width * 10; // Convert simplified % to pseudo-pixels (assuming 1000px canvas) roughly

                const avgCharWidth = fontSize * 0.55;
                const estimatedWidth = text.length * avgCharWidth;

                if (estimatedWidth > width) {
                    const newSize = Math.max(10, Math.floor(width / (text.length * 0.55)));
                    targetEl.fontSize = newSize;
                    elements = elements.map(el => el.id === id ? { ...el, fontSize: newSize } : el);
                    logger.debug('editor', 'Auto-scaled text', { id, oldSize: fontSize, newSize });
                }
            }

            // 2. Element Anchoring (Layout Shift)
            // If this element grew/shrunk, move dependent elements
            // Find elements anchored to this one
            const dependents = elements.filter(el => el.relativeTo === id);
            dependents.forEach(dep => {
                if (dep.anchor) {
                    // Start simple: If anchor is "bottom-left", place it below target
                    // Vertical Stack Logic
                    const spacing = 2; // 2% gap
                    if (dep.anchor.includes('bottom')) {
                        const newY = targetEl.y + targetEl.height + spacing;
                        if (newY !== dep.y) {
                            // Update dependent
                            elements = elements.map(el => el.id === dep.id ? { ...el, y: newY } : el);
                        }
                    }
                }
            });
        }

        this.setState({ elements });
        logger.debug('editor', 'Element updated', { id, keys: Object.keys(updates) });
    }

    deleteElement(id: string): void {
        const elements = this.state.elements.filter(el => el.id !== id);
        const selectedIds = this.state.selectedIds.filter(sid => sid !== id);
        this.setState({ elements, selectedIds });
        logger.info('editor', 'Element deleted', { id });
    }

    duplicateElement(id: string): string | null {
        const element = this.state.elements.find(el => el.id === id);
        if (!element) return null;

        const newId = this.addElement({
            ...element,
            name: `${element.name} Copy`,
            x: element.x + 3,
            y: element.y + 3,
        });

        logger.info('editor', 'Element duplicated', { originalId: id, newId });
        return newId;
    }

    // Selection
    setSelection(ids: string[]): void {
        this.setState({ selectedIds: ids }, false);
    }

    addToSelection(id: string): void {
        if (!this.state.selectedIds.includes(id)) {
            this.setState({ selectedIds: [...this.state.selectedIds, id] }, false);
        }
    }

    removeFromSelection(id: string): void {
        this.setState({ selectedIds: this.state.selectedIds.filter(sid => sid !== id) }, false);
    }

    clearSelection(): void {
        this.setState({ selectedIds: [] }, false);
    }

    getSelectedElements(): CanvasElement[] {
        return this.state.elements.filter(el => this.state.selectedIds.includes(el.id));
    }

    // Layer ordering
    bringToFront(id: string): void {
        const element = this.state.elements.find(el => el.id === id);
        if (!element) return;
        const elements = [...this.state.elements.filter(el => el.id !== id), element];
        this.setState({ elements });
        logger.debug('editor', 'Element brought to front', { id });
    }

    sendToBack(id: string): void {
        const element = this.state.elements.find(el => el.id === id);
        if (!element) return;
        const elements = [element, ...this.state.elements.filter(el => el.id !== id)];
        this.setState({ elements });
        logger.debug('editor', 'Element sent to back', { id });
    }

    bringForward(id: string): void {
        const index = this.state.elements.findIndex(el => el.id === id);
        if (index === -1 || index === this.state.elements.length - 1) return;
        const elements = [...this.state.elements];
        [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];
        this.setState({ elements });
    }

    sendBackward(id: string): void {
        const index = this.state.elements.findIndex(el => el.id === id);
        if (index <= 0) return;
        const elements = [...this.state.elements];
        [elements[index], elements[index - 1]] = [elements[index - 1], elements[index]];
        this.setState({ elements });
    }

    // Grid & Guides
    toggleGrid(visible?: boolean): void {
        if (!this.features.gridOverlay) return;
        this.setState({ gridVisible: visible ?? !this.state.gridVisible }, false);
        logger.debug('editor', 'Grid toggled', { visible: this.state.gridVisible });
    }

    setGridSize(size: number): void {
        this.setState({ gridSize: Math.max(5, Math.min(100, size)) }, false);
    }

    toggleRulers(visible?: boolean): void {
        if (!this.features.rulers) return;
        this.setState({ rulersVisible: visible ?? !this.state.rulersVisible }, false);
    }

    toggleSafeZones(visible?: boolean): void {
        this.setState({ safeZonesVisible: visible ?? !this.state.safeZonesVisible }, false);
        logger.debug('editor', 'Safe Zones toggled', { visible: this.state.safeZonesVisible });
    }

    addGuide(type: 'horizontal' | 'vertical', position: number): void {
        if (!this.features.snapToGuides) return;
        const guides = [...this.state.guides, { type, position }];
        this.setState({ guides }, false);
    }

    removeGuide(index: number): void {
        const guides = this.state.guides.filter((_, i) => i !== index);
        this.setState({ guides }, false);
    }

    // Background
    setBackgroundColor(color: string): void {
        this.setState({ backgroundColor: color });
        logger.debug('editor', 'Background color changed', { color });
    }

    setBackgroundImage(url: string | null): void {
        this.setState({ backgroundImage: url });
        logger.debug('editor', 'Background image changed', { hasImage: !!url });
    }

    // Snap calculations
    getSnapPosition(x: number, y: number, elementId?: string): { x: number; y: number } {
        if (!this.features.snapToGrid && !this.features.snapToGuides) {
            return { x, y };
        }

        let snapX = x;
        let snapY = y;
        const snapThreshold = 5;

        if (this.features.snapToGrid && this.state.gridVisible) {
            const { gridSize } = this.state;
            snapX = Math.round(x / gridSize) * gridSize;
            snapY = Math.round(y / gridSize) * gridSize;
        }

        if (this.features.snapToGuides) {
            for (const guide of this.state.guides) {
                if (guide.type === 'horizontal' && Math.abs(y - guide.position) < snapThreshold) {
                    snapY = guide.position;
                }
                if (guide.type === 'vertical' && Math.abs(x - guide.position) < snapThreshold) {
                    snapX = guide.position;
                }
            }
        }

        return { x: snapX, y: snapY };
    }

    // Alignment
    alignElements(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
        const selected = this.getSelectedElements();
        if (selected.length === 0) return;

        if (selected.length === 1) {
            const el = selected[0];
            let updates: Partial<CanvasElement> = {};

            switch (alignment) {
                case 'left': updates.x = 0; break;
                case 'center': updates.x = (100 - el.width) / 2; break;
                case 'right': updates.x = 100 - el.width; break;
                case 'top': updates.y = 0; break;
                case 'middle': updates.y = (100 - el.height) / 2; break;
                case 'bottom': updates.y = 100 - el.height; break;
            }

            this.updateElement(el.id, updates);
        }
    }

    // Export state
    exportState(): object {
        return {
            elements: this.state.elements,
            backgroundColor: this.state.backgroundColor,
            backgroundImage: this.state.backgroundImage,
            gridSize: this.state.gridSize,
            version: '1.0.0',
        };
    }

    // Import state
    importState(data: { elements: CanvasElement[]; backgroundColor?: string; backgroundImage?: string | null }): void {
        this.setState({
            elements: data.elements || [],
            backgroundColor: data.backgroundColor || '#1a1a2e',
            backgroundImage: data.backgroundImage || null,
        });
        logger.info('editor', 'Canvas state imported', { elementCount: data.elements?.length || 0 });
    }
}

// Singleton
let engineInstance: CanvasEngine | null = null;

export function getCanvasEngine(
    initialState?: Partial<CanvasState>,
    features?: Partial<EditorFeatures>
): CanvasEngine {
    if (!engineInstance) {
        engineInstance = new CanvasEngine(initialState, features);
    }
    return engineInstance;
}

export function resetCanvasEngine(): void {
    engineInstance = null;
}
