import { useState, useCallback, useRef, useEffect } from 'react';
import { useCanvasEngine, CanvasElement } from '@/lib/stores/canvas-engine';
import { ElementController, ResizeHandle, DragState, ResizeState, RotateState } from '@/lib/canvas/element-controller';
import { useElementSnap } from './use-element-snap';

/**
 * Hook for element drag behavior
 */
export function useElementDrag(elementId: string | null) {
    const { elements, updateElement, width, height } = useCanvasEngine();
    const [dragState, setDragState] = useState<DragState | null>(null);
    const controllerRef = useRef(new ElementController(width, height));
    const { applySnap, endSnap } = useElementSnap(elementId);

    // Update controller when canvas size changes
    useEffect(() => {
        controllerRef.current = new ElementController(width, height);
    }, [width, height]);

    const startDrag = useCallback((element: CanvasElement, e: React.MouseEvent) => {
        const state = controllerRef.current.startDrag(element, e.clientX, e.clientY);
        setDragState(state);
    }, []);

    const updateDrag = useCallback((e: MouseEvent) => {
        if (!dragState || !elementId) return;

        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        const { x, y } = controllerRef.current.updateDrag(
            dragState,
            e.clientX,
            e.clientY,
            e.shiftKey
        );

        // Apply snapping
        const snapped = applySnap(element, x, y);

        // Apply soft edge resistance
        const resisted = controllerRef.current.applySoftEdgeResistance(
            element,
            snapped.x,
            snapped.y
        );

        updateElement(elementId, resisted);
    }, [dragState, elementId, elements, updateElement, applySnap]);

    const endDrag = useCallback(() => {
        setDragState(null);
        endSnap();
    }, [endSnap]);

    // Mouse event handlers
    useEffect(() => {
        if (!dragState) return;

        window.addEventListener('mousemove', updateDrag);
        window.addEventListener('mouseup', endDrag);

        return () => {
            window.removeEventListener('mousemove', updateDrag);
            window.removeEventListener('mouseup', endDrag);
        };
    }, [dragState, updateDrag, endDrag]);

    return {
        startDrag,
        isDragging: dragState !== null
    };
}

/**
 * Hook for element resize behavior
 */
export function useElementResize(elementId: string | null) {
    const { elements, updateElement, width, height } = useCanvasEngine();
    const [resizeState, setResizeState] = useState<ResizeState | null>(null);
    const controllerRef = useRef(new ElementController(width, height));

    useEffect(() => {
        controllerRef.current = new ElementController(width, height);
    }, [width, height]);

    const startResize = useCallback((
        element: CanvasElement,
        handle: ResizeHandle,
        e: React.MouseEvent
    ) => {
        const state = controllerRef.current.startResize(element, handle, e.clientX, e.clientY);
        setResizeState(state);
    }, []);

    const updateResize = useCallback((e: MouseEvent) => {
        if (!resizeState || !elementId) return;

        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        const result = controllerRef.current.updateResize(
            element,
            resizeState,
            e.clientX,
            e.clientY,
            e.shiftKey
        );

        updateElement(elementId, result);
    }, [resizeState, elementId, elements, updateElement]);

    const endResize = useCallback(() => {
        setResizeState(null);
    }, []);

    useEffect(() => {
        if (!resizeState) return;

        window.addEventListener('mousemove', updateResize);
        window.addEventListener('mouseup', endResize);

        return () => {
            window.removeEventListener('mousemove', updateResize);
            window.removeEventListener('mouseup', endResize);
        };
    }, [resizeState, updateResize, endResize]);

    return {
        startResize,
        isResizing: resizeState !== null
    };
}

/**
 * Hook for element rotation behavior
 */
export function useElementRotate(elementId: string | null) {
    const { elements, updateElement } = useCanvasEngine();
    const [rotateState, setRotateState] = useState<RotateState | null>(null);
    const controller = useRef(new ElementController(1080, 1920));

    const startRotate = useCallback((element: CanvasElement, e: React.MouseEvent) => {
        const state = controller.current.startRotate(element, e.clientX, e.clientY);
        setRotateState(state);
    }, []);

    const updateRotate = useCallback((e: MouseEvent) => {
        if (!rotateState || !elementId) return;

        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        const rotation = controller.current.updateRotate(
            element,
            rotateState,
            e.clientX,
            e.clientY,
            e.shiftKey
        );

        updateElement(elementId, { rotation });
    }, [rotateState, elementId, elements, updateElement]);

    const endRotate = useCallback(() => {
        setRotateState(null);
    }, []);

    useEffect(() => {
        if (!rotateState) return;

        window.addEventListener('mousemove', updateRotate);
        window.addEventListener('mouseup', endRotate);

        return () => {
            window.removeEventListener('mousemove', updateRotate);
            window.removeEventListener('mouseup', endRotate);
        };
    }, [rotateState, updateRotate, endRotate]);

    return {
        startRotate,
        isRotating: rotateState !== null
    };
}

/**
 * Combined hook for all element interactions
 */
export function useElementInteraction(elementId: string | null) {
    const drag = useElementDrag(elementId);
    const resize = useElementResize(elementId);
    const rotate = useElementRotate(elementId);

    return {
        ...drag,
        ...resize,
        ...rotate,
        isInteracting: drag.isDragging || resize.isResizing || rotate.isRotating
    };
}
