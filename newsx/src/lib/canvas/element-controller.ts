import { CanvasElement } from '../stores/canvas-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface DragState {
    isDragging: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
}

export interface ResizeState {
    isResizing: boolean;
    handle: ResizeHandle | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
}

export interface RotateState {
    isRotating: boolean;
    startAngle: number;
    centerX: number;
    centerY: number;
}

export type ResizeHandle =
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top'
    | 'right'
    | 'bottom'
    | 'left';

export interface ElementBounds {
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
}

// ============================================================================
// ELEMENT CONTROLLER
// ============================================================================

export class ElementController {
    private canvasWidth: number;
    private canvasHeight: number;

    constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    // ========================================================================
    // DRAG OPERATIONS
    // ========================================================================

    /**
     * Start drag operation
     */
    startDrag(element: CanvasElement, mouseX: number, mouseY: number): DragState {
        return {
            isDragging: true,
            startX: element.x,
            startY: element.y,
            offsetX: mouseX - element.x,
            offsetY: mouseY - element.y
        };
    }

    /**
     * Calculate new position during drag
     */
    updateDrag(
        dragState: DragState,
        mouseX: number,
        mouseY: number,
        shiftKey: boolean = false
    ): { x: number; y: number } {
        let newX = mouseX - dragState.offsetX;
        let newY = mouseY - dragState.offsetY;

        // Shift key = lock to axis
        if (shiftKey) {
            const deltaX = Math.abs(newX - dragState.startX);
            const deltaY = Math.abs(newY - dragState.startY);

            if (deltaX > deltaY) {
                newY = dragState.startY; // Lock Y axis
            } else {
                newX = dragState.startX; // Lock X axis
            }
        }

        return { x: newX, y: newY };
    }

    // ========================================================================
    // RESIZE OPERATIONS
    // ========================================================================

    /**
     * Start resize operation
     */
    startResize(
        element: CanvasElement,
        handle: ResizeHandle,
        mouseX: number,
        mouseY: number
    ): ResizeState {
        return {
            isResizing: true,
            handle,
            startX: mouseX,
            startY: mouseY,
            startWidth: element.width,
            startHeight: element.height,
            aspectRatio: element.width / element.height
        };
    }

    /**
     * Calculate new dimensions during resize
     */
    updateResize(
        element: CanvasElement,
        resizeState: ResizeState,
        mouseX: number,
        mouseY: number,
        shiftKey: boolean = false
    ): { x: number; y: number; width: number; height: number } {
        const { handle, startX, startY, startWidth, startHeight, aspectRatio } = resizeState;

        let newX = element.x;
        let newY = element.y;
        let newWidth = element.width;
        let newHeight = element.height;

        const deltaX = mouseX - startX;
        const deltaY = mouseY - startY;

        // Determine if aspect ratio should be locked
        const lockAspectRatio = element.aspectRatioLocked || shiftKey;

        switch (handle) {
            case 'top-left':
                newWidth = startWidth - deltaX;
                newHeight = lockAspectRatio ? newWidth / aspectRatio : startHeight - deltaY;
                newX = element.x + startWidth - newWidth;
                newY = element.y + startHeight - newHeight;
                break;

            case 'top-right':
                newWidth = startWidth + deltaX;
                newHeight = lockAspectRatio ? newWidth / aspectRatio : startHeight - deltaY;
                newY = element.y + startHeight - newHeight;
                break;

            case 'bottom-left':
                newWidth = startWidth - deltaX;
                newHeight = lockAspectRatio ? newWidth / aspectRatio : startHeight + deltaY;
                newX = element.x + startWidth - newWidth;
                break;

            case 'bottom-right':
                newWidth = startWidth + deltaX;
                newHeight = lockAspectRatio ? newWidth / aspectRatio : startHeight + deltaY;
                break;

            case 'top':
                newHeight = startHeight - deltaY;
                if (lockAspectRatio) {
                    newWidth = newHeight * aspectRatio;
                    newX = element.x - (newWidth - startWidth) / 2;
                }
                newY = element.y + startHeight - newHeight;
                break;

            case 'right':
                newWidth = startWidth + deltaX;
                if (lockAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                    newY = element.y - (newHeight - startHeight) / 2;
                }
                break;

            case 'bottom':
                newHeight = startHeight + deltaY;
                if (lockAspectRatio) {
                    newWidth = newHeight * aspectRatio;
                    newX = element.x - (newWidth - startWidth) / 2;
                }
                break;

            case 'left':
                newWidth = startWidth - deltaX;
                if (lockAspectRatio) {
                    newHeight = newWidth / aspectRatio;
                    newY = element.y - (newHeight - startHeight) / 2;
                }
                newX = element.x + startWidth - newWidth;
                break;
        }

        // Apply minimum size constraints
        const bounds = this.getElementBounds(element);
        newWidth = Math.max(bounds.minWidth, Math.min(bounds.maxWidth, newWidth));
        newHeight = Math.max(bounds.minHeight, Math.min(bounds.maxHeight, newHeight));

        return { x: newX, y: newY, width: newWidth, height: newHeight };
    }

    // ========================================================================
    // ROTATION OPERATIONS
    // ========================================================================

    /**
     * Start rotation operation
     */
    startRotate(element: CanvasElement, mouseX: number, mouseY: number): RotateState {
        const centerX = element.x + element.width / 2;
        const centerY = element.y + element.height / 2;
        const startAngle = this.calculateAngle(centerX, centerY, mouseX, mouseY);

        return {
            isRotating: true,
            startAngle,
            centerX,
            centerY
        };
    }

    /**
     * Update rotation during drag
     */
    updateRotate(
        element: CanvasElement,
        rotateState: RotateState,
        mouseX: number,
        mouseY: number,
        shiftKey: boolean = false
    ): number {
        const currentAngle = this.calculateAngle(
            rotateState.centerX,
            rotateState.centerY,
            mouseX,
            mouseY
        );

        let rotation = element.rotation + (currentAngle - rotateState.startAngle);

        // Snap to 45-degree increments if Shift is held
        if (shiftKey) {
            const snapAngle = 45;
            rotation = Math.round(rotation / snapAngle) * snapAngle;
        }

        // Normalize to 0-360
        rotation = ((rotation % 360) + 360) % 360;

        return rotation;
    }

    /**
     * Calculate angle from center to point
     */
    private calculateAngle(centerX: number, centerY: number, pointX: number, pointY: number): number {
        const dx = pointX - centerX;
        const dy = pointY - centerY;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    // ========================================================================
    // CONSTRAINTS & BOUNDS
    // ========================================================================

    /**
     * Get element size constraints based on type
     */
    getElementBounds(element: CanvasElement): ElementBounds {
        const bounds: ElementBounds = {
            minWidth: 20,
            minHeight: 20,
            maxWidth: this.canvasWidth,
            maxHeight: this.canvasHeight
        };

        // Type-specific constraints
        switch (element.type) {
            case 'text':
                bounds.minWidth = 50;
                bounds.minHeight = 20;
                break;
            case 'video':
            case 'image':
                bounds.minWidth = 100;
                bounds.minHeight = 100;
                break;
            case 'shape':
                bounds.minWidth = 20;
                bounds.minHeight = 20;
                break;
        }

        return bounds;
    }

    /**
     * Constrain element to canvas bounds
     */
    constrainToCanvas(element: CanvasElement): CanvasElement {
        let { x, y, width, height } = element;

        // Prevent element from going off-canvas
        x = Math.max(0, Math.min(x, this.canvasWidth - width));
        y = Math.max(0, Math.min(y, this.canvasHeight - height));

        // If element is larger than canvas, resize it
        if (width > this.canvasWidth) {
            width = this.canvasWidth;
        }
        if (height > this.canvasHeight) {
            height = this.canvasHeight;
        }

        return { ...element, x, y, width, height };
    }

    /**
     * Add soft resistance near edges
     */
    applySoftEdgeResistance(
        element: CanvasElement,
        proposedX: number,
        proposedY: number,
        resistanceZone: number = 20
    ): { x: number; y: number } {
        let x = proposedX;
        let y = proposedY;

        const right = proposedX + element.width;
        const bottom = proposedY + element.height;

        // Apply resistance near edges
        if (proposedX < resistanceZone) {
            const t = proposedX / resistanceZone;
            x = this.easeOut(t) * resistanceZone;
        }

        if (right > this.canvasWidth - resistanceZone) {
            const t = (this.canvasWidth - right) / resistanceZone;
            x = this.canvasWidth - element.width - (this.easeOut(1 - t) * resistanceZone);
        }

        if (proposedY < resistanceZone) {
            const t = proposedY / resistanceZone;
            y = this.easeOut(t) * resistanceZone;
        }

        if (bottom > this.canvasHeight - resistanceZone) {
            const t = (this.canvasHeight - bottom) / resistanceZone;
            y = this.canvasHeight - element.height - (this.easeOut(1 - t) * resistanceZone);
        }

        return { x, y };
    }

    private easeOut(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }
}
