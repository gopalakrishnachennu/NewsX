"use client";

/**
 * Canva-Style Editor - Full Features
 * - Drag & Drop
 * - Right-click context menu  
 * - Resize handles
 * - Element toolbar (persistent)
 * - Keyboard shortcuts
 * - Persistent properties panel
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toPng, toJpeg, toCanvas } from "html-to-image";
import { removeBackground } from "@imgly/background-removal";
import { useEditorStore, useAdminStore, useTemplateStore } from "@/lib/stores";
// import { AuthGuard } from "@/components/admin/studio/guards"; // Disabled for now
import { SaveTemplateModal, TemplateFormData } from "@/components/admin/studio/modals/save-template-modal";
import { TemplateFillModal } from "@/components/admin/studio/modals/template-fill-modal";
import { BindFieldPanel, BindConfig } from "@/components/admin/studio/editor/bind-field-panel";
import { PlatformPanel, PLATFORM_PRESETS } from "@/components/admin/studio/editor/platform-panel";
import { ScheduleModal } from "@/components/admin/studio/modals/schedule-modal";
import { PlatformVariant, ElementOverride } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import {
    ArrowLeft,
    Save,
    Download,
    ZoomIn,
    ZoomOut,
    Highlighter,
    Type,
    Loader2,
    X,
    Upload,
    Trash2,
    Square,
    Layout,
    Lock,
    Copy,
    Layers,
    AlignCenter,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignHorizontalJustifyCenter,
    FlipHorizontal,
    FlipVertical,
    Unlock,
    Shapes,
    Camera,
    Circle,
    Triangle,
    Star,
    Heart,
    Bold,
    Italic,
    Underline,
    Undo,
    Redo,
    Keyboard,
    ChevronDown,
    Move,
    Maximize2,
    Eye,
    EyeOff,
    Home,
    User,
    Settings,
    Search,
    Bell,
    Share2,
    MessageCircle,
    Mail,
    Calendar,
    MapPin,
    Plus,
    MousePointer2,
    Magnet,
    Cloud,
    MoreVertical,
    ClipboardPaste,
    RotateCw,
    Hand,
    CloudOff,
    Check,
    Grid,
    RefreshCw,
    Minus,
    Link2,
    Smartphone, // Phase 7
    Wand2,
    CaseUpper,
    CaseLower,
    CaseSensitive,
    Hash,
    History as HistoryIcon
} from "lucide-react";

import { analyzeImageLuminance } from "@/lib/utils/image-analysis";

// Helper to generate dynamic shape paths
const getShapePath = (type: string, param?: number) => {
    if (type === 'triangle') return 'polygon(50% 0%, 0% 100%, 100% 100%)';
    if (type === 'pentagon') return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
    if (type === 'hexagon') return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'; // Pointy top hex
    if (type === 'octagon') return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
    if (type === 'arrow') return 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)';
    if (type === 'message') return 'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)';
    if (type === 'heart') return 'path("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")';
    if (type === 'circle') return 'circle(50% at 50% 50%)';

    // Dynamic Star / Burst
    if (type === 'star' || type === 'burst') {
        const points = param || (type === 'star' ? 5 : 12);
        const outerRadius = 50;
        const innerRadius = type === 'star' ? 20 : 35; // Burst is fatter
        let path = '';
        const cx = 50, cy = 50;
        for (let i = 0; i < points * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const a = Math.PI * i / points;
            const x = cx + Math.sin(a) * r; // Adjusted specific to CSS polygon rotation
            const y = cy - Math.cos(a) * r;
            path += `${x.toFixed(1)}% ${y.toFixed(1)}%, `;
        }
        return `polygon(${path.slice(0, -2)})`;
    }
    return undefined;
};

const ICON_MAP: Record<string, any> = {
    'Home': Home,
    'User': User,
    'Settings': Settings,
    'Search': Search,
    'Notification': Bell,
    'Love': Heart,
    'Favorite': Star,
    'Share': Share2,
    'Message': MessageCircle,
    'Mail': Mail,
    'Date': Calendar,
    'Location': MapPin,
};
import { Fingerprint, Image } from "lucide-react";
import { PlaceholderElement } from "@/components/admin/studio/editor/placeholder-element";
import { GridOverlay } from "@/components/admin/studio/editor/grid-overlay";
import { SafeZoneOverlay } from "@/components/admin/studio/editor/safe-zone-overlay";
import { logger } from "@/lib/editor-logger";

// Element types
interface CanvasElement {
    id: string;
    type: 'text' | 'image' | 'shape' | 'group' | 'icon';
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
    opacity?: number;
    // Group support
    groupId?: string; // ID of parent group (if this element is inside a group)
    children?: string[]; // IDs of child elements (if this is a group)
    // Text specific
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    backgroundColor?: string;
    textHighlight?: boolean;
    textTransform?: 'uppercase' | 'lowercase' | 'none';
    letterSpacing?: number;
    lineHeight?: number;
    // Text effects
    textShadow?: {
        enabled?: boolean;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
        color?: string;
    };
    textOutline?: {
        enabled?: boolean;
        width?: number;
        color?: string;
    };
    // Curved text
    curveRadius?: number; // 0 = no curve, +/- value for direction
    // Image specific
    imageUrl?: string;
    borderRadius?: number;
    focusPoint?: {
        x: number;
        y: number;
    };
    shadow?: {
        enabled: boolean;
        color: string;
        blur: number;
        x: number;
        y: number;
    };
    // Inset / PiP specific
    isInset?: boolean;
    insetAnchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    maskShape?: string; // e.g. 'star', 'circle', 'hexagon'
    // Shape specific
    shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star' | 'burst' | 'heart' | 'pentagon' | 'hexagon' | 'octagon' | 'arrow' | 'message' | 'line';
    shapeParam?: number; // e.g. Star points, Burst points
    fillColor?: string;
    // Shape stroke
    strokeWidth?: number;
    strokeColor?: string;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    // Gradient fill (for shapes and background)
    gradient?: {
        enabled: boolean;
        type: 'linear' | 'radial';
        angle: number;
        colors: string[];
    };
    // Image filters
    imageFilters?: {
        brightness: number; // 0-200, default 100
        contrast: number;   // 0-200, default 100
        saturation: number; // 0-200, default 100
        blur: number;       // 0-20, default 0
        grayscale: number;  // 0-100, default 0
    };
    // Visual Effects
    effect?: {
        enabled: boolean;
        type: 'blur' | 'glass' | 'noise' | 'grain';
        intensity: number;
    };
    overlay?: {
        enabled: boolean;
        direction: 'bottom-up' | 'top-down' | 'full';
        color: string;
        opacity: number;
        height: number;
        blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
    };
    // Icon specific
    iconName?: string;
    // Bindable field configuration (for templates)
    isBindable?: boolean;
    bindConfig?: {
        fieldId: string;
        label: string;
        placeholder: string;
        required: boolean;
        fieldType: 'text' | 'image' | 'color';
        constraints?: {
            minLength?: number;
            maxLength?: number;
            minWidth?: number;
            minHeight?: number;
            aspectRatio?: string;
        };
    };
    // Placeholder support for templates
    isPlaceholder?: boolean;
    placeholderType?: 'text' | 'image' | 'logo';
    // Smart Layouts - Anchoring
    relativeTo?: string; // ID of element to anchor to
    anchor?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    autoScale?: boolean;
}

// Design Template interface
interface DesignTemplate {
    id: string;
    name: string;
    thumbnail: string;
    elements: CanvasElement[];
    backgroundColor: string;
    backgroundImage?: string | null;
    backgroundGradient?: typeof backgroundGradientDefault;
    frameSize: { width: number; height: number };
    createdAt: string;
}

const backgroundGradientDefault = {
    enabled: false,
    type: 'linear' as 'linear' | 'radial',
    angle: 135,
    colors: [{ color: '#6366f1', stop: 0 }, { color: '#ec4899', stop: 100 }],
};

// Font families available
const FONT_FAMILIES = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Open Sans', value: 'Open Sans, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Playfair Display', value: 'Playfair Display, serif' },
    { name: 'Lora', value: 'Lora, serif' },
    { name: 'Oswald', value: 'Oswald, sans-serif' },
    { name: 'Bebas Neue', value: 'Bebas Neue, sans-serif' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
];

// Frame presets
const frameSizes = [
    { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920 },
    { id: 'instagram-post', name: 'Instagram Post', width: 1080, height: 1080 },
    { id: 'instagram-portrait', name: 'Instagram Portrait', width: 1080, height: 1350 },
    { id: 'facebook-post', name: 'Facebook Post', width: 1200, height: 630 },
    { id: 'twitter-post', name: 'Twitter/X Post', width: 1200, height: 675 },
];

// Shape renderer
const ShapeIcon = ({ type, className }: { type: string; className?: string }) => {
    switch (type) {
        case 'circle': return <Circle className={className} />;
        case 'triangle': return <Triangle className={className} />;
        case 'star': return <Star className={className} />;
        case 'heart': return <Heart className={className} />;
        default: return <Square className={className} />;
    }
};

export default function EditorPage() {
    const searchParams = useSearchParams();
    const articleId = searchParams.get('source');
    const lockHeadlineParam = searchParams.get('lockHeadline') === '1';
    const lockSummaryParam = searchParams.get('lockSummary') === '1';
    // Mock user for Studio since AuthGuard is removed
    const user = { id: 'admin-user', email: 'admin@newsx.com' };
    const { settings } = useAdminStore();
    const { isSaving, setZoom, zoom, savePost, currentPost, loadPost, canvasJson, textStyles } = useEditorStore();
    const { saveTemplate: saveTemplateToFirebase, updateTemplate } = useTemplateStore();

    // State for new template modal
    const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>('');
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [showTemplateFillModal, setShowTemplateFillModal] = useState(false);
    const [templateToFill, setTemplateToFill] = useState<any>(null);
    const [templateFillInitialValues, setTemplateFillInitialValues] = useState<Record<string, string>>({});
    const [templateFillFallback, setTemplateFillFallback] = useState<{ headline?: string; summary?: string; image?: string; logo?: string }>({});
    const [pendingTemplateElements, setPendingTemplateElements] = useState<CanvasElement[] | null>(null);

    // Canvas state
    const [backgroundColor, setBackgroundColor] = useState("#1a1a2e");
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [backgroundGradient, setBackgroundGradient] = useState<{
        enabled: boolean;
        type: 'linear' | 'radial';
        angle: number;
        colors: { color: string; stop: number }[];
    }>({
        enabled: false,
        type: 'linear',
        angle: 180,
        colors: [
            { color: '#6366f1', stop: 0 },
            { color: '#ec4899', stop: 100 }
        ]
    });
    const [selectedFrame, setSelectedFrame] = useState(frameSizes[1]); // Default to Instagram Post
    const [isAnalyzingColor, setIsAnalyzingColor] = useState(false);

    const applyTemplateVariables = useCallback((
        sourceElements: CanvasElement[],
        variables: Record<string, string>,
        fallbackContent: { headline?: string; summary?: string; image?: string; logo?: string; highlight?: string }
    ) => {
        const used = { headline: false, summary: false, image: false, logo: false };
        const headlineValue = variables.headline || variables.title || fallbackContent.headline;
        const summaryValue = variables.summary || variables.body || fallbackContent.summary;
        const imageValue = variables['main-image'] || variables.image || variables['hero_image'] || fallbackContent.image;
        const logoValue = variables.logo || fallbackContent.logo;
        const highlightValue = variables.highlight_phrase || variables.highlight || fallbackContent.highlight;

        return sourceElements.map((el) => {
            let next = { ...el };

            if (el.isBindable && el.bindConfig) {
                const bindValue = variables[el.bindConfig.fieldId];
                if (bindValue !== undefined && bindValue !== null && bindValue !== '') {
                    if (el.bindConfig.fieldType === 'text' && el.type === 'text') {
                        next = { ...next, text: bindValue, isPlaceholder: false };
                        return next;
                    }
                    if (el.bindConfig.fieldType === 'image' && el.type === 'image') {
                        next = { ...next, imageUrl: bindValue };
                        return next;
                    }
                    if (el.bindConfig.fieldType === 'color') {
                        next = { ...next, color: bindValue, fillColor: bindValue };
                        return next;
                    }
                }

                if (el.bindConfig.fieldType === 'text' && el.type === 'text') {
                    if (!used.headline && headlineValue && el.bindConfig.fieldId === 'headline') {
                        used.headline = true;
                        return { ...next, text: headlineValue, isPlaceholder: false };
                    }
                    if (!used.summary && summaryValue && el.bindConfig.fieldId === 'summary') {
                        used.summary = true;
                        return { ...next, text: summaryValue, isPlaceholder: false };
                    }
                }
                if (el.bindConfig.fieldType === 'image' && el.type === 'image') {
                    if (!used.logo && logoValue && el.bindConfig.fieldId === 'logo') {
                        used.logo = true;
                        return { ...next, imageUrl: logoValue };
                    }
                    if (!used.image && imageValue && el.bindConfig.fieldId === 'main-image') {
                        used.image = true;
                        return { ...next, imageUrl: imageValue };
                    }
                }
            }

            const idName = `${el.id} ${el.name}`.toLowerCase();

            if (el.type === 'image') {
                if (!used.logo && logoValue && (el.placeholderType === 'logo' || idName.includes('logo'))) {
                    used.logo = true;
                    return { ...next, imageUrl: logoValue };
                }
                if (!used.image && imageValue && (el.isPlaceholder || el.placeholderType === 'image' || idName.includes('image') || idName.includes('photo') || idName.includes('bg') || idName.includes('background') || idName.includes('hero'))) {
                    used.image = true;
                    return { ...next, imageUrl: imageValue };
                }
            }

            if (el.type === 'text') {
                if (highlightValue && (idName.includes('highlight') || idName.includes('emphasis') || idName.includes('key phrase'))) {
                    return { ...next, text: highlightValue, isPlaceholder: false };
                }
                if (!used.headline && headlineValue && (idName.includes('headline') || idName.includes('title') || idName.includes('head'))) {
                    used.headline = true;
                    return { ...next, text: headlineValue, isPlaceholder: false };
                }
                if (!used.summary && summaryValue && (idName.includes('summary') || idName.includes('subhead') || idName.includes('subtitle') || idName.includes('body') || idName.includes('desc'))) {
                    used.summary = true;
                    return { ...next, text: summaryValue, isPlaceholder: false };
                }
                if (el.isPlaceholder && el.placeholderType === 'text') {
                    if (!used.headline && headlineValue) {
                        used.headline = true;
                        return { ...next, text: headlineValue, isPlaceholder: false };
                    }
                    if (!used.summary && summaryValue) {
                        used.summary = true;
                        return { ...next, text: summaryValue, isPlaceholder: false };
                    }
                }
            }

            return next;
        });
    }, []);

    const buildTemplateInitialValues = useCallback((templateData: any, fallback: { headline?: string; summary?: string; image?: string; logo?: string; highlight?: string }) => {
        const initialValues: Record<string, string> = {};
        const fields = templateData?.dataFields || [];

        fields.forEach((field: any) => {
            if (field.type === 'text') {
                if (field.id === 'headline' && fallback.headline) initialValues[field.id] = fallback.headline;
                else if (field.id === 'summary' && fallback.summary) initialValues[field.id] = fallback.summary;
                else if (field.id.includes('highlight') && fallback.highlight) initialValues[field.id] = fallback.highlight;
                else if (!initialValues[field.id] && fallback.headline && (field.id.includes('title') || field.id.includes('headline'))) initialValues[field.id] = fallback.headline;
                else if (!initialValues[field.id] && fallback.summary && (field.id.includes('summary') || field.id.includes('body') || field.id.includes('desc'))) initialValues[field.id] = fallback.summary;
            }
            if (field.type === 'image') {
                if (field.id === 'main-image' && fallback.image) initialValues[field.id] = fallback.image;
                else if (!initialValues[field.id] && fallback.image && (field.id.includes('image') || field.id.includes('photo') || field.id.includes('hero'))) initialValues[field.id] = fallback.image;
                else if (field.id === 'logo' && fallback.logo) initialValues[field.id] = fallback.logo;
            }
        });

        return initialValues;
    }, []);

    // Load Article Data, Template, and Custom Params
    useEffect(() => {
        const loadContent = async () => {
            const customTitle = searchParams.get('customTitle');
            const customSummary = searchParams.get('customSummary');
            const customImage = searchParams.get('customImage');
            const customLogo = searchParams.get('customLogo');
            const highlightPhrase = searchParams.get('highlightPhrase');
            const tone = searchParams.get('tone');
            const avoidSensationalism = searchParams.get('avoidSensationalism');
            const lockHeadline = searchParams.get('lockHeadline') === '1';
            const lockSummary = searchParams.get('lockSummary') === '1';
            const templateId = searchParams.get('templateId');
            const aspectRatio = searchParams.get('aspectRatio');

            let articleData: any = {};
            let templateData: any = null;

            // 1. Fetch Article for base data if source exists
            if (articleId) {
                try {
                    const res = await fetch(`/api/articles/${articleId}`);
                    if (res.ok) articleData = await res.json();
                } catch (e) {
                    console.error("Failed to load article", e);
                }
            }

            // 2. Fetch Template if provided
            if (templateId) {
                try {
                    const res = await fetch(`/api/admin/templates/${templateId}`);
                    if (res.ok) templateData = await res.json();
                } catch (e) {
                    console.error("Failed to load template", e);
                }
            }

            // 3. Resolve Content
            const finalHeadline = customTitle || articleData.title || 'Headline';
            const finalSummary = customSummary || articleData.summary || '';
            const finalImage = customImage || articleData.image || '';

            // 4. Construct Elements
            let initialElements: CanvasElement[] = [];
            // Parse elements from template data (handling both legacy and new 'canvasState' formats)
            if (templateData) {
                if (templateData.elements && Array.isArray(templateData.elements)) {
                    initialElements = templateData.elements;
                } else if (templateData.canvasState) {
                    try {
                        const parsed = typeof templateData.canvasState === 'string'
                            ? JSON.parse(templateData.canvasState)
                            : templateData.canvasState;

                        if (parsed.elements) initialElements = parsed.elements;

                        // Also restore other properties from canvasState if available
                        if (parsed.background && !templateData.backgroundColor) {
                            if (parsed.background.color) setBackgroundColor(parsed.background.color);
                            if (parsed.background.image !== undefined) setBackgroundImage(parsed.background.image);
                            if (parsed.background.gradient) setBackgroundGradient(parsed.background.gradient);
                        }
                        if (parsed.frame && !templateData.frame) {
                            // Logic to set frame from parsed state could go here if needed
                        }
                    } catch (e) {
                        console.error("Failed to parse canvasState", e);
                    }
                }
            }

            if (initialElements.length > 0) {
                // If we are editing the template itself (templateId present + NO articleId/customTitle/mode=create), 
                // load it AS IS without mapping placeholder content.
                const mode = searchParams.get('mode');
                const isUseMode = mode === 'create' || !!articleId || !!customTitle;
                const isEditingTemplate = !!templateId && !isUseMode;

                console.log("Loading Template:", { templateId, isEditingTemplate, isUseMode, mode });

                if (isEditingTemplate) {
                    setEditingTemplateId(templateId);
                    setElements(initialElements);
                } else {
                    const incomingTitle = customTitle !== null ? customTitle : articleData.title;
                    const incomingSummary = customSummary !== null ? customSummary : articleData.summary;
                    const incomingImage = customImage !== null ? customImage : articleData.image;
                    const incomingLogo = customLogo || articleData.logo || '';
                    const incomingHighlight = highlightPhrase || '';

                    const fallbackContent = {
                        headline: incomingTitle || finalHeadline,
                        summary: incomingSummary || finalSummary,
                        image: incomingImage || finalImage,
                        logo: incomingLogo || undefined,
                        highlight: incomingHighlight || undefined
                    };

                    if (templateData?.dataFields && templateData.dataFields.length > 0) {
                        const initialValues = buildTemplateInitialValues(templateData, fallbackContent);
                        const requiredFields = templateData.dataFields.filter((f: any) => f.required);
                        const hasAllRequired = requiredFields.every((f: any) => {
                            const value = initialValues[f.id] || f.defaultValue || "";
                            return typeof value === "string" ? value.trim().length > 0 : !!value;
                        });

                        if (hasAllRequired) {
                            const mappedElements = applyTemplateVariables(initialElements, initialValues, fallbackContent).map(el => {
                                if (lockHeadline && el.type === 'text' && (el.bindConfig?.fieldId === 'headline' || el.name.toLowerCase().includes('headline'))) {
                                    return { ...el, locked: true };
                                }
                                if (lockSummary && el.type === 'text' && (el.bindConfig?.fieldId === 'summary' || el.name.toLowerCase().includes('summary'))) {
                                    return { ...el, locked: true };
                                }
                                return el;
                            });
                            setElements(mappedElements);
                        } else {
                            setTemplateToFill(templateData);
                            setTemplateFillInitialValues(initialValues);
                            setTemplateFillFallback(fallbackContent);
                            setPendingTemplateElements(initialElements);
                            setShowTemplateFillModal(true);
                            setElements(initialElements);
                        }
                    } else {
                        const mappedElements = applyTemplateVariables(initialElements, { highlight_phrase: incomingHighlight }, fallbackContent).map(el => {
                            if (lockHeadline && el.type === 'text' && (el.bindConfig?.fieldId === 'headline' || el.name.toLowerCase().includes('headline'))) {
                                return { ...el, locked: true };
                            }
                            if (lockSummary && el.type === 'text' && (el.bindConfig?.fieldId === 'summary' || el.name.toLowerCase().includes('summary'))) {
                                return { ...el, locked: true };
                            }
                            return el;
                        });
                        setElements(mappedElements);
                    }
                }

                // Apply Template Background
                if (templateData.backgroundColor) setBackgroundColor(templateData.backgroundColor);
                if (templateData.backgroundImage !== undefined) setBackgroundImage(templateData.backgroundImage);
                if (templateData.backgroundGradient) setBackgroundGradient(templateData.backgroundGradient);

                // Apply Template Frame unless overridden by aspectRatio
                /*
                if (templateData.frameSize) {
                    // Find matching preset or use custom
                    const preset = frameSizes.find(f => f.width === templateData.frameSize.width && f.height === templateData.frameSize.height);
                    if (preset) setSelectedFrame(preset);
                }
                */
            } else {
                // Default Layout (Fallback)
                setElements([
                    {
                        id: 'bg-image',
                        type: 'image',
                        name: 'Article Image',
                        x: 0, y: 0, width: 100, height: 100,
                        rotation: 0, locked: true, visible: true, flipX: false, flipY: false,
                        imageUrl: finalImage,
                        opacity: 0.5
                    },
                    {
                        id: 'headline',
                        type: 'text',
                        name: 'Headline',
                        x: 5, y: 70, width: 90, height: 20,
                        rotation: 0, locked: false, visible: true, flipX: false, flipY: false,
                        text: finalHeadline,
                        fontSize: 42, fontWeight: 800, color: '#ffffff',
                        textAlign: 'left',
                        textShadow: { enabled: true, color: 'rgba(0,0,0,0.8)', blur: 10, offsetX: 2, offsetY: 2 }
                    },
                    {
                        id: 'brand',
                        type: 'text',
                        name: 'Brand',
                        x: 5, y: 5, width: 30, height: 5,
                        rotation: 0, locked: false, visible: true, flipX: false, flipY: false,
                        text: 'NEWS X',
                        fontSize: 24, fontWeight: 900, color: '#e11d48',
                        textAlign: 'left'
                    }
                ].map(el => {
                    if (lockHeadline && el.id === 'headline') return { ...el, locked: true };
                    return el;
                }));
            }

            // 5. Apply Aspect Ratio Override
            if (aspectRatio) {
                if (aspectRatio === 'square') setSelectedFrame(frameSizes.find(f => f.id === 'instagram-post') || frameSizes[1]);
                else if (aspectRatio === 'portrait') setSelectedFrame(frameSizes.find(f => f.id === 'instagram-story') || frameSizes[0]);
                else if (aspectRatio === 'landscape') setSelectedFrame(frameSizes.find(f => f.id === 'twitter-post') || frameSizes[4]);
            }
        };

        loadContent();
    }, [searchParams]);

    // Handle Smart Generator handoff - load pre-built canvas state (SINGLE SOURCE OF TRUTH)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handoffData = localStorage.getItem('smart_gen_handoff');
        if (!handoffData) return;

        try {
            const handoff = JSON.parse(handoffData);
            localStorage.removeItem('smart_gen_handoff');

            // Load the EXACT canvas state from Smart Generator preview
            if (handoff.canvasState) {
                const { elements, background, frame } = handoff.canvasState;

                if (elements && Array.isArray(elements)) {
                    setElements(elements);
                }

                if (background?.color) {
                    setBackgroundColor(background.color);
                }

                if (frame) {
                    setSelectedFrame(frame);
                }
            }
        } catch (e) {
            console.error('Failed to load Smart Generator handoff:', e);
        }
    }, []);

    // Sync state from store
    useEffect(() => {
        if (canvasJson) {
            try {
                const loaded = JSON.parse(canvasJson);
                // Handle legacy array format (elements only)
                if (Array.isArray(loaded)) {
                    setElements(loaded);
                }
                // Handle new object format (elements + background + config)
                else if (loaded && typeof loaded === 'object') {
                    if (loaded.elements) setElements(loaded.elements);

                    // Restore Background
                    if (loaded.background) {
                        if (loaded.background.color) setBackgroundColor(loaded.background.color);
                        if (loaded.background.image !== undefined) setBackgroundImage(loaded.background.image);
                        if (loaded.background.gradient) setBackgroundGradient(loaded.background.gradient);
                    }

                    // Restore Frame/Canvas Size
                    if (loaded.frame) {
                        // Try to find matching preset, otherwise use saved dimensions
                        const matchingFrame = frameSizes.find(f => f.id === loaded.frame.id);
                        setSelectedFrame(matchingFrame || loaded.frame);
                    }

                    // Restore Editor Preferences
                    if (loaded.frame) setSelectedFrame(loaded.frame);
                    if (loaded.config) {
                        setGridVisible(loaded.config.gridVisible);
                        setSnapEnabled(loaded.config.snapEnabled);
                        setGridSize(loaded.config.gridSize);
                    }

                    // Phase 7: Restore Platforms
                    if (loaded.platforms) {
                        setPlatformVariants(loaded.platforms);
                    } else if (loaded.platformVariants) {
                        // Legacy/Backwards compat if needed
                        setPlatformVariants(loaded.platformVariants);
                    }

                    setHistory([loaded.elements]);
                    setHistoryIndex(0);
                }
            } catch (e) {
                console.error("Failed to parse canvas", e);
            }
        }
    }, [canvasJson]);

    // History for undo/redo
    const [history, setHistory] = useState<CanvasElement[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Elements
    const [elements, setElements] = useState<CanvasElement[]>([
        {
            id: 'brand',
            type: 'text',
            name: 'Brand Badge',
            x: 40,
            y: 5,
            width: 20,
            height: 5,
            rotation: 0,
            locked: false,
            visible: true,
            flipX: false,
            flipY: false,
            text: 'Your Brand',
            fontSize: 14,
            fontWeight: 700,
            color: '#ffffff',
            backgroundColor: '#6366f1',
            textAlign: 'center',
        },
        {
            id: 'headline',
            type: 'text',
            name: 'Headline',
            x: 5,
            y: 75,
            width: 90,
            height: 15,
            rotation: 0,
            locked: false,
            visible: true,
            flipX: false,
            flipY: false,
            text: 'Your headline appears here',
            fontSize: 32,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'left',
        },
    ]);

    // Selection & interaction - now supports multi-select
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const selectedId = selectedIds[0] || null; // backward compat - first selected

    // Helper to set single selection (backward compat)
    const setSelectedId = useCallback((id: string | null) => {
        setSelectedIds(id ? [id] : []);
    }, []);

    // Toggle selection for multi-select (Shift+click)
    const toggleSelection = useCallback((id: string, addToSelection: boolean) => {
        if (addToSelection) {
            setSelectedIds(prev =>
                prev.includes(id)
                    ? prev.filter(i => i !== id)
                    : [...prev, id]
            );
        } else {
            setSelectedIds([id]);
        }
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [elementStart, setElementStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    // Context menu
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

    // Clipboard
    const [clipboard, setClipboard] = useState<CanvasElement | null>(null);

    // AI Background Removal
    const [isRemovingBg, setIsRemovingBg] = useState(false);

    // Sidebar & UI
    const [activeSidebar, setActiveSidebar] = useState<'design' | 'elements' | 'text' | 'uploads' | 'layers' | 'templates' | 'platforms'>('elements');
    const [showFrameSelector, setShowFrameSelector] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
    const [exportQuality, setExportQuality] = useState(90);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Templates System
    const [savedTemplates, setSavedTemplates] = useState<DesignTemplate[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

    // Phase 29: Versioning
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    // In a real app, this would be loaded from the DB. For now, we'll keep local session history.
    const [versions, setVersions] = useState<{ id: string, name: string, date: Date, elements: any[] }[]>([]);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // Internal save handler to verify data before store call
    const handleSaveFullTemplate = async (formData: TemplateFormData) => {
        // 1. Serialize Canvas
        const canvasState = JSON.stringify({
            elements,
            background: {
                color: backgroundColor,
                image: backgroundImage,
                gradient: backgroundGradient
            },
            frame: selectedFrame,
            config: {
                gridVisible,
                snapEnabled,
                gridSize
            },
            platforms: platformVariants // Persist variants inside canvas state
        });

        // 2. Extract Metadata
        const hasInset = elements.some(e => e.type === 'image' && e.width < 100);

        // 3. Collect Bindable Fields
        const dataFields = elements
            .filter(e => e.isBindable && e.bindConfig)
            .map(e => ({
                id: `field-${e.id}`,
                elementId: e.id,
                label: e.bindConfig!.label,
                type: e.bindConfig!.fieldType,
                placeholder: e.bindConfig!.placeholder,
                required: e.bindConfig!.required,
                constraints: e.bindConfig!.constraints
            }));

        await saveTemplateToFirebase({
            ...formData,
            canvasState,
            thumbnail: thumbnailDataUrl,
            layout: {
                imagePosition: hasInset ? 'inset' : 'full',
                textPosition: 'bottom', // simplified default
                hasInsetPhoto: hasInset,
                hasSwipeIndicator: false,
                hasSocialIcons: false
            },
            style: {
                backgroundColor,
                textColor: elements.find(e => e.type === 'text')?.color || '#ffffff',
                accentColor: brandColors[0] || '#6366f1',
                highlightColor: '#000000',
                gradientOverlay: '',
                fontFamily: elements.find(e => e.type === 'text')?.fontFamily || 'Inter, sans-serif',
                brandPosition: 'top-left'
            },
            dataFields,
            platforms: platformVariants, // Phase 7
        });
    };

    // Phase 7: Platform Variants
    const [platformVariants, setPlatformVariants] = useState<PlatformVariant[]>([]);
    const [activePlatformId, setActivePlatformId] = useState<string | null>(null);
    const [masterSnapshot, setMasterSnapshot] = useState<CanvasElement[] | null>(null);
    const [masterFrame, setMasterFrame] = useState<{ id: string; name: string; width: number; height: number } | null>(null);

    const handleCreateVariant = (presetId: string) => {
        const preset = PLATFORM_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const newVariant: PlatformVariant = {
            id: preset.id, // Enforce unique ID per preset type for simplicity? Or generic ID?
            name: preset.name,
            width: preset.width,
            height: preset.height,
            overrides: {} // Start empty (inherits from master naturally via %)
        };
        setPlatformVariants(prev => [...prev, newVariant]);
    };

    const handleDeleteVariant = (id: string) => {
        setPlatformVariants(prev => prev.filter(v => v.id !== id));
        if (activePlatformId === id) {
            handleSelectPlatform(null); // Return to master
        }
    };

    const handleSelectPlatform = useCallback((id: string | null) => {
        if (id === activePlatformId) return;

        // 1. Snapshot current state before leaving
        if (activePlatformId === null) {
            // Leaving Master: Save Snapshot
            setMasterSnapshot(JSON.parse(JSON.stringify(elements)));
            setMasterFrame(selectedFrame);
        } else {
            // Leaving Variant: Save Overrides
            // We compare current elements with masterSnapshot? 
            // Phase 7 MVP: Simply save absolute % positions as overrides
            // This ensures exactly what the user sees is saved.
            const variantIndex = platformVariants.findIndex(v => v.id === activePlatformId);
            if (variantIndex >= 0) {
                const overrides: Record<string, ElementOverride> = {};
                elements.forEach(el => {
                    // Only save layout props
                    overrides[el.id] = { id: el.id, x: el.x, y: el.y, scaleX: 1, scaleY: 1, visible: el.visible, fontSize: el.fontSize };
                });

                setPlatformVariants(prev => {
                    const next = [...prev];
                    next[variantIndex] = { ...next[variantIndex], overrides };
                    return next;
                });
            }
        }

        // 2. Switch Context
        setActivePlatformId(id);

        if (id === null) {
            // Restore Master
            if (masterSnapshot) setElements(JSON.parse(JSON.stringify(masterSnapshot)));
            if (masterFrame) setSelectedFrame(masterFrame);
        } else {
            // switch to variant
            const variant = platformVariants.find(v => v.id === id);
            if (variant) {
                // Resize Frame
                setSelectedFrame({ id: variant.id, name: variant.name, width: variant.width, height: variant.height });

                // Load Overrides
                if (masterSnapshot) {
                    // Start from Master base
                    const baseElements = JSON.parse(JSON.stringify(masterSnapshot)) as CanvasElement[];

                    // Check if we have existing overrides
                    const hasOverrides = Object.keys(variant.overrides).length > 0;

                    if (hasOverrides) {
                        // Apply existing overrides
                        const merged = baseElements.map(el => {
                            const ov = variant.overrides[el.id];
                            if (ov) {
                                return { ...el, x: ov.x ?? el.x, y: ov.y ?? el.y, visible: ov.visible ?? el.visible, fontSize: ov.fontSize ?? el.fontSize };
                            }
                            return el;
                        });
                        setElements(merged);
                    } else {
                        // Phase 29: Smart Aspect Ratio Lock
                        // If no overrides, calculate smart positions to prevent distortion
                        const oldW = masterFrame?.width || 1080;
                        const oldH = masterFrame?.height || 1080;
                        const newW = variant.width;
                        const newH = variant.height;

                        const smartElements = baseElements.map(el => {
                            // Only adjust Shapes and Images to maintain aspect ratio
                            // Text usually flows fine with %, or uses autoScale
                            if (el.type === 'shape' || el.type === 'image' || el.type === 'icon') {
                                const elPxW = (el.width / 100) * oldW;
                                const elPxH = (el.height / 100) * oldH;
                                const elRatio = elPxW / elPxH;

                                // Current proposed new dimensions in pixels (if we kept raw %)
                                const newPxW_Raw = (el.width / 100) * newW;
                                // We want to keep width (relative to screen width usually) but adjust height to match ratio
                                // OR we fit within bounds.
                                // Strategy: Maintain Width % (so it spans the same amount of screen horizontally)
                                // Adjust Height % to match aspect ratio.

                                const targetPxH = newPxW_Raw / elRatio;
                                const newHeightPercent = (targetPxH / newH) * 100;

                                return { ...el, height: newHeightPercent };
                            }
                            return el;
                        });
                        setElements(smartElements);
                    }
                }
            }
        }
    }, [activePlatformId, elements, masterSnapshot, masterFrame, platformVariants, selectedFrame]);

    // Bind Field Panel
    const [showBindPanel, setShowBindPanel] = useState(false);
    const [bindingElementId, setBindingElementId] = useState<string | null>(null);

    // Brand Kit - saved palette colors
    const [brandColors, setBrandColors] = useState<string[]>(['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6']);

    // Grid & Pan state
    const [gridVisible, setGridVisible] = useState(false);
    const [safeZonesVisible, setSafeZonesVisible] = useState(false); // New: Phase 27
    const [gridSize, setGridSize] = useState(20);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [snapIndicator, setSnapIndicator] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);

    // Autosave state
    const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [isSavingAuto, setIsSavingAuto] = useState(false);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Rotation state
    const [isRotating, setIsRotating] = useState(false);
    const [rotationStart, setRotationStart] = useState({ angle: 0, rotation: 0 });

    // Inline editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
    const editInputRef = useRef<HTMLDivElement>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);

    // Display calculation
    const maxDisplayHeight = 500;
    const scale = Math.min(1, maxDisplayHeight / selectedFrame.height);
    const displayWidth = selectedFrame.width * scale;
    const displayHeight = selectedFrame.height * scale;

    // Snap to grid/guides helper
    const snapToGrid = useCallback((value: number, threshold: number = 2): { value: number; snapped: boolean } => {
        if (!snapEnabled) return { value, snapped: false };

        // Snap to percentage grid (every 5%)
        const gridSnap = 5;
        const remainder = value % gridSnap;
        if (remainder < threshold) return { value: value - remainder, snapped: true };
        if (gridSnap - remainder < threshold) return { value: value + (gridSnap - remainder), snapped: true };

        // Snap to center (50%)
        if (Math.abs(value - 50) < threshold) return { value: 50, snapped: true };

        return { value, snapped: false };
    }, [snapEnabled]);

    // Get selected element
    const selectedElement = useMemo(() => elements.find(e => e.id === selectedId), [elements, selectedId]);

    // Save to history
    const saveToHistory = useCallback((newElements: CanvasElement[]) => {
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newElements]);
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    // Update element
    const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
        setElements(prev => {
            const newElements = prev.map(el => el.id === id ? { ...el, ...updates } : el);
            return newElements;
        });
    }, []);

    const getNextBindableField = useCallback((placeholderType: 'text' | 'image' | 'logo') => {
        const existingIds = new Set(
            elements
                .filter(e => e.isBindable && e.bindConfig?.fieldId)
                .map(e => e.bindConfig!.fieldId)
        );

        if (placeholderType === 'text') {
            if (!existingIds.has('headline')) {
                return { id: 'headline', label: 'Headline', placeholder: 'Enter headline...', required: true, fieldType: 'text' as const };
            }
            if (!existingIds.has('summary')) {
                return { id: 'summary', label: 'Summary', placeholder: 'Enter summary...', required: false, fieldType: 'text' as const };
            }
            const count = Array.from(existingIds).filter(id => id.startsWith('text-')).length + 1;
            return { id: `text-${count}`, label: `Text ${count}`, placeholder: 'Enter text...', required: false, fieldType: 'text' as const };
        }

        if (placeholderType === 'logo') {
            if (!existingIds.has('logo')) {
                return { id: 'logo', label: 'Logo', placeholder: 'Upload logo', required: false, fieldType: 'image' as const };
            }
            const count = Array.from(existingIds).filter(id => id.startsWith('logo-')).length + 1;
            return { id: `logo-${count}`, label: `Logo ${count}`, placeholder: 'Upload logo', required: false, fieldType: 'image' as const };
        }

        if (!existingIds.has('main-image')) {
            return { id: 'main-image', label: 'Main Image', placeholder: 'Upload main image', required: true, fieldType: 'image' as const };
        }
        const count = Array.from(existingIds).filter(id => id.startsWith('image-')).length + 1;
        return { id: `image-${count}`, label: `Image ${count}`, placeholder: 'Upload image', required: false, fieldType: 'image' as const };
    }, [elements]);

    // Add element
    const addElement = useCallback((element: Partial<CanvasElement>) => {
        const id = `el-${Date.now()}`;
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
            ...element,
        };
        setElements(prev => {
            const newElements = [...prev, newElement];
            saveToHistory(newElements);
            return newElements;
        });
        setSelectedId(id);
    }, [saveToHistory]);

    // Delete element
    const deleteElement = useCallback((id: string) => {
        setElements(prev => {
            const newElements = prev.filter(el => el.id !== id);
            saveToHistory(newElements);
            return newElements;
        });
        if (selectedId === id) setSelectedId(null);
    }, [selectedId, saveToHistory]);

    // Duplicate element
    const duplicateElement = useCallback((id: string) => {
        const el = elements.find(e => e.id === id);
        if (el) {
            const newId = `el-${Date.now()}`;
            setElements(prev => {
                const newElements = [...prev, { ...el, id: newId, name: `${el.name} Copy`, x: el.x + 3, y: el.y + 3 }];
                saveToHistory(newElements);
                return newElements;
            });
            setSelectedId(newId);
        }
    }, [elements, saveToHistory]);

    // Copy/Paste/Cut
    const copyElement = useCallback((id: string) => {
        const el = elements.find(e => e.id === id);
        if (el) setClipboard({ ...el });
    }, [elements]);

    const pasteElement = useCallback(() => {
        if (clipboard) {
            const newId = `el-${Date.now()}`;
            setElements(prev => {
                const newElements = [...prev, { ...clipboard, id: newId, x: clipboard.x + 5, y: clipboard.y + 5 }];
                saveToHistory(newElements);
                return newElements;
            });
            setSelectedId(newId);
        }
    }, [clipboard, saveToHistory]);

    const cutElement = useCallback((id: string) => {
        copyElement(id);
        deleteElement(id);
    }, [copyElement, deleteElement]);

    // Group selected elements
    const groupElements = useCallback(() => {
        if (selectedIds.length < 2) return; // Need at least 2 elements to group

        const elementsToGroup = elements.filter(el => selectedIds.includes(el.id) && !el.groupId);
        if (elementsToGroup.length < 2) return;

        // Calculate bounding box
        const minX = Math.min(...elementsToGroup.map(el => el.x));
        const minY = Math.min(...elementsToGroup.map(el => el.y));
        const maxX = Math.max(...elementsToGroup.map(el => el.x + el.width));
        const maxY = Math.max(...elementsToGroup.map(el => el.y + el.height));

        const groupId = `group-${Date.now()}`;

        setElements(prev => {
            const newElements = prev.map(el =>
                selectedIds.includes(el.id)
                    ? { ...el, groupId }
                    : el
            );

            // Add group element
            const groupElement: CanvasElement = {
                id: groupId,
                type: 'group',
                name: `Group (${elementsToGroup.length})`,
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                rotation: 0,
                locked: false,
                visible: true,
                flipX: false,
                flipY: false,
                children: selectedIds,
            };

            const result = [...newElements, groupElement];
            saveToHistory(result);
            return result;
        });

        setSelectedId(groupId);
        logger.info('editor', 'Elements grouped', { groupId, count: elementsToGroup.length });
    }, [selectedIds, elements, saveToHistory, setSelectedId]);

    // Ungroup selected group
    const ungroupElements = useCallback(() => {
        if (!selectedId) return;

        const groupElement = elements.find(el => el.id === selectedId && el.type === 'group');
        if (!groupElement || !groupElement.children) return;

        const childIds = groupElement.children;

        setElements(prev => {
            // Remove groupId from children
            const newElements = prev
                .filter(el => el.id !== selectedId) // Remove group element
                .map(el =>
                    childIds.includes(el.id)
                        ? { ...el, groupId: undefined }
                        : el
                );
            saveToHistory(newElements);
            return newElements;
        });

        setSelectedIds(childIds);
        logger.info('editor', 'Group dissolved', { groupId: selectedId, childCount: childIds.length });
    }, [selectedId, elements, saveToHistory, setSelectedIds]);

    // Undo/Redo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setElements(history[historyIndex - 1]);
        }
    }, [historyIndex, history]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setElements(history[historyIndex + 1]);
        }
    }, [historyIndex, history]);

    // Layer operations
    const bringToFront = useCallback((id: string) => {
        setElements(prev => {
            const el = prev.find(e => e.id === id);
            if (!el) return prev;
            return [...prev.filter(e => e.id !== id), el];
        });
    }, []);

    const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
        setElements(prev => {
            const result = [...prev];
            const [removed] = result.splice(fromIndex, 1);
            result.splice(toIndex, 0, removed);
            return result;
        });
        saveToHistory(elements);
    }, [elements, saveToHistory]);

    const sendToBack = useCallback((id: string) => {
        setElements(prev => {
            const el = prev.find(e => e.id === id);
            if (!el) return prev;
            return [el, ...prev.filter(e => e.id !== id)];
        });
    }, []);

    // Align element
    const alignElement = useCallback((id: string, alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const el = elements.find(e => e.id === id);
        if (!el) return;

        let updates: Partial<CanvasElement> = {};
        switch (alignment) {
            case 'left': updates.x = 0; break;
            case 'center': updates.x = (100 - el.width) / 2; break;
            case 'right': updates.x = 100 - el.width; break;
            case 'top': updates.y = 0; break;
            case 'middle': updates.y = (100 - el.height) / 2; break;
            case 'bottom': updates.y = 100 - el.height; break;
        }
        updateElement(id, updates);
    }, [elements, updateElement]);

    // Arrow key movement
    const moveElement = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (!selectedId) return;
        const step = 0.1; // 0.1% is approx 1px on 1000px canvas
        const updates: Partial<CanvasElement> = {};
        switch (direction) {
            case 'up': updates.y = Math.max(0, (elements.find(e => e.id === selectedId)?.y || 0) - step); break;
            case 'down': updates.y = Math.min(100, (elements.find(e => e.id === selectedId)?.y || 0) + step); break;
            case 'left': updates.x = Math.max(0, (elements.find(e => e.id === selectedId)?.x || 0) - step); break;
            case 'right': updates.x = Math.min(100, (elements.find(e => e.id === selectedId)?.x || 0) + step); break;
        }
        updateElement(selectedId, updates);
    }, [selectedId, elements, updateElement]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        deleteElement: () => selectedId && deleteElement(selectedId),
        duplicateElement: () => selectedId && duplicateElement(selectedId),
        copyElement: () => selectedId && copyElement(selectedId),
        pasteElement: pasteElement,
        cutElement: () => selectedId && cutElement(selectedId),
        deselectAll: () => setSelectedId(null),
        undo,
        redo,
        bringToFront: () => selectedId && bringToFront(selectedId),
        sendToBack: () => selectedId && sendToBack(selectedId),
        zoomIn: () => setZoom(Math.min(2, zoom + 0.1)),
        zoomOut: () => setZoom(Math.max(0.5, zoom - 0.1)),
        zoomReset: () => setZoom(1),
        toggleLock: () => selectedId && updateElement(selectedId, { locked: !selectedElement?.locked }),
        save: () => console.log('Save'),
        exportDesign: () => setShowExportModal(true),
        moveUp: () => moveElement('up'),
        moveDown: () => moveElement('down'),
        moveLeft: () => moveElement('left'),
        moveRight: () => moveElement('right'),
        groupElements: groupElements,
        ungroupElements: ungroupElements,
    }, { enabled: true, hasSelection: !!selectedId });

    // Wheel zoom handler (Ctrl/Cmd + Wheel)
    useEffect(() => {
        const canvas = canvasWrapperRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = -e.deltaY * 0.001;
                const newZoom = Math.max(0.25, Math.min(3, zoom + delta));
                setZoom(newZoom);
                logger.debug('editor', 'Wheel zoom', { zoom: newZoom.toFixed(2) });
            }
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [zoom, setZoom]);

    // Spacebar pan mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space' && !isSpacePressed) {
                e.preventDefault();
                setIsSpacePressed(true);
                logger.debug('editor', 'Pan mode enabled');
            }
            // G key toggles grid
            if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
                setGridVisible(prev => !prev);
                logger.debug('editor', 'Grid toggled');
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false);
                setIsPanning(false);
                logger.debug('editor', 'Pan mode disabled');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isSpacePressed]);

    // Pan handlers
    const handleWrapperMouseDown = useCallback((e: React.MouseEvent) => {
        if (isSpacePressed) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
        }
    }, [isSpacePressed, panX, panY]);

    const handleWrapperMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning && isSpacePressed) {
            setPanX(e.clientX - panStart.x);
            setPanY(e.clientY - panStart.y);
        }
    }, [isPanning, isSpacePressed, panStart]);

    const handleWrapperMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Mouse wheel zoom (Ctrl/Cmd + scroll)
    const handleWheelZoom = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1; // scroll down = zoom out, up = zoom in
            const newZoom = Math.max(0.5, Math.min(2, zoom + delta));
            setZoom(newZoom);
        }
    }, [zoom, setZoom]);

    // Rotation handler
    const handleAutoColor = async (id: string) => {
        const el = elements.find(e => e.id === id);
        if (!el || el.type !== 'text') return;

        setIsAnalyzingColor(true);

        const myIndex = elements.findIndex(e => e.id === id);
        let bgImage = null;
        for (let i = myIndex - 1; i >= 0; i--) {
            if (elements[i].type === 'image' && elements[i].imageUrl) {
                bgImage = elements[i].imageUrl;
                break;
            }
        }

        if (!bgImage && backgroundImage) {
            bgImage = backgroundImage;
        }

        if (!bgImage) {
            console.warn("No background image to analyze");
            setIsAnalyzingColor(false);
            return;
        }

        try {
            const { perception } = await analyzeImageLuminance(bgImage, {
                x: (el.x / 100) * selectedFrame.width,
                y: (el.y / 100) * selectedFrame.height,
                width: (el.width / 100) * selectedFrame.width,
                height: (el.height / 100) * selectedFrame.height,
                containerWidth: selectedFrame.width,
                containerHeight: selectedFrame.height
            });

            updateElement(id, { color: perception === 'dark' ? '#ffffff' : '#000000' });
        } catch (error) {
            console.error("Auto-Color failed:", error);
        } finally {
            setIsAnalyzingColor(false);
        }
    };

    const handleRotationStart = useCallback((e: React.MouseEvent, elementId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const element = elements.find(el => el.id === elementId);
        if (!element || element.locked) return;

        setSelectedId(elementId);
        setIsRotating(true);

        // Get element center
        const target = e.currentTarget.parentElement;
        if (target) {
            const rect = target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
            setRotationStart({ angle: startAngle, rotation: element.rotation });
        }
    }, [elements]);

    // Rotation mouse move
    useEffect(() => {
        if (!isRotating || !selectedId) return;

        const handleRotationMove = (e: MouseEvent) => {
            const element = document.querySelector(`[data-element-id="${selectedId}"]`);
            if (!element) return;

            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            let currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
            let newRotation = rotationStart.rotation + (currentAngle - rotationStart.angle);

            // Snap to 15° when Shift is held
            if (e.shiftKey) {
                newRotation = Math.round(newRotation / 15) * 15;
            }

            // Normalize to 0-360
            newRotation = ((newRotation % 360) + 360) % 360;
            updateElement(selectedId, { rotation: newRotation });
        };

        const handleRotationEnd = () => {
            setIsRotating(false);
            saveToHistory([...elements]);
            logger.debug('editor', 'Rotation ended');
        };

        window.addEventListener('mousemove', handleRotationMove);
        window.addEventListener('mouseup', handleRotationEnd);
        return () => {
            window.removeEventListener('mousemove', handleRotationMove);
            window.removeEventListener('mouseup', handleRotationEnd);
        };
    }, [isRotating, selectedId, rotationStart, elements, updateElement, saveToHistory]);

    // Inline editing handlers
    const startEditing = useCallback((elementId: string) => {
        const element = elements.find(el => el.id === elementId);
        if (!element || element.type !== 'text' || element.locked) return;

        setEditingId(elementId);
        setSelectedId(elementId);
        logger.debug('editor', 'Inline editing started', { id: elementId });

        // Focus the contentEditable after it renders
        setTimeout(() => {
            if (editInputRef.current) {
                editInputRef.current.focus();
                // Select all text
                const range = document.createRange();
                range.selectNodeContents(editInputRef.current);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        }, 0);
    }, [elements]);

    const finishEditing = useCallback(() => {
        if (!editingId || !editInputRef.current) return;

        const newText = editInputRef.current.innerText.trim() || 'Add text';
        updateElement(editingId, { text: newText });
        saveToHistory([...elements]);
        setEditingId(null);
        logger.debug('editor', 'Inline editing finished', { id: editingId, newText });
    }, [editingId, elements, updateElement, saveToHistory]);

    const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditingId(null);
            logger.debug('editor', 'Inline editing cancelled');
        }
    }, [finishEditing]);

    // Click outside to finish editing
    useEffect(() => {
        if (!editingId) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
                finishEditing();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editingId, finishEditing]);

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent, elementId: string, handle?: string) => {
        e.preventDefault();
        e.stopPropagation();

        const element = elements.find(el => el.id === elementId);
        if (!element || element.locked) return;

        // Support multi-select with Shift+click
        toggleSelection(elementId, e.shiftKey);
        setDragStart({ x: e.clientX, y: e.clientY });
        setElementStart({ x: element.x, y: element.y, width: element.width, height: element.height });

        if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
        } else {
            setIsDragging(true);
        }
    };

    const [alignmentGuides, setAlignmentGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

    // Snap to other objects (Smart Guides)
    const snapToObjects = useCallback((x: number, y: number, width: number, height: number, excludeId: string) => {
        const threshold = 0.5; // 0.5% snap threshold
        let snappedX = x;
        let snappedY = y;
        let guides = { x: null as number | null, y: null as number | null };

        // Center points
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        for (const el of elements) {
            if (el.id === excludeId || !el.visible) continue;

            const elCenterX = el.x + el.width / 2;
            const elCenterY = el.y + el.height / 2;

            // Horizontal Alignment (Vertical Line)
            // Left to Left
            if (Math.abs(x - el.x) < threshold) { snappedX = el.x; guides.x = el.x; }
            // Left to Right
            else if (Math.abs(x - (el.x + el.width)) < threshold) { snappedX = el.x + el.width; guides.x = el.x + el.width; }
            // Right to Left
            else if (Math.abs((x + width) - el.x) < threshold) { snappedX = el.x - width; guides.x = el.x; }
            // Right to Right
            else if (Math.abs((x + width) - (el.x + el.width)) < threshold) { snappedX = el.x + el.width - width; guides.x = el.x + el.width; }
            // Center to Center
            else if (Math.abs(centerX - elCenterX) < threshold) { snappedX = elCenterX - width / 2; guides.x = elCenterX; }

            // Vertical Alignment (Horizontal Line)
            // Top to Top
            if (Math.abs(y - el.y) < threshold) { snappedY = el.y; guides.y = el.y; }
            // Top to Bottom
            else if (Math.abs(y - (el.y + el.height)) < threshold) { snappedY = el.y + el.height; guides.y = el.y + el.height; }
            // Bottom to Top
            else if (Math.abs((y + height) - el.y) < threshold) { snappedY = el.y - height; guides.y = el.y; }
            // Bottom to Bottom
            else if (Math.abs((y + height) - (el.y + el.height)) < threshold) { snappedY = el.y + el.height - height; guides.y = el.y + el.height; }
            // Center to Center
            else if (Math.abs(centerY - elCenterY) < threshold) { snappedY = elCenterY - height / 2; guides.y = elCenterY; }
        }

        return { x: snappedX, y: snappedY, guides };
    }, [elements]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

        if (isDragging && selectedId) {
            let newX = Math.max(0, Math.min(95, elementStart.x + deltaX));
            let newY = Math.max(0, Math.min(95, elementStart.y + deltaY));
            const width = elementStart.width;
            const height = elementStart.height;

            // 1. Try Object Snap first
            const objectSnap = snapToObjects(newX, newY, width, height, selectedId);

            let finalX = objectSnap.x;
            let finalY = objectSnap.y;
            let activeGuides = objectSnap.guides;

            // 2. If no object snap, try Grid Snap (if enabled)
            if (snapEnabled) {
                if (activeGuides.x === null) {
                    const gridSnap = snapToGrid(finalX);
                    if (gridSnap.snapped) {
                        finalX = gridSnap.value;
                        // For grid, we don't show full alignment line, maybe just snap
                    }
                }
                if (activeGuides.y === null) {
                    const gridSnap = snapToGrid(finalY);
                    if (gridSnap.snapped) finalY = gridSnap.value;
                }
            }

            // Set alignment guides for visual feedback
            setAlignmentGuides(activeGuides);

            // Also keep using snapIndicator for grid/general snap feedback if needed
            setSnapIndicator({
                x: activeGuides.x !== null ? activeGuides.x : null,
                y: activeGuides.y !== null ? activeGuides.y : null,
            });

            updateElement(selectedId, {
                x: finalX,
                y: finalY,
            });
        }

        if (isResizing && selectedId && resizeHandle) {
            let updates: Partial<CanvasElement> = {};
            const aspectRatio = elementStart.width / elementStart.height;

            // Check if Shift is held for aspect ratio lock
            if (e.shiftKey && (resizeHandle === 'se' || resizeHandle === 'nw' || resizeHandle === 'ne' || resizeHandle === 'sw')) {
                // Aspect ratio locked resize
                const primaryDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aspectRatio;
                if (resizeHandle.includes('e')) {
                    updates.width = Math.max(5, elementStart.width + primaryDelta);
                    updates.height = Math.max(3, (elementStart.width + primaryDelta) / aspectRatio);
                }
                if (resizeHandle.includes('w')) {
                    updates.x = Math.max(0, elementStart.x + primaryDelta);
                    updates.width = Math.max(5, elementStart.width - primaryDelta);
                    updates.height = Math.max(3, (elementStart.width - primaryDelta) / aspectRatio);
                }
                if (resizeHandle.includes('s') && !resizeHandle.includes('e') && !resizeHandle.includes('w')) {
                    updates.height = Math.max(3, elementStart.height + deltaY);
                    updates.width = Math.max(5, (elementStart.height + deltaY) * aspectRatio);
                }
                if (resizeHandle.includes('n') && !resizeHandle.includes('e') && !resizeHandle.includes('w')) {
                    updates.y = Math.max(0, elementStart.y + deltaY);
                    updates.height = Math.max(3, elementStart.height - deltaY);
                    updates.width = Math.max(5, (elementStart.height - deltaY) * aspectRatio);
                }
            } else {
                // Free resize (original behavior)
                if (resizeHandle.includes('e')) updates.width = Math.max(5, elementStart.width + deltaX);
                if (resizeHandle.includes('w')) {
                    updates.x = Math.max(0, elementStart.x + deltaX);
                    updates.width = Math.max(5, elementStart.width - deltaX);
                }
                if (resizeHandle.includes('s')) updates.height = Math.max(3, elementStart.height + deltaY);
                if (resizeHandle.includes('n')) {
                    updates.y = Math.max(0, elementStart.y + deltaY);
                    updates.height = Math.max(3, elementStart.height - deltaY);
                }
            }
            updateElement(selectedId, updates);
        }
    }, [isDragging, isResizing, selectedId, resizeHandle, dragStart, elementStart, updateElement]);

    const handleMouseUp = useCallback(() => {
        if (isDragging || isResizing) {
            saveToHistory([...elements]);
            setSnapIndicator({ x: null, y: null });
            setAlignmentGuides({ x: null, y: null });
        }
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    }, [isDragging, isResizing, elements, saveToHistory]);

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    // Context menu
    const handleContextMenu = (e: React.MouseEvent, elementId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(elementId);
        setContextMenu({ x: e.clientX, y: e.clientY, elementId });
    };

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        if (contextMenu) window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    // Canvas click
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedId(null);
        }
    };

    // Helper to proxy images for CORS (fixes Tainted Canvas & Display issues)
    const getProxiedUrl = useCallback((url: string) => {
        if (!url) return '';
        if (url.startsWith('data:')) return url; // Base64 is safe
        if (url.startsWith('/')) return url; // Local assets are safe
        // Only proxy if not already proxied
        if (url.includes('/api/proxy-image')) return url;

        return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }, []);

    // Export
    const handleExport = async () => {
        if (!canvasRef.current) return;
        setIsExporting(true);
        const prevSelected = selectedId;
        setSelectedId(null);
        // Wait for selection handles to disappear
        await new Promise(r => setTimeout(r, 200));

        try {
            console.log('Exporting design...');
            // Calculate pixel ratio to export at full resolution (frame size)
            // If display is 500px but frame is 1080px, ratio is 2.16
            const pixelRatio = (selectedFrame.width && displayWidth) ? (selectedFrame.width / displayWidth) : 1;

            let dataUrl = '';
            const options = {
                pixelRatio,
                backgroundColor: null as any
            };

            if (exportFormat === 'png') {
                dataUrl = await toPng(canvasRef.current, options);
            } else if (exportFormat === 'jpeg') {
                // JPEG needs a background, default to white if transparent
                dataUrl = await toJpeg(canvasRef.current, {
                    ...options,
                    quality: exportQuality / 100,
                    backgroundColor: backgroundColor || '#ffffff'
                });
            } else if (exportFormat === 'webp') {
                // html-to-image doesn't have direct WebP, so use canvas
                const canvas = await toCanvas(canvasRef.current, options);
                dataUrl = canvas.toDataURL('image/webp', exportQuality / 100);
            }

            const link = document.createElement('a');
            link.download = `design-${Date.now()}.${exportFormat === 'jpeg' ? 'jpg' : exportFormat}`;
            link.href = dataUrl;
            link.click();

            // Track export usage
            // useAuthStore.getState().incrementUsage('exportsThisMonth');

            console.log('Export successful!');
            setShowExportModal(false);
        } catch (error: any) {
            console.error('Export failed:', error);
            alert(`Export failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsExporting(false);
            setSelectedId(prevSelected);
        }
    };

    // Image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isBackground = false) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (isBackground) {
                    setBackgroundImage(event.target?.result as string);
                } else {
                    addElement({
                        type: 'image',
                        name: 'Image',
                        imageUrl: event.target?.result as string,
                        width: 40,
                        height: 40,
                        borderRadius: 0,
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Image Replace - swap image while keeping element properties
    const handleImageReplace = (elementId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target?.result as string;
                updateElement(elementId, {
                    imageUrl
                });
            };
            reader.readAsDataURL(file);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // AI Background Removal
    const handleRemoveBackground = useCallback(async (elementId: string, imageUrl: string) => {
        if (isRemovingBg) return;
        setIsRemovingBg(true);
        try {
            const blob = await removeBackground(imageUrl);
            const url = URL.createObjectURL(blob);
            updateElement(elementId, { imageUrl: url });
        } catch (error) {
            console.error('Background removal failed:', error);
        } finally {
            setIsRemovingBg(false);
        }
    }, [isRemovingBg, updateElement]);

    // Load templates from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('postdesigner_templates');
        if (stored) {
            try {
                setSavedTemplates(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to load templates:', e);
            }
        }
    }, []);

    // Generate thumbnail for template
    const generateThumbnail = useCallback(async (): Promise<string> => {
        if (!canvasRef.current) return '';

        try {
            console.log('Generating template thumbnail...');
            const thumbnail = await toJpeg(canvasRef.current, {
                quality: 0.7,
                pixelRatio: 0.5,
                backgroundColor: backgroundColor || '#ffffff',
            });
            return thumbnail;
        } catch (thumbError) {
            console.warn('Thumbnail generation failed, using fallback:', thumbError);
            // Create a simple colored fallback thumbnail
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 200;
            fallbackCanvas.height = 250;
            const ctx = fallbackCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = backgroundColor || '#6366f1';
                ctx.fillRect(0, 0, 200, 250);
                ctx.fillStyle = '#ffffff';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Template', 100, 125);
            }
            return fallbackCanvas.toDataURL('image/jpeg', 0.7);
        }
    }, [backgroundColor]);

    // Save template to Firebase (new system)
    const saveAsTemplateToFirebase = useCallback(async (formData: TemplateFormData) => {
        const thumbnail = await generateThumbnail();

        // Collect bindable fields from elements
        const dataFields = elements
            .filter(el => el.isBindable && el.bindConfig)
            .map(el => ({
                id: el.bindConfig!.fieldId,
                elementId: el.id,
                label: el.bindConfig!.label,
                type: el.bindConfig!.fieldType,
                placeholder: el.bindConfig!.placeholder,
                required: el.bindConfig!.required,
                constraints: el.bindConfig!.constraints,
            }));

        // Build the canvas state JSON
        const canvasStateObj = {
            elements: [...elements],
            background: {
                color: backgroundColor,
                image: backgroundImage,
                gradient: backgroundGradient,
            },
            frame: {
                id: selectedFrame.id,
                name: selectedFrame.name,
                width: selectedFrame.width,
                height: selectedFrame.height,
            },
            config: {
                gridVisible,
                snapEnabled,
                gridSize,
            }
        };

        const templatePayload = {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            tags: formData.tags,
            isPro: formData.isPro,
            type: 'canvas' as const,
            canvasState: JSON.stringify(canvasStateObj),
            thumbnail,
            layout: {
                imagePosition: 'full' as const,
                textPosition: 'bottom' as const,
                hasInsetPhoto: false,
                hasSwipeIndicator: false,
                hasSocialIcons: false,
            },
            style: {
                backgroundColor,
                textColor: '#ffffff',
                accentColor: '#6366f1',
                highlightColor: '#ec4899',
                gradientOverlay: backgroundGradient.enabled ? 'linear' : 'none',
                fontFamily: 'Inter, sans-serif',
                brandPosition: 'top-center' as const,
            },
            dataFields, // Now populated from bindable elements!
        };

        try {
            if (editingTemplateId) {
                // UPDATE existing template
                await updateTemplate(editingTemplateId, {
                    ...templatePayload,
                    updatedAt: new Date()
                });
                console.log('Template updated successfully!', editingTemplateId);
            } else {
                // CREATE new template
                await saveTemplateToFirebase(templatePayload, user.id);
                console.log('Template created successfully!', {
                    name: formData.name,
                    dataFieldsCount: dataFields.length
                });
            }

            setShowSaveTemplateModal(false);
        } catch (error) {
            console.error('Failed to save template:', error);
            throw error;
        }
    }, [elements, backgroundColor, backgroundImage, backgroundGradient, selectedFrame, gridVisible, snapEnabled, gridSize, generateThumbnail, saveTemplateToFirebase, updateTemplate, editingTemplateId]);

    // Old save template (keeping for backward compat with localStorage templates)
    const saveAsTemplate = useCallback(async (name: string) => {
        if (!canvasRef.current || !name.trim()) return;

        const thumbnail = await generateThumbnail();

        const template: DesignTemplate = {
            id: `template-${Date.now()}`,
            name: name.trim(),
            thumbnail,
            elements: [...elements],
            backgroundColor,
            backgroundImage,
            backgroundGradient,
            frameSize: { width: selectedFrame.width, height: selectedFrame.height },
            createdAt: new Date().toISOString(),
        };

        setSavedTemplates(prev => {
            const updated = [template, ...prev];
            localStorage.setItem('postdesigner_templates', JSON.stringify(updated));
            console.log('Template saved successfully:', template.name, 'Total templates:', updated.length);
            return updated;
        });
        setShowSaveTemplateModal(false);
        setTemplateName('');
    }, [elements, backgroundColor, backgroundImage, backgroundGradient, selectedFrame, generateThumbnail]);

    // Load template
    const loadTemplate = useCallback((template: DesignTemplate) => {
        setElements(template.elements);
        setBackgroundColor(template.backgroundColor);
        setBackgroundImage(template.backgroundImage || null);
        setBackgroundGradient(template.backgroundGradient || backgroundGradientDefault);
        const frame = frameSizes.find(f => f.width === template.frameSize.width && f.height === template.frameSize.height);
        if (frame) setSelectedFrame(frame);
        setSelectedIds([]);
        saveToHistory(template.elements);
    }, [saveToHistory]);

    // Phase 28: Add Template to Scene (Nested/Group)
    const addTemplateToScene = useCallback((template: DesignTemplate) => {
        const newElements = template.elements.map(el => ({
            ...el,
            id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: el.x + 5,
            y: el.y + 5,
            name: `${el.name} (Copy)`
        }));
        setElements(prev => {
            const updated = [...prev, ...newElements];
            saveToHistory(updated);
            return updated;
        });
        setSelectedIds(newElements.map(e => e.id));
    }, [saveToHistory]);

    // Delete template
    const deleteTemplate = useCallback((id: string) => {
        setSavedTemplates(prev => {
            const updated = prev.filter(t => t.id !== id);
            localStorage.setItem('postdesigner_templates', JSON.stringify(updated));
            return updated;
        });
    }, []);

    // Autosave effect - debounced save to localStorage
    useEffect(() => {
        if (!autoSaveEnabled || elements.length === 0) return;

        // Clear any pending save
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Debounce autosave by 3 seconds
        autoSaveTimeoutRef.current = setTimeout(() => {
            setIsSavingAuto(true);

            const designState = {
                elements,
                backgroundColor,
                backgroundImage,
                selectedFrame,
                savedAt: new Date().toISOString(),
            };

            try {
                localStorage.setItem('postDesigner_autosave', JSON.stringify(designState));
                setLastSaveTime(new Date());
                logger.debug('editor', 'Autosave completed', { elementCount: elements.length });
            } catch (error) {
                logger.error('editor', 'Autosave failed', { error });
            } finally {
                setIsSavingAuto(false);
            }
        }, 3000);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [elements, backgroundColor, backgroundImage, selectedFrame, autoSaveEnabled]);

    // Load autosaved design on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('postDesigner_autosave');
            if (saved) {
                const designState = JSON.parse(saved);
                if (designState.elements && designState.elements.length > 0) {
                    // Could show a prompt to restore - for now just log
                    logger.info('editor', 'Autosave data found', { savedAt: designState.savedAt });
                }
            }
        } catch (error) {
            logger.warn('editor', 'Failed to load autosave', { error });
        }
    }, []);

    // Unified save function
    const saveDesign = useCallback(async (isExiting = false, scheduleOptions?: { status: 'scheduled' | 'draft', scheduledAt: Date }) => {
        if (elements.length === 0) return;

        try {
            setIsSavingAuto(true);

            // Serialize and update store - include ALL state
            const canvasState = JSON.stringify({
                elements,
                background: {
                    color: backgroundColor,
                    image: backgroundImage,
                    gradient: backgroundGradient
                },
                frame: selectedFrame,
                config: {
                    gridVisible,
                    snapEnabled,
                    gridSize
                },
                platforms: platformVariants // Persist variants inside canvas state
            });
            useEditorStore.getState().setCanvasJson(canvasState);

            const platform = selectedFrame.id.split('-')[0];

            logger.debug('editor', 'Generating thumbnail...');
            let thumbnail = '';
            try {
                if (!canvasRef.current) throw new Error("No canvas ref");

                // Use JPEG with reasonable resolution (balance between quality and size)
                thumbnail = await toJpeg(canvasRef.current, {
                    quality: 0.8,
                    pixelRatio: 0.5,
                    cacheBust: true,
                    backgroundColor: backgroundColor || '#ffffff'
                });

                // DEBUG ALERT - User requested
                // alert(`DEBUG: Thumnail Generated. Size: ${thumbnail.length} characters.`);
                // logger.debug('editor', `Thumbnail generated. Length: ${thumbnail?.length}`);
            } catch (thumbError: any) {
                console.error("Thumbnail generation failed:", thumbError);
                // alert(`Thumbnail Error: ${thumbError.message}`);
            }

            if (!user?.id) {
                console.error('[CRITICAL] SAVE ABORTED: User ID missing in EditorPage');
                // alert('Error: You appear to be logged out. Please refresh the page.');
                return;
            }

            const savedPostId = await savePost({
                id: currentPost?.id,
                title: elements.find(e => e.type === 'text')?.text?.slice(0, 20) || currentPost?.title || 'Untitled Design',
                status: scheduleOptions?.status || currentPost?.status || 'draft',
                scheduledAt: scheduleOptions?.scheduledAt || currentPost?.scheduledAt || undefined,
                platform: platform,
                userId: user.id, // Explicitly pass verified user.id
                images: { thumbnail: thumbnail } // Pass the generated thumbnail
            });

            // Update URL if this was a new post (so refresh works)
            if (!currentPost?.id && savedPostId) {
                window.history.replaceState(null, '', `/editor/${savedPostId}`);
            }

            // Confirm Save completed
            // alert("DEBUG: Save Successful! Check Posts page.");

            logger.info('editor', isExiting ? 'Auto-saved on exit' : 'Manual save completed');

            if (isExiting) {
                // Check if we came from Smart Generator
                const returnUrl = localStorage.getItem('smart_gen_return');
                if (returnUrl) {
                    localStorage.removeItem('smart_gen_return');
                    window.location.href = returnUrl;
                } else {
                    window.location.href = "/dashboard";
                }
            } else {
                // Show a quick success state if needed
                setIsSavingAuto(false);
            }
        } catch (error: any) {
            console.error("Save failed", error);
            setIsSavingAuto(false);

            // CRITICAL: Alert the user if save fails
            // alert(`SAVE FAILED: ${error.message || "Unknown error"}. Check console.`);

            // Do NOT exit if save failed, so user can retry
            // if (isExiting) {
            //     window.location.href = "/dashboard";
            // }
        }
    }, [elements, selectedFrame, savePost, currentPost]);

    return (
        <div className="h-screen flex flex-col bg-[#1e1e1e]">
            {/* Header */}
            <header className="h-12 bg-[#252525] border-b border-[#3a3a3a] flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            saveDesign(true);
                        }}
                        className="p-1.5 hover:bg-[#3a3a3a] rounded-lg text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-white font-medium">Post Designer</span>
                    <div className="flex items-center gap-1 ml-4">
                        <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white disabled:opacity-30">
                            <Undo className="w-4 h-4" />
                        </button>
                        <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white disabled:opacity-30">
                            <Redo className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setGridVisible(!gridVisible)} className={cn("p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white", gridVisible && "bg-[#3a3a3a] text-indigo-400")} title="Toggle grid (G)">
                        <Grid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setSafeZonesVisible(!safeZonesVisible)} className={cn("p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white", safeZonesVisible && "bg-[#3a3a3a] text-indigo-400")} title="Toggle Safe Zones">
                        <Layout className="w-4 h-4" />
                    </button>
                    <button onClick={() => setSnapEnabled(!snapEnabled)} className={cn("p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white", snapEnabled && "bg-[#3a3a3a] text-green-400")} title={`Snap to grid: ${snapEnabled ? 'ON' : 'OFF'}`}>
                        <Magnet className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-[#3a3a3a]" />
                    <button onClick={() => setShowShortcuts(true)} className="p-1.5 hover:bg-[#3a3a3a] rounded text-gray-400 hover:text-white" title="Keyboard shortcuts">
                        <Keyboard className="w-4 h-4" />
                    </button>
                    {/* Autosave indicator */}
                    <div className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg" title={lastSaveTime ? `Last saved: ${lastSaveTime.toLocaleTimeString()}` : 'Autosave enabled'}>
                        {isSavingAuto ? (
                            <><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span className="text-blue-400">Saving...</span></>
                        ) : autoSaveEnabled && lastSaveTime ? (
                            <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Saved</span></>
                        ) : autoSaveEnabled ? (
                            <><Cloud className="w-3 h-3 text-gray-400" /></>
                        ) : (
                            <><CloudOff className="w-3 h-3 text-gray-500" /></>
                        )}
                    </div>
                    {isSpacePressed && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-indigo-600/20 rounded-lg text-indigo-400 text-xs">
                            <Hand className="w-3 h-3" /> Pan Mode
                        </div>
                    )}
                    <div className="relative">
                        <button onClick={() => setShowFrameSelector(!showFrameSelector)} className="px-3 py-1.5 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-sm text-white flex items-center gap-1">
                            {selectedFrame.name} <ChevronDown className="w-3 h-3" />
                        </button>
                        {showFrameSelector && (
                            <div className="absolute top-full mt-2 right-0 w-48 bg-[#2a2a2a] rounded-xl shadow-xl border border-[#3a3a3a] py-1 z-50">
                                {frameSizes.map((frame) => (
                                    <button key={frame.id} onClick={() => { setSelectedFrame(frame); setShowFrameSelector(false); }}
                                        className={cn("w-full px-3 py-2 text-left text-sm hover:bg-[#3a3a3a]", selectedFrame.id === frame.id ? "text-indigo-400" : "text-white")}>
                                        {frame.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#3a3a3a] rounded-lg">
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-1 hover:bg-[#4a4a4a] rounded text-gray-400">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-white w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-1 hover:bg-[#4a4a4a] rounded text-gray-400">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Phase 29: Version History */}
                    <div className="relative">
                        <button onClick={() => setShowVersionHistory(!showVersionHistory)}
                            className={cn("flex items-center gap-2 px-3 py-1.5 hover:bg-[#3a3a3a] text-white rounded-lg text-sm font-medium transition-colors", showVersionHistory && "bg-[#4a4a4a]")}>
                            <HistoryIcon className="w-4 h-4" /> History
                        </button>
                        {showVersionHistory && (
                            <div className="absolute top-full mt-2 right-0 w-64 bg-[#2a2a2a] rounded-xl shadow-xl border border-[#3a3a3a] p-2 z-50">
                                <div className="flex justify-between items-center mb-2 px-2">
                                    <span className="text-xs font-bold text-white">Versions</span>
                                    <button
                                        onClick={() => {
                                            const newVersion = {
                                                id: Date.now().toString(),
                                                name: `Version ${versions.length + 1}`,
                                                date: new Date(),
                                                elements: JSON.parse(JSON.stringify(elements))
                                            };
                                            setVersions([newVersion, ...versions]);
                                        }}
                                        className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded"
                                    >
                                        + Save Current
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {versions.length === 0 ? (
                                        <div className="text-center py-4 text-gray-500 text-xs">No saved versions</div>
                                    ) : (
                                        versions.map(v => (
                                            <div key={v.id} className="flex items-center justify-between p-2 hover:bg-[#3a3a3a] rounded cursor-pointer group">
                                                <div onClick={() => {
                                                    setElements(v.elements);
                                                    saveToHistory(v.elements);
                                                    setShowVersionHistory(false);
                                                }}>
                                                    <div className="text-white text-xs font-medium">{v.name}</div>
                                                    <div className="text-gray-500 text-[10px]">{v.date.toLocaleTimeString()}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => {
                        generateThumbnail().then(thumb => {
                            setThumbnailDataUrl(thumb);
                            setShowSaveTemplateModal(true);
                        });
                    }} className="flex items-center gap-2 px-3 py-1.5 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white rounded-lg text-sm font-medium transition-colors border border-gray-700/50">
                        <Layout className="w-4 h-4" /> Save as Template
                    </button>
                    <button onClick={() => saveDesign(false)} className="flex items-center gap-2 px-3 py-1.5 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white rounded-lg text-sm font-medium transition-colors">
                        <Save className="w-4 h-4" /> Save
                    </button>
                    <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white rounded-lg text-sm font-medium transition-colors">
                        <Calendar className="w-4 h-4" /> Schedule
                    </button>
                    <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </header>

            {/* Element Toolbar - Always visible when selected */}
            <div className={cn("h-10 bg-white flex items-center px-4 gap-2 border-b transition-all", selectedElement ? "opacity-100" : "opacity-0 pointer-events-none")}>
                {selectedElement?.type === 'text' && (
                    <>
                        <input type="color" value={selectedElement.color || '#ffffff'} onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
                        <button
                            onClick={() => handleAutoColor(selectedElement.id)}
                            disabled={isAnalyzingColor}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 ml-1 disabled:opacity-50"
                            title="Auto Contrast Color"
                        >
                            {isAnalyzingColor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        </button>
                        <div className="h-4 w-px bg-gray-300" />
                        <button onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 700 ? 400 : 700 })} className={cn("p-1.5 rounded hover:bg-gray-100", selectedElement.fontWeight === 700 && "bg-gray-200")}>
                            <Bold className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })} className={cn("p-1.5 rounded hover:bg-gray-100", selectedElement.fontStyle === 'italic' && "bg-gray-200")}>
                            <Italic className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateElement(selectedElement.id, { textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })} className={cn("p-1.5 rounded hover:bg-gray-100", selectedElement.textDecoration === 'underline' && "bg-gray-200")}>
                            <Underline className="w-4 h-4" />
                        </button>
                        <div className="h-4 w-px bg-gray-300" />
                        <button onClick={() => updateElement(selectedElement.id, { textAlign: 'left' })} className={cn("p-1.5 rounded hover:bg-gray-100", selectedElement.textAlign === 'left' && "bg-gray-200")}><AlignLeft className="w-4 h-4" /></button>
                        <button onClick={() => updateElement(selectedElement.id, { textAlign: 'center' })} className={cn("p-1.5 rounded hover:bg-gray-100", selectedElement.textAlign === 'center' && "bg-gray-200")}><AlignCenter className="w-4 h-4" /></button>
                        <button onClick={() => updateElement(selectedElement.id, { textAlign: 'right' })} className={cn("p-1.5 rounded hover:bg-gray-100", selectedElement.textAlign === 'right' && "bg-gray-200")}><AlignRight className="w-4 h-4" /></button>
                    </>
                )}
                <div className="h-4 w-px bg-gray-300 mx-2" />
                <button onClick={() => selectedElement && updateElement(selectedElement.id, { flipX: !selectedElement.flipX })} className="p-1.5 rounded hover:bg-gray-100" title="Flip horizontal"><FlipHorizontal className="w-4 h-4" /></button>
                <button onClick={() => selectedElement && updateElement(selectedElement.id, { flipY: !selectedElement.flipY })} className="p-1.5 rounded hover:bg-gray-100" title="Flip vertical"><FlipVertical className="w-4 h-4" /></button>
                <div className="h-4 w-px bg-gray-300 mx-2" />
                <button onClick={() => selectedElement && alignElement(selectedElement.id, 'center')} className="p-1.5 rounded hover:bg-gray-100" title="Center horizontally"><AlignHorizontalJustifyCenter className="w-4 h-4" /></button>
                <button onClick={() => selectedElement && alignElement(selectedElement.id, 'middle')} className="p-1.5 rounded hover:bg-gray-100" title="Center vertically"><AlignVerticalJustifyCenter className="w-4 h-4" /></button>
                <div className="flex-1" />
                <span className="text-sm text-gray-500 mr-2">{selectedElement?.name}</span>
                <button onClick={() => selectedElement && duplicateElement(selectedElement.id)} className="p-1.5 rounded hover:bg-gray-100" title="Duplicate (⌘D)"><Copy className="w-4 h-4" /></button>
                <button onClick={() => selectedElement && deleteElement(selectedElement.id)} className="p-1.5 rounded hover:bg-gray-100 text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>

            {/* Main */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar Icons */}
                <div className="w-16 bg-[#252525] border-r border-[#3a3a3a] flex flex-col items-center py-3 gap-1">
                    {[
                        { id: 'design', icon: Layout, label: 'Design' },
                        { id: 'elements', icon: Shapes, label: 'Elements' },
                        { id: 'text', icon: Type, label: 'Text' },
                        { id: 'uploads', icon: Upload, label: 'Uploads' },
                        { id: 'layers', icon: Layers, label: 'Layers' },
                        { id: 'templates', icon: Copy, label: 'Templates' },
                        { id: 'platforms', icon: Smartphone, label: 'Platforms' },
                    ].map((item) => (
                        <button key={item.id} onClick={() => setActiveSidebar(item.id as typeof activeSidebar)}
                            className={cn("w-12 h-12 flex flex-col items-center justify-center rounded-lg transition text-xs gap-1",
                                activeSidebar === item.id ? "bg-[#3a3a3a] text-white" : "text-gray-400 hover:text-white hover:bg-[#3a3a3a]")}>
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px]">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Left Panel */}
                <div className="w-72 bg-[#2a2a2a] border-r border-[#3a3a3a] overflow-y-auto">
                    {activeSidebar === 'elements' && (
                        <div className="p-4 space-y-6">
                            <div>
                                <h3 className="text-white text-sm font-medium mb-3">Shapes</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {['rectangle', 'circle', 'triangle', 'star', 'heart', 'pentagon', 'hexagon', 'arrow'].map((shape) => (
                                        <button key={shape} onClick={() => addElement({
                                            type: 'shape',
                                            name: shape.charAt(0).toUpperCase() + shape.slice(1),
                                            shapeType: shape as CanvasElement['shapeType'],
                                            fillColor: '#6366f1',
                                            width: 20,
                                            height: 20
                                        })}
                                            className="aspect-square bg-[#3a3a3a] rounded-lg flex items-center justify-center hover:bg-[#4a4a4a] hover:ring-2 hover:ring-indigo-500 transition-all">
                                            <ShapeIcon type={shape} className="w-5 h-5 text-gray-300" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-white text-sm font-medium mb-3">Icons</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { icon: Home, name: 'Home' },
                                        { icon: User, name: 'User' },
                                        { icon: Settings, name: 'Settings' },
                                        { icon: Search, name: 'Search' },
                                        { icon: Bell, name: 'Notification' },
                                        { icon: Heart, name: 'Love' },
                                        { icon: Star, name: 'Favorite' },
                                        { icon: Share2, name: 'Share' },
                                        { icon: MessageCircle, name: 'Message' },
                                        { icon: Mail, name: 'Mail' },
                                        { icon: Calendar, name: 'Date' },
                                        { icon: MapPin, name: 'Location' },
                                    ].map((item) => (
                                        <button key={item.name} onClick={() => {
                                            const id = `el-${Date.now()}`;
                                            const newElement: CanvasElement = {
                                                id,
                                                type: 'icon',
                                                name: item.name,
                                                x: 50,
                                                y: 50,
                                                width: 10,
                                                height: 10,
                                                rotation: 0,
                                                locked: false,
                                                visible: true,
                                                flipX: false,
                                                flipY: false,
                                                iconName: item.name,
                                                strokeColor: '#ffffff',
                                                strokeWidth: 2
                                            };
                                            setElements(prev => {
                                                const updated = [...prev, newElement];
                                                saveToHistory(updated);
                                                return updated;
                                            });
                                            setSelectedId(id);
                                        }}
                                            className="aspect-square bg-[#3a3a3a] rounded-lg flex items-center justify-center hover:bg-[#4a4a4a] hover:ring-2 hover:ring-indigo-500 transition-all">
                                            <item.icon className="w-5 h-5 text-gray-300" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-white text-sm font-medium mb-3">Smart Placeholders</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: 'image', label: 'Image', icon: Image },
                                        { type: 'text', label: 'Text', icon: Type },
                                        { type: 'logo', label: 'Logo', icon: Fingerprint },
                                    ].map((item) => (
                                        <button key={item.type} onClick={() => {
                                            const bindMeta = getNextBindableField(item.type as 'text' | 'image' | 'logo');
                                            addElement({
                                                type: item.type === 'text' ? 'text' : 'image',
                                                name: `${bindMeta.label} Slot`,
                                                text: item.type === 'text' ? bindMeta.placeholder : undefined,
                                                width: 30,
                                                height: item.type === 'text' ? 10 : 30,
                                                isPlaceholder: true,
                                                placeholderType: item.type as any,
                                                opacity: 1,
                                                isBindable: true,
                                                bindConfig: {
                                                    fieldId: bindMeta.id,
                                                    label: bindMeta.label,
                                                    placeholder: bindMeta.placeholder,
                                                    required: bindMeta.required,
                                                    fieldType: bindMeta.fieldType,
                                                }
                                            });
                                        }}
                                            className="aspect-[4/3] bg-[#3a3a3a] rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-[#4a4a4a] hover:ring-2 hover:ring-indigo-500 transition-all">
                                            <item.icon className="w-5 h-5 text-indigo-400" />
                                            <span className="text-[10px] text-gray-400">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSidebar === 'text' && (
                        <div className="p-4 space-y-3">
                            <button onClick={() => addElement({ type: 'text', name: 'Heading', text: 'Add a heading', fontSize: 32, fontWeight: 700, color: '#ffffff', width: 80, height: 10 })}
                                className="w-full p-3 bg-[#3a3a3a] rounded-lg text-left hover:bg-[#4a4a4a]">
                                <span className="text-white text-xl font-bold">Add a heading</span>
                            </button>
                            <button onClick={() => addElement({ type: 'text', name: 'Subheading', text: 'Add a subheading', fontSize: 20, color: '#ffffff', width: 60, height: 8 })}
                                className="w-full p-3 bg-[#3a3a3a] rounded-lg text-left hover:bg-[#4a4a4a]">
                                <span className="text-white text-lg">Add a subheading</span>
                            </button>
                            <button onClick={() => addElement({ type: 'text', name: 'Body Text', text: 'Add body text', fontSize: 14, color: '#ffffff', width: 50, height: 5 })}
                                className="w-full p-3 bg-[#3a3a3a] rounded-lg text-left hover:bg-[#4a4a4a]">
                                <span className="text-white text-sm">Add body text</span>
                            </button>
                        </div>
                    )}

                    {activeSidebar === 'design' && (
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="text-white text-sm font-medium mb-2">Background Color</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {['#1a1a2e', '#0f172a', '#000000', '#ffffff', '#6366f1', '#ec4899', '#10b981'].map((c) => (
                                        <button key={c} onClick={() => { setBackgroundColor(c); setBackgroundGradient(prev => ({ ...prev, enabled: false })); }} className={cn("w-8 h-8 rounded-lg border-2", backgroundColor === c && !backgroundGradient.enabled ? "border-indigo-500" : "border-transparent")} style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>

                            {/* Gradient Background */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white text-sm font-medium">Gradient Background</h3>
                                    <button
                                        onClick={() => setBackgroundGradient(prev => ({ ...prev, enabled: !prev.enabled }))}
                                        className={cn("w-10 h-5 rounded-full transition-colors", backgroundGradient.enabled ? "bg-indigo-600" : "bg-[#4a4a4a]")}
                                    >
                                        <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", backgroundGradient.enabled ? "translate-x-5" : "translate-x-0.5")} />
                                    </button>
                                </div>
                                {backgroundGradient.enabled && (
                                    <div className="space-y-3 pl-2 border-l-2 border-[#3a3a3a]">
                                        <div className="flex gap-2">
                                            <button onClick={() => setBackgroundGradient(prev => ({ ...prev, type: 'linear' }))}
                                                className={cn("flex-1 py-1 rounded text-xs", backgroundGradient.type === 'linear' ? 'bg-indigo-600 text-white' : 'bg-[#3a3a3a] text-gray-400')}>
                                                Linear
                                            </button>
                                            <button onClick={() => setBackgroundGradient(prev => ({ ...prev, type: 'radial' }))}
                                                className={cn("flex-1 py-1 rounded text-xs", backgroundGradient.type === 'radial' ? 'bg-indigo-600 text-white' : 'bg-[#3a3a3a] text-gray-400')}>
                                                Radial
                                            </button>
                                        </div>
                                        {backgroundGradient.type === 'linear' && (
                                            <div>
                                                <label className="text-gray-500 text-xs">Angle ({backgroundGradient.angle}°)</label>
                                                <input type="range" min="0" max="360" value={backgroundGradient.angle}
                                                    onChange={(e) => setBackgroundGradient(prev => ({ ...prev, angle: parseInt(e.target.value) }))}
                                                    className="w-full" />
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-gray-500 text-xs">Color 1</label>
                                                <input type="color" value={backgroundGradient.colors[0].color}
                                                    onChange={(e) => setBackgroundGradient(prev => ({ ...prev, colors: [{ ...prev.colors[0], color: e.target.value }, prev.colors[1]] }))}
                                                    className="w-full h-8 rounded cursor-pointer" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-gray-500 text-xs">Color 2</label>
                                                <input type="color" value={backgroundGradient.colors[1].color}
                                                    onChange={(e) => setBackgroundGradient(prev => ({ ...prev, colors: [prev.colors[0], { ...prev.colors[1], color: e.target.value }] }))}
                                                    className="w-full h-8 rounded cursor-pointer" />
                                            </div>
                                        </div>
                                        {/* Gradient presets */}
                                        <div>
                                            <label className="text-gray-500 text-xs block mb-1">Presets</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {[
                                                    { colors: ['#6366f1', '#ec4899'], name: 'Indigo Pink' },
                                                    { colors: ['#f59e0b', '#ef4444'], name: 'Orange Red' },
                                                    { colors: ['#10b981', '#3b82f6'], name: 'Green Blue' },
                                                    { colors: ['#8b5cf6', '#06b6d4'], name: 'Purple Cyan' },
                                                    { colors: ['#1a1a2e', '#6366f1'], name: 'Dark Indigo' },
                                                ].map((preset) => (
                                                    <button key={preset.name}
                                                        onClick={() => setBackgroundGradient(prev => ({ ...prev, colors: [{ color: preset.colors[0], stop: 0 }, { color: preset.colors[1], stop: 100 }] }))}
                                                        className="w-8 h-8 rounded-lg border border-[#4a4a4a]"
                                                        style={{ background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})` }}
                                                        title={preset.name} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="text-white text-sm font-medium mb-2">Background Image</h3>
                                <input ref={fileInputRef} type="file" accept="image/*,.svg" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border border-dashed border-[#4a4a4a] rounded-lg text-gray-400 hover:border-indigo-500 hover:text-white flex items-center justify-center gap-2">
                                    <Upload className="w-4 h-4" /> Upload Background
                                </button>
                                {backgroundImage && (
                                    <div className="mt-2 relative">
                                        <img src={backgroundImage} className="w-full h-20 object-cover rounded-lg" />
                                        <button onClick={() => setBackgroundImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white"><X className="w-3 h-3" /></button>
                                    </div>
                                )}
                            </div>

                            {/* Brand Palette */}
                            <div className="pt-4 border-t border-[#3a3a3a]">
                                <h3 className="text-white text-sm font-medium mb-2">Brand Palette</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {brandColors.map((color, index) => (
                                        <div key={index} className="relative group">
                                            <button
                                                onClick={() => setBackgroundColor(color)}
                                                className={cn("w-8 h-8 rounded-lg border-2", backgroundColor === color ? "border-indigo-500" : "border-transparent hover:border-gray-500")}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                            <button
                                                onClick={() => setBrandColors(prev => prev.filter((_, i) => i !== index))}
                                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >×</button>
                                        </div>
                                    ))}
                                    <label className="w-8 h-8 rounded-lg border-2 border-dashed border-[#4a4a4a] hover:border-indigo-500 flex items-center justify-center cursor-pointer text-gray-400 hover:text-white">
                                        <Plus className="w-4 h-4" />
                                        <input
                                            type="color"
                                            className="sr-only"
                                            onChange={(e) => setBrandColors(prev => [...prev, e.target.value])}
                                        />
                                    </label>
                                </div>
                                <p className="text-gray-500 text-xs mt-2">Click to use • Hover to remove</p>
                            </div>
                        </div>
                    )}

                    {activeSidebar === 'uploads' && (
                        <div className="p-4">
                            <input type="file" ref={fileInputRef} accept="image/*,.svg" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border border-dashed border-[#4a4a4a] rounded-lg text-gray-400 hover:border-indigo-500 hover:text-white flex items-center justify-center gap-2">
                                <Upload className="w-5 h-5" /> Upload Image
                            </button>
                        </div>
                    )}

                    {activeSidebar === 'layers' && (
                        <div className="p-4 space-y-2">
                            <h3 className="text-white text-sm font-medium mb-3">Layers</h3>
                            {[...elements].reverse().map((el, displayIndex) => {
                                const realIndex = elements.length - 1 - displayIndex;
                                return (
                                    <div
                                        key={el.id}
                                        onClick={() => setSelectedId(el.id)}
                                        draggable
                                        onDragStart={() => setDraggedLayerId(el.id)}
                                        onDragEnd={() => setDraggedLayerId(null)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                            if (draggedLayerId && draggedLayerId !== el.id) {
                                                const fromIndex = elements.findIndex(e => e.id === draggedLayerId);
                                                reorderLayers(fromIndex, realIndex);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg cursor-grab transition-opacity",
                                            selectedId === el.id ? "bg-indigo-600" : "hover:bg-[#3a3a3a]",
                                            draggedLayerId === el.id && "opacity-50"
                                        )}
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }); }} className="text-gray-400 hover:text-white">
                                            {el.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <span className="text-white text-sm flex-1 truncate">{el.name}</span>
                                        {el.isBindable && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setBindingElementId(el.id);
                                                    setShowBindPanel(true);
                                                }}
                                                className="text-indigo-400 hover:text-indigo-300"
                                                title={`Bindable: ${el.bindConfig?.label || 'User Input'}`}
                                            >
                                                <Link2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }} className="text-gray-400 hover:text-white">
                                            {el.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeSidebar === 'templates' && (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white text-sm font-medium">Templates</h3>
                                <button
                                    onClick={async () => {
                                        // Generate thumbnail preview before opening modal
                                        const thumb = await generateThumbnail();
                                        setThumbnailDataUrl(thumb);
                                        setShowSaveTemplateModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs text-white font-medium"
                                >
                                    + Save Current
                                </button>
                            </div>

                            {savedTemplates.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-500 text-sm">No templates saved yet</div>
                                    <div className="text-gray-600 text-xs mt-1">Save your design as a template to reuse later</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {savedTemplates.map((template) => (
                                        <div
                                            key={template.id}
                                            className="group relative bg-[#3a3a3a] rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                            onClick={() => loadTemplate(template)}
                                        >
                                            <img
                                                src={template.thumbnail}
                                                alt={template.name}
                                                className="w-full aspect-square object-cover"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                <div className="text-white text-xs font-medium truncate">{template.name}</div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addTemplateToScene(template);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Add to Scene (Nested)"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeSidebar === 'platforms' && (
                        <PlatformPanel
                            activePlatformId={activePlatformId}
                            variants={platformVariants}
                            onSelectPlatform={handleSelectPlatform}
                            onCreateVariant={handleCreateVariant}
                            onDeleteVariant={handleDeleteVariant}
                        />
                    )}
                </div>

                {/* Canvas */}
                <div
                    ref={canvasWrapperRef}
                    className="flex-1 flex items-center justify-center p-8 overflow-auto bg-[#1e1e1e]"
                    style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default' }}
                    onMouseDown={handleWrapperMouseDown}
                    onMouseMove={handleWrapperMouseMove}
                    onMouseUp={handleWrapperMouseUp}
                    onMouseLeave={handleWrapperMouseUp}
                    onWheel={handleWheelZoom}
                >
                    <div style={{ transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`, transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 0.1s ease' }}>
                        <div ref={canvasRef} className="shadow-2xl rounded-lg overflow-hidden relative select-none" style={{
                            width: displayWidth,
                            height: displayHeight,
                            backgroundColor,
                            background: backgroundGradient.enabled
                                ? backgroundGradient.type === 'linear'
                                    ? `linear-gradient(${backgroundGradient.angle}deg, ${backgroundGradient.colors[0].color} ${backgroundGradient.colors[0].stop}%, ${backgroundGradient.colors[1].color} ${backgroundGradient.colors[1].stop}%)`
                                    : `radial-gradient(circle, ${backgroundGradient.colors[0].color} ${backgroundGradient.colors[0].stop}%, ${backgroundGradient.colors[1].color} ${backgroundGradient.colors[1].stop}%)`
                                : undefined
                        }} onClick={handleCanvasClick}>
                            {backgroundImage && <img crossOrigin="anonymous" src={getProxiedUrl(backgroundImage)} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="" />}

                            {/* Grid Overlay */}
                            <GridOverlay visible={gridVisible} gridSize={gridSize} width={displayWidth} height={displayHeight} />
                            <SafeZoneOverlay
                                visible={safeZonesVisible}
                                width={displayWidth}
                                height={displayHeight}
                                platformId={selectedFrame.id}
                            />

                            {/* Alignment Guides */}
                            {alignmentGuides.x !== null && (
                                <div className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none" style={{ left: `${alignmentGuides.x}%` }} />
                            )}
                            {alignmentGuides.y !== null && (
                                <div className="absolute left-0 right-0 h-px bg-red-500 z-50 pointer-events-none" style={{ top: `${alignmentGuides.y}%` }} />
                            )}

                            {elements.filter(el => el.visible).map((el) => {
                                const isSelected = selectedId === el.id;
                                return (
                                    <div
                                        key={el.id}
                                        data-element-id={el.id}
                                        className={cn("absolute group", el.locked ? "cursor-not-allowed" : "cursor-move", isSelected && "z-50")}
                                        style={{
                                            left: `${el.x}%`,
                                            top: `${el.y}%`,
                                            width: `${el.width}%`,
                                            height: el.type === 'text' && el.isPlaceholder ? `${el.height}%` : el.type === 'text' ? 'auto' : `${el.height}%`,
                                            transform: `rotate(${el.rotation}deg) scaleX(${el.flipX ? -1 : 1}) scaleY(${el.flipY ? -1 : 1})`
                                        }}
                                        onMouseDown={(e) => !isSpacePressed && !editingId && handleMouseDown(e, el.id)}
                                        onDoubleClick={() => el.type === 'text' && !el.locked && startEditing(el.id)}
                                        onContextMenu={(e) => handleContextMenu(e, el.id)}
                                    >

                                        {el.type === 'text' && !el.isPlaceholder && (
                                            editingId === el.id ? (
                                                <div
                                                    ref={editInputRef}
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    className="outline-none cursor-text whitespace-pre-wrap"
                                                    style={{
                                                        fontSize: el.fontSize ? el.fontSize * scale : 16,
                                                        fontFamily: el.fontFamily || 'Inter, sans-serif',
                                                        fontWeight: el.fontWeight,
                                                        fontStyle: el.fontStyle,
                                                        textDecoration: el.textDecoration,
                                                        color: el.color,
                                                        backgroundColor: el.backgroundColor || 'rgba(99, 102, 241, 0.1)',
                                                        textAlign: el.textAlign,
                                                        padding: '4px 12px',
                                                        borderRadius: 4,
                                                        minWidth: '50px',
                                                        border: '2px solid #6366f1',
                                                    }}
                                                    onKeyDown={handleEditKeyDown}
                                                    onBlur={finishEditing}
                                                >
                                                    {el.text}
                                                </div>
                                            ) : (
                                                (el.curveRadius && el.curveRadius !== 0) ? (
                                                    <svg width="100%" height="100%" overflow="visible">
                                                        <defs>
                                                            <path id={`curve-${el.id}`} d={`M 0,${el.height / 2} Q ${el.width / 2},${(el.height / 2) + el.curveRadius} ${el.width},${el.height / 2}`} />
                                                        </defs>
                                                        <text width="100%" style={{
                                                            fontSize: el.fontSize ? el.fontSize * scale : 16,
                                                            fontFamily: el.fontFamily || 'Inter, sans-serif',
                                                            fontWeight: el.fontWeight,
                                                            fontStyle: el.fontStyle,
                                                            textDecoration: el.textDecoration,
                                                            fill: el.color || '#000',
                                                            letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                                                            textShadow: el.textShadow?.enabled
                                                                ? `${el.textShadow.offsetX}px ${el.textShadow.offsetY}px ${el.textShadow.blur}px ${el.textShadow.color}`
                                                                : undefined,
                                                        }}>
                                                            <textPath href={`#curve-${el.id}`} startOffset="50%" textAnchor="middle">
                                                                {el.text}
                                                            </textPath>
                                                        </text>
                                                    </svg>
                                                ) : (
                                                    <div
                                                        style={{
                                                            fontSize: el.fontSize ? el.fontSize * scale : 16,
                                                            fontFamily: el.fontFamily || 'Inter, sans-serif',
                                                            fontWeight: el.fontWeight,
                                                            fontStyle: el.fontStyle,
                                                            textDecoration: el.textDecoration,
                                                            color: el.color,
                                                            backgroundColor: el.textHighlight ? undefined : el.backgroundColor,
                                                            textAlign: el.textAlign,
                                                            padding: el.textHighlight ? 0 : (el.backgroundColor ? '4px 12px' : 0),
                                                            borderRadius: el.backgroundColor ? 4 : 0,
                                                            letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                                                            lineHeight: el.lineHeight || 1.6,
                                                            whiteSpace: 'pre-wrap',
                                                            textTransform: el.textTransform || 'none',
                                                            textShadow: el.textShadow?.enabled
                                                                ? `${el.textShadow.offsetX}px ${el.textShadow.offsetY}px ${el.textShadow.blur}px ${el.textShadow.color}`
                                                                : undefined,
                                                            WebkitTextStroke: el.textOutline?.enabled
                                                                ? `${el.textOutline.width}px ${el.textOutline.color}`
                                                                : undefined,
                                                            paintOrder: el.textOutline?.enabled ? 'stroke fill' : undefined,
                                                        }}
                                                        title="Double-click to edit"
                                                    >
                                                        {el.textHighlight ? (
                                                            <span
                                                                style={{
                                                                    backgroundColor: el.backgroundColor || 'transparent',
                                                                    boxDecorationBreak: 'clone',
                                                                    WebkitBoxDecorationBreak: 'clone',
                                                                    padding: '0.15em 0.5em',
                                                                    borderRadius: '0',
                                                                }}
                                                            >
                                                                {el.text}
                                                            </span>
                                                        ) : (
                                                            el.text
                                                        )}
                                                    </div>
                                                )
                                            )
                                        )}
                                        {el.type === 'image' && el.imageUrl && (
                                            <div className="w-full h-full relative" style={{
                                                borderRadius: el.borderRadius,
                                                boxShadow: el.shadow?.enabled ? `${el.shadow.x || 0}px ${el.shadow.y || 4}px ${el.shadow.blur || 10}px ${el.shadow.color || 'rgba(0,0,0,0.3)'}` : undefined
                                            }}>
                                                <div className="w-full h-full relative overflow-hidden" style={{
                                                    borderRadius: el.borderRadius,
                                                    clipPath: el.maskShape ? getShapePath(el.maskShape, el.shapeParam) : undefined
                                                }}>
                                                    <img
                                                        crossOrigin="anonymous"
                                                        src={getProxiedUrl(el.imageUrl)}
                                                        className="w-full h-full object-cover"
                                                        style={{
                                                            opacity: el.opacity ?? 1,
                                                            objectPosition: el.focusPoint ? `${el.focusPoint.x}% ${el.focusPoint.y}%` : '50% 50%',
                                                            filter: el.imageFilters
                                                                ? `brightness(${el.imageFilters.brightness}%) contrast(${el.imageFilters.contrast}%) saturate(${el.imageFilters.saturation}%) blur(${el.imageFilters.blur + (el.effect?.type === 'blur' ? el.effect.intensity : 0)}px) grayscale(${el.imageFilters.grayscale}%)`
                                                                : undefined
                                                        }}
                                                        alt=""
                                                    />
                                                    {el.effect?.enabled && el.effect.type === 'noise' && (
                                                        <div className="absolute inset-0 pointer-events-none opacity-50"
                                                            style={{
                                                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                                                mixBlendMode: 'overlay'
                                                            }}
                                                        />
                                                    )}
                                                    {el.effect?.enabled && el.effect.type === 'glass' && (
                                                        <div className="absolute inset-0 pointer-events-none"
                                                            style={{ backdropFilter: `blur(${el.effect.intensity || 10}px)` }}
                                                        />
                                                    )}
                                                    {el.overlay?.enabled && (
                                                        <div
                                                            className="absolute inset-x-0 pointer-events-none"
                                                            style={{
                                                                top: el.overlay.direction === 'top-down' ? 0 : (el.overlay.direction === 'full' ? 0 : undefined),
                                                                bottom: el.overlay.direction === 'bottom-up' ? 0 : (el.overlay.direction === 'full' ? 0 : undefined),
                                                                height: el.overlay.direction === 'full' ? '100%' : `${el.overlay.height}%`,
                                                                background: el.overlay.direction === 'full'
                                                                    ? el.overlay.color
                                                                    : `linear-gradient(${el.overlay.direction === 'bottom-up' ? 'to top' : 'to bottom'}, ${el.overlay.color}, transparent)`,
                                                                opacity: el.overlay.opacity / 100,
                                                                mixBlendMode: el.overlay.blendMode || 'normal'
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {el.type === 'shape' && (
                                            <div className="w-full h-full" style={{
                                                backgroundColor: el.fillColor,
                                                borderRadius: el.shapeType === 'circle' ? '50%' : el.shapeType === 'rectangle' ? el.borderRadius || 0 : 0,
                                                clipPath: getShapePath(el.shapeType || 'rectangle', el.shapeParam),
                                                border: el.strokeWidth ? `${el.strokeWidth}px ${el.strokeStyle || 'solid'} ${el.strokeColor || '#000'}` : undefined,
                                                opacity: el.opacity ?? 1,
                                            }} />
                                        )}
                                        {el.type === 'icon' && el.iconName && ICON_MAP[el.iconName] && (
                                            <div className="w-full h-full flex items-center justify-center" style={{ color: el.strokeColor || '#6366f1', opacity: el.opacity ?? 1 }}>
                                                {(() => {
                                                    const Icon = ICON_MAP[el.iconName!];
                                                    return <Icon className="w-full h-full" strokeWidth={el.strokeWidth || 2} />;
                                                })()}
                                            </div>
                                        )}

                                        {/* Phase 28: Placeholder Rendering - Only show if NO image is loaded */}
                                        {el.isPlaceholder && !el.imageUrl && (
                                            <div className="w-full h-full bg-white/80 backdrop-blur-sm">
                                                <PlaceholderElement
                                                    type={el.placeholderType || 'all'}
                                                    width={el.width}
                                                    height={el.height}
                                                    isActive={isSelected}
                                                    label={el.name}
                                                    onClick={() => {
                                                        if (el.placeholderType === 'image' || el.placeholderType === 'logo') {
                                                            // Trigger image upload
                                                            setSelectedId(el.id);
                                                            fileInputRef.current?.click();
                                                        } else if (el.placeholderType === 'text') {
                                                            // Convert to text element
                                                            updateElement(el.id, {
                                                                isPlaceholder: false,
                                                                text: 'Double click to edit',
                                                                color: '#000000',
                                                                fontSize: 24
                                                            });
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {isSelected && !el.locked && (
                                            <>
                                                <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

                                                {/* Rotation handle */}
                                                <div className="absolute left-1/2 -top-8 w-px h-6 bg-blue-500 -translate-x-1/2" />
                                                <div
                                                    className="absolute left-1/2 -top-10 w-4 h-4 bg-white border-2 border-blue-500 rounded-full -translate-x-1/2 cursor-pointer hover:bg-blue-100 flex items-center justify-center"
                                                    onMouseDown={(e) => handleRotationStart(e, el.id)}
                                                    title={`Rotate (${Math.round(el.rotation)}°)`}
                                                >
                                                    <RotateCw className="w-2 h-2 text-blue-500" />
                                                </div>

                                                {/* Resize handles */}
                                                {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map((h) => (
                                                    <div key={h} className={cn("absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm",
                                                        h === 'nw' && "-top-1.5 -left-1.5 cursor-nw-resize",
                                                        h === 'ne' && "-top-1.5 -right-1.5 cursor-ne-resize",
                                                        h === 'sw' && "-bottom-1.5 -left-1.5 cursor-sw-resize",
                                                        h === 'se' && "-bottom-1.5 -right-1.5 cursor-se-resize",
                                                        h === 'n' && "-top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize",
                                                        h === 's' && "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize",
                                                        h === 'w' && "top-1/2 -left-1.5 -translate-y-1/2 cursor-w-resize",
                                                        h === 'e' && "top-1/2 -right-1.5 -translate-y-1/2 cursor-e-resize",
                                                    )} onMouseDown={(e) => handleMouseDown(e, el.id, h)} />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Properties (Always visible when selected) */}
                <div className={cn("w-64 bg-[#2a2a2a] border-l border-[#3a3a3a] overflow-y-auto transition-all", selectedElement ? "translate-x-0" : "translate-x-full w-0 opacity-0")}>
                    {selectedElement && (
                        <div className="p-4 space-y-4">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <Move className="w-4 h-4" /> Properties
                            </h3>

                            <div>
                                <label className="text-gray-400 text-xs block mb-1">Name</label>
                                <input type="text" value={selectedElement.name} onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
                                    className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm" />
                            </div>

                            <div className="pt-2 pb-2">
                                <button
                                    onClick={() => {
                                        setBindingElementId(selectedElement.id);
                                        setShowBindPanel(true);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border",
                                        selectedElement.isBindable
                                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/50 hover:bg-indigo-500/20"
                                            : "bg-[#3a3a3a] text-gray-300 border-[#4a4a4a] hover:bg-[#4a4a4a] hover:text-white"
                                    )}
                                >
                                    <Link2 className="w-4 h-4" />
                                    {selectedElement.isBindable ? (
                                        <span>Bound: {selectedElement.bindConfig?.label}</span>
                                    ) : (
                                        <span>Connect Data</span>
                                    )}
                                </button>
                                {selectedElement.isBindable && (
                                    <p className="text-[10px] text-gray-500 mt-1 text-center">
                                        This element will be dynamically replaced when using this template.
                                    </p>
                                )}
                            </div>

                            {/* Phase 27: Smart Layouts - Anchoring */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-gray-400 text-xs block mb-1">Anchor To</label>
                                    <select
                                        value={selectedElement.relativeTo || ''}
                                        onChange={(e) => updateElement(selectedElement.id, { relativeTo: e.target.value || undefined })}
                                        className="w-full px-2 py-1.5 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-xs"
                                    >
                                        <option value="">None</option>
                                        {elements
                                            .filter(el => el.id !== selectedElement.id) // Can't anchor to self
                                            .map(el => (
                                                <option key={el.id} value={el.id}>{el.name}</option>
                                            ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs block mb-1">Position</label>
                                    <select
                                        value={selectedElement.anchor || ''}
                                        disabled={!selectedElement.relativeTo}
                                        onChange={(e) => updateElement(selectedElement.id, { anchor: e.target.value as any })}
                                        className="w-full px-2 py-1.5 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-xs disabled:opacity-50"
                                    >
                                        <option value="">-</option>
                                        <option value="bottom-left">Below (Left)</option>
                                        <option value="bottom-right">Below (Right)</option>
                                        <option value="top-left">Above (Left)</option>
                                        <option value="top-right">Above (Right)</option>
                                    </select>
                                </div>
                            </div>

                            {selectedElement.type === 'text' && (
                                <>
                                    {/* Text Style Tokens */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-gray-400 text-xs">Text Style</label>
                                        </div>
                                        <select
                                            className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm"
                                            onChange={(e) => {
                                                const styleId = e.target.value;
                                                const style = textStyles.find(s => s.id === styleId);
                                                if (style) {
                                                    // Apply style properties but preserve content
                                                    const { text, ...styleProps } = style.style;
                                                    updateElement(selectedElement.id, styleProps);
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Select a style...</option>
                                            {textStyles.map((style) => (
                                                <option key={style.id} value={style.id}>{style.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Text Content</label>
                                        <textarea value={selectedElement.text || ''} onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })} rows={3}
                                            className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm resize-none" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Font Size</label>
                                        <input type="number" min="1" max="500" value={selectedElement.fontSize ?? ''} onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Font Family</label>
                                        <select
                                            value={selectedElement.fontFamily || 'Inter, sans-serif'}
                                            onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                                            className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm"
                                        >
                                            {FONT_FAMILIES.map((font) => (
                                                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                                    {font.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <select
                                                value={selectedElement.fontWeight || 400}
                                                onChange={(e) => updateElement(selectedElement.id, { fontWeight: parseInt(e.target.value) })}
                                                className="w-full px-2 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm"
                                            >
                                                <option value={100}>Thin (100)</option>
                                                <option value={200}>Extra Light (200)</option>
                                                <option value={300}>Light (300)</option>
                                                <option value={400}>Regular (400)</option>
                                                <option value={500}>Medium (500)</option>
                                                <option value={600}>Semi Bold (600)</option>
                                                <option value={700}>Bold (700)</option>
                                                <option value={800}>Extra Bold (800)</option>
                                                <option value={900}>Black (900)</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                            className={cn("flex-1 py-2 rounded-lg border border-[#4a4a4a] flex items-center justify-center gap-1", selectedElement.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'bg-[#3a3a3a] text-gray-400')}
                                        >
                                            <Italic className="w-4 h-4" /> Italic
                                        </button>
                                    </div>

                                    {/* Phase 27: Auto Scale */}
                                    <div className="flex items-center justify-between py-2 border-b border-[#3a3a3a] mb-2">
                                        <span className="text-gray-400 text-xs flex items-center gap-2">
                                            <Maximize2 className="w-3 h-3" /> Auto Scale Text
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={selectedElement.autoScale || false}
                                                onChange={(e) => updateElement(selectedElement.id, { autoScale: e.target.checked })} />
                                            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Background Color</label>
                                        <input type="color" value={selectedElement.backgroundColor || '#000000'} onChange={(e) => updateElement(selectedElement.id, { backgroundColor: e.target.value })}
                                            className="w-full h-10 rounded-lg cursor-pointer" />
                                    </div>



                                    {/* Text Effects Section - Force Rebuild */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white text-sm font-medium">Text Effects</h4>
                                        </div>

                                        {/* Highlight and Transform Row */}
                                        <div className="flex gap-2 mb-3">
                                            <div className="flex-1">
                                                <label className="text-gray-400 text-xs block mb-1">Highlight</label>
                                                <button
                                                    onClick={() => updateElement(selectedElement.id, { textHighlight: !selectedElement.textHighlight })}
                                                    className={cn("w-full py-2 rounded-lg border border-[#4a4a4a] text-xs transition-colors", selectedElement.textHighlight ? "bg-indigo-600 text-white border-indigo-600" : "bg-[#3a3a3a] text-gray-400")}
                                                >
                                                    {selectedElement.textHighlight ? "Box Mode" : "Normal"}
                                                </button>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-gray-400 text-xs block mb-1">Transform Case</label>
                                                <div className="flex bg-[#3a3a3a] rounded-lg border border-[#4a4a4a] p-0.5">
                                                    <button
                                                        onClick={() => {
                                                            const newText = selectedElement.text?.toUpperCase();
                                                            updateElement(selectedElement.id, { text: newText, textTransform: 'none' });
                                                        }}
                                                        className="flex-1 py-1.5 rounded flex items-center justify-center hover:bg-[#4a4a4a] text-gray-400 hover:text-white"
                                                        title="UPPERCASE"
                                                    >
                                                        <CaseUpper className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newText = selectedElement.text?.toLowerCase();
                                                            updateElement(selectedElement.id, { text: newText, textTransform: 'none' });
                                                        }}
                                                        className="flex-1 py-1.5 rounded flex items-center justify-center hover:bg-[#4a4a4a] text-gray-400 hover:text-white"
                                                        title="lowercase"
                                                    >
                                                        <CaseLower className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            // Simple Title Case
                                                            const newText = selectedElement.text?.replace(
                                                                /\w\S*/g,
                                                                (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                                                            );
                                                            updateElement(selectedElement.id, { text: newText, textTransform: 'none' });
                                                        }}
                                                        className="flex-1 py-1.5 rounded flex items-center justify-center hover:bg-[#4a4a4a] text-gray-400 hover:text-white"
                                                        title="Title Case"
                                                    >
                                                        <CaseSensitive className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            // Dynamic Number Formatting
                                                            const nFormatter = (num: number, digits: number) => {
                                                                const lookup = [
                                                                    { value: 1, symbol: "" },
                                                                    { value: 1e3, symbol: "k" },
                                                                    { value: 1e6, symbol: "M" },
                                                                    { value: 1e9, symbol: "G" },
                                                                    { value: 1e12, symbol: "T" },
                                                                    { value: 1e15, symbol: "P" },
                                                                    { value: 1e18, symbol: "E" }
                                                                ];
                                                                const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
                                                                const item = lookup.slice().reverse().find(function (item) {
                                                                    return num >= item.value;
                                                                });
                                                                return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
                                                            };

                                                            const newText = selectedElement.text?.replace(/\b\d{4,}\b/g, (match) => nFormatter(parseInt(match), 1));
                                                            updateElement(selectedElement.id, { text: newText });
                                                        }}
                                                        className="flex-1 py-1.5 rounded flex items-center justify-center hover:bg-[#4a4a4a] text-gray-400 hover:text-white"
                                                        title="Format Numbers (e.g. 1k)"
                                                    >
                                                        <Hash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Letter Spacing */}
                                        <div className="mb-3">
                                            <label className="text-gray-400 text-xs block mb-1">Letter Spacing ({selectedElement.letterSpacing || 0}px)</label>
                                            <input type="range" min="-5" max="20" value={selectedElement.letterSpacing || 0}
                                                onChange={(e) => updateElement(selectedElement.id, { letterSpacing: parseInt(e.target.value) })}
                                                className="w-full" />
                                        </div>

                                        {/* Line Height */}
                                        <div className="mb-3">
                                            <label className="text-gray-400 text-xs block mb-1">Line Height ({selectedElement.lineHeight || 1.2})</label>
                                            <input type="range" min="0.8" max="3" step="0.1" value={selectedElement.lineHeight || 1.2}
                                                onChange={(e) => updateElement(selectedElement.id, { lineHeight: parseFloat(e.target.value) })}
                                                className="w-full" />
                                        </div>

                                        {/* Text Shadow */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-gray-400 text-xs">Text Shadow</label>
                                                <button
                                                    onClick={() => updateElement(selectedElement.id, {
                                                        textShadow: {
                                                            enabled: !selectedElement.textShadow?.enabled,
                                                            offsetX: selectedElement.textShadow?.offsetX ?? 2,
                                                            offsetY: selectedElement.textShadow?.offsetY ?? 2,
                                                            blur: selectedElement.textShadow?.blur ?? 4,
                                                            color: selectedElement.textShadow?.color ?? '#000000'
                                                        }
                                                    })}
                                                    className={cn("w-10 h-5 rounded-full transition-colors", selectedElement.textShadow?.enabled ? "bg-indigo-600" : "bg-[#4a4a4a]")}
                                                >
                                                    <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", selectedElement.textShadow?.enabled ? "translate-x-5" : "translate-x-0.5")} />
                                                </button>
                                            </div>
                                            {selectedElement.textShadow?.enabled && (
                                                <div className="space-y-2 pl-2 border-l-2 border-[#3a3a3a]">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-gray-500 text-[10px]">Blur</label>
                                                            <input type="number" value={selectedElement.textShadow.blur || 0} onChange={(e) => updateElement(selectedElement.id, { textShadow: { ...selectedElement.textShadow, blur: parseInt(e.target.value) } })} className="w-full h-6 px-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-xs" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-gray-500 text-[10px]">Color</label>
                                                            <input type="color" value={selectedElement.textShadow.color || '#000000'} onChange={(e) => updateElement(selectedElement.id, { textShadow: { ...selectedElement.textShadow, color: e.target.value } })} className="w-full h-6 rounded cursor-pointer" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-gray-500 text-[10px]">Off X</label>
                                                            <input type="number" value={selectedElement.textShadow.offsetX || 2} onChange={(e) => updateElement(selectedElement.id, { textShadow: { ...selectedElement.textShadow, offsetX: parseInt(e.target.value) } })} className="w-full h-6 px-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-xs" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-gray-500 text-[10px]">Off Y</label>
                                                            <input type="number" value={selectedElement.textShadow.offsetY || 2} onChange={(e) => updateElement(selectedElement.id, { textShadow: { ...selectedElement.textShadow, offsetY: parseInt(e.target.value) } })} className="w-full h-6 px-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-xs" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Text Outline */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-gray-400 text-xs">Outline</label>
                                                <button
                                                    onClick={() => updateElement(selectedElement.id, {
                                                        textOutline: {
                                                            enabled: !selectedElement.textOutline?.enabled,
                                                            width: selectedElement.textOutline?.width ?? 2,
                                                            color: selectedElement.textOutline?.color ?? '#000000'
                                                        }
                                                    })}
                                                    className={cn("w-10 h-5 rounded-full transition-colors", selectedElement.textOutline?.enabled ? "bg-indigo-600" : "bg-[#4a4a4a]")}
                                                >
                                                    <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", selectedElement.textOutline?.enabled ? "translate-x-5" : "translate-x-0.5")} />
                                                </button>
                                            </div>
                                            {selectedElement.textOutline?.enabled && (
                                                <div className="space-y-2 pl-2 border-l-2 border-[#3a3a3a]">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-gray-500 text-[10px]">Width</label>
                                                            <input type="number" value={selectedElement.textOutline.width || 0} onChange={(e) => updateElement(selectedElement.id, { textOutline: { ...selectedElement.textOutline, width: parseInt(e.target.value) } })} className="w-full h-6 px-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-xs" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-gray-500 text-[10px]">Color</label>
                                                            <input type="color" value={selectedElement.textOutline.color || '#000000'} onChange={(e) => updateElement(selectedElement.id, { textOutline: { ...selectedElement.textOutline, color: e.target.value } })} className="w-full h-6 rounded cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Curved Text */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-gray-400 text-xs">Curved Text</label>
                                            <button
                                                onClick={() => updateElement(selectedElement.id, { curveRadius: (selectedElement.curveRadius === undefined || selectedElement.curveRadius === 0) ? 100 : 0 })}
                                                className={cn("w-10 h-5 rounded-full transition-colors", (selectedElement.curveRadius || 0) !== 0 ? "bg-indigo-600" : "bg-[#4a4a4a]")}
                                            >
                                                <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", (selectedElement.curveRadius || 0) !== 0 ? "translate-x-5" : "translate-x-0.5")} />
                                            </button>
                                        </div>
                                        {(selectedElement.curveRadius || 0) !== 0 && (
                                            <div className="pl-2 border-l-2 border-[#3a3a3a]">
                                                <label className="text-gray-500 text-xs block mb-1">Curve Strength ({selectedElement.curveRadius})</label>
                                                <input type="range" min="-360" max="360" value={selectedElement.curveRadius || 0}
                                                    onChange={(e) => updateElement(selectedElement.id, { curveRadius: parseInt(e.target.value) })}
                                                    className="w-full" />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {selectedElement.type === 'shape' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Fill Color</label>
                                        <input type="color" value={selectedElement.fillColor || '#6366f1'} onChange={(e) => updateElement(selectedElement.id, { fillColor: e.target.value })}
                                            className="w-full h-10 rounded-lg cursor-pointer" />
                                    </div>

                                    {(selectedElement.shapeType === 'star' || selectedElement.shapeType === 'burst') && (
                                        <div>
                                            <label className="text-gray-400 text-xs block mb-1">Points ({selectedElement.shapeParam || (selectedElement.shapeType === 'star' ? 5 : 12)})</label>
                                            <input type="range" min="3" max="20" value={selectedElement.shapeParam || (selectedElement.shapeType === 'star' ? 5 : 12)}
                                                onChange={(e) => updateElement(selectedElement.id, { shapeParam: parseInt(e.target.value) })}
                                                className="w-full" />
                                        </div>
                                    )}

                                    {(selectedElement.shapeType === 'rectangle' || !selectedElement.shapeType) && (
                                        <div>
                                            <label className="text-gray-400 text-xs block mb-1">Corner Radius ({selectedElement.borderRadius || 0}px)</label>
                                            <input type="range" min="0" max="50" value={selectedElement.borderRadius || 0}
                                                onChange={(e) => updateElement(selectedElement.id, { borderRadius: parseInt(e.target.value) })}
                                                className="w-full" />
                                        </div>
                                    )}

                                    {(selectedElement.shapeType === 'rectangle' || selectedElement.shapeType === 'circle' || !selectedElement.shapeType) && (
                                        <>
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">Stroke Width ({selectedElement.strokeWidth || 0}px)</label>
                                                <input type="range" min="0" max="10" value={selectedElement.strokeWidth || 0}
                                                    onChange={(e) => updateElement(selectedElement.id, { strokeWidth: parseInt(e.target.value) })}
                                                    className="w-full" />
                                            </div>
                                            {(selectedElement.strokeWidth || 0) > 0 && (
                                                <>
                                                    <div>
                                                        <label className="text-gray-400 text-xs block mb-1">Stroke Color</label>
                                                        <input type="color" value={selectedElement.strokeColor || '#000000'}
                                                            onChange={(e) => updateElement(selectedElement.id, { strokeColor: e.target.value })}
                                                            className="w-full h-8 rounded cursor-pointer" />
                                                    </div>
                                                    <div>
                                                        <label className="text-gray-400 text-xs block mb-1">Stroke Style</label>
                                                        <select value={selectedElement.strokeStyle || 'solid'}
                                                            onChange={(e) => updateElement(selectedElement.id, { strokeStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}
                                                            className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm">
                                                            <option value="solid">Solid</option>
                                                            <option value="dashed">Dashed</option>
                                                            <option value="dotted">Dotted</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {selectedElement.type === 'image' && (
                                <div className="space-y-4">
                                    {/* Replace Image */}
                                    <div>
                                        <input
                                            ref={replaceInputRef}
                                            type="file"
                                            accept="image/*,.svg"
                                            onChange={(e) => handleImageReplace(selectedElement.id, e)}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => replaceInputRef.current?.click()}
                                            className="w-full py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg text-gray-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Replace Image
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Border Radius ({selectedElement.borderRadius || 0}px)</label>
                                        <input type="range" min="0" max="50" value={selectedElement.borderRadius || 0} onChange={(e) => updateElement(selectedElement.id, { borderRadius: parseInt(e.target.value) })} className="w-full" />
                                    </div>

                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Mask Shape</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['none', 'circle', 'triangle', 'star', 'heart', 'hexagon', 'burst', 'message'].map((shape) => (
                                                <button
                                                    key={shape}
                                                    onClick={() => updateElement(selectedElement.id, { maskShape: shape === 'none' ? undefined : shape })}
                                                    className={cn("h-8 rounded flex items-center justify-center border",
                                                        (selectedElement.maskShape === shape || (!selectedElement.maskShape && shape === 'none'))
                                                            ? "bg-indigo-600 border-indigo-500 text-white"
                                                            : "bg-[#3a3a3a] border-[#4a4a4a] text-gray-400 hover:text-white"
                                                    )}
                                                    title={shape}
                                                >
                                                    {shape === 'none' ? <X className="w-4 h-4" /> : <ShapeIcon type={shape} className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Mask Details Slider - Show if Star or Burst */}
                                        {(selectedElement.maskShape === 'star' || selectedElement.maskShape === 'burst') && (
                                            <div className="mt-2 pl-2 border-l-2 border-[#3a3a3a]">
                                                <label className="text-gray-400 text-[10px] block mb-1">Points ({selectedElement.shapeParam || 5})</label>
                                                <input
                                                    type="range"
                                                    min="3"
                                                    max="20"
                                                    step="1"
                                                    value={selectedElement.shapeParam || 5}
                                                    onChange={(e) => updateElement(selectedElement.id, { shapeParam: parseInt(e.target.value) })}
                                                    className="w-full h-1 bg-[#4a4a4a] rounded-lg appearance-none cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Text Protection Overlay */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white text-sm font-medium">Text Protection Overlay</h4>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={selectedElement.overlay?.enabled || false}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        overlay: {
                                                            enabled: e.target.checked,
                                                            direction: selectedElement.overlay?.direction || 'bottom-up',
                                                            color: selectedElement.overlay?.color || '#000000',
                                                            opacity: selectedElement.overlay?.opacity ?? 70,
                                                            height: selectedElement.overlay?.height ?? 50
                                                        }
                                                    })} />
                                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {selectedElement.overlay?.enabled && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-gray-400 text-xs block mb-1">Overlay Color</label>
                                                    <div className="flex gap-2">
                                                        <input type="color" value={selectedElement.overlay.color}
                                                            onChange={(e) => updateElement(selectedElement.id, { overlay: { ...selectedElement.overlay!, color: e.target.value } })}
                                                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden" />
                                                        <div className="flex-1 flex gap-1">
                                                            {['#000000', '#ffffff', '#1e1e1e', '#f3f4f6'].map(color => (
                                                                <button key={color} onClick={() => updateElement(selectedElement.id, { overlay: { ...selectedElement.overlay!, color } })}
                                                                    className="w-8 h-8 rounded border border-[#4a4a4a]" style={{ backgroundColor: color }} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-gray-400 text-xs block mb-1">Direction</label>
                                                    <select value={selectedElement.overlay.direction}
                                                        onChange={(e) => updateElement(selectedElement.id, { overlay: { ...selectedElement.overlay!, direction: e.target.value as any } })}
                                                        className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm">
                                                        <option value="bottom-up">Bottom Up (Standard)</option>
                                                        <option value="top-down">Top Down</option>
                                                        <option value="full">Full Overlay</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-gray-400 text-xs block mb-1">Opacity ({selectedElement.overlay.opacity}%)</label>
                                                    <input type="range" min="0" max="100" value={selectedElement.overlay.opacity}
                                                        onChange={(e) => updateElement(selectedElement.id, { overlay: { ...selectedElement.overlay!, opacity: parseInt(e.target.value) } })}
                                                        className="w-full" />
                                                </div>
                                                <div>
                                                    <label className="text-gray-400 text-xs block mb-1">Blend Mode</label>
                                                    <select value={selectedElement.overlay.blendMode || 'normal'}
                                                        onChange={(e) => updateElement(selectedElement.id, { overlay: { ...selectedElement.overlay!, blendMode: e.target.value as any } })}
                                                        className="w-full px-3 py-2 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg text-white text-sm">
                                                        <option value="normal">Normal</option>
                                                        <option value="multiply">Multiply (Darken)</option>
                                                        <option value="screen">Screen (Lighten)</option>
                                                        <option value="overlay">Overlay (Contrast)</option>
                                                        <option value="soft-light">Soft Light</option>
                                                    </select>
                                                </div>
                                                {selectedElement.overlay.direction !== 'full' && (
                                                    <div>
                                                        <label className="text-gray-400 text-xs block mb-1">Height / Spread ({selectedElement.overlay.height}%)</label>
                                                        <input type="range" min="0" max="100" value={selectedElement.overlay.height}
                                                            onChange={(e) => updateElement(selectedElement.id, { overlay: { ...selectedElement.overlay!, height: parseInt(e.target.value) } })}
                                                            className="w-full" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Shadows & Glows */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white text-sm font-medium">Shadows & Glows</h4>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={selectedElement.shadow?.enabled || false}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        shadow: {
                                                            enabled: e.target.checked,
                                                            color: selectedElement.shadow?.color || 'rgba(0,0,0,0.5)',
                                                            blur: selectedElement.shadow?.blur ?? 20,
                                                            x: selectedElement.shadow?.x ?? 0,
                                                            y: selectedElement.shadow?.y ?? 10
                                                        }
                                                    })} />
                                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {selectedElement.shadow?.enabled && (
                                            <div className="space-y-3">
                                                {/* Shadow Presets */}
                                                <div className="grid grid-cols-3 gap-2 mb-2">
                                                    {[
                                                        { name: 'Soft', blur: 30, x: 0, y: 15, color: 'rgba(0,0,0,0.3)' },
                                                        { name: 'Hard', blur: 0, x: 8, y: 8, color: '#000000' },
                                                        { name: 'Neon', blur: 20, x: 0, y: 0, color: '#22d3ee' },
                                                    ].map(preset => (
                                                        <button key={preset.name}
                                                            onClick={() => updateElement(selectedElement.id, { shadow: { enabled: true, ...preset } })}
                                                            className="px-2 py-1 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded text-xs text-gray-300">
                                                            {preset.name}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2 items-center">
                                                    <input type="color" value={selectedElement.shadow.color.startsWith('#') ? selectedElement.shadow.color : '#000000'}
                                                        onChange={(e) => updateElement(selectedElement.id, { shadow: { ...selectedElement.shadow!, color: e.target.value } })}
                                                        className="w-8 h-8 rounded border-0 p-0 overflow-hidden" />
                                                    <span className="text-xs text-gray-400">Shadow Color</span>
                                                </div>

                                                <div>
                                                    <label className="text-gray-400 text-xs block mb-1">Blur ({selectedElement.shadow.blur}px)</label>
                                                    <input type="range" min="0" max="100" value={selectedElement.shadow.blur}
                                                        onChange={(e) => updateElement(selectedElement.id, { shadow: { ...selectedElement.shadow!, blur: parseInt(e.target.value) } })} className="w-full" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-gray-400 text-xs block mb-1">X ({selectedElement.shadow.x}px)</label>
                                                        <input type="number" value={selectedElement.shadow.x}
                                                            onChange={(e) => updateElement(selectedElement.id, { shadow: { ...selectedElement.shadow!, x: parseInt(e.target.value) } })}
                                                            className="w-full bg-[#3a3a3a] border border-[#4a4a4a] rounded px-2 py-1 text-xs text-white" />
                                                    </div>
                                                    <div>
                                                        <label className="text-gray-400 text-xs block mb-1">Y ({selectedElement.shadow.y}px)</label>
                                                        <input type="number" value={selectedElement.shadow.y}
                                                            onChange={(e) => updateElement(selectedElement.id, { shadow: { ...selectedElement.shadow!, y: parseInt(e.target.value) } })}
                                                            className="w-full bg-[#3a3a3a] border border-[#4a4a4a] rounded px-2 py-1 text-xs text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Focus Point */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <h4 className="text-white text-sm font-medium mb-3">Focus Point (Smart Crop)</h4>
                                        <div className="grid grid-cols-3 gap-1 w-24 mx-auto mb-3">
                                            {[
                                                { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 },
                                                { x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 },
                                                { x: 0, y: 100 }, { x: 50, y: 100 }, { x: 100, y: 100 }
                                            ].map((pt, i) => {
                                                const isSelected = (selectedElement.focusPoint?.x ?? 50) === pt.x && (selectedElement.focusPoint?.y ?? 50) === pt.y;
                                                return (
                                                    <button key={i}
                                                        onClick={() => updateElement(selectedElement.id, { focusPoint: pt })}
                                                        className={`w-7 h-7 rounded border ${isSelected ? 'bg-indigo-600 border-indigo-400' : 'bg-[#3a3a3a] border-[#4a4a4a] hover:bg-[#4a4a4a]'}`}
                                                        title={`Focus ${pt.x}% ${pt.y}%`}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="text-center text-xs text-gray-500">
                                            Click to set where the image should center when resized or cropped.
                                        </div>
                                    </div>

                                    {/* Smart Inset (PiP) */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white text-sm font-medium">Smart Inset (PiP)</h4>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={selectedElement.isInset || false}
                                                    onChange={(e) => {
                                                        const isEnabled = e.target.checked;
                                                        updateElement(selectedElement.id, {
                                                            isInset: isEnabled,
                                                            // Auto-apply aesthetics if enabling
                                                            borderRadius: isEnabled ? 1000 : selectedElement.borderRadius, // Circle
                                                            shadow: isEnabled ? { enabled: true, color: 'rgba(0,0,0,0.3)', blur: 20, x: 0, y: 10 } : selectedElement.shadow,
                                                            // You might want to handle border here but border is generic. 
                                                            // For now we assume user adds border manually or we add a border property later.
                                                        });
                                                    }} />
                                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {selectedElement.isInset && (
                                            <div className="space-y-3">
                                                <div className="bg-[#2a2a2a] p-3 rounded-lg border border-[#4a4a4a]">
                                                    <label className="text-gray-400 text-xs block mb-2 text-center">Snap to Corner</label>
                                                    <div className="grid grid-cols-2 gap-2 w-24 mx-auto">
                                                        <button onClick={() => updateElement(selectedElement.id, { x: 5, y: 5, insetAnchor: 'top-left' })}
                                                            className={`h-8 rounded border ${selectedElement.insetAnchor === 'top-left' ? 'bg-indigo-600 border-indigo-400' : 'bg-[#3a3a3a] border-[#4a4a4a] hover:bg-[#4a4a4a]'}`}>
                                                            TL
                                                        </button>
                                                        <button onClick={() => updateElement(selectedElement.id, { x: 65, y: 5, insetAnchor: 'top-right' })}
                                                            className={`h-8 rounded border ${selectedElement.insetAnchor === 'top-right' ? 'bg-indigo-600 border-indigo-400' : 'bg-[#3a3a3a] border-[#4a4a4a] hover:bg-[#4a4a4a]'}`}>
                                                            TR
                                                        </button>
                                                        <button onClick={() => updateElement(selectedElement.id, { x: 5, y: 65, insetAnchor: 'bottom-left' })}
                                                            className={`h-8 rounded border ${selectedElement.insetAnchor === 'bottom-left' ? 'bg-indigo-600 border-indigo-400' : 'bg-[#3a3a3a] border-[#4a4a4a] hover:bg-[#4a4a4a]'}`}>
                                                            BL
                                                        </button>
                                                        <button onClick={() => updateElement(selectedElement.id, { x: 65, y: 65, insetAnchor: 'bottom-right' })}
                                                            className={`h-8 rounded border ${selectedElement.insetAnchor === 'bottom-right' ? 'bg-indigo-600 border-indigo-400' : 'bg-[#3a3a3a] border-[#4a4a4a] hover:bg-[#4a4a4a]'}`}>
                                                            BR
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-gray-500 text-center">
                                                    Note: Inset mode auto-enables circle crop and shadow.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Background Effects */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white text-sm font-medium">Background Effects</h4>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={selectedElement.effect?.enabled || false}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        effect: {
                                                            enabled: e.target.checked,
                                                            type: selectedElement.effect?.type || 'glass',
                                                            intensity: selectedElement.effect?.intensity || 5
                                                        }
                                                    })} />
                                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {selectedElement.effect?.enabled && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['glass', 'blur', 'noise'].map(type => (
                                                        <button key={type}
                                                            onClick={() => updateElement(selectedElement.id, { effect: { ...selectedElement.effect!, type: type as any } })}
                                                            className={`px-3 py-2 rounded text-sm capitalize ${selectedElement.effect?.type === type ? 'bg-indigo-600 text-white' : 'bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]'}`}>
                                                            {type === 'glass' ? 'Glass Blur' : type}
                                                        </button>
                                                    ))}
                                                </div>
                                                {selectedElement.effect.type !== 'noise' && (
                                                    <div>
                                                        <label className="text-gray-400 text-xs block mb-1">Intensity ({selectedElement.effect.intensity}px)</label>
                                                        <input type="range" min="0" max="20" value={selectedElement.effect.intensity}
                                                            onChange={(e) => updateElement(selectedElement.id, { effect: { ...selectedElement.effect!, intensity: parseInt(e.target.value) } })}
                                                            className="w-full" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Image Filters Section */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-white text-sm font-medium">Image Filters</h4>
                                            <button onClick={() => updateElement(selectedElement.id, {
                                                imageFilters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0 }
                                            })} className="text-xs text-gray-400 hover:text-white">Reset</button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">Brightness ({selectedElement.imageFilters?.brightness ?? 100}%)</label>
                                                <input type="range" min="0" max="200" value={selectedElement.imageFilters?.brightness ?? 100}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        imageFilters: { ...selectedElement.imageFilters!, brightness: parseInt(e.target.value) }
                                                    })} className="w-full" />
                                            </div>
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">Contrast ({selectedElement.imageFilters?.contrast ?? 100}%)</label>
                                                <input type="range" min="0" max="200" value={selectedElement.imageFilters?.contrast ?? 100}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        imageFilters: { ...selectedElement.imageFilters!, contrast: parseInt(e.target.value) }
                                                    })} className="w-full" />
                                            </div>
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">Saturation ({selectedElement.imageFilters?.saturation ?? 100}%)</label>
                                                <input type="range" min="0" max="200" value={selectedElement.imageFilters?.saturation ?? 100}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        imageFilters: { ...selectedElement.imageFilters!, saturation: parseInt(e.target.value) }
                                                    })} className="w-full" />
                                            </div>
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">Blur ({selectedElement.imageFilters?.blur ?? 0}px)</label>
                                                <input type="range" min="0" max="20" value={selectedElement.imageFilters?.blur ?? 0}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        imageFilters: { ...selectedElement.imageFilters!, blur: parseInt(e.target.value) }
                                                    })} className="w-full" />
                                            </div>
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">Grayscale ({selectedElement.imageFilters?.grayscale ?? 0}%)</label>
                                                <input type="range" min="0" max="100" value={selectedElement.imageFilters?.grayscale ?? 0}
                                                    onChange={(e) => updateElement(selectedElement.id, {
                                                        imageFilters: { ...selectedElement.imageFilters!, grayscale: parseInt(e.target.value) }
                                                    })} className="w-full" />
                                            </div>
                                        </div>

                                        {/* Filter Presets */}
                                        <div className="mt-3">
                                            <label className="text-gray-500 text-xs block mb-2">Presets</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {[
                                                    { name: 'Vivid', filters: { brightness: 110, contrast: 120, saturation: 130, blur: 0, grayscale: 0 } },
                                                    { name: 'Vintage', filters: { brightness: 90, contrast: 85, saturation: 60, blur: 0, grayscale: 20 } },
                                                    { name: 'B&W', filters: { brightness: 100, contrast: 110, saturation: 0, blur: 0, grayscale: 100 } },
                                                    { name: 'Cool', filters: { brightness: 105, contrast: 100, saturation: 90, blur: 0, grayscale: 0 } },
                                                    { name: 'Warm', filters: { brightness: 105, contrast: 95, saturation: 120, blur: 0, grayscale: 0 } },
                                                ].map((preset) => (
                                                    <button key={preset.name}
                                                        onClick={() => updateElement(selectedElement.id, { imageFilters: preset.filters })}
                                                        className="px-2 py-1 text-xs bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded text-gray-300">
                                                        {preset.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Background Remover */}
                                    <div className="pt-3 border-t border-[#3a3a3a]">
                                        <h4 className="text-white text-sm font-medium mb-2">AI Background Remover</h4>
                                        <button
                                            onClick={() => selectedElement.imageUrl && handleRemoveBackground(selectedElement.id, selectedElement.imageUrl)}
                                            disabled={isRemovingBg || !selectedElement.imageUrl}
                                            className={cn(
                                                "w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                                                isRemovingBg ? "bg-[#3a3a3a] text-gray-500 cursor-wait" : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                                            )}
                                        >
                                            {isRemovingBg ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>✨ Remove Background</>
                                            )}
                                        </button>
                                        <p className="text-gray-500 text-xs mt-2 text-center">AI-powered • Takes 5-15 seconds</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-[#3a3a3a] space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">X (%)</label>
                                        <input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateElement(selectedElement.id, { x: parseFloat(e.target.value) })}
                                            className="w-full px-2 py-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Y (%)</label>
                                        <input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateElement(selectedElement.id, { y: parseFloat(e.target.value) })}
                                            className="w-full px-2 py-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Width (%)</label>
                                        <input type="number" value={Math.round(selectedElement.width)} onChange={(e) => updateElement(selectedElement.id, { width: parseFloat(e.target.value) })}
                                            className="w-full px-2 py-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Height (%)</label>
                                        <input type="number" value={Math.round(selectedElement.height)} onChange={(e) => updateElement(selectedElement.id, { height: parseFloat(e.target.value) })}
                                            className="w-full px-2 py-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded text-white text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >

            {/* Context Menu */}
            <AnimatePresence>
                {
                    contextMenu && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed bg-white rounded-xl shadow-xl border py-1 z-[100] min-w-[180px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
                            {[
                                { icon: Copy, label: 'Copy', shortcut: '⌘C', action: () => copyElement(contextMenu.elementId) },
                                { icon: ClipboardPaste, label: 'Paste', shortcut: '⌘V', action: pasteElement },
                                { icon: Copy, label: 'Duplicate', shortcut: '⌘D', action: () => duplicateElement(contextMenu.elementId) },
                                ...(elements.find(e => e.id === contextMenu.elementId)?.type === 'text' ? [{
                                    icon: Highlighter,
                                    label: elements.find(e => e.id === contextMenu.elementId)?.textHighlight ? 'Remove Highlight' : 'Highlight',
                                    action: () => updateElement(contextMenu.elementId, { textHighlight: !elements.find(e => e.id === contextMenu.elementId)?.textHighlight })
                                }] : []),
                                { divider: true },
                                { icon: Trash2, label: 'Delete', shortcut: 'DEL', action: () => deleteElement(contextMenu.elementId), danger: true },
                                { divider: true },
                                { icon: elements.find(e => e.id === contextMenu.elementId)?.locked ? Unlock : Lock, label: elements.find(e => e.id === contextMenu.elementId)?.locked ? 'Unlock' : 'Lock', shortcut: '⌘L', action: () => updateElement(contextMenu.elementId, { locked: !elements.find(e => e.id === contextMenu.elementId)?.locked }) },
                                { divider: true },
                                { icon: Layers, label: 'Bring to Front', shortcut: '⌘]', action: () => bringToFront(contextMenu.elementId) },
                                { icon: Layers, label: 'Send to Back', shortcut: '⌘[', action: () => sendToBack(contextMenu.elementId) },
                                { divider: true },
                                {
                                    icon: Link2,
                                    label: elements.find(e => e.id === contextMenu.elementId)?.isBindable ? 'Edit Binding' : 'Make Bindable',
                                    action: () => {
                                        setBindingElementId(contextMenu.elementId);
                                        setShowBindPanel(true);
                                    },
                                    highlight: elements.find(e => e.id === contextMenu.elementId)?.isBindable
                                },
                            ].map((item, i) =>
                                item.divider ? <div key={i} className="h-px bg-gray-200 my-1" /> : (
                                    <button key={i} onClick={() => { item.action?.(); setContextMenu(null); }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100",
                                            item.danger && "text-red-500",
                                            item.highlight && "text-indigo-600 bg-indigo-50"
                                        )}>
                                        {item.icon && <item.icon className="w-4 h-4" />}
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {item.shortcut && <span className="text-gray-400 text-xs">{item.shortcut}</span>}
                                        {item.highlight && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
                                    </button>
                                )
                            )}
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Bind Field Panel */}
            {
                bindingElementId && (() => {
                    const bindingElement = elements.find(e => e.id === bindingElementId);
                    return bindingElement ? (
                        <BindFieldPanel
                            isOpen={showBindPanel}
                            onClose={() => {
                                setShowBindPanel(false);
                                setBindingElementId(null);
                            }}
                            elementId={bindingElementId}
                            elementName={bindingElement.name}
                            elementType={bindingElement.type as 'text' | 'image' | 'shape'}
                            currentConfig={bindingElement.bindConfig || null}
                            onSave={(config) => {
                                if (config) {
                                    updateElement(bindingElementId, {
                                        isBindable: true,
                                        bindConfig: config,
                                    });
                                } else {
                                    updateElement(bindingElementId, {
                                        isBindable: false,
                                        bindConfig: undefined,
                                    });
                                }
                            }}
                        />
                    ) : null;
                })()
            }

            {/* Keyboard Shortcuts Modal */}
            <AnimatePresence>
                {
                    showShortcuts && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
                            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2"><Keyboard className="w-5 h-5" /> Keyboard Shortcuts</h2>
                                    <button onClick={() => setShowShortcuts(false)}><X className="w-5 h-5" /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(KEYBOARD_SHORTCUTS).map(([key, { key: shortcut, label }]) => (
                                        <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                                            <span className="text-sm text-gray-700">{label}</span>
                                            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{shortcut}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Save Template Modal - NEW Firebase-backed version */}
            <SaveTemplateModal
                isOpen={showSaveTemplateModal}
                onClose={() => setShowSaveTemplateModal(false)}
                onSave={handleSaveFullTemplate}
                thumbnailUrl={thumbnailDataUrl}
            />

            <TemplateFillModal
                isOpen={showTemplateFillModal}
                onClose={() => setShowTemplateFillModal(false)}
                template={templateToFill}
                initialValues={templateFillInitialValues}
                onGenerate={async (variables) => {
                    const sourceElements = pendingTemplateElements || elements;
                    const mappedElements = applyTemplateVariables(sourceElements, variables, templateFillFallback).map(el => {
                        if (lockHeadlineParam && el.type === 'text' && (el.bindConfig?.fieldId === 'headline' || el.name.toLowerCase().includes('headline'))) {
                            return { ...el, locked: true };
                        }
                        if (lockSummaryParam && el.type === 'text' && (el.bindConfig?.fieldId === 'summary' || el.name.toLowerCase().includes('summary'))) {
                            return { ...el, locked: true };
                        }
                        return el;
                    });
                    setElements(mappedElements);
                    setPendingTemplateElements(null);
                    setTemplateToFill(null);
                    setShowTemplateFillModal(false);
                }}
            />

            <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSchedule={async (date) => {
                    await saveDesign(true, { status: 'scheduled', scheduledAt: date });
                }}
            />

            <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSchedule={async (date) => {
                    await saveDesign(true, { status: 'scheduled', scheduledAt: date });
                }}
            />

            {/* Export Modal */}
            <AnimatePresence>
                {
                    showExportModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowExportModal(false)}>
                            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl p-6 w-full max-w-md">
                                <div className="flex justify-between mb-4">
                                    <h2 className="text-xl font-bold">Export Design</h2>
                                    <button onClick={() => setShowExportModal(false)}><X className="w-5 h-5" /></button>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                                        <p><strong>Size:</strong> {selectedFrame.width}×{selectedFrame.height}px</p>
                                        <p><strong>Elements:</strong> {elements.length}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Format</label>
                                        <div className="flex gap-2">
                                            {(['png', 'jpeg', 'webp'] as const).map((format) => (
                                                <button
                                                    key={format}
                                                    onClick={() => setExportFormat(format)}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${exportFormat === format
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {format === 'jpeg' ? 'JPG' : format.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {exportFormat !== 'png' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Quality: {exportQuality}%</label>
                                            <input
                                                type="range"
                                                min="10"
                                                max="100"
                                                value={exportQuality}
                                                onChange={(e) => setExportQuality(parseInt(e.target.value))}
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    <button onClick={handleExport} disabled={isExporting}
                                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                        Download {exportFormat === 'jpeg' ? 'JPG' : exportFormat.toUpperCase()}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
