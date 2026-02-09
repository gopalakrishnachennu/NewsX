import { create } from "zustand";
import { persist } from "zustand/middleware";
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
    limit,
    serverTimestamp,
    Timestamp,
    getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";
import { Post, BrandKit, ContentExtraction } from "../types";
import { templates as staticTemplates, TemplateConfig } from "../templates";
import { useAuthStore } from "./auth-store";
import { logger } from "../logger";

interface EditorStore {
    // Current editor state
    currentPost: Post | null;
    currentTemplate: TemplateConfig | null;
    currentBrandKit: BrandKit | null;
    extractedContent: ContentExtraction | null;

    // Canvas state
    canvasJson: string | null;
    canvasHistory: string[];
    historyIndex: number;

    // UI state
    selectedLayerId: string | null;
    zoom: number;
    isPreviewing: boolean;
    isExporting: boolean;

    // Collections
    templates: TemplateConfig[];
    brandKits: BrandKit[];
    recentPosts: Post[];
    posts: Post[]; // All user posts

    // Loading states
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;

    // Actions
    setCurrentPost: (post: Post | null) => void;
    setCurrentTemplate: (template: TemplateConfig | null) => void;
    setCurrentBrandKit: (brandKit: BrandKit | null) => void;
    setExtractedContent: (content: ContentExtraction | null) => void;

    // Canvas actions
    setCanvasJson: (json: string) => void;
    pushToHistory: (json: string) => void;
    undo: () => void;
    redo: () => void;
    clearHistory: () => void;

    // UI actions
    setSelectedLayer: (layerId: string | null) => void;
    setZoom: (zoom: number) => void;
    togglePreview: () => void;
    setIsExporting: (isExporting: boolean) => void;

    // Data loading
    loadTemplates: (category?: string) => Promise<void>;
    loadBrandKits: (userId: string) => Promise<void>;
    loadRecentPosts: (userId: string) => Promise<void>;
    loadPosts: (userId: string) => Promise<void>;
    loadPost: (postId: string) => Promise<void>;

    // CRUD operations
    savePost: (post: Partial<Post>) => Promise<string>;
    createPostFromTemplate: (template: TemplateConfig, variables: Record<string, string>) => Promise<string>;
    createPostFromDynamicTemplate: (
        templateName: string,
        canvasState: string,
        variables: Record<string, string>
    ) => Promise<string>;
    deletePost: (postId: string) => Promise<void>;
    repairPostTimestamps: (userId: string) => Promise<void>;
    syncUserStats: (userId: string) => Promise<void>;
    saveBrandKit: (brandKit: Partial<BrandKit>) => Promise<string>;
    deleteBrandKit: (brandKitId: string) => Promise<void>;

    // Reset
    resetEditor: () => void;

    // Phase 24: Text Style Tokens
    textStyles: TextStyle[];
    addTextStyle: (style: TextStyle) => void;
    deleteTextStyle: (id: string) => void;
}

export interface TextStyle {
    id: string;
    name: string;
    style: Record<string, any>; // Partial<CanvasElement> but loose for now
}

export const useEditorStore = create<EditorStore>()(
    persist(
        (set, get) => ({
            // Initial state
            currentPost: null,
            currentTemplate: null,
            currentBrandKit: null,
            extractedContent: null,
            canvasJson: null,
            canvasHistory: [],
            historyIndex: -1,
            selectedLayerId: null,
            zoom: 1,
            isPreviewing: false,
            isExporting: false,
            templates: [],
            brandKits: [],
            recentPosts: [],
            posts: [],
            isLoading: false,
            isSaving: false,
            error: null,

            // Post actions
            setCurrentPost: (post) => set({ currentPost: post }),
            setCurrentTemplate: (template) => {
                set({ currentTemplate: template });
                if (template) {
                    get().clearHistory();
                }
            },
            setCurrentBrandKit: (brandKit) => set({ currentBrandKit: brandKit }),
            setExtractedContent: (content) => set({ extractedContent: content }),

            // Canvas actions
            setCanvasJson: (json) => set({ canvasJson: json }),

            pushToHistory: (json) => {
                logger.debug('editor-store', 'Canvas state pushed to history');
                const { canvasHistory, historyIndex } = get();
                const newHistory = canvasHistory.slice(0, historyIndex + 1);
                newHistory.push(json);
                // Keep only last 50 states
                if (newHistory.length > 50) {
                    newHistory.shift();
                }
                set({
                    canvasHistory: newHistory,
                    historyIndex: newHistory.length - 1,
                    canvasJson: json,
                });
                logger.debug('editor-store', 'History updated', {
                    historyLength: newHistory.length,
                    currentIndex: newHistory.length - 1
                });
            },

            undo: () => {
                const { canvasHistory, historyIndex } = get();
                if (historyIndex > 0) {
                    const newIndex = historyIndex - 1;
                    logger.info('editor-store', 'Undo performed', {
                        previousIndex: historyIndex,
                        newIndex
                    });
                    set({
                        historyIndex: newIndex,
                        canvasJson: canvasHistory[newIndex],
                    });
                }
            },

            redo: () => {
                const { canvasHistory, historyIndex } = get();
                if (historyIndex < canvasHistory.length - 1) {
                    const newIndex = historyIndex + 1;
                    logger.info('editor-store', 'Redo performed', {
                        previousIndex: historyIndex,
                        newIndex
                    });
                    set({
                        historyIndex: newIndex,
                        canvasJson: canvasHistory[newIndex],
                    });
                }
            },

            clearHistory: () => set({ canvasHistory: [], historyIndex: -1 }),

            // UI actions
            setSelectedLayer: (layerId) => set({ selectedLayerId: layerId }),
            setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
            togglePreview: () => set((state) => ({ isPreviewing: !state.isPreviewing })),
            setIsExporting: (isExporting) => set({ isExporting }),

            // Data loading
            // Data loading
            loadTemplates: async (category) => {
                set({ isLoading: true, error: null });
                try {
                    let loaded = staticTemplates;
                    if (category && category !== "all") {
                        loaded = loaded.filter((t) => t.category === category);
                    }
                    set({ templates: loaded });
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to load templates:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            loadBrandKits: async (userId) => {
                set({ isLoading: true, error: null });
                try {
                    const q = query(
                        collection(db, "brandKits"),
                        where("userId", "==", userId),
                        orderBy("createdAt", "desc")
                    );

                    const snapshot = await getDocs(q);
                    const brandKits = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as BrandKit[];

                    set({ brandKits });

                    // Set default brand kit if available
                    const defaultKit = brandKits.find((kit) => kit.isDefault);
                    if (defaultKit) {
                        set({ currentBrandKit: defaultKit });
                    }
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to load brand kits:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            loadRecentPosts: async (userId) => {
                set({ isLoading: true, error: null });
                try {
                    // Removed orderBy and limit to avoid needing a composite index
                    const q = query(
                        collection(db, "posts"),
                        where("userId", "==", userId)
                    );

                    const snapshot = await getDocs(q);
                    const allPosts = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Post[];

                    // Sort posts
                    const recentPosts = allPosts
                        .sort((a, b) => {
                            // Handle Firestore timestamps or Dates or nulls
                            const dateA = a.updatedAt ? (a.updatedAt as any).toDate ? (a.updatedAt as any).toDate() : new Date(a.updatedAt) : new Date(0);
                            const dateB = b.updatedAt ? (b.updatedAt as any).toDate ? (b.updatedAt as any).toDate() : new Date(b.updatedAt) : new Date(0);
                            return dateB.getTime() - dateA.getTime();
                        });

                    set({ recentPosts: recentPosts.slice(0, 20) });
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to load recent posts:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            loadPosts: async (userId) => {
                set({ isLoading: true, error: null });
                try {
                    const q = query(
                        collection(db, "posts"),
                        where("userId", "==", userId)
                    );

                    const snapshot = await getDocs(q);
                    const allPosts = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Post[];

                    // Sort posts (Newest first)
                    const sortedPosts = allPosts.sort((a, b) => {
                        const dateA = a.updatedAt ? ((a.updatedAt as any).toDate ? (a.updatedAt as any).toDate() : new Date(a.updatedAt)) : new Date(0);
                        const dateB = b.updatedAt ? ((b.updatedAt as any).toDate ? (b.updatedAt as any).toDate() : new Date(b.updatedAt)) : new Date(0);
                        return dateB.getTime() - dateA.getTime();
                    });

                    set({ posts: sortedPosts });
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to load posts:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            loadPost: async (postId) => {
                set({ isLoading: true, error: null });
                try {
                    const postRef = doc(db, "posts", postId);
                    const postSnap = await getDoc(postRef);

                    if (postSnap.exists()) {
                        const postData = { id: postSnap.id, ...postSnap.data() } as Post;
                        set({
                            currentPost: postData,
                            canvasJson: postData.canvasState
                        });
                    } else {
                        throw new Error("Post not found");
                    }
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to load post:", error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            // CRUD operations
            savePost: async (post) => {
                const saveTimer = logger.time('editor-store', 'Save Post');

                // DEBUG: Trace exact payload
                console.log('%c[DEBUG] savePost CALL:', 'color: #f0f; font-weight: bold;', {
                    payloadId: post.id,
                    payloadUserId: post.userId,
                    payloadTitle: post.title,
                    isCanvasPresent: !!get().canvasJson,
                    canvasLength: get().canvasJson?.length
                });

                if (!post.userId) {
                    console.error('[CRITICAL] Parsing savePost: Missing User ID', post);
                    throw new Error("User ID is missing. Cannot save post.");
                }

                logger.info('editor-store', 'Saving post', {
                    postId: post.id,
                    isNew: !post.id,
                    hasTitle: !!post.title,
                    userId: post.userId
                });

                set({ isSaving: true, error: null });
                try {
                    const postId = post.id || doc(collection(db, "posts")).id;
                    const postRef = doc(db, "posts", postId);

                    // Data to save to Firestore (with serverTimestamp)
                    const firestoreData: Record<string, unknown> = {
                        ...post,
                        id: postId,
                        canvasState: get().canvasJson,
                        updatedAt: serverTimestamp(),
                    };

                    // CRITICAL FIX: Remove undefined values (Firestore rejects them)
                    Object.keys(firestoreData).forEach(key => {
                        if (firestoreData[key] === undefined) {
                            delete firestoreData[key];
                        }
                    });

                    // DEBUG: Trace Firestore Data
                    console.log('[DEBUG] Firestore Write Payload:', firestoreData);

                    if (!post.id) {
                        firestoreData.createdAt = serverTimestamp();
                        // Increment usage stats for new post
                        useAuthStore.getState().incrementUsage('postsCreated');
                        logger.info('editor-store', 'Creating new post', { postId });
                    }

                    await setDoc(postRef, firestoreData, { merge: true });

                    // Local state update (with Date instead of serverTimestamp)
                    const localPostData = {
                        ...post,
                        id: postId,
                        canvasState: get().canvasJson || "",
                        updatedAt: new Date(),
                        createdAt: post.id ? get().currentPost?.createdAt : new Date(),
                    };
                    set({ currentPost: { ...get().currentPost, ...localPostData } as Post });

                    // Update recentPosts list locally to reflect changes immediately
                    set(state => ({
                        recentPosts: state.recentPosts.map(p =>
                            p.id === postId ? { ...p, ...localPostData, createdAt: localPostData.createdAt || new Date() } as Post : p
                        )
                    }));

                    return postId;
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to save post:", error);
                    throw error;
                } finally {
                    set({ isSaving: false });
                }
            },

            createPostFromTemplate: async (template, variables) => {
                set({ isSaving: true, error: null });
                try {
                    const currentUser = useAuthStore.getState().user;
                    const brandKit = get().currentBrandKit;

                    // System variables for auto-binding
                    const systemVariables: Record<string, string> = {
                        "brand.name": brandKit?.name || "Your Brand",
                        "brand.website": brandKit?.social?.website || "www.yourbrand.com",
                        "user.name": currentUser?.displayName || "User",
                        "user.email": currentUser?.email || "",
                        "date": new Date().toLocaleDateString(),
                    };
                    const allVariables = { ...systemVariables, ...variables };

                    // Build canvas elements in the EDITOR's expected format (percentage-based)
                    // NOT Fabric.js format - the editor uses a custom element array
                    const editorElements: any[] = [];

                    // Process each template element and convert to editor format
                    for (const el of template.canvasElements || []) {
                        // Get value from binding or default
                        let value = el.defaultValue || "";
                        if (el.binding && allVariables[el.binding]) {
                            value = allVariables[el.binding];
                        }

                        // Replace {{variables}} in default values
                        value = value.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                            return allVariables[key.trim()] || match;
                        });

                        const baseElement = {
                            id: `el-${el.id}-${Date.now()}`,
                            name: el.name,
                            x: el.x,
                            y: el.y,
                            width: el.width,
                            height: el.height,
                            rotation: 0,
                            locked: false,
                            visible: true,
                            flipX: false,
                            flipY: false,
                        };

                        if (el.type === 'text' || el.type === 'brand') {
                            editorElements.push({
                                ...baseElement,
                                type: 'text',
                                text: value,
                                fontSize: el.style.fontSize || 24,
                                fontWeight: el.style.fontWeight || 'normal',
                                fontFamily: el.style.fontFamily || template.style.fontFamily || 'Inter, sans-serif',
                                textAlign: el.style.textAlign || 'left',
                                color: el.style.color || template.style.textColor || '#ffffff',
                                backgroundColor: el.style.backgroundColor || '',
                                textHighlight: el.style.textHighlight,
                                textOutline: el.style.textOutlineWidth ? { enabled: true, width: el.style.textOutlineWidth, color: el.style.textOutlineColor || '#000000' } : undefined,
                                textShadow: el.style.textShadow ? { enabled: true, color: '#000000', blur: 4, offsetX: 2, offsetY: 2 } : undefined, // Parse textShadow string if complex later
                                lineHeight: el.style.lineHeight,
                                letterSpacing: el.style.letterSpacing,
                                textTransform: el.style.textTransform,
                            });
                        } else if (el.type === 'image') {
                            const imageUrl = allVariables[el.binding || ''] || '';
                            editorElements.push({
                                ...baseElement,
                                type: 'image',
                                imageUrl: imageUrl,
                                borderRadius: el.style.borderRadius || 0,
                            });
                        } else if (el.type === 'shape') {
                            editorElements.push({
                                ...baseElement,
                                type: 'shape',
                                shapeType: 'rectangle',
                                fillColor: el.style.backgroundColor || template.style.accentColor || '#6366f1',
                                borderRadius: el.style.borderRadius || 0,
                            });
                        }
                    }

                    // Create canvas state in the format expected by the editor
                    const canvasStateObj = {
                        elements: editorElements,
                        background: {
                            color: template.style.backgroundColor,
                            image: null,
                            gradient: {
                                enabled: template.style.gradientOverlay !== 'none',
                                type: 'linear' as const,
                                angle: 180,
                                colors: [
                                    { color: template.style.backgroundColor, stop: 0 },
                                    { color: template.style.accentColor || template.style.backgroundColor, stop: 100 }
                                ]
                            }
                        },
                        frame: {
                            id: 'instagram-portrait',
                            name: 'Instagram Portrait',
                            width: 1080,
                            height: 1350
                        },
                        config: {
                            gridVisible: false,
                            snapEnabled: true,
                            gridSize: 20
                        }
                    };
                    const canvasJson = JSON.stringify(canvasStateObj);

                    // Create Post in Firestore
                    const postId = doc(collection(db, "posts")).id;
                    const postRef = doc(db, "posts", postId);

                    const newPost: Record<string, any> = {
                        id: postId,
                        title: `${template.name} - ${new Date().toLocaleDateString()}`,
                        templateId: template.id,
                        canvasState: canvasJson,
                        status: "draft",
                        platform: "instagram",
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        content: {
                            headline: allVariables['headline'] || '',
                            body: allVariables['subheadline'] || allVariables['subtext'] || '',
                            quote: allVariables['quote'] || '',
                        },
                    };

                    if (currentUser?.id) {
                        newPost.userId = currentUser.id;
                    }

                    if (brandKit?.id) {
                        newPost.brandKitId = brandKit.id;
                    }

                    await setDoc(postRef, newPost);

                    // Increment usage
                    useAuthStore.getState().incrementUsage('postsCreated');

                    return postId;
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to create post from template:", error);
                    throw error;
                } finally {
                    set({ isSaving: false });
                }
            },

            deletePost: async (postId) => {
                set({ isLoading: true, error: null });
                try {
                    await deleteDoc(doc(db, "posts", postId));
                    set((state) => ({
                        recentPosts: state.recentPosts.filter((p) => p.id !== postId),
                        currentPost: state.currentPost?.id === postId ? null : state.currentPost,
                    }));
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to delete post:", error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            // Create a post from a DYNAMIC template (saved in Firebase with canvasState JSON)
            createPostFromDynamicTemplate: async (templateName, canvasState, variables) => {
                set({ isSaving: true, error: null });
                try {
                    const currentUser = useAuthStore.getState().user;
                    const brandKit = get().currentBrandKit;

                    // Parse the stored canvas state
                    let parsedState = JSON.parse(canvasState);

                    // Apply variables to bound elements
                    if (parsedState.elements && Array.isArray(parsedState.elements)) {
                        parsedState.elements = parsedState.elements.map((el: any) => {
                            if (el.isBindable && el.bindConfig) {
                                const variableKey = el.bindConfig.fieldId;
                                const variableValue = variables[variableKey];

                                if (variableValue !== undefined) {
                                    // Apply the variable value based on field type
                                    if (el.bindConfig.fieldType === 'text' && el.type === 'text') {
                                        return { ...el, text: variableValue };
                                    } else if (el.bindConfig.fieldType === 'image' && el.type === 'image') {
                                        return { ...el, imageUrl: variableValue };
                                    } else if (el.bindConfig.fieldType === 'color') {
                                        return { ...el, color: variableValue, fillColor: variableValue };
                                    }
                                }
                            }
                            return el;
                        });
                    }

                    const canvasJson = JSON.stringify(parsedState);

                    // Check document size before saving (Firestore has 1MB limit)
                    const estimatedSize = new Blob([canvasJson]).size;
                    console.log(`Canvas state size: ${(estimatedSize / 1024).toFixed(1)}KB`);

                    if (estimatedSize > 900000) { // 900KB safety margin
                        throw new Error(`Document too large (${(estimatedSize / 1024 / 1024).toFixed(2)}MB). Please use smaller images.`);
                    }

                    // Create Post in Firestore
                    const postId = doc(collection(db, "posts")).id;
                    const postRef = doc(db, "posts", postId);

                    // Build post data, explicitly excluding undefined values
                    const postData: Record<string, any> = {
                        id: postId,
                        title: `${templateName} - ${new Date().toLocaleDateString()}`,
                        canvasState: canvasJson,
                        status: "draft",
                        platform: "instagram",
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };

                    // Only add if not undefined
                    if (currentUser?.id) {
                        postData.userId = currentUser.id;
                    }
                    if (brandKit?.id) {
                        postData.brandKitId = brandKit.id;
                    }

                    await setDoc(postRef, postData);

                    // Update local state
                    set((state) => ({
                        recentPosts: [
                            { ...postData, id: postId, createdAt: new Date(), updatedAt: new Date() } as Post,
                            ...state.recentPosts,
                        ],
                        currentPost: { ...postData, id: postId } as Post,
                        canvasJson: canvasJson,
                    }));

                    return postId;
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to create post from dynamic template:", error);
                    throw error;
                } finally {
                    set({ isSaving: false });
                }
            },

            repairPostTimestamps: async (userId: string) => {
                set({ isLoading: true });
                try {
                    const q = query(collection(db, "posts"), where("userId", "==", userId));
                    const querySnapshot = await getDocs(q);

                    const updates = querySnapshot.docs.map(async (docSnap) => {
                        const data = docSnap.data();
                        // If updatedAt is missing, use createdAt or now
                        if (!data.updatedAt) {
                            const newTimestamp = data.createdAt || serverTimestamp();
                            const updateData: Record<string, any> = {
                                ...data,
                                updatedAt: newTimestamp,
                                createdAt: data.createdAt || newTimestamp
                            };

                            // Also fix generic titles
                            if (!data.title || data.title === 'Untitled Design') {
                                const dateObj = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                                updateData.title = `Design - ${dateStr}`;
                            }

                            await setDoc(docSnap.ref, updateData, { merge: true });
                        } else if (!data.title || data.title === 'Untitled Design') {
                            // Fix generic title even if timestamp exists
                            const dateObj = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
                            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                            await setDoc(docSnap.ref, { title: `Design - ${dateStr}` }, { merge: true });
                        }
                    });

                    await Promise.all(updates);
                    // Reload to see changes
                    await get().loadRecentPosts(userId);
                } catch (error) {
                    console.error("Failed to repair timestamps:", error);
                    set({ error: (error as Error).message });
                } finally {
                    set({ isLoading: false });
                }
            },

            saveBrandKit: async (brandKit) => {
                set({ isSaving: true, error: null });
                try {
                    const kitId = brandKit.id || doc(collection(db, "brandKits")).id;
                    const kitRef = doc(db, "brandKits", kitId);

                    const firestoreData: Record<string, unknown> = {
                        ...brandKit,
                        id: kitId,
                    };

                    if (!brandKit.id) {
                        firestoreData.createdAt = serverTimestamp();
                    }

                    await setDoc(kitRef, firestoreData, { merge: true });

                    return kitId;
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to save brand kit:", error);
                    throw error;
                } finally {
                    set({ isSaving: false });
                }
            },

            deleteBrandKit: async (brandKitId) => {
                set({ isLoading: true, error: null });
                try {
                    await deleteDoc(doc(db, "brandKits", brandKitId));
                    set((state) => ({
                        brandKits: state.brandKits.filter((k) => k.id !== brandKitId),
                        currentBrandKit:
                            state.currentBrandKit?.id === brandKitId ? null : state.currentBrandKit,
                    }));
                } catch (error) {
                    set({ error: (error as Error).message });
                    console.error("Failed to delete brand kit:", error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            syncUserStats: async (userId: string) => {
                try {
                    const q = query(collection(db, "posts"), where("userId", "==", userId));
                    const snapshot = await getCountFromServer(q);
                    const count = snapshot.data().count;

                    const user = useAuthStore.getState().user;
                    if (user) {
                        // Only update if different to avoid unnecessary writes
                        if (user.usage?.postsCreated !== count) {
                            await useAuthStore.getState().updateUser({
                                usage: {
                                    ...user.usage,
                                    postsCreated: count,
                                    // Preserve other stats or default to 0
                                    aiGenerationsThisMonth: user.usage?.aiGenerationsThisMonth || 0,
                                    exportsThisMonth: user.usage?.exportsThisMonth || 0,
                                    templatesCreated: user.usage?.templatesCreated || 0,
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error("Failed to sync user stats:", error);
                }
            },

            resetEditor: () => {
                set({
                    currentPost: null,
                    currentTemplate: null,
                    extractedContent: null,
                    canvasJson: null,
                    canvasHistory: [],
                    historyIndex: -1,
                    selectedLayerId: null,
                    zoom: 1,
                    isPreviewing: false,
                    isExporting: false,
                    error: null,
                });
            },

            // Phase 24: Text Style Tokens
            textStyles: [
                { id: 'h1', name: 'Headline 1', style: { fontSize: 64, fontWeight: 800, fontFamily: 'Inter, sans-serif' } },
                { id: 'h2', name: 'Headline 2', style: { fontSize: 48, fontWeight: 700, fontFamily: 'Inter, sans-serif' } },
                { id: 'body', name: 'Body', style: { fontSize: 24, fontWeight: 400, fontFamily: 'Inter, sans-serif' } },
                { id: 'caption', name: 'Caption', style: { fontSize: 16, fontWeight: 400, color: '#666666' } },
            ],
            addTextStyle: (style) => set((state) => ({ textStyles: [...state.textStyles, style] })),
            deleteTextStyle: (id) => set((state) => ({ textStyles: state.textStyles.filter((s) => s.id !== id) })),
        }),
        {
            name: "editor-store",
            partialize: (state) => ({
                // Only persist essential editor state
                currentBrandKit: state.currentBrandKit,
                zoom: state.zoom,
                textStyles: state.textStyles, // Persist styles
            }),
        }
    )
);
