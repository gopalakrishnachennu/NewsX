"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Settings = {
    timeZone: string;
    locale: string;
    defaultNewsLimit: number;
};

const SettingsContext = createContext<Settings | null>(null);

const DEFAULT_SETTINGS: Settings = {
    timeZone: "Asia/Kolkata",
    locale: "en-IN",
    defaultNewsLimit: 100,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

    useEffect(() => {
        let mounted = true;
        fetch("/api/settings", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!mounted || !data?.config) return;
                setSettings({
                    timeZone: data.config.timeZone || DEFAULT_SETTINGS.timeZone,
                    locale: data.config.locale || DEFAULT_SETTINGS.locale,
                    defaultNewsLimit: Number(data.config.defaultNewsLimit || DEFAULT_SETTINGS.defaultNewsLimit),
                });
            })
            .catch(() => {
                // keep defaults
            });
        return () => {
            mounted = false;
        };
    }, []);

    const value = useMemo(() => settings, [settings]);

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    return ctx || DEFAULT_SETTINGS;
}
