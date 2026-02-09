/**
 * Editor Controllers - Enterprise-level action handlers
 * Centralized controller for editor operations with logging
 */

import { logger } from '@/lib/logger';
import { CanvasEngine, CanvasElement, getCanvasEngine } from './canvas-engine';
import { getFeatureTracker } from './feature-tracker';

/**
 * Selection Controller
 */
export class SelectionController {
    private engine: CanvasEngine;

    constructor(engine: CanvasEngine) {
        this.engine = engine;
    }

    select(id: string): void {
        const element = this.engine.getState().elements.find(el => el.id === id);
        if (!element) {
            logger.warn('editor', 'Cannot select: element not found', { id });
            return;
        }
        if (element.locked) {
            logger.debug('editor', 'Cannot select: element is locked', { id });
            return;
        }
        this.engine.setSelection([id]);
        logger.debug('editor', 'Element selected', { id, name: element.name });
    }

    addToSelection(id: string): void {
        const tracker = getFeatureTracker();
        if (!tracker.isImplemented('multi_select')) {
            logger.debug('editor', 'Multi-select not yet implemented');
            this.select(id);
            return;
        }
        this.engine.addToSelection(id);
    }

    deselect(): void {
        this.engine.clearSelection();
        logger.debug('editor', 'Selection cleared');
    }

    selectAll(): void {
        const elements = this.engine.getState().elements.filter(el => !el.locked && el.visible);
        this.engine.setSelection(elements.map(el => el.id));
        logger.debug('editor', 'All elements selected', { count: elements.length });
    }
}

/**
 * Transform Controller
 */
export class TransformController {
    private engine: CanvasEngine;

    constructor(engine: CanvasEngine) {
        this.engine = engine;
    }

    move(id: string, x: number, y: number): void {
        const snapped = this.engine.getSnapPosition(x, y, id);
        this.engine.updateElement(id, { x: snapped.x, y: snapped.y });
    }

    resize(id: string, width: number, height: number, maintainAspect = false): void {
        const element = this.engine.getState().elements.find(el => el.id === id);
        if (!element) return;

        let newWidth = Math.max(5, width);
        let newHeight = Math.max(5, height);

        if (maintainAspect && element.width && element.height) {
            const aspectRatio = element.width / element.height;
            newHeight = newWidth / aspectRatio;
        }

        this.engine.updateElement(id, { width: newWidth, height: newHeight });
    }

    rotate(id: string, angle: number, snapAngle = false): void {
        let rotation = angle;
        if (snapAngle) {
            rotation = Math.round(angle / 15) * 15;
        }
        rotation = ((rotation % 360) + 360) % 360;
        this.engine.updateElement(id, { rotation });
        logger.debug('editor', 'Element rotated', { id, rotation });
    }

    flip(id: string, direction: 'horizontal' | 'vertical'): void {
        const element = this.engine.getState().elements.find(el => el.id === id);
        if (!element) return;

        if (direction === 'horizontal') {
            this.engine.updateElement(id, { flipX: !element.flipX });
        } else {
            this.engine.updateElement(id, { flipY: !element.flipY });
        }
        logger.debug('editor', 'Element flipped', { id, direction });
    }

    nudge(id: string, direction: 'up' | 'down' | 'left' | 'right', amount = 1): void {
        const element = this.engine.getState().elements.find(el => el.id === id);
        if (!element) return;

        let { x, y } = element;
        switch (direction) {
            case 'up': y = Math.max(0, y - amount); break;
            case 'down': y = Math.min(100 - element.height, y + amount); break;
            case 'left': x = Math.max(0, x - amount); break;
            case 'right': x = Math.min(100 - element.width, x + amount); break;
        }
        this.engine.updateElement(id, { x, y });
    }
}

/**
 * Element Controller
 */
export class ElementController {
    private engine: CanvasEngine;

    constructor(engine: CanvasEngine) {
        this.engine = engine;
    }

    addText(preset: 'heading' | 'subheading' | 'body'): string {
        const presets = {
            heading: { name: 'Heading', fontSize: 32, fontWeight: 'bold' as const, width: 80 },
            subheading: { name: 'Subheading', fontSize: 20, fontWeight: 'normal' as const, width: 60 },
            body: { name: 'Body Text', fontSize: 14, fontWeight: 'normal' as const, width: 50 },
        };

        const config = presets[preset];
        const id = this.engine.addElement({
            type: 'text',
            name: config.name,
            text: `Add a ${preset}`,
            fontSize: config.fontSize,
            fontWeight: config.fontWeight,
            color: '#ffffff',
            width: config.width,
            height: 10,
        });

        logger.info('editor', 'Text element added', { id, preset });
        return id;
    }

    addShape(shapeType: CanvasElement['shapeType']): string {
        const id = this.engine.addElement({
            type: 'shape',
            name: shapeType ? shapeType.charAt(0).toUpperCase() + shapeType.slice(1) : 'Shape',
            shapeType,
            fillColor: '#6366f1',
            width: 20,
            height: 20,
        });

        logger.info('editor', 'Shape element added', { id, shapeType });
        return id;
    }

    addImage(imageUrl: string): string {
        const id = this.engine.addElement({
            type: 'image',
            name: 'Image',
            imageUrl,
            width: 40,
            height: 40,
            borderRadius: 0,
        });

        logger.info('editor', 'Image element added', { id });
        return id;
    }

    delete(id: string): void {
        this.engine.deleteElement(id);
    }

    duplicate(id: string): string | null {
        return this.engine.duplicateElement(id);
    }

    setLocked(id: string, locked: boolean): void {
        this.engine.updateElement(id, { locked });
        logger.debug('editor', 'Element lock toggled', { id, locked });
    }

    setVisible(id: string, visible: boolean): void {
        this.engine.updateElement(id, { visible });
        logger.debug('editor', 'Element visibility toggled', { id, visible });
    }
}

/**
 * Layer Controller
 */
export class LayerController {
    private engine: CanvasEngine;

    constructor(engine: CanvasEngine) {
        this.engine = engine;
    }

    bringToFront(id: string): void {
        this.engine.bringToFront(id);
    }

    sendToBack(id: string): void {
        this.engine.sendToBack(id);
    }

    bringForward(id: string): void {
        this.engine.bringForward(id);
    }

    sendBackward(id: string): void {
        this.engine.sendBackward(id);
    }
}

/**
 * Clipboard Controller
 */
export class ClipboardController {
    private engine: CanvasEngine;
    private clipboard: CanvasElement | null = null;

    constructor(engine: CanvasEngine) {
        this.engine = engine;
    }

    copy(id: string): void {
        const element = this.engine.getState().elements.find(el => el.id === id);
        if (!element) {
            logger.warn('editor', 'Cannot copy: element not found', { id });
            return;
        }
        this.clipboard = { ...element };
        logger.debug('editor', 'Element copied to clipboard', { id, name: element.name });
    }

    cut(id: string): void {
        this.copy(id);
        this.engine.deleteElement(id);
        logger.debug('editor', 'Element cut', { id });
    }

    paste(): string | null {
        if (!this.clipboard) {
            logger.debug('editor', 'Nothing to paste');
            return null;
        }

        const id = this.engine.addElement({
            ...this.clipboard,
            name: `${this.clipboard.name} Copy`,
            x: this.clipboard.x + 3,
            y: this.clipboard.y + 3,
        });

        logger.debug('editor', 'Element pasted', { id });
        return id;
    }

    hasContent(): boolean {
        return this.clipboard !== null;
    }
}

/**
 * Zoom Controller
 */
export class ZoomController {
    private engine: CanvasEngine;

    constructor(engine: CanvasEngine) {
        this.engine = engine;
    }

    setZoom(zoom: number): void {
        this.engine.setZoom(zoom);
    }

    zoomIn(step = 0.1): void {
        this.engine.zoomIn(step);
    }

    zoomOut(step = 0.1): void {
        this.engine.zoomOut(step);
    }

    zoomToFit(): void {
        this.engine.zoomToFit();
    }

    handleWheelZoom(deltaY: number, ctrlKey: boolean): void {
        if (!this.engine.isFeatureEnabled('mouseWheelZoom')) return;

        if (ctrlKey) {
            const direction = deltaY > 0 ? -1 : 1;
            const step = 0.05;
            const currentZoom = this.engine.getState().zoom;
            this.engine.setZoom(currentZoom + (direction * step));
        }
    }

    setPan(x: number, y: number): void {
        this.engine.setPan(x, y);
    }

    pan(deltaX: number, deltaY: number): void {
        if (!this.engine.isFeatureEnabled('spacebarPan')) return;
        this.engine.pan(deltaX, deltaY);
    }
}

/**
 * Grid Controller
 */
export class GridController {
    private engine: CanvasEngine;

    constructor(engine: CanvasEngine) {
        this.engine = engine;
    }

    toggleGrid(visible?: boolean): void {
        this.engine.toggleGrid(visible);
    }

    setGridSize(size: number): void {
        this.engine.setGridSize(size);
    }

    toggleRulers(visible?: boolean): void {
        this.engine.toggleRulers(visible);
    }

    addGuide(type: 'horizontal' | 'vertical', position: number): void {
        this.engine.addGuide(type, position);
    }

    removeGuide(index: number): void {
        this.engine.removeGuide(index);
    }
}

/**
 * Master Editor Controller - Facade for all controllers
 */
export class EditorController {
    private engine: CanvasEngine;

    public selection: SelectionController;
    public transform: TransformController;
    public element: ElementController;
    public layer: LayerController;
    public clipboard: ClipboardController;
    public zoom: ZoomController;
    public grid: GridController;

    constructor(engine?: CanvasEngine) {
        this.engine = engine || getCanvasEngine();

        this.selection = new SelectionController(this.engine);
        this.transform = new TransformController(this.engine);
        this.element = new ElementController(this.engine);
        this.layer = new LayerController(this.engine);
        this.clipboard = new ClipboardController(this.engine);
        this.zoom = new ZoomController(this.engine);
        this.grid = new GridController(this.engine);

        logger.info('editor', 'EditorController initialized');
    }

    getEngine(): CanvasEngine {
        return this.engine;
    }

    undo(): void {
        this.engine.undo();
    }

    redo(): void {
        this.engine.redo();
    }

    canUndo(): boolean {
        return this.engine.canUndo();
    }

    canRedo(): boolean {
        return this.engine.canRedo();
    }

    exportState(): object {
        return this.engine.exportState();
    }

    importState(data: { elements: CanvasElement[] }): void {
        this.engine.importState(data);
    }
}

// Singleton
let controllerInstance: EditorController | null = null;

export function getEditorController(engine?: CanvasEngine): EditorController {
    if (!controllerInstance) {
        controllerInstance = new EditorController(engine);
    }
    return controllerInstance;
}

export function resetEditorController(): void {
    controllerInstance = null;
}
