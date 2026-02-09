// Admin Settings Types - All app behavior controlled from here

// Tier-based feature configuration
export type UserTier = 'free' | 'pro' | 'enterprise';
export type UserRole = 'free' | 'pro' | 'moderator' | 'admin';

export interface FeatureConfig {
    enabled: boolean;           // Global on/off switch
    allowedTiers: UserTier[];   // Which tiers can access (free, pro, enterprise)
    allowedRoles: UserRole[];   // Which roles can access (overrides tier)
}

export interface AdminSettings {
    // Feature Flags - Toggle features and control tier access
    features: {
        urlContentExtraction: FeatureConfig;
        aiGeneration: FeatureConfig;
        batchProcessing: FeatureConfig;
        scheduling: FeatureConfig;
        customTemplates: FeatureConfig;
        brandKits: FeatureConfig;
        imageSearch: FeatureConfig;
        exportToPlatforms: FeatureConfig;

        // Video Editor Specific Features (Nested)
        videoEditor: {
            enabled: boolean; // Global kill switch
            enable4k: boolean;
            enableAI: boolean;
            maxDurationSec: number;
            allowedResolutions: ("720p" | "1080p" | "4k")[];
        };
    };

    // AI Configuration - Control AI behavior
    ai: {
        enabled: boolean;
        provider: "openai" | "gemini" | "both";
        maxTokensPerRequest: number;
        dailyLimitPerUser: number;
        contentFilter: "strict" | "moderate" | "off";
        autoModerationEnabled: boolean;
    };

    // Template Settings
    templates: {
        allowUserUploads: boolean;
        requireApproval: boolean;
        maxTemplatesPerUser: number;
        defaultCategory: string;
        allowedCategories: string[];
    };

    // Export Settings
    exports: {
        allowedFormats: ("png" | "jpg" | "webp" | "pdf")[];
        maxResolution: number;
        watermarkEnabled: boolean;
        watermarkText: string;
        watermarkOpacity: number;
    };

    // Content Moderation
    moderation: {
        enabled: boolean;
        autoRejectKeywords: string[];
        requireManualApproval: boolean;
        maxDailyPosts: number;
    };

    // Rate Limiting
    rateLimits: {
        urlExtractionsPerHour: number;
        aiGenerationsPerHour: number;
        exportsPerHour: number;
        batchJobsPerDay: number;
    };

    // Branding & Appearance
    appearance: {
        primaryColor: string;
        accentColor: string;
        logoUrl: string;
        faviconUrl: string;
        customCss: string;
    };

    // Maintenance Mode
    maintenance: {
        enabled: boolean;
        message: string;
        allowAdminAccess: boolean;
    };

    // General App Settings
    general: {
        appName: string;
        supportEmail: string;
        defaultTimezone: string;
    };
}

export interface UserRoleConfig {
    id: string;
    name: string;
    permissions: string[];
    isAdmin: boolean;
    canAccessAdmin: boolean;
}

export interface User {
    id: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: "admin" | "moderator" | "pro" | "free";
    tier: "free" | "pro" | "enterprise";
    createdAt: Date;
    lastLoginAt: Date;
    usage: {
        aiGenerationsThisMonth: number;
        exportsThisMonth: number;
        postsCreated: number;
        templatesCreated: number;
    };
    settings: {
        defaultBrandKitId?: string;
        preferredPlatform?: string;
        timezone?: string;
    };
    isActive: boolean;
    isBanned: boolean;
}

export interface Template {
    id: string;
    name: string;
    category: string;
    thumbnail: string;
    config: TemplateConfig;
    isPublic: boolean;
    isPremium: boolean;
    createdBy: string;
    createdAt: Date;
    usageCount: number;
    tags: string[];
    platforms: string[];
}

export interface TemplateConfig {
    dimensions: {
        width: number;
        height: number;
    };
    layers: Layer[];
    bindings: Record<string, string>;
    defaultValues: Record<string, string>;
}

export interface Layer {
    id: string;
    type: "image" | "text" | "shape" | "logo" | "gradient";
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    style: Record<string, unknown>;
    binding?: string;
    locked?: boolean;
    visible?: boolean;
}

export interface BrandKit {
    id: string;
    name: string;
    userId: string;
    logo: {
        primary?: string;
        secondary?: string;
        icon?: string;
    };
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        text: string;
        background: string;
    };
    fonts: {
        heading: string;
        body: string;
        accent?: string;
    };
    watermark?: {
        text: string;
        position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        opacity: number;
    };
    voice?: {
        tone: string; // e.g., "Professional", "Witty", "Urgent"
        keywords: string[]; // e.g., "Sustainable", "Innovation"
        audience: string; // e.g., "Gen Z", "Enterprise"
    };
    social?: {
        website?: string;
        instagram?: string;
        linkedin?: string;
        twitter?: string;
        email?: string;
    };
    isDefault: boolean;
    createdAt: Date;
}

export interface Post {
    id: string;
    userId: string;
    title: string;
    templateId?: string;
    content: {
        headline?: string;
        body?: string;
        quote?: string;
        hashtags?: string[];
        sourceUrl?: string;
    };
    images: {
        hero?: string;
        thumbnail?: string;
        additional?: string[];
    };
    brandKitId?: string;
    canvasState: string; // JSON stringified Fabric.js canvas
    exportedUrls?: Record<string, string>;
    status: "draft" | "published" | "scheduled" | "archived";
    scheduledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    platform: string;
}

export interface ContentExtraction {
    url: string;
    title: string;
    summary: string;
    keyQuotes: string[];
    images: {
        url: string;
        alt: string;
        isFeatured: boolean;
    }[];
    entities: {
        people: string[];
        organizations: string[];
        locations: string[];
    };
    sentiment: "positive" | "negative" | "neutral";
    category: string;
    suggestedHashtags: string[];
    extractedAt: Date;
}

export interface BatchJob {
    id: string;
    userId: string;
    urls: string[];
    templateId: string;
    brandKitId?: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    results: {
        postId: string;
        status: "success" | "failed";
        error?: string;
    }[];
    createdAt: Date;
    completedAt?: Date;
}

// Helper to create feature config
const createFeature = (
    enabled: boolean,
    tiers: UserTier[] = ['free', 'pro', 'enterprise'],
    roles: UserRole[] = ['free', 'pro', 'moderator', 'admin']
): FeatureConfig => ({ enabled, allowedTiers: tiers, allowedRoles: roles });

// Default admin settings with tier-based feature access
export const defaultAdminSettings: AdminSettings = {
    features: {
        // Available to all tiers
        urlContentExtraction: createFeature(true, ['free', 'pro', 'enterprise']),
        customTemplates: createFeature(true, ['free', 'pro', 'enterprise']),
        imageSearch: createFeature(true, ['free', 'pro', 'enterprise']),

        // Pro and Enterprise only
        aiGeneration: createFeature(true, ['pro', 'enterprise']),
        batchProcessing: createFeature(true, ['pro', 'enterprise']),
        scheduling: createFeature(true, ['pro', 'enterprise']),
        brandKits: createFeature(true, ['pro', 'enterprise']),
        exportToPlatforms: createFeature(true, ['pro', 'enterprise']),

        // Video Editor Defaults
        videoEditor: {
            enabled: true,
            enable4k: false, // Default to false (Pro only)
            enableAI: true,
            maxDurationSec: 60,
            allowedResolutions: ["720p", "1080p"],
        }
    },
    ai: {
        enabled: true,
        provider: "openai",
        maxTokensPerRequest: 4000,
        dailyLimitPerUser: 50,
        contentFilter: "moderate",
        autoModerationEnabled: true,
    },
    templates: {
        allowUserUploads: true,
        requireApproval: false,
        maxTemplatesPerUser: 20,
        defaultCategory: "general",
        allowedCategories: [
            "quote-posts",
            "news-posts",
            "story-posts",
            "tech-startup",
            "sports",
            "business",
            "entertainment",
            "custom",
        ],
    },
    exports: {
        allowedFormats: ["png", "jpg", "webp"],
        maxResolution: 4096,
        watermarkEnabled: true,
        watermarkText: "Made with Post Designer",
        watermarkOpacity: 0.3,
    },
    moderation: {
        enabled: true,
        autoRejectKeywords: [],
        requireManualApproval: false,
        maxDailyPosts: 50,
    },
    rateLimits: {
        urlExtractionsPerHour: 30,
        aiGenerationsPerHour: 20,
        exportsPerHour: 50,
        batchJobsPerDay: 5,
    },
    appearance: {
        primaryColor: "#6366f1",
        accentColor: "#f59e0b",
        logoUrl: "",
        faviconUrl: "",
        customCss: "",
    },
    maintenance: {
        enabled: false,
        message: "We're performing scheduled maintenance. Please check back soon.",
        allowAdminAccess: true,
    },
    general: {
        appName: "Post Designer",
        supportEmail: "support@postdesigner.app",
        defaultTimezone: "Asia/Kolkata",
    },
};
