"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore"; // Import setDoc statically
import { auth, db } from "@/lib/firebase";
import { Role, User as AppUser } from "@/types";

interface AuthContextType {
    user: FirebaseUser | null;
    appUser: AppUser | null;
    loading: boolean;
    role: Role | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    appUser: null,
    loading: true,
    role: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth check timed out, forcing loading false");
                setLoading(false);
            }
        }, 8000); // 8 seconds

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!mounted) return;
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userRef = doc(db, "users", firebaseUser.uid);
                    const userDoc = await getDoc(userRef);

                    if (mounted) {
                        if (userDoc.exists()) {
                            setAppUser(userDoc.data() as AppUser);
                        } else {
                            // First time login: Create Owner
                            const newUser: AppUser = {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email || "",
                                role: 'owner',
                                lastLogin: new Date(),
                            };
                            await setDoc(userRef, newUser);
                            if (mounted) setAppUser(newUser);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching/creating user role", error);
                    // On error, we might want to setAppUser(null) or a default "guest"?
                    // For now, let's leave it null which might redirect to unauthorized
                }
            } else {
                if (mounted) setAppUser(null);
            }

            if (mounted) setLoading(false);
            clearTimeout(safetyTimeout);
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            unsubscribe();
        };
    }, []);

    const value = {
        user,
        appUser,
        role: appUser?.role || null,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
