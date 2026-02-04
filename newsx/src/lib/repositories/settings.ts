import { db } from "@/lib/db";

const CONFIG_KEY = "config";

export const SettingsRepository = {
    async getConfig() {
        const result = await db.execute({
            sql: `SELECT value FROM system_settings WHERE key = ? LIMIT 1`,
            args: [CONFIG_KEY],
        });
        if (!result.rows[0]?.value) {
            return { defaultFetchInterval: 60, timeZone: "Asia/Kolkata", locale: "en-IN", defaultNewsLimit: 100 };
        }
        try {
            const parsed = JSON.parse(result.rows[0].value as string);
            return {
                defaultFetchInterval: parsed?.defaultFetchInterval ?? 60,
                timeZone: parsed?.timeZone || "Asia/Kolkata",
                locale: parsed?.locale || "en-IN",
                defaultNewsLimit: parsed?.defaultNewsLimit ?? 100,
            };
        } catch {
            return { defaultFetchInterval: 60, timeZone: "Asia/Kolkata", locale: "en-IN", defaultNewsLimit: 100 };
        }
    },

    async setConfig(config: Record<string, any>) {
        await db.execute({
            sql: `INSERT INTO system_settings (key, value, updated_at)
                  VALUES (?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
            args: [CONFIG_KEY, JSON.stringify(config)],
        });
    },
};
