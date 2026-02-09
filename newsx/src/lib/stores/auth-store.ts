import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { auth, db } from "../firebase";
import { User } from "../types";
import { logger, setLogUser, clearLogUser } from "../editor-logger";

interface AuthStore {
    // State
    user: User | null;
    firebaseUser: FirebaseUser | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;

    // Actions
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    initializeAuth: () => () => void;
    updateUser: (updates: Partial<User>) => Promise<void>;
    incrementUsage: (metric: keyof User['usage']) => Promise<void>;

    // Role helpers
    isAdmin: () => boolean;
    isModerator: () => boolean;
    isPro: () => boolean;
    getTier: () => string;
    hasPermission: (permission: string) => boolean;
}

const createUserDocument = async (
    firebaseUser: FirebaseUser,
    additionalData?: Partial<User>
): Promise<User> => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        // Update last login
        logger.info('auth', 'User login - existing user', { userId: firebaseUser.uid, email: firebaseUser.email });
        await setDoc(
            userRef,
            { lastLoginAt: serverTimestamp() },
            { merge: true }
        );
        return userSnap.data() as User;
    }

    // Create new user document
    const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: additionalData?.displayName || firebaseUser.displayName || "User",
        ...(firebaseUser.photoURL && { photoURL: firebaseUser.photoURL }),
        role: "free", // Default role
        tier: "free", // Default tier
        createdAt: new Date(),
        lastLoginAt: new Date(),
        usage: {
            aiGenerationsThisMonth: 0,
            exportsThisMonth: 0,
            postsCreated: 0,
            templatesCreated: 0,
        },
        settings: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        isActive: true,
        isBanned: false,
        ...additionalData,
    };

    logger.info('auth', 'Creating new user document', {
        userId: firebaseUser.uid,
        email: newUser.email,
        role: newUser.role,
        tier: newUser.tier
    });

    await setDoc(userRef, {
        ...newUser,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
    });

    return newUser;
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            firebaseUser: null,
            isLoading: false,
            isInitialized: false,
            error: null,

            signIn: async (email, password) => {
                const loginTimer = logger.time('auth', 'Email/Password Sign In');
                logger.info('auth', 'Sign in attempt', { email });

                set({ isLoading: true, error: null });
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    const user = await createUserDocument(result.user);
                    setLogUser(user.id, user.email);

                    set({ user, firebaseUser: result.user });
                    loginTimer.end({ userId: user.id });
                    logger.info('auth', 'Sign in successful', { userId: user.id });
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    logger.error('auth', 'Sign in failed', { email, error: errorMessage });
                    set({ error: errorMessage });
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            signUp: async (email, password, displayName) => {
                const signupTimer = logger.time('auth', 'User Registration');
                logger.info('auth', 'Sign up attempt', { email, displayName });

                set({ isLoading: true, error: null });
                try {
                    const result = await createUserWithEmailAndPassword(auth, email, password);
                    const user = await createUserDocument(result.user, { displayName });
                    setLogUser(user.id, user.email);

                    set({ user, firebaseUser: result.user });
                    signupTimer.end({ userId: user.id });
                    logger.info('auth', 'Sign up successful', { userId: user.id });
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    logger.error('auth', 'Sign up failed', { email, error: errorMessage });
                    set({ error: errorMessage });
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            signInWithGoogle: async () => {
                set({ isLoading: true, error: null });
                try {
                    const provider = new GoogleAuthProvider();
                    const result = await signInWithPopup(auth, provider);
                    const user = await createUserDocument(result.user);
                    set({ user, firebaseUser: result.user });
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    set({ error: errorMessage });
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            signOut: async () => {
                logger.info('auth', 'Sign out initiated', { userId: get().user?.id });
                set({ isLoading: true, error: null });
                try {
                    await firebaseSignOut(auth);
                    clearLogUser();

                    set({ user: null, firebaseUser: null });
                    logger.info('auth', 'Sign out successful');
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    logger.error('auth', 'Sign out failed', { error: errorMessage });
                    set({ error: errorMessage });
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            initializeAuth: () => {
                set({ isLoading: true });
                const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        try {
                            const user = await createUserDocument(firebaseUser);
                            set({ user, firebaseUser, isInitialized: true });
                        } catch (error) {
                            console.error("Failed to load user document:", error);
                            set({ user: null, firebaseUser, isInitialized: true });
                        }
                    } else {
                        set({ user: null, firebaseUser: null, isInitialized: true });
                    }
                    set({ isLoading: false });
                });
                return unsubscribe;
            },

            updateUser: async (updates) => {
                const { user, firebaseUser } = get();
                if (!user || !firebaseUser) return;

                set({ isLoading: true, error: null });
                try {
                    const userRef = doc(db, "users", firebaseUser.uid);
                    await setDoc(userRef, updates, { merge: true });
                    set({ user: { ...user, ...updates } });
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    set({ error: errorMessage });
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            incrementUsage: async (metric) => {
                const { user, firebaseUser } = get();
                if (!user || !firebaseUser) return;

                // Optimistic update
                const newUsage = {
                    ...user.usage,
                    [metric]: (user.usage?.[metric] || 0) + 1
                };

                set({ user: { ...user, usage: newUsage } });

                try {
                    const userRef = doc(db, "users", firebaseUser.uid);
                    await setDoc(userRef, {
                        usage: {
                            [metric]: increment(1)
                        }
                    }, { merge: true });
                } catch (error) {
                    console.error(`Failed to increment ${metric}:`, error);
                    // Revert on failure (optional, but good practice)
                    // For simple counters, maybe not preventing the user flow is better
                }
            },

            isAdmin: () => get().user?.role === "admin",
            isModerator: () => ["admin", "moderator"].includes(get().user?.role || ""),
            isPro: () => ["pro", "enterprise"].includes(get().user?.tier || ""),
            getTier: () => get().user?.tier || "free",

            hasPermission: (permission) => {
                const user = get().user;
                if (!user) return false;
                if (user.role === "admin") return true;

                // Define role-based permissions
                const permissions: Record<string, string[]> = {
                    admin: ["*"],
                    moderator: ["view_users", "moderate_content", "view_analytics"],
                    pro: ["create_posts", "use_ai", "batch_process", "custom_templates"],
                    free: ["create_posts", "view_templates"],
                };

                const rolePerms = permissions[user.role] || [];
                return rolePerms.includes("*") || rolePerms.includes(permission);
            },
        }),
        {
            name: "auth-store",
            partialize: (state) => ({
                // Only persist minimal user info, reload full user on auth init
                user: state.user
                    ? {
                        id: state.user.id,
                        email: state.user.email,
                        role: state.user.role,
                        tier: state.user.tier,
                    }
                    : null,
            }),
        }
    )
);
