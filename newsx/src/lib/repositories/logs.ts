import { db } from "@/lib/db";
import { LogLevel } from "@/lib/services/logs";

export const LogRepository = {
    async log(level: LogLevel, message: string, context?: Record<string, any>) {
        try {
            await db.execute({
                sql: `INSERT INTO logs (level, message, context, timestamp) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                args: [
                    level,
                    message,
                    context ? JSON.stringify(context) : null
                ]
            });
        } catch (e) {
            console.error("Failed to write log to SQLite:", e);
        }
    },

    async getRecent(limit: number = 50) {
        try {
            const result = await db.execute({
                sql: `SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?`,
                args: [limit]
            });

            return result.rows.map(row => ({
                id: row.id,
                level: row.level as LogLevel,
                message: row.message as string,
                context: row.context ? JSON.parse(row.context as string) : {},
                timestamp: row.timestamp as string
            }));
        } catch (e) {
            console.error("Failed to fetch logs from SQLite:", e);
            return [];
        }
    }
};
