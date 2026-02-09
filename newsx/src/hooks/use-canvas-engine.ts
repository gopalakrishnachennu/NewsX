/**
 * useCanvasEngine Hook
 * React hook for using the Canvas Engine with automatic state sync
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    getCanvasEngine,
    CanvasEngine,
    CanvasState,
    CanvasElement,
    EditorFeatures,
    DEFAULT_FEATURES
} from '@/lib/editor';
import { getEditorController, EditorController } from '@/lib/editor';
import { logger } from '@/lib/logger';

interface UseCanvasEngineOptions {
    initialState?: Partial<CanvasState>;
    features?: Partial<EditorFeatures>;
}

interface UseCanvasEngineReturn {
    // State
    state: CanvasState;
    elements: CanvasElement[];
    selectedIds: string[];
    selectedElement: CanvasElement | undefined;
    zoom: number;
    panX: number;
    panY: number;
    gridVisible: boolean;
    gridSize: number;
    isPanning: boolean;
    isSpacePressed: boolean;

    // Engine & Controller
    engine: CanvasEngine;
    controller: EditorController;

    // Feature checks
    isFeatureEnabled: (feature: keyof EditorFeatures) => boolean;

    // Quick actions
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;

    // Zoom
    setZoom: (zoom: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;

    // Selection
    select: (id: string) => void;
    deselect: () => void;
    selectAll: () => void;

    // Elements
    addText: (preset: 'heading' | 'subheading' | 'body') => string;
    addShape: (shapeType: CanvasElement['shapeType']) => string;
    addImage: (imageUrl: string) => string;
    updateElement: (id: string, updates: Partial<CanvasElement>) => void;
    deleteElement: (id: string) => void;
    duplicateElement: (id: string) => string | null;

    // Clipboard
    copy: (id: string) => void;
    cut: (id: string) => void;
    paste: () => string | null;

    // Layers
    bringToFront: (id: string) => void;
    sendToBack: (id: string) => void;

    // Transform
    move: (id: string, x: number, y: number) => void;
    resize: (id: string, width: number, height: number) => void;
    rotate: (id: string, angle: number) => void;
    flip: (id: string, direction: 'horizontal' | 'vertical') => void;
    nudge: (id: string, direction: 'up' | 'down' | 'left' | 'right', amount?: number) => void;

    // Grid
    toggleGrid: () => void;
    setGridSize: (size: number) => void;

    // Pan
    setPan: (x: number, y: number) => void;
    pan: (deltaX: number, deltaY: number) => void;
    setIsPanning: (isPanning: boolean) => void;
    setSpacePressed: (isPressed: boolean) => void;

    // Background
    setBackgroundColor: (color: string) => void;
    setBackgroundImage: (url: string | null) => void;
}

export function useCanvasEngine(options: UseCanvasEngineOptions = {}): UseCanvasEngineReturn {
    const engine = useMemo(() => getCanvasEngine(options.initialState, options.features), []);
    const controller = useMemo(() => getEditorController(engine), [engine]);

    const [state, setState] = useState<CanvasState>(engine.getState());

    // Subscribe to engine changes
    useEffect(() => {
        const unsubscribe = engine.subscribe((newState) => {
            setState(newState);
        });

        logger.debug('editor', 'useCanvasEngine mounted');

        return () => {
            unsubscribe();
            logger.debug('editor', 'useCanvasEngine unmounted');
        };
    }, [engine]);

    // Derived state
    const selectedElement = useMemo(() =>
        state.elements.find(el => state.selectedIds.includes(el.id)),
        [state.elements, state.selectedIds]
    );

    const canUndo = engine.canUndo();
    const canRedo = engine.canRedo();

    // Feature check
    const isFeatureEnabled = useCallback((feature: keyof EditorFeatures) =>
        engine.isFeatureEnabled(feature),
        [engine]
    );

    // Wrapped functions for better DX
    const setZoom = useCallback((zoom: number) => controller.zoom.setZoom(zoom), [controller]);
    const zoomIn = useCallback(() => controller.zoom.zoomIn(), [controller]);
    const zoomOut = useCallback(() => controller.zoom.zoomOut(), [controller]);

    const select = useCallback((id: string) => controller.selection.select(id), [controller]);
    const deselect = useCallback(() => controller.selection.deselect(), [controller]);
    const selectAll = useCallback(() => controller.selection.selectAll(), [controller]);

    const addText = useCallback((preset: 'heading' | 'subheading' | 'body') =>
        controller.element.addText(preset), [controller]);
    const addShape = useCallback((shapeType: CanvasElement['shapeType']) =>
        controller.element.addShape(shapeType), [controller]);
    const addImage = useCallback((imageUrl: string) =>
        controller.element.addImage(imageUrl), [controller]);
    const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) =>
        engine.updateElement(id, updates), [engine]);
    const deleteElement = useCallback((id: string) =>
        controller.element.delete(id), [controller]);
    const duplicateElement = useCallback((id: string) =>
        controller.element.duplicate(id), [controller]);

    const copy = useCallback((id: string) => controller.clipboard.copy(id), [controller]);
    const cut = useCallback((id: string) => controller.clipboard.cut(id), [controller]);
    const paste = useCallback(() => controller.clipboard.paste(), [controller]);

    const bringToFront = useCallback((id: string) => controller.layer.bringToFront(id), [controller]);
    const sendToBack = useCallback((id: string) => controller.layer.sendToBack(id), [controller]);

    const move = useCallback((id: string, x: number, y: number) =>
        controller.transform.move(id, x, y), [controller]);
    const resize = useCallback((id: string, width: number, height: number) =>
        controller.transform.resize(id, width, height), [controller]);
    const rotate = useCallback((id: string, angle: number) =>
        controller.transform.rotate(id, angle), [controller]);
    const flip = useCallback((id: string, direction: 'horizontal' | 'vertical') =>
        controller.transform.flip(id, direction), [controller]);
    const nudge = useCallback((id: string, direction: 'up' | 'down' | 'left' | 'right', amount = 1) =>
        controller.transform.nudge(id, direction, amount), [controller]);

    const toggleGrid = useCallback(() => controller.grid.toggleGrid(), [controller]);
    const setGridSize = useCallback((size: number) => controller.grid.setGridSize(size), [controller]);

    const setPan = useCallback((x: number, y: number) => controller.zoom.setPan(x, y), [controller]);
    const pan = useCallback((deltaX: number, deltaY: number) => controller.zoom.pan(deltaX, deltaY), [controller]);
    const setIsPanning = useCallback((isPanning: boolean) => engine.setIsPanning(isPanning), [engine]);
    const setSpacePressed = useCallback((isPressed: boolean) => engine.setSpacePressed(isPressed), [engine]);

    const setBackgroundColor = useCallback((color: string) => engine.setBackgroundColor(color), [engine]);
    const setBackgroundImage = useCallback((url: string | null) => engine.setBackgroundImage(url), [engine]);

    const undo = useCallback(() => controller.undo(), [controller]);
    const redo = useCallback(() => controller.redo(), [controller]);

    return {
        // State
        state,
        elements: state.elements,
        selectedIds: state.selectedIds,
        selectedElement,
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        gridVisible: state.gridVisible,
        gridSize: state.gridSize,
        isPanning: state.isPanning,
        isSpacePressed: state.isSpacePressed,

        // Engine & Controller
        engine,
        controller,

        // Feature check
        isFeatureEnabled,

        // Quick actions
        undo,
        redo,
        canUndo,
        canRedo,

        // Zoom
        setZoom,
        zoomIn,
        zoomOut,

        // Selection
        select,
        deselect,
        selectAll,

        // Elements
        addText,
        addShape,
        addImage,
        updateElement,
        deleteElement,
        duplicateElement,

        // Clipboard
        copy,
        cut,
        paste,

        // Layers
        bringToFront,
        sendToBack,

        // Transform
        move,
        resize,
        rotate,
        flip,
        nudge,

        // Grid
        toggleGrid,
        setGridSize,

        // Pan
        setPan,
        pan,
        setIsPanning,
        setSpacePressed,

        // Background
        setBackgroundColor,
        setBackgroundImage,
    };
}
