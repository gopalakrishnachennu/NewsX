import { dbAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    timestamp: Date;
}

const COLLECTION = "logs";

export const LogService = {
    async write(level: LogLevel, message: string, context?: Record<string, any>) {
        try {
            const db = dbAdmin();
            await db.collection(COLLECTION).add({
                level,
                message,
                context: context || {},
                timestamp: FieldValue.serverTimestamp(),
            });
        } catch (error) {
            // Fallback to console if Firestore fails
            console.error("Failed to write log to Firestore", error);
            console.log(JSON.stringify({ level, message, context }));
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
        const db = dbAdmin();
        const snapshot = await db
            .collection(COLLECTION)
            .orderBy("timestamp", "desc")
            .limit(limit)
            .get();

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    },
};
