/**
 * Advanced Logging System for Post Designer
 * 
 * Features:
 * - Multiple log levels (error, warn, info, debug)
 * - Automatic context capture (user, page, timestamp)
 * - Firestore persistence for admin review
 * - Console output for development
 * - Error stack trace capture
 * - Performance timing
 */

import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { db } from './firebase';

// Log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Log entry structure
export interface LogEntry {
    id?: string;
    level: LogLevel;
    message: string;
    context: string; // Component or function name
    details?: Record<string, unknown>;
    stackTrace?: string;
    userId?: string;
    userEmail?: string;
    url?: string;
    userAgent?: string;
    timestamp: Date | Timestamp;
    sessionId: string;
    environment: 'development' | 'production';
}

// Session ID for grouping logs from same session
const sessionId = typeof window !== 'undefined'
    ? `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
    : 'server';

// Environment detection
const isDev = process.env.NODE_ENV === 'development';
const environment = isDev ? 'development' : 'production';

// Log level colors for console
const levelColors: Record<LogLevel, string> = {
    error: '\x1b[31m', // Red
    warn: '\x1b[33m',  // Yellow
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[90m', // Gray
};
const resetColor = '\x1b[0m';

// User context (set after login)
let currentUser: { id: string; email: string } | null = null;

/**
 * Set the current user for log context
 */
export function setLogUser(userId: string, email: string): void {
    currentUser = { id: userId, email };
}

/**
 * Clear user context on logout
 */
export function clearLogUser(): void {
    currentUser = null;
}

/**
 * Get current page URL safely
 */
function getCurrentUrl(): string {
    if (typeof window !== 'undefined') {
        return window.location.href;
    }
    return 'server';
}

/**
 * Get user agent safely
 */
function getUserAgent(): string {
    if (typeof window !== 'undefined') {
        return navigator.userAgent;
    }
    return 'server';
}

/**
 * Format log for console output
 */
function formatConsoleLog(level: LogLevel, context: string, message: string, details?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const color = levelColors[level];
    const prefix = `${color}[${level.toUpperCase()}]${resetColor}`;

    console.log(`${prefix} ${timestamp} [${context}] ${message}`);

    if (details && Object.keys(details).length > 0) {
        console.log('  Details:', details);
    }
}

/**
 * Save log to Firestore
 */
async function saveToFirestore(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    try {
        const logsCollection = collection(db, 'logs');
        await addDoc(logsCollection, {
            ...entry,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        // Don't throw - we don't want logging to break the app
        console.error('Failed to save log to Firestore:', error);
    }
}

/**
 * Core logging function
 */
async function log(
    level: LogLevel,
    context: string,
    message: string,
    details?: Record<string, unknown>,
    error?: Error
): Promise<void> {
    // Create log entry
    const entry: Omit<LogEntry, 'timestamp'> = {
        level,
        message,
        context,
        details,
        stackTrace: error?.stack,
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        url: getCurrentUrl(),
        userAgent: getUserAgent(),
        sessionId,
        environment,
    };

    // Always log to console in development
    if (isDev) {
        formatConsoleLog(level, context, message, details);
        if (error) {
            console.error('  Stack:', error.stack);
        }
    }

    // Save to Firestore based on level
    // In production: save all errors and warnings
    // In development: save errors only (to avoid flooding)
    if (level === 'error' || (!isDev && level === 'warn')) {
        await saveToFirestore(entry);
    }

    // Always save errors to Firestore
    if (level === 'error') {
        await saveToFirestore(entry);
    }
}

/**
 * Logger object with methods for each level
 */
export const logger = {
    /**
     * Log an error - always saved to Firestore
     */
    error: (context: string, message: string, details?: Record<string, unknown>, error?: Error) => {
        return log('error', context, message, details, error);
    },

    /**
     * Log a warning - saved in production
     */
    warn: (context: string, message: string, details?: Record<string, unknown>) => {
        return log('warn', context, message, details);
    },

    /**
     * Log info - console only
     */
    info: (context: string, message: string, details?: Record<string, unknown>) => {
        return log('info', context, message, details);
    },

    /**
     * Log debug - console only in development
     */
    debug: (context: string, message: string, details?: Record<string, unknown>) => {
        if (isDev) {
            return log('debug', context, message, details);
        }
        return Promise.resolve();
    },

    /**
     * Log and capture an exception
     */
    exception: (context: string, error: Error, details?: Record<string, unknown>) => {
        return log('error', context, error.message, { ...details, name: error.name }, error);
    },

    /**
     * Performance timing helper
     */
    time: (context: string, label: string) => {
        const start = performance.now();
        return {
            end: (details?: Record<string, unknown>) => {
                const duration = performance.now() - start;
                log('info', context, `${label} completed in ${duration.toFixed(2)}ms`, {
                    ...details,
                    duration,
                });
                return duration;
            },
        };
    },

    /**
     * Create a scoped logger for a specific context
     */
    scope: (context: string) => ({
        error: (message: string, details?: Record<string, unknown>, error?: Error) =>
            logger.error(context, message, details, error),
        warn: (message: string, details?: Record<string, unknown>) =>
            logger.warn(context, message, details),
        info: (message: string, details?: Record<string, unknown>) =>
            logger.info(context, message, details),
        debug: (message: string, details?: Record<string, unknown>) =>
            logger.debug(context, message, details),
        exception: (error: Error, details?: Record<string, unknown>) =>
            logger.exception(context, error, details),
        time: (label: string) => logger.time(context, label),
    }),
};

// ============================================
// Log Query Functions (for Admin Dashboard)
// ============================================

export interface LogQuery {
    level?: LogLevel;
    context?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}

/**
 * Fetch logs from Firestore for admin review
 */
export async function fetchLogs(options: LogQuery = {}): Promise<LogEntry[]> {
    try {
        const logsRef = collection(db, 'logs');
        const constraints = [];

        // Add filters
        if (options.level) {
            constraints.push(where('level', '==', options.level));
        }
        if (options.userId) {
            constraints.push(where('userId', '==', options.userId));
        }

        // Order by timestamp descending (most recent first)
        constraints.push(orderBy('timestamp', 'desc'));

        // Limit results
        constraints.push(limit(options.limit || 100));

        const q = query(logsRef, ...constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as LogEntry[];
    } catch (error) {
        console.error('Failed to fetch logs:', error);
        return [];
    }
}

/**
 * Delete a specific log entry
 */
export async function deleteLogEntry(logId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'logs', logId));
    } catch (error) {
        console.error('Failed to delete log:', error);
    }
}

/**
 * Clear old logs (older than specified days)
 */
export async function clearOldLogs(daysOld: number = 30): Promise<number> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const logsRef = collection(db, 'logs');
        const q = query(
            logsRef,
            where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
            limit(500) // Process in batches
        );

        const snapshot = await getDocs(q);
        let deleted = 0;

        for (const docSnapshot of snapshot.docs) {
            await deleteDoc(docSnapshot.ref);
            deleted++;
        }

        return deleted;
    } catch (error) {
        console.error('Failed to clear old logs:', error);
        return 0;
    }
}

// ============================================
// Global Error Handlers
// ============================================

/**
 * Setup global error handlers for uncaught errors
 */
export function setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        logger.error('GlobalErrorHandler', 'Unhandled Promise Rejection', {
            reason: String(event.reason),
        });
    });

    // Catch uncaught exceptions
    window.addEventListener('error', (event) => {
        logger.error('GlobalErrorHandler', 'Uncaught Error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });
}

export default logger;
