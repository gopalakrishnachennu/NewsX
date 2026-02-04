type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, any>;
    error?: Error | unknown;
}

import { LogService, LogLevel as ServiceLogLevel } from "./services/logs";

class Logger {
    private formatError(error: unknown): string {
        if (error instanceof Error) {
            return error.stack || error.message;
        }
        return String(error);
    }

    private log(level: LogLevel, message: string, context?: Record<string, any>, error?: unknown) {
        // Fire and forget LogService
        // We match LogLevel types or cast if needed
        const serviceLevel = level as ServiceLogLevel;

        const contextWithErr = error ? { ...context, error: this.formatError(error) } : context;

        // This handles both Console (Vercel) and SQLite (Local)
        LogService.write(serviceLevel, message, contextWithErr).catch(e => {
            console.error("Logger failed to write to LogService", e);
        });
    }

    debug(message: string, context?: Record<string, any>) {
        this.log('debug', message, context);
    }

    info(message: string, context?: Record<string, any>) {
        this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, any>) {
        this.log('warn', message, context);
    }

    error(message: string, error?: unknown, context?: Record<string, any>) {
        this.log('error', message, context, error);
    }
}

export const logger = new Logger();
