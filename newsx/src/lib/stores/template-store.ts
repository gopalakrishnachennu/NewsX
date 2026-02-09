
import { create } from "zustand";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuthStore } from "./auth-store";
import { logger as ultraLogger } from "../editor-logger";

/**
 * Template schema for dynamic templates stored in Firebase
 */
import { PlatformVariant } from "../templates";

// Phase 29: Template Versioning
export interface TemplateVersion {
    id: string; // timestamp
    name: string; // e.g. "Draft 1", "Before Feedback"
    createdAt: number;
    elements: any[]; // Snapshot of elements
}

export interface DynamicTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPro: boolean;
    type?: 'canvas' | 'video';

    // The complete canvas state (elements, background, frame, config)
    canvasState: string;

    // Auto-generated thumbnail
    thumbnail: string;

    // Layout info (extracted for gallery display)
    layout: {
        imagePosition: 'full' | 'top' | 'split' | 'inset';
        textPosition: 'bottom' | 'overlay' | 'below' | 'top-bottom';
        hasInsetPhoto: boolean;
        hasSwipeIndicator: boolean;
        hasSocialIcons: boolean;
    };

    // Style info (extracted for gallery display)
    style: {
        backgroundColor: string;
        textColor: string;
        accentColor: string;
        highlightColor: string;
        gradientOverlay: string;
        fontFamily: string;
        brandPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
    };

    // Bindable fields configuration (Phase 2)
    dataFields: {
        id: string;
        elementId: string; // Which element this binds to
        label: string;
        type: 'text' | 'image' | 'color';
        placeholder: string;
        required: boolean;
        constraints?: {
            minLength?: number;
            maxLength?: number;
            minWidth?: number;
            minHeight?: number;
            aspectRatio?: string;
        };
    }[];

    // Metadata
    createdBy: string;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
    usageCount: number;

    // Scheduling (Phase 12)
    schedule?: {
        startDate?: Timestamp;
        endDate?: Timestamp;
        isSeasonalEvent?: string;
    };

    // Versioning (Phase 11)
    version?: number;

    // Phase 29: Version History
    versions?: TemplateVersion[];

    // Phase 7: Platforms
    platforms?: PlatformVariant[];
}

interface TemplateStore {
    // State
    dynamicTemplates: DynamicTemplate[];
    isLoading: boolean;
    error: string | null;

    // CRUD Operations
    loadDynamicTemplates: () => Promise<void>;
    saveTemplate: (
        templateData: Omit<DynamicTemplate, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount'>,
        userId?: string
    ) => Promise<string>;
    updateTemplate: (id: string, updates: Partial<DynamicTemplate>) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;
    getTemplateById: (id: string) => Promise<DynamicTemplate | null>;

    // Analytics
    incrementTemplateUsage: (id: string) => Promise<void>;

    // Helpers
    getTemplatesByCategory: (category: string) => DynamicTemplate[];
    searchTemplates: (query: string) => DynamicTemplate[];
}

export const useTemplateStore = create<TemplateStore>()((set, get) => ({
    dynamicTemplates: [],
    isLoading: false,
    error: null,

    loadDynamicTemplates: async () => {
        const loadTimer = Date.now();
        set({ isLoading: true, error: null });

        ultraLogger.info('template-load-start',
            'Loading dynamic templates from Firestore database. ' +
            'Fetching all user-created templates ordered by creation date (newest first). ' +
            'Templates will be filtered by schedule (only active templates shown). ' +
            'Expected: List of templates with thumbnails, metadata, and bindable fields. ' +
            'User will see templates in gallery after loading completes.',
            { source: 'firestore', collection: 'templates', orderBy: 'createdAt-desc' }
        );

        try {
            const q = query(
                collection(db, "templates"),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(q);
            const templates = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as DynamicTemplate[];

            // Filter by schedule if applicable
            const now = new Date();
            const activeTemplates = templates.filter((t) => {
                if (!t.schedule) return true;
                if (t.schedule.startDate && t.schedule.startDate.toDate() > now) return false;
                if (t.schedule.endDate && t.schedule.endDate.toDate() < now) return false;
                return true;
            });

            const loadTimeMs = Date.now() - loadTimer;
            const inactiveCount = templates.length - activeTemplates.length;

            ultraLogger.info('template-load-success',
                `Successfully loaded ${activeTemplates.length} active templates from Firestore. ` +
                `Total templates in database: ${templates.length}. ` +
                `${inactiveCount > 0 ? `Filtered out ${inactiveCount} scheduled templates (not yet active or expired). ` : ''}` +
                `Load time: ${loadTimeMs}ms. ` +
                `Templates are now available in gallery for user to select and use. ` +
                `User can: (1) Quick generate from template, (2) Open fill modal, (3) Edit template (if creator).`,
                {
                    totalTemplates: templates.length,
                    activeTemplates: activeTemplates.length,
                    filteredOut: inactiveCount,
                    loadTimeMs,
                    categories: [...new Set(activeTemplates.map(t => t.category))]
                }
            );

            set({ dynamicTemplates: activeTemplates });
        } catch (error) {
            ultraLogger.error('template-load-error',
                `Failed to load templates from Firestore. ` +
                `Error: "${(error as Error).message}". ` +
                `Possible causes: (1) No internet connection, (2) Firestore permissions issue, (3) Invalid query. ` +
                `User will see error message and empty template gallery. ` +
                `Solution: Check internet connection, verify Firestore rules allow read access to 'templates' collection.`,
                { error: (error as Error).message, stack: (error as Error).stack || 'No stack trace' }
            );
            set({ error: (error as Error).message });
            console.error("Failed to load dynamic templates:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    saveTemplate: async (templateData, userId) => {
        const saveTimer = Date.now();
        set({ isLoading: true, error: null });

        ultraLogger.info('template-save-start',
            `User initiated template save by clicking "Save as Template" button in editor. ` +
            `Template name: "${templateData.name}". ` +
            `Category: ${templateData.category}. ` +
            `Has bindable fields: ${templateData.dataFields && templateData.dataFields.length > 0 ? 'Yes (' + templateData.dataFields.length + ' fields)' : 'No'}. ` +
            `Has thumbnail: ${templateData.thumbnail ? 'Yes' : 'No (will be placeholder)'}. ` +
            `Pro template: ${templateData.isPro ? 'Yes (requires subscription)' : 'No (free for all users)'}. ` +
            `Process: Generate unique ID → Sanitize data (remove undefined values) → Save to Firestore → Update local state. ` +
            `Expected: Template appears in gallery immediately after save.`,
            {
                name: templateData.name,
                category: templateData.category,
                dataFields: templateData.dataFields?.length || 0,
                hasThumbnail: !!templateData.thumbnail,
                isPro: templateData.isPro,
                tags: templateData.tags
            }
        );

        try {
            const currentUser = useAuthStore.getState().user;
            const currentUserId = userId || currentUser?.id;

            if (!currentUserId) {
                ultraLogger.error('template-save-error',
                    'Template save failed: User not authenticated. ' +
                    'User tried to save template but is not logged in. ' +
                    'This should not happen as Save button should be hidden for unauthenticated users. ' +
                    'Possible causes: (1) User logged out during editing, (2) Session expired, (3) Auth state inconsistency. ' +
                    'Solution: User needs to log in again and retry save.',
                    { error: 'User not authenticated', stage: 'pre-check' }
                );
                throw new Error("User not authenticated");
            }

            const templateId = doc(collection(db, "templates")).id;

            // Helper function to remove undefined values (Firebase doesn't allow them)
            const sanitizeForFirestore = (obj: any): any => {
                if (obj === null || obj === undefined) return null;
                if (Array.isArray(obj)) {
                    return obj.map(item => sanitizeForFirestore(item));
                }
                if (typeof obj === 'object') {
                    const sanitized: Record<string, any> = {};
                    for (const [key, value] of Object.entries(obj)) {
                        if (value !== undefined) {
                            sanitized[key] = sanitizeForFirestore(value);
                        }
                    }
                    return sanitized;
                }
                return obj;
            };

            // Sanitize the template data to remove any undefined values
            const sanitizedData = sanitizeForFirestore({
                id: templateId,
                ...templateData,
                createdBy: currentUserId,
                usageCount: 0,
                version: 1,
            });

            // NEW: Save via API to bypass client permission issues
            const response = await fetch('/api/admin/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...sanitizedData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save template via API');
            }

            const result = await response.json();
            const savedId = result.id || templateId;

            const saveTimeMs = Date.now() - saveTimer;
            const elementCount = JSON.parse(templateData.canvasState || '{}').elements?.length || 0;

            ultraLogger.info('template-save-success',
                `✅ Template saved successfully via API! ` +
                `Template ID: ${savedId}. ` +
                `Template name: "${templateData.name}". ` +
                `Elements on canvas: ${elementCount}. ` +
                `Bindable fields: ${sanitizedData.dataFields?.length || 0}. ` +
                `Created by: ${currentUserId}. ` +
                `Save time: ${saveTimeMs}ms. ` +
                `Template is now visible in gallery for all users. ` +
                `User can: (1) Use this template via Quick Generate, (2) Edit template later, (3) Delete template if needed. `,
                {
                    templateId: savedId,
                    name: templateData.name,
                    category: templateData.category,
                    elementCount,
                    bindableFields: sanitizedData.dataFields?.length || 0,
                    createdBy: currentUserId,
                    saveTimeMs,
                    isPro: templateData.isPro
                }
            );

            // Update local state
            set((state) => ({
                dynamicTemplates: [
                    { ...sanitizedData, id: savedId, createdAt: new Date(), updatedAt: new Date() } as DynamicTemplate,
                    ...state.dynamicTemplates,
                ],
            }));

            return savedId;
        } catch (error) {
            ultraLogger.error('template-save-error',
                `❌ Template save FAILED. ` +
                `Error: "${(error as Error).message}". ` +
                `Template name: "${templateData.name}". ` +
                `Common causes: (1) No internet connection, (2) Firestore write permission denied, (3) Invalid template data, (4) Quota exceeded. ` +
                `User saw error message and template was NOT saved. ` +
                `Solution: ${(error as Error).message.includes('permission') ? 'Check Firestore rules for write access' : (error as Error).message.includes('quota') ? 'Database quota exceeded, upgrade plan' : 'Check internet and retry'}.`,
                {
                    error: (error as Error).message,
                    stack: (error as Error).stack || 'No stack trace', // Fixed: Ensure stack is defined
                    templateName: templateData.name,
                    category: templateData.category
                }
            );
            set({ error: (error as Error).message });
            console.error("Failed to save template:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    updateTemplate: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            // NEW: Use API for updates to bypass client permission issues
            const response = await fetch('/api/admin/templates', {
                method: 'POST', // POST handles both create and update (merge behavior)
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    ...updates,
                    updatedAt: new Date(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update template via API');
            }

            // Update local state
            set((state) => ({
                dynamicTemplates: state.dynamicTemplates.map((t) =>
                    t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
                ),
            }));
            ultraLogger.info('template-update-success', `Template ${id} updated via API.`);
        } catch (error) {
            set({ error: (error as Error).message });
            console.error("Failed to update template:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    deleteTemplate: async (id) => {
        set({ isLoading: true, error: null });

        const template = get().dynamicTemplates.find(t => t.id === id);

        ultraLogger.info('template-delete-start',
            `User initiated template deletion by clicking delete button. ` +
            `Template to delete: "${template?.name || 'Unknown'}" (ID: ${id}). ` +
            `Category: ${template?.category || 'N/A'}. ` +
            `Created by: ${template?.createdBy || 'N/A'}. ` +
            `Usage count: ${template?.usageCount || 0} times. ` +
            `This action will: (1) Delete from Firestore database, (2) Remove from local state, (3) Make template unavailable to all users. ` +
            `Note: This action is permanent and cannot be undone.`,
            {
                templateId: id,
                templateName: template?.name,
                category: template?.category,
                usageCount: template?.usageCount || 0
            }
        );

        try {
            await deleteDoc(doc(db, "templates", id));

            ultraLogger.info('template-delete-success',
                `✅ Template deleted successfully from Firestore. ` +
                `Template "${template?.name}" (ID: ${id}) has been permanently removed. ` +
                `Template is no longer visible in gallery for any users. ` +
                `Users who previously used this template can still access their generated posts (templates are copied, not referenced). ` +
                `Local state updated to remove template from list.`,
                { templateId: id, templateName: template?.name, deletedAt: Date.now() }
            );

            // Update local state
            set((state) => ({
                dynamicTemplates: state.dynamicTemplates.filter((t) => t.id !== id),
            }));
        } catch (error) {
            ultraLogger.error('template-delete-error',
                `❌ Template deletion FAILED. ` +
                `Error: "${(error as Error).message}". ` +
                `Template ID: ${id}. ` +
                `Common causes: (1) No internet connection, (2) Firestore delete permission denied, (3) Template already deleted, (4) Invalid template ID. ` +
                `User saw error message and template was NOT deleted. ` +
                `Solution: ${(error as Error).message.includes('permission') ? 'Check Firestore rules for delete access' : (error as Error).message.includes('not found') ? 'Template already deleted' : 'Check internet and retry'}.`,
                {
                    error: (error as Error).message,
                    stack: (error as Error).stack || 'No stack trace', // Fixed
                    templateId: id
                }
            );
            set({ error: (error as Error).message });
            console.error("Failed to delete template:", error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    getTemplateById: async (id) => {
        try {
            // First check local state
            const local = get().dynamicTemplates.find((t) => t.id === id);
            if (local) return local;

            // Fetch from Firestore
            const templateRef = doc(db, "templates", id);
            const snapshot = await getDoc(templateRef);

            if (snapshot.exists()) {
                return { id: snapshot.id, ...snapshot.data() } as DynamicTemplate;
            }

            return null;
        } catch (error) {
            console.error("Failed to get template:", error);
            return null;
        }
    },

    incrementTemplateUsage: async (id) => {
        try {
            const template = await get().getTemplateById(id);
            if (template) {
                const newUsageCount = (template.usageCount || 0) + 1;

                ultraLogger.info('template-usage-increment',
                    `Template usage incremented for "${template.name}" (ID: ${id}). ` +
                    `Previous usage: ${template.usageCount || 0} times. ` +
                    `New usage: ${newUsageCount} times. ` +
                    `User action: ${newUsageCount === 1 ? 'First time using this template' : `${newUsageCount}th use of template`}. ` +
                    `This metric helps track template popularity and informs template recommendations. ` +
                    `Usage count displayed in template card for admin/analytics purposes.`,
                    {
                        templateId: id,
                        templateName: template.name,
                        previousUsage: template.usageCount || 0,
                        newUsage: newUsageCount
                    }
                );

                await get().updateTemplate(id, {
                    usageCount: newUsageCount,
                });
            }
        } catch (error) {
            ultraLogger.warn('template-usage-increment-error',
                `Failed to increment template usage count. ` +
                `Error: "${(error as Error).message}". ` +
                `Template ID: ${id}. ` +
                `This is a non-critical error - template can still be used, just usage tracking failed. ` +
                `Common causes: (1) No internet, (2) Firestore write permission issue, (3) Template deleted mid-use. ` +
                `Impact: Usage count will be inaccurate for analytics but doesn't affect core functionality.`,
                { error: (error as Error).message, templateId: id }
            );
            console.error("Failed to increment template usage:", error);
        }
    },

    getTemplatesByCategory: (category) => {
        return get().dynamicTemplates.filter((t) => t.category === category);
    },

    searchTemplates: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().dynamicTemplates.filter((t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
    },
}));
