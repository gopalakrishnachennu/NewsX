/**
 * Canvas Engine - Unit Tests
 * Tests for Phase 1.1: Canvas Core System
 */

import { useCanvasEngine } from '../canvas-engine';

describe('Canvas Engine - Core System', () => {
    beforeEach(() => {
        // Reset store before each test
        useCanvasEngine.setState({
            elements: [],
            selectedElementIds: [],
            guides: [],
            zoom: 1.0,
            pan: { x: 0, y: 0 }
        });
    });

    describe('Canvas Configuration', () => {
        test('should have default canvas size (1080x1920)', () => {
            const { width, height, aspectRatio } = useCanvasEngine.getState();
            expect(width).toBe(1080);
            expect(height).toBe(1920);
            expect(aspectRatio).toBeCloseTo(1080 / 1920);
        });

        test('should update canvas size and reset zoom', () => {
            const { setCanvasSize } = useCanvasEngine.getState();
            setCanvasSize(1920, 1080); // Landscape

            const { width, height, aspectRatio, zoom } = useCanvasEngine.getState();
            expect(width).toBe(1920);
            expect(height).toBe(1080);
            expect(aspectRatio).toBeCloseTo(1920 / 1080);
            expect(zoom).toBe(1.0);
        });
    });

    describe('Zoom & Pan', () => {
        test('should constrain zoom between 0.1 and 4.0', () => {
            const { setZoom } = useCanvasEngine.getState();

            setZoom(5.0);
            expect(useCanvasEngine.getState().zoom).toBe(4.0);

            setZoom(0.05);
            expect(useCanvasEngine.getState().zoom).toBe(0.1);

            setZoom(2.0);
            expect(useCanvasEngine.getState().zoom).toBe(2.0);
        });

        test('should not allow pan when zoom is 1.0 or less', () => {
            const { setPan, setZoom } = useCanvasEngine.getState();

            setZoom(1.0);
            setPan(100, 100);
            expect(useCanvasEngine.getState().pan).toEqual({ x: 0, y: 0 });
        });

        test('should allow pan when zoomed in', () => {
            const { setPan, setZoom } = useCanvasEngine.getState();

            setZoom(2.0);
            setPan(100, 50);
            expect(useCanvasEngine.getState().pan).toEqual({ x: 100, y: 50 });
        });
    });

    describe('Element Management', () => {
        test('should add element with auto-incremented z-index', () => {
            const { addElement } = useCanvasEngine.getState();

            const id1 = addElement({
                type: 'text',
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                startTime: 0,
                endTime: 10,
                data: { text: 'Hello' }
            });

            const id2 = addElement({
                type: 'image',
                x: 200,
                y: 200,
                width: 300,
                height: 300,
                startTime: 0,
                endTime: 10,
                data: { url: 'test.jpg' }
            });

            const { elements } = useCanvasEngine.getState();
            expect(elements).toHaveLength(2);
            expect(elements[0].zIndex).toBe(1);
            expect(elements[1].zIndex).toBe(2);
        });

        test('should constrain element to bounds on add', () => {
            const { addElement, width, height } = useCanvasEngine.getState();

            // Try to add element outside bounds
            const id = addElement({
                type: 'text',
                x: 2000, // Beyond canvas width
                y: 3000, // Beyond canvas height
                width: 200,
                height: 50,
                startTime: 0,
                endTime: 10,
                data: {}
            });

            const element = useCanvasEngine.getState().elements.find(e => e.id === id);
            expect(element!.x).toBeLessThanOrEqual(width - element!.width);
            expect(element!.y).toBeLessThanOrEqual(height - element!.height);
        });

        test('should update element and re-constrain', () => {
            const { addElement, updateElement, width } = useCanvasEngine.getState();

            const id = addElement({
                type: 'text',
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                startTime: 0,
                endTime: 10,
                data: {}
            });

            updateElement(id, { x: 5000 }); // Try to move outside

            const element = useCanvasEngine.getState().elements.find(e => e.id === id);
            expect(element!.x).toBeLessThanOrEqual(width - element!.width);
        });

        test('should remove element and clear from selection', () => {
            const { addElement, removeElement, selectElement } = useCanvasEngine.getState();

            const id = addElement({
                type: 'text',
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                startTime: 0,
                endTime: 10,
                data: {}
            });

            selectElement(id);
            expect(useCanvasEngine.getState().selectedElementIds).toContain(id);

            removeElement(id);
            expect(useCanvasEngine.getState().elements).toHaveLength(0);
            expect(useCanvasEngine.getState().selectedElementIds).toHaveLength(0);
        });
    });

    describe('Selection Management', () => {
        test('should select single element', () => {
            const { addElement, selectElement } = useCanvasEngine.getState();

            const id1 = addElement({ type: 'text', x: 0, y: 0, width: 100, height: 100, startTime: 0, endTime: 10, data: {} });
            const id2 = addElement({ type: 'text', x: 0, y: 0, width: 100, height: 100, startTime: 0, endTime: 10, data: {} });

            selectElement(id1);
            expect(useCanvasEngine.getState().selectedElementIds).toEqual([id1]);

            selectElement(id2);
            expect(useCanvasEngine.getState().selectedElementIds).toEqual([id2]);
        });

        test('should multi-select with toggle', () => {
            const { addElement, selectElement } = useCanvasEngine.getState();

            const id1 = addElement({ type: 'text', x: 0, y: 0, width: 100, height: 100, startTime: 0, endTime: 10, data: {} });
            const id2 = addElement({ type: 'text', x: 0, y: 0, width: 100, height: 100, startTime: 0, endTime: 10, data: {} });

            selectElement(id1, true); // multi
            selectElement(id2, true); // multi
            expect(useCanvasEngine.getState().selectedElementIds).toEqual([id1, id2]);

            selectElement(id1, true); // toggle off
            expect(useCanvasEngine.getState().selectedElementIds).toEqual([id2]);
        });

        test('should clear selection', () => {
            const { addElement, selectElement, clearSelection } = useCanvasEngine.getState();

            const id = addElement({ type: 'text', x: 0, y: 0, width: 100, height: 100, startTime: 0, endTime: 10, data: {} });
            selectElement(id);

            clearSelection();
            expect(useCanvasEngine.getState().selectedElementIds).toHaveLength(0);
        });
    });

    describe('Canvas Utilities', () => {
        test('should return correct canvas center', () => {
            const { getCanvasCenter, width, height } = useCanvasEngine.getState();
            const center = getCanvasCenter();

            expect(center.x).toBe(width / 2);
            expect(center.y).toBe(height / 2);
        });

        test('should validate if element is within bounds', () => {
            const { isWithinBounds, width, height } = useCanvasEngine.getState();

            const inBounds = {
                x: 100,
                y: 100,
                width: 200,
                height: 200
            };
            expect(isWithinBounds(inBounds as any)).toBe(true);

            const outOfBounds = {
                x: width - 50,
                y: height - 50,
                width: 200,
                height: 200
            };
            expect(isWithinBounds(outOfBounds as any)).toBe(false);
        });

        test('should constrain oversized element', () => {
            const { constrainToBounds, width, height } = useCanvasEngine.getState();

            const oversized = {
                id: 'test',
                type: 'image' as const,
                x: 0,
                y: 0,
                width: width * 2, // Bigger than canvas
                height: height * 2,
                rotation: 0,
                startTime: 0,
                endTime: 10,
                opacity: 1,
                zIndex: 1,
                locked: false,
                visible: true,
                aspectRatioLocked: true,
                data: {}
            };

            const constrained = constrainToBounds(oversized);
            expect(constrained.width).toBeLessThanOrEqual(width);
            expect(constrained.height).toBeLessThanOrEqual(height);
        });
    });

    describe('Guide Management', () => {
        test('should add guide', () => {
            const { addGuide } = useCanvasEngine.getState();

            addGuide({
                type: 'vertical',
                position: 540, // Center
                temporary: true
            });

            expect(useCanvasEngine.getState().guides).toHaveLength(1);
        });

        test('should remove guide', () => {
            const { addGuide, removeGuide } = useCanvasEngine.getState();

            addGuide({ type: 'vertical', position: 540 });
            const guideId = useCanvasEngine.getState().guides[0].id;

            removeGuide(guideId);
            expect(useCanvasEngine.getState().guides).toHaveLength(0);
        });

        test('should clear temporary guides', () => {
            const { addGuide, clearTemporaryGuides } = useCanvasEngine.getState();

            addGuide({ type: 'vertical', position: 540, temporary: true });
            addGuide({ type: 'horizontal', position: 960, temporary: false });

            clearTemporaryGuides();
            const guides = useCanvasEngine.getState().guides;
            expect(guides).toHaveLength(1);
            expect(guides[0].temporary).toBe(false);
        });
    });
});
