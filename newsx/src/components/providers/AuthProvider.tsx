"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Role, User as AppUser } from "@/types";

interface AuthContextType {
    user: FirebaseUser | null;
    appUser: AppUser | null;
    loading: boolean;
    role: Role | null;
    status: string; // Debug status
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    appUser: null,
    loading: true,
    role: null,
    status: "Initializing...",
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Initializing Auth...");

    useEffect(() => {
        let mounted = true;

        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth check timed out");
                setStatus("Auth Timed Out (Check Console)");
                // Don't force loading false yet, let the user see the timeout message?
                // Or force it:
                setLoading(false);
            }
        }, 10000); // 10s

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!mounted) return;
            setStatus("Auth State Changed...");
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    setStatus("Fetching User Profile...");
                    const token = await firebaseUser.getIdToken();
                    const response = await fetch("/api/users/me", {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || "Failed to fetch user profile");
                    }

                    const data = await response.json();
                    const lastLoginMs = typeof data?.user?.lastLogin === "number"
                        ? data.user.lastLogin
                        : Date.now();

                    if (mounted) {
                        setStatus("Profile Loaded");
                        setAppUser({
                            uid: data.user.uid,
                            email: data.user.email || "",
                            role: data.user.role as Role,
                            lastLogin: new Date(lastLoginMs),
                        });
                    }
                } catch (error: any) {
                    console.error("Error fetching/creating user role", error);
                    setStatus(`Error: ${error.message}`);
                }
            } else {
                if (mounted) setAppUser(null);
                setStatus("No User");
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
        status,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
