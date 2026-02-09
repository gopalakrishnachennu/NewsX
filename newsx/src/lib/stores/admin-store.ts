import { create } from "zustand";
import { persist } from "zustand/middleware";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { AdminSettings, defaultAdminSettings } from "../types";
import { logger as ultraLogger } from "../editor-logger";

interface AdminStore {
    // State
    settings: AdminSettings;
    isLoading: boolean;
    error: string | null;
    lastSyncedAt: Date | null;

    // Actions
    setSettings: (settings: Partial<AdminSettings>) => void;
    loadSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
    resetToDefaults: () => void;
    subscribeToChanges: () => () => void;

    // Feature flag helpers
    isFeatureEnabled: (feature: keyof AdminSettings["features"]) => boolean;
    isMaintenanceMode: () => boolean;
    canUserAccess: (userRole: string) => boolean;
}

export const useAdminStore = create<AdminStore>()(
    persist(
        (set, get) => ({
            settings: defaultAdminSettings,
            isLoading: false,
            error: null,
            lastSyncedAt: null,

            setSettings: (newSettings) => {
                const oldSettings = get().settings;

                ultraLogger.info('admin-settings-change',
                    `Admin settings updated locally. ` +
                    `Changes made: ${Object.keys(newSettings).join(', ')}. ` +
                    `Updated categories: ${newSettings.features ? 'Features' : ''}${newSettings.ai ? ', AI' : ''}${newSettings.templates ? ', Templates' : ''}${newSettings.exports ? ', Exports' : ''}${newSettings.moderation ? ', Moderation' : ''}${newSettings.rateLimits ? ', Rate Limits' : ''}${newSettings.appearance ? ', Appearance' : ''}${newSettings.maintenance ? ', Maintenance' : ''}. ` +
                    `NOTE: These changes are in local state only - must click "Save Settings" to persist to Firestore. ` +
                    `Changes will be lost on page refresh if not saved.`,
                    {
                        changedFields: Object.keys(newSettings),
                        features: newSettings.features ? Object.keys(newSettings.features) : [],
                        ai: newSettings.ai ? Object.keys(newSettings.ai) : [],
                        maintenance: newSettings.maintenance,
                        unsaved: true
                    }
                );
                set((state) => ({
                    settings: {
                        ...state.settings,
                        ...newSettings,
                        // Deep merge for nested objects
                        features: {
                            ...state.settings.features,
                            ...(newSettings.features || {}),
                        },
                        ai: {
                            ...state.settings.ai,
                            ...(newSettings.ai || {}),
                        },
                        templates: {
                            ...state.settings.templates,
                            ...(newSettings.templates || {}),
                        },
                        exports: {
                            ...state.settings.exports,
                            ...(newSettings.exports || {}),
                        },
                        moderation: {
                            ...state.settings.moderation,
                            ...(newSettings.moderation || {}),
                        },
                        rateLimits: {
                            ...state.settings.rateLimits,
                            ...(newSettings.rateLimits || {}),
                        },
                        appearance: {
                            ...state.settings.appearance,
                            ...(newSettings.appearance || {}),
                        },
                        maintenance: {
                            ...state.settings.maintenance,
                            ...(newSettings.maintenance || {}),
                        },
                    },
                }));
            },

            loadSettings: async () => {
                const loadTimer = Date.now();
                set({ isLoading: true, error: null });

                ultraLogger.info('admin-settings-load-start',
                    'Loading admin settings from Firestore. ' +
                    'Fetching global application configuration from "admin/settings" document. ' +
                    'Settings include: Feature flags, AI quotas, rate limits, maintenance mode, etc. ' +
                    'Expected: Settings loaded and merged with defaults. ' +
                    'If no settings exist, will initialize with default configuration.',
                    { source: 'firestore', document: 'admin/settings' }
                );

                try {
                    const docRef = doc(db, "admin", "settings");
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data() as AdminSettings;
                        const loadTimeMs = Date.now() - loadTimer;

                        ultraLogger.info('admin-settings-load-success',
                            `Admin settings loaded successfully from Firestore. ` +
                            `Load time: ${loadTimeMs}ms. ` +
                            `Feature flags loaded: ${Object.keys(data.features || {}).length} features. ` +
                            `Maintenance mode: ${data.maintenance?.enabled ? 'ENABLED' : 'Disabled'}. ` +
                            `AI provider: ${data.ai?.provider || 'Not set'}. ` +
                            `Settings merged with defaults and applied to store. ` +
                            `All feature checks will now use these settings.`,
                            {
                                loadTimeMs,
                                featureCount: Object.keys(data.features || {}).length,
                                maintenanceMode: data.maintenance?.enabled,
                                aiProvider: data.ai?.provider
                            }
                        );

                        set({
                            settings: { ...defaultAdminSettings, ...data },
                            lastSyncedAt: new Date(),
                        });
                    } else {
                        ultraLogger.info('admin-settings-init',
                            'No admin settings found in Firestore - initializing with defaults. ' +
                            'This is expected on first admin panel access. ' +
                            'Default settings will be saved to Firestore now. ' +
                            'Default config: All features enabled, OpenAI provider, no maintenance mode.',
                            { action: 'initialize-defaults', willSave: true }
                        );

                        // Initialize with defaults if no settings exist
                        await setDoc(docRef, defaultAdminSettings);
                        set({ settings: defaultAdminSettings, lastSyncedAt: new Date() });

                        ultraLogger.info('admin-settings-init-success',
                            'Default admin settings saved to Firestore successfully. ' +
                            'Future loads will use these settings as base configuration.',
                            { initialized: true }
                        );
                    }
                } catch (error) {
                    ultraLogger.error('admin-settings-load-error',
                        `Failed to load admin settings from Firestore. ` +
                        `Error: "${(error as Error).message}". ` +
                        `Possible causes: (1) No internet connection, (2) Firestore read permission denied, (3) Invalid document structure. ` +
                        `Impact: App will use default settings, admin changes won't be reflected. ` +
                        `Solution: ${(error as Error).message.includes('permission') ? 'Check Firestore rules for admin collection read access' : 'Check internet connection and retry'}.`,
                        {
                            error: (error as Error).message,
                            stack: (error as Error).stack,
                            document: 'admin/settings'
                        }
                    );
                    set({ error: (error as Error).message });
                    console.error("Failed to load admin settings:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            saveSettings: async () => {
                const saveTimer = Date.now();
                set({ isLoading: true, error: null });

                const settings = get().settings;
                const changedCategories = [];
                if (JSON.stringify(settings.features) !== JSON.stringify(defaultAdminSettings.features)) changedCategories.push('Features');
                if (JSON.stringify(settings.ai) !== JSON.stringify(defaultAdminSettings.ai)) changedCategories.push('AI');
                if (JSON.stringify(settings.maintenance) !== JSON.stringify(defaultAdminSettings.maintenance)) changedCategories.push('Maintenance');

                ultraLogger.info('admin-settings-save-start',
                    `Admin clicked "Save Settings" to persist configuration to Firestore. ` +
                    `Settings categories being saved: ${changedCategories.length > 0 ? changedCategories.join(', ') : 'All defaults'}. ` +
                    `Maintenance mode: ${settings.maintenance?.enabled ? 'ENABLED (app will be inaccessible to users!)' : 'Disabled'}. ` +
                    `AI provider: ${settings.ai?.provider}. ` +
                    `Feature flags: ${Object.keys(settings.features || {}).length} features configured. ` +
                    `These settings will take effect immediately for all users.`,
                    {
                        changedCategories,
                        maintenanceMode: settings.maintenance?.enabled,
                        aiProvider: settings.ai?.provider,
                        featureCount: Object.keys(settings.features || {}).length
                    }
                );

                try {
                    const docRef = doc(db, "admin", "settings");
                    await setDoc(docRef, get().settings);

                    const saveTimeMs = Date.now() - saveTimer;

                    ultraLogger.info('admin-settings-save-success',
                        `✅ Admin settings saved successfully to Firestore! ` +
                        `Save time: ${saveTimeMs}ms. ` +
                        `Settings now synced to database and will be loaded on next app start. ` +
                        `All connected users will receive updated settings via real-time listener. ` +
                        `${settings.maintenance?.enabled ? 'WARNING: Maintenance mode is ENABLED - users cannot access app!' : 'App is operating normally.'}`,
                        {
                            saveTimeMs,
                            syncedAt: new Date().toISOString(),
                            maintenanceWarning: settings.maintenance?.enabled
                        }
                    );

                    set({ lastSyncedAt: new Date() });
                } catch (error) {
                    ultraLogger.error('admin-settings-save-error',
                        `❌ Admin settings save FAILED. ` +
                        `Error: "${(error as Error).message}". ` +
                        `Settings were NOT saved to Firestore - changes only in local state. ` +
                        `Possible causes: (1) No internet connection, (2) Firestore write permission denied, (3) Quota exceeded. ` +
                        `Impact: Settings changes will be lost on page refresh, users won't see updates. ` +
                        `Solution: ${(error as Error).message.includes('permission') ? 'Check Firestore rules for admin collection write access' : 'Check internet and retry save'}.`,
                        {
                            error: (error as Error).message,
                            stack: (error as Error).stack,
                            document: 'admin/settings'
                        }
                    );
                    set({ error: (error as Error).message });
                    console.error("Failed to save admin settings:", error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            resetToDefaults: () => {
                set({ settings: defaultAdminSettings });
            },

            subscribeToChanges: () => {
                const docRef = doc(db, "admin", "settings");
                const unsubscribe = onSnapshot(docRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data() as AdminSettings;
                        set({
                            settings: { ...defaultAdminSettings, ...data },
                            lastSyncedAt: new Date(),
                        });
                    }
                });
                return unsubscribe;
            },

            isFeatureEnabled: (feature) => {
                const { settings } = get();
                // Check maintenance mode first
                if (settings.maintenance.enabled) {
                    return false;
                }

                // Allow checking nested features e.g. "videoEditor.export4k"
                const keys = (feature as string).split('.');
                if (keys[0] === 'videoEditor' && settings.features['videoEditor'] && typeof settings.features['videoEditor'] !== 'boolean') {
                    // @ts-ignore - dynamic access for now, will type strictly later
                    return settings.features['videoEditor'][keys[1]] ?? false;
                }

                const featureConfig = settings.features[feature];
                // Handle both old (boolean) and new (FeatureConfig) formats
                if (typeof featureConfig === 'boolean') {
                    return featureConfig;
                }
                return featureConfig?.enabled ?? false;
            },

            isMaintenanceMode: () => {
                return get().settings.maintenance.enabled;
            },

            canUserAccess: (userRole) => {
                const { settings } = get();
                if (!settings.maintenance.enabled) return true;
                if (settings.maintenance.allowAdminAccess && userRole === "admin") {
                    return true;
                }
                return false;
            },
        }),
        {
            name: "admin-settings",
            partialize: (state) => ({
                settings: state.settings,
                lastSyncedAt: state.lastSyncedAt,
            }),
        }
    )
);
