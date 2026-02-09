import { User, BrandKit } from "./types";

export interface SystemVariable {
    key: string;
    label: string;
    getValue: (user: User | null, brandKit: BrandKit | null) => string;
}

export const SYSTEM_VARIABLES: SystemVariable[] = [
    {
        key: 'brand.name',
        label: 'Brand Name',
        getValue: (u, bk) => bk?.name || 'Your Brand'
    },
    {
        key: 'brand.logo.primary',
        label: 'Primary Logo',
        getValue: (u, bk) => bk?.logo?.primary || ''
    },
    {
        key: 'brand.logo.icon',
        label: 'Icon Logo',
        getValue: (u, bk) => bk?.logo?.icon || ''
    },
    {
        key: 'brand.website',
        label: 'Website',
        getValue: (u, bk) => bk?.social?.website || (u?.email ? `www.${u.email.split('@')[1]}` : 'www.yourwebsite.com')
    },
    {
        key: 'brand.email',
        label: 'Brand Email',
        getValue: (u, bk) => bk?.social?.email || u?.email || 'contact@brand.com'
    },
    {
        key: 'brand.instagram',
        label: 'Instagram',
        getValue: (u, bk) => bk?.social?.instagram || '@yourbrand'
    },
    {
        key: 'brand.colors.primary',
        label: 'Brand Primary',
        getValue: (u, bk) => bk?.colors?.primary || '#000000'
    },
    {
        key: 'brand.colors.secondary',
        label: 'Brand Secondary',
        getValue: (u, bk) => bk?.colors?.secondary || '#ffffff'
    },
    {
        key: 'brand.colors.accent',
        label: 'Brand Accent',
        getValue: (u, bk) => bk?.colors?.accent || '#808080'
    },
    {
        key: 'brand.colors.text',
        label: 'Brand Text',
        getValue: (u, bk) => bk?.colors?.text || '#000000'
    },
    {
        key: 'brand.colors.background',
        label: 'Brand Background',
        getValue: (u, bk) => bk?.colors?.background || '#ffffff'
    },
    {
        key: 'user.name',
        label: 'Your Name',
        getValue: (u, bk) => u?.displayName || 'User'
    },
    {
        key: 'date.today',
        label: 'Today\'s Date',
        getValue: () => new Date().toLocaleDateString()
    },
    {
        key: 'date.year',
        label: 'Current Year',
        getValue: () => new Date().getFullYear().toString()
    }
];

export const getSystemVariables = (
    user: User | null,
    brandKit: BrandKit | null,
    extraVariables: Record<string, string> = {}
): Record<string, string> => {
    const vars: Record<string, string> = {};

    // 1. Load System Variables
    SYSTEM_VARIABLES.forEach(v => {
        vars[v.key] = v.getValue(user, brandKit);
    });

    // 2. Merge Extra Variables (e.g. from CSV/JSON binding)
    // Keys should be prefixed if not already (logic handled by caller usually, but we ensure safety)
    Object.entries(extraVariables).forEach(([key, value]) => {
        vars[key] = value;
    });

    return vars;
};

/**
 * Helper to resolve a string with variables like "Hello {{user.name}}"
 */
export const resolveVariables = (
    text: string,
    variables: Record<string, string>
): string => {
    if (!text) return "";
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
        return variables[key.trim()] || `{{${key}}}`; // Return original if not found (for debugging)
    });
};
