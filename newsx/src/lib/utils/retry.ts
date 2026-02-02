/**
 * Smart Retry Utility
 * Implements exponential backoff with Retry-After header support
 */

export interface RetryOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// Non-retryable status codes
const NON_RETRYABLE = new Set([400, 401, 403, 404, 405, 410, 422]);

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff + jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    return Math.min(exponentialDelay + jitter, options.maxDelayMs);
}

/**
 * Parse Retry-After header
 * Supports both seconds and HTTP-date format
 */
function parseRetryAfter(header: string | null): number | null {
    if (!header) return null;

    // Try parsing as seconds
    const seconds = parseInt(header, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000;
    }

    // Try parsing as HTTP-date
    const date = new Date(header);
    if (!isNaN(date.getTime())) {
        const delayMs = date.getTime() - Date.now();
        return delayMs > 0 ? delayMs : null;
    }

    return null;
}

export interface FetchWithRetryResult {
    response: Response | null;
    error: Error | null;
    attempts: number;
    totalTimeMs: number;
}

/**
 * Fetch with smart retry logic
 * - Exponential backoff
 * - Respects Retry-After header
 * - Skips non-retryable errors (404, 403, etc.)
 */
export async function fetchWithRetry(
    url: string,
    options?: RequestInit,
    retryOptions?: RetryOptions
): Promise<FetchWithRetryResult> {
    const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        attempts = attempt + 1;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Success
            if (response.ok) {
                return {
                    response,
                    error: null,
                    attempts,
                    totalTimeMs: Date.now() - startTime,
                };
            }

            // Non-retryable error
            if (NON_RETRYABLE.has(response.status)) {
                return {
                    response,
                    error: new Error(`Non-retryable status: ${response.status}`),
                    attempts,
                    totalTimeMs: Date.now() - startTime,
                };
            }

            // Retryable error - check Retry-After header
            if (opts.retryableStatuses.includes(response.status)) {
                if (attempt < opts.maxRetries) {
                    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
                    const delay = retryAfter ?? calculateDelay(attempt, opts);
                    await sleep(Math.min(delay, opts.maxDelayMs));
                    continue;
                }
            }

            // Other error - return as-is
            return {
                response,
                error: new Error(`HTTP error: ${response.status}`),
                attempts,
                totalTimeMs: Date.now() - startTime,
            };

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Network error - retry with backoff
            if (attempt < opts.maxRetries) {
                const delay = calculateDelay(attempt, opts);
                await sleep(delay);
            }
        }
    }

    return {
        response: null,
        error: lastError ?? new Error("Max retries exceeded"),
        attempts,
        totalTimeMs: Date.now() - startTime,
    };
}
