type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, any>;
    error?: Error | unknown;
}

class Logger {
    private formatError(error: unknown): string {
        if (error instanceof Error) {
            return error.stack || error.message;
        }
        return String(error);
    }

    private log(level: LogLevel, message: string, context?: Record<string, any>, error?: unknown) {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
        };

        if (error) {
            entry.error = this.formatError(error);
        }

        // In local dev, we might want pretty printing, but for "advanced system" we stick to JSON
        // or use a conditional. For this user request, robust JSON is best.
        if (process.env.NODE_ENV === 'development') {
            // Pretty print for readability in console during dev
            const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[32m';
            console.log(`${color}[${level.toUpperCase()}] \x1b[0m ${message}`, context || '', error || '');
        } else {
            // Production JSON format
            console.log(JSON.stringify(entry));
        }
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
