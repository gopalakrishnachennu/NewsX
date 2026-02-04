
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    timestamp: Date;
}

export const LogService = {
    async write(level: LogLevel, message: string, context?: Record<string, any>) {
        // 1. Write to Console (Vercel Logs)
        const timestamp = new Date().toISOString();
        const entry = { level, message, context, timestamp };

        if (level === "error") {
            console.error(JSON.stringify(entry));
        } else if (level === "warn") {
            console.warn(JSON.stringify(entry));
        } else {
            console.log(JSON.stringify(entry));
        }

        // 2. Write to SQLite (Local Logs)
        try {
            const { LogRepository } = await import("@/lib/repositories/logs");
            await LogRepository.log(level, message, context);
        } catch (error) {
            console.error("Failed to write log to SQLite", error);
        }
    },

    debug(message: string, context?: Record<string, any>) {
        return this.write("debug", message, context);
    },

    info(message: string, context?: Record<string, any>) {
        return this.write("info", message, context);
    },

    warn(message: string, context?: Record<string, any>) {
        return this.write("warn", message, context);
    },

    error(message: string, context?: Record<string, any>) {
        return this.write("error", message, context);
    },

    async getRecent(limit = 50) {
        const { LogRepository } = await import("@/lib/repositories/logs");
        return LogRepository.getRecent(limit);
    },
};
