/**
 * Template Definitions
 * Templates inspired by professional news/content design patterns
 */

// Data field for template binding
export interface DataField {
    id: string;
    label: string;
    type: 'text' | 'image' | 'color';
    placeholder: string;
    required: boolean;
    constraints?: {
        minLength?: number;
        maxLength?: number;
        aspectRatio?: string;
    };
    defaultValue?: string;
}

// Canvas element for pre-built layouts
export interface CanvasElementDef {
    id: string;
    type: 'text' | 'image' | 'shape' | 'brand';
    name: string;
    // Position as percentage (0-100)
    x: number;
    y: number;
    width: number;
    height: number;
    // Styling
    style: {
        fontSize?: number;
        fontWeight?: 'normal' | 'bold';
        fontFamily?: string;
        color?: string;
        backgroundColor?: string;
        textAlign?: 'left' | 'center' | 'right';
        borderRadius?: number;
        opacity?: number;
        // Phase 11: Advanced Text Styling
        textHighlight?: boolean;
        textOutlineWidth?: number;
        textOutlineColor?: string;
        textShadow?: string;
        lineHeight?: number;
        letterSpacing?: number;
        textTransform?: 'uppercase' | 'lowercase' | 'none';
        gradient?: string;
    };
    // Smart Layouts
    autoScale?: boolean;
    anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    relativeTo?: string;
    // Placeholders
    isPlaceholder?: boolean;
    placeholderType?: 'text' | 'image' | 'logo' | 'all';
    // Data binding key (e.g., "headline", "quote")
    binding?: string;
    // Default/placeholder text
    defaultValue?: string;
}

export interface ElementOverride {
    id: string;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    visible?: boolean;
    fontSize?: number; // useful for text resizing
}

export interface PlatformVariant {
    id: string; // e.g. 'instagram-post', 'story'
    name: string; // 'Instagram Post', 'Story'
    width: number;
    height: number;
    overrides: Record<string, ElementOverride>;
}

export interface TemplateConfig {
    id: string;
    name: string;
    createdAt?: any; // Firestore Timestamp
    updatedAt?: any;

    // Phase 7: Platforms
    platforms?: PlatformVariant[];
    description: string;
    category: 'news' | 'quote' | 'story' | 'announcement' | 'interview';
    tags?: string[]; // Smart Generator Tags
    thumbnail: string;  // Now required - path to preview image
    isPro: boolean;
    layout: {
        imagePosition: 'full' | 'top' | 'split' | 'inset';
        textPosition: 'bottom' | 'overlay' | 'below' | 'top-bottom';
        hasInsetPhoto: boolean;
        hasSwipeIndicator: boolean;
        hasSocialIcons: boolean;
    };
    style: {
        backgroundColor: string;
        textColor: string;
        accentColor: string;
        highlightColor: string;
        gradientOverlay: string;
        fontFamily: string;
        brandPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
    };
    // Data binding fields
    dataFields: DataField[];
    // Pre-built canvas elements
    canvasElements: CanvasElementDef[];
}

export const templates: TemplateConfig[] = [
    // Template 1: Quote Post (like Entrepreneur Insights)
    {
        id: 'quote-dark',
        name: 'Quote Post Dark',
        description: 'Person photo with inspiring quote overlay',
        category: 'quote',
        tags: ['quote', 'minimal', 'dark', 'single-person'],
        thumbnail: '/templates/quote-dark.png',
        isPro: false,
        layout: {
            imagePosition: 'full',
            textPosition: 'bottom',
            hasInsetPhoto: false,
            hasSwipeIndicator: true,
            hasSocialIcons: false,
        },
        style: {
            backgroundColor: '#000000',
            textColor: '#ffffff',
            accentColor: '#f59e0b',
            highlightColor: '#f59e0b',
            gradientOverlay: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 70%)',
            fontFamily: 'serif',
            brandPosition: 'top-center',
        },
        dataFields: [
            { id: 'quote', label: 'Quote', type: 'text', placeholder: 'Enter the inspiring quote...', required: true },
            { id: 'hero_image', label: 'Person Photo', type: 'image', placeholder: 'Upload person photo', required: true },
        ],
        canvasElements: [
            // Background image
            { id: 'bg', type: 'image', name: 'Background', x: 0, y: 0, width: 100, height: 100, binding: 'hero_image', style: {} },
            // Brand badge
            { id: 'brand', type: 'text', name: 'Brand', x: 35, y: 55, width: 30, height: 5, style: { fontSize: 14, fontWeight: 'bold', color: '#f59e0b', textAlign: 'center' }, defaultValue: '{{brand.name}}' },
            // Quote text
            { id: 'quote', type: 'text', name: 'Quote', x: 5, y: 62, width: 90, height: 30, binding: 'quote', style: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', fontFamily: 'Georgia, serif' }, defaultValue: 'Your inspiring quote goes here. Make it memorable.' },
            // Swipe indicator
            { id: 'swipe', type: 'text', name: 'Swipe', x: 70, y: 95, width: 25, height: 3, style: { fontSize: 10, color: '#888888', textAlign: 'right' }, defaultValue: 'swipe for more →' },
        ],
    },

    // Template 2: News Breaking (like DailyBrew)
    {
        id: 'news-breaking',
        name: 'Breaking News',
        description: 'Bold headlines with highlighted keywords',
        category: 'news',
        tags: ['news', 'headline-focus', 'dark', 'breaking'],
        thumbnail: '/templates/news-breaking.png',
        isPro: false,
        layout: {
            imagePosition: 'full',
            textPosition: 'overlay',
            hasInsetPhoto: false,
            hasSwipeIndicator: true,
            hasSocialIcons: false,
        },
        style: {
            backgroundColor: '#1a1a2e',
            textColor: '#ffffff',
            accentColor: '#ec4899',
            highlightColor: '#fbbf24',
            gradientOverlay: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
            fontFamily: 'sans-serif',
            brandPosition: 'bottom-left',
        },
        dataFields: [
            { id: 'headline', label: 'Headline', type: 'text', placeholder: 'Enter headline...', required: true },
            { id: 'highlight_text', label: 'Highlighted Words', type: 'text', placeholder: 'Words to highlight (comma separated)', required: false },
            { id: 'subheadline', label: 'Subheadline', type: 'text', placeholder: 'Enter subheadline...', required: false },
            { id: 'hero_image', label: 'Background Image', type: 'image', placeholder: 'Upload background', required: true },
        ],
        canvasElements: [
            { id: 'bg', type: 'image', name: 'Background', x: 0, y: 0, width: 100, height: 100, binding: 'hero_image', style: {} },
            { id: 'headline', type: 'text', name: 'Headline', x: 5, y: 60, width: 90, height: 25, binding: 'headline', style: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' }, defaultValue: 'Breaking: Your headline goes here with important keywords highlighted' },
            { id: 'subheadline', type: 'text', name: 'Subheadline', x: 5, y: 85, width: 90, height: 5, binding: 'subheadline', style: { fontSize: 14, color: '#cccccc' }, defaultValue: 'Additional context for the news story' },
            { id: 'brand', type: 'text', name: 'Brand', x: 5, y: 92, width: 30, height: 5, style: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#ec4899' }, defaultValue: '{{brand.name}}' },
            { id: 'swipe', type: 'shape', name: 'Swipe Arrows', x: 85, y: 60, width: 10, height: 5, style: { color: '#ffffff' }, defaultValue: '>>>' },
        ],
    },

    // Template 3: Interview Duo (like Startuppedia)
    {
        id: 'interview-duo',
        name: 'Interview Split',
        description: 'Two people side by side with colorful gradient',
        category: 'interview',
        tags: ['comparison', 'multi-person', 'split', 'interview', 'light'],
        thumbnail: '/templates/interview-split.png',
        isPro: true,
        layout: {
            imagePosition: 'split',
            textPosition: 'below',
            hasInsetPhoto: false,
            hasSwipeIndicator: false,
            hasSocialIcons: true,
        },
        style: {
            backgroundColor: '#ffffff',
            textColor: '#1a1a2e',
            accentColor: '#8b5cf6',
            highlightColor: '#ec4899',
            gradientOverlay: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            fontFamily: 'sans-serif',
            brandPosition: 'top-right',
        },
        dataFields: [
            { id: 'person1_image', label: 'Person 1 Photo', type: 'image', placeholder: 'Upload first person', required: true },
            { id: 'person2_image', label: 'Person 2 Photo', type: 'image', placeholder: 'Upload second person', required: true },
            { id: 'headline', label: 'Headline', type: 'text', placeholder: 'Enter headline...', required: true },
            { id: 'person1_name', label: 'Person 1 Name', type: 'text', placeholder: 'First person name', required: false },
            { id: 'person2_name', label: 'Person 2 Name', type: 'text', placeholder: 'Second person name', required: false },
        ],
        canvasElements: [
            { id: 'person1', type: 'image', name: 'Person 1', x: 0, y: 0, width: 50, height: 60, binding: 'person1_image', style: {} },
            { id: 'person2', type: 'image', name: 'Person 2', x: 50, y: 0, width: 50, height: 60, binding: 'person2_image', style: {} },
            { id: 'brand', type: 'text', name: 'Brand', x: 70, y: 3, width: 25, height: 5, style: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e', textAlign: 'right' }, defaultValue: '{{brand.name}}' },
            { id: 'headline', type: 'text', name: 'Headline', x: 5, y: 65, width: 90, height: 25, binding: 'headline', style: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' }, defaultValue: 'Interview headline with highlighted names' },
            { id: 'social', type: 'text', name: 'Social', x: 5, y: 92, width: 50, height: 5, style: { fontSize: 12, color: '#666666' }, defaultValue: '{{brand.website}}' },
        ],
    },

    // Template 4: Story with Inset (like NOW India / Indians Gag)
    {
        id: 'story-inset',
        name: 'Story with Person',
        description: 'Main image with circular inset photo',
        category: 'story',
        tags: ['story', 'inset', 'clean', 'light', 'social'],
        thumbnail: '/templates/story-inset.png',
        isPro: false,
        layout: {
            imagePosition: 'full',
            textPosition: 'below',
            hasInsetPhoto: true,
            hasSwipeIndicator: false,
            hasSocialIcons: false,
        },
        style: {
            backgroundColor: '#ffffff',
            textColor: '#1a1a2e',
            accentColor: '#fbbf24',
            highlightColor: '#fbbf24',
            gradientOverlay: 'none',
            fontFamily: 'sans-serif',
            brandPosition: 'bottom-left',
        },
        dataFields: [
            { id: 'hero_image', label: 'Main Image', type: 'image', placeholder: 'Upload main image', required: true },
            { id: 'inset_image', label: 'Person Photo (Circle)', type: 'image', placeholder: 'Upload person for inset', required: true },
            { id: 'headline', label: 'Headline', type: 'text', placeholder: 'Enter headline...', required: true },
            { id: 'highlight_text', label: 'Highlighted Words', type: 'text', placeholder: 'Words to highlight', required: false },
        ],
        canvasElements: [
            { id: 'bg', type: 'image', name: 'Background', x: 0, y: 0, width: 100, height: 60, binding: 'hero_image', style: {} },
            { id: 'inset', type: 'image', name: 'Inset Person', x: 5, y: 50, width: 15, height: 15, binding: 'inset_image', style: { borderRadius: 50 } },
            { id: 'headline', type: 'text', name: 'Headline', x: 5, y: 68, width: 90, height: 25, binding: 'headline', style: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e' }, defaultValue: 'Your headline with highlighted keywords' },
            { id: 'brand', type: 'text', name: 'Brand', x: 5, y: 95, width: 30, height: 4, style: { fontSize: 12, fontWeight: 'bold', color: '#1a1a2e' }, defaultValue: '{{brand.name}}' },
        ],
    },

    // Template 5: Text Card (like RVCJ)
    {
        id: 'text-card',
        name: 'Text Card',
        description: 'Bold text top and bottom with image in middle',
        category: 'news',
        tags: ['text-heavy', 'bold', 'social', 'inset'],
        thumbnail: '/templates/story-inset-alt.png',
        isPro: true,
        layout: {
            imagePosition: 'inset',
            textPosition: 'top-bottom',
            hasInsetPhoto: false,
            hasSwipeIndicator: false,
            hasSocialIcons: true,
        },
        style: {
            backgroundColor: '#fbbf24',
            textColor: '#1a1a2e',
            accentColor: '#ec4899',
            highlightColor: '#8b5cf6',
            gradientOverlay: 'none',
            fontFamily: 'sans-serif',
            brandPosition: 'top-center',
        },
        dataFields: [
            { id: 'headline', label: 'Headline', type: 'text', placeholder: 'Enter headline...', required: true },
            { id: 'hero_image', label: 'Center Image', type: 'image', placeholder: 'Upload image', required: true },
            { id: 'bottom_text', label: 'Bottom Text', type: 'text', placeholder: 'Enter bottom text...', required: false },
        ],
        canvasElements: [
            { id: 'bg', type: 'shape', name: 'Background', x: 0, y: 0, width: 100, height: 100, style: { backgroundColor: '#fbbf24' } },
            { id: 'brand', type: 'text', name: 'Brand', x: 5, y: 3, width: 30, height: 5, style: { fontSize: 14, fontWeight: 'bold', color: '#1a1a2e' }, defaultValue: '{{brand.name}}' },
            { id: 'headline', type: 'text', name: 'Headline', x: 5, y: 10, width: 90, height: 15, binding: 'headline', style: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' }, defaultValue: 'Your headline here' },
            { id: 'image', type: 'image', name: 'Center Image', x: 10, y: 28, width: 80, height: 45, binding: 'hero_image', style: { borderRadius: 8 } },
            { id: 'bottom', type: 'text', name: 'Bottom Text', x: 5, y: 75, width: 90, height: 15, binding: 'bottom_text', style: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' }, defaultValue: 'Bottom text goes here' },
        ],
    },

    // Template 6: Finance News (like Indian Finance)
    {
        id: 'finance-news',
        name: 'Finance News',
        description: 'Professional news with statistics highlight',
        category: 'news',
        tags: ['news', 'finance', 'professional', 'light', 'stats'],
        thumbnail: '/templates/finance-news.png',
        isPro: true,
        layout: {
            imagePosition: 'full',
            textPosition: 'below',
            hasInsetPhoto: true,
            hasSwipeIndicator: true,
            hasSocialIcons: false,
        },
        style: {
            backgroundColor: '#ffffff',
            textColor: '#1a1a2e',
            accentColor: '#ef4444',
            highlightColor: '#3b82f6',
            gradientOverlay: 'none',
            fontFamily: 'sans-serif',
            brandPosition: 'top-right',
        },
        dataFields: [
            { id: 'hero_image', label: 'Main Image', type: 'image', placeholder: 'Upload main image', required: true },
            { id: 'inset_image', label: 'Person Photo', type: 'image', placeholder: 'Upload person', required: false },
            { id: 'headline', label: 'Headline', type: 'text', placeholder: 'Enter headline...', required: true },
            { id: 'stat_number', label: 'Key Statistic', type: 'text', placeholder: 'e.g., ₹74.92 Lakh Crore', required: false },
        ],
        canvasElements: [
            { id: 'brand', type: 'text', name: 'Brand', x: 70, y: 3, width: 25, height: 5, style: { fontSize: 14, fontWeight: 'bold', color: '#ef4444', textAlign: 'right' }, defaultValue: '{{brand.name}}' },
            { id: 'bg', type: 'image', name: 'Background', x: 0, y: 8, width: 100, height: 55, binding: 'hero_image', style: {} },
            { id: 'inset', type: 'image', name: 'Inset Person', x: 60, y: 45, width: 20, height: 20, binding: 'inset_image', style: { borderRadius: 50 } },
            { id: 'headline', type: 'text', name: 'Headline', x: 5, y: 68, width: 90, height: 25, binding: 'headline', style: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e' }, defaultValue: 'Your headline with highlighted stats' },
            { id: 'website', type: 'text', name: 'Website', x: 30, y: 95, width: 40, height: 4, style: { fontSize: 12, color: '#666666', textAlign: 'center' }, defaultValue: '{{brand.website}}' },
        ],
    },

    // Template 7: Tech Dramatic (like ISM DU)
    {
        id: 'tech-dramatic',
        name: 'Tech Dramatic',
        description: 'Dramatic imagery with bold overlaid text',
        category: 'news',
        tags: ['tech', 'dramatic', 'overlay', 'dark'],
        thumbnail: '/templates/tech-dramatic.png',
        isPro: true,
        layout: {
            imagePosition: 'full',
            textPosition: 'bottom',
            hasInsetPhoto: false,
            hasSwipeIndicator: false,
            hasSocialIcons: false,
        },
        style: {
            backgroundColor: '#0f172a',
            textColor: '#ffffff',
            accentColor: '#06b6d4',
            highlightColor: '#22d3ee',
            gradientOverlay: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 40%, transparent 70%)',
            fontFamily: 'sans-serif',
            brandPosition: 'top-right',
        },
        dataFields: [
            { id: 'hero_image', label: 'Dramatic Image', type: 'image', placeholder: 'Upload dramatic background', required: true },
            { id: 'headline', label: 'Headline', type: 'text', placeholder: 'Enter headline...', required: true },
            { id: 'highlight_phrase', label: 'Highlighted Phrase', type: 'text', placeholder: 'Key phrase to highlight', required: false },
            { id: 'subtext', label: 'Subtext', type: 'text', placeholder: 'Additional context', required: false },
        ],
        canvasElements: [
            { id: 'bg', type: 'image', name: 'Background', x: 0, y: 0, width: 100, height: 65, binding: 'hero_image', style: {} },
            { id: 'brand', type: 'text', name: 'Brand', x: 75, y: 3, width: 20, height: 5, style: { fontSize: 14, fontWeight: 'bold', color: '#22d3ee', textAlign: 'right' }, defaultValue: '{{brand.name}}' },
            { id: 'headline', type: 'text', name: 'Headline', x: 5, y: 68, width: 90, height: 20, binding: 'headline', style: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' }, defaultValue: 'Bold headline with highlighted phrases' },
            { id: 'subtext', type: 'text', name: 'Subtext', x: 5, y: 88, width: 90, height: 8, binding: 'subtext', style: { fontSize: 14, color: '#94a3b8' }, defaultValue: 'Additional context goes here' },
        ],
    },

    // Template 8: Simple News
    {
        id: 'simple-news',
        name: 'Simple News',
        description: 'Clean layout with subtle gradient',
        category: 'news',
        tags: ['news', 'simple', 'gradient', 'minimal'],
        thumbnail: '/templates/news-breaking.png',
        isPro: false,
        layout: {
            imagePosition: 'full',
            textPosition: 'bottom',
            hasInsetPhoto: true,
            hasSwipeIndicator: false,
            hasSocialIcons: false,
        },
        style: {
            backgroundColor: '#1a1a2e',
            textColor: '#ffffff',
            accentColor: '#10b981',
            highlightColor: '#10b981',
            gradientOverlay: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 80%)',
            fontFamily: 'sans-serif',
            brandPosition: 'top-center',
        },
        dataFields: [
            { id: 'hero_image', label: 'Background', type: 'image', placeholder: 'Upload background', required: true },
            { id: 'headline', label: 'Headline', type: 'text', placeholder: 'Enter headline...', required: true },
        ],
        canvasElements: [
            { id: 'bg', type: 'image', name: 'Background', x: 0, y: 0, width: 100, height: 100, binding: 'hero_image', style: {} },
            { id: 'brand', type: 'text', name: 'Brand', x: 35, y: 3, width: 30, height: 5, style: { fontSize: 14, fontWeight: 'bold', color: '#10b981', textAlign: 'center' }, defaultValue: '{{brand.name}}' },
            { id: 'headline', type: 'text', name: 'Headline', x: 5, y: 70, width: 90, height: 25, binding: 'headline', style: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' }, defaultValue: 'Your headline goes here' },
        ],
    },
];

export const getTemplateById = (id: string): TemplateConfig | undefined => {
    return templates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: TemplateConfig['category']): TemplateConfig[] => {
    return templates.filter(t => t.category === category);
};

export const getFreeTemplates = (): TemplateConfig[] => {
    return templates.filter(t => !t.isPro);
};

export const getProTemplates = (): TemplateConfig[] => {
    return templates.filter(t => t.isPro);
};
