"use client";

import { useEffect, useState } from "react";

const DEBUG_KEY = "newsx_debug_mode";

export function useDebugMode() {
    const [isEnabled, setIsEnabled] = useState(false);

    useEffect(() => {
        // Initial check
        const stored = localStorage.getItem(DEBUG_KEY);
        setIsEnabled(stored === "true");

        // Listen for changes from other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === DEBUG_KEY) {
                setIsEnabled(e.newValue === "true");
            }
        };

        // Listen for custom event (for same-tab updates)
        const handleCustomEvent = () => {
            const stored = localStorage.getItem(DEBUG_KEY);
            setIsEnabled(stored === "true");
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("debug_mode_change", handleCustomEvent);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("debug_mode_change", handleCustomEvent);
        };
    }, []);

    const toggle = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        localStorage.setItem(DEBUG_KEY, String(newState));

        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new Event("debug_mode_change"));
    };

    return { isEnabled, toggle };
}
