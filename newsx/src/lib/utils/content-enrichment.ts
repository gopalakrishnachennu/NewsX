/**
 * Content Enrichment Utilities
 * Provides reading time estimation, summary generation, and keyword extraction
 */

// Common English stopwords to filter out
const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
    "used", "it", "its", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "what", "which", "who", "whom", "whose", "where",
    "when", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "also", "now", "here",
    "there", "then", "once", "if", "up", "out", "about", "into", "over",
    "after", "before", "between", "under", "again", "further", "while",
    "during", "through", "above", "below", "any", "said", "says", "will",
    "new", "one", "two", "first", "last", "many", "much", "get", "got",
    "make", "made", "even", "still", "since", "back", "going", "know",
    "time", "year", "years", "day", "days", "today", "week", "month",
]);

/**
 * Average reading speed in words per minute
 */
const WORDS_PER_MINUTE = 200;

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(content: string): number {
    if (!content) return 1;

    // Strip HTML tags
    const text = content.replace(/<[^>]*>/g, " ");

    // Count words (split by whitespace)
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;

    // Calculate minutes, minimum 1 minute
    const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
    return Math.max(1, minutes);
}

/**
 * Generate a summary from content or description
 * Takes first 2 sentences or truncates at ~200 characters
 */
export function generateSummary(content: string, description?: string): string {
    // Prefer description if available and non-empty
    const source = (description && description.trim().length > 20)
        ? description
        : content;

    if (!source) return "";

    // Strip HTML tags
    const text = source.replace(/<[^>]*>/g, " ").trim();

    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);

    // Take first 2 sentences
    const summary = sentences.slice(0, 2).join(" ").trim();

    // Truncate if too long
    if (summary.length > 300) {
        return summary.substring(0, 297) + "...";
    }

    return summary;
}

/**
 * Extract top keywords from content
 * Filters stopwords and returns most frequent meaningful words
 */
export function extractKeywords(content: string, maxKeywords: number = 5): string[] {
    if (!content) return [];

    // Strip HTML and normalize
    const text = content
        .replace(/<[^>]*>/g, " ")
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ");

    // Split into words
    const words = text.split(/\s+/).filter((w) => w.length > 3);

    // Count word frequencies (excluding stopwords)
    const frequencies: Map<string, number> = new Map();
    for (const word of words) {
        if (!STOPWORDS.has(word)) {
            frequencies.set(word, (frequencies.get(word) || 0) + 1);
        }
    }

    // Sort by frequency and take top N
    const sorted = Array.from(frequencies.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxKeywords)
        .map(([word]) => word);

    return sorted;
}

/**
 * Parse relative dates like "2 hours ago", "yesterday"
 */
export function parseRelativeDate(text: string): Date | undefined {
    if (!text) return undefined;

    const now = new Date();
    const lower = text.toLowerCase().trim();

    // "X minutes ago"
    const minutesMatch = lower.match(/(\d+)\s*(?:minute|min)s?\s*ago/);
    if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1], 10);
        return new Date(now.getTime() - minutes * 60 * 1000);
    }

    // "X hours ago"
    const hoursMatch = lower.match(/(\d+)\s*hours?\s*ago/);
    if (hoursMatch) {
        const hours = parseInt(hoursMatch[1], 10);
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }

    // "X days ago"
    const daysMatch = lower.match(/(\d+)\s*days?\s*ago/);
    if (daysMatch) {
        const days = parseInt(daysMatch[1], 10);
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // "yesterday"
    if (lower.includes("yesterday")) {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // "today"
    if (lower.includes("today")) {
        return now;
    }

    // "X weeks ago"
    const weeksMatch = lower.match(/(\d+)\s*weeks?\s*ago/);
    if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1], 10);
        return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    }

    // "X months ago"
    const monthsMatch = lower.match(/(\d+)\s*months?\s*ago/);
    if (monthsMatch) {
        const months = parseInt(monthsMatch[1], 10);
        const date = new Date(now);
        date.setMonth(date.getMonth() - months);
        return date;
    }

    return undefined;
}

/**
 * Parse Unix timestamp from string (seconds or milliseconds)
 */
export function parseUnixTimestamp(value: string | number): Date | undefined {
    const num = typeof value === "string" ? parseInt(value, 10) : value;
    if (isNaN(num)) return undefined;

    // Determine if seconds or milliseconds
    // Timestamps before year 2001 in ms would be > 978307200000
    // Timestamps after year 2001 in seconds would be < 978307200
    const isMilliseconds = num > 1000000000000;
    const ms = isMilliseconds ? num : num * 1000;

    const date = new Date(ms);

    // Validate reasonable date range (2000-2100)
    const year = date.getFullYear();
    if (year < 2000 || year > 2100) return undefined;

    return date;
}

/**
 * Extract Unix timestamp from URL patterns like:
 * - /1706803200/ (seconds)
 * - /t/1706803200000 (milliseconds)
 */
export function extractUnixTimestampFromUrl(url: string): Date | undefined {
    // Look for 10-digit (seconds) or 13-digit (milliseconds) numbers
    const match = url.match(/\/(\d{10,13})(?:\/|$|\?)/);
    if (match) {
        return parseUnixTimestamp(match[1]);
    }
    return undefined;
}

/**
 * Detect "Viral" intent based on Indian social media keywords
 */
const VIRAL_KEYWORDS = [
    "netizens", "viral video", "twitter erupts", "internet reacts",
    "twitter reacts", "video goes viral", "shocking video",
    "breaks internet", "trolls", "memes", "instagram reel",
    "caught on cam", "caught on camera", "watch:",
    "trending now", "social media", "users react"
];

export function detectViralIntent(title: string, summary: string): boolean {
    const text = (title + " " + summary).toLowerCase();

    // 1. Check Keywords
    const hasViralKeyword = VIRAL_KEYWORDS.some(keyword => text.includes(keyword));

    // 2. Additional heuristics can go here (e.g. strict source check if passed)

    return hasViralKeyword;
}

/**
 * All-in-one content enrichment
 */
export interface EnrichedContent {
    readingTime: number;
    summary: string;
    keywords: string[];
    category?: string;
}

export function enrichContent(content: string, description?: string, title: string = ""): EnrichedContent {
    const summary = generateSummary(content, description);
    const isViral = detectViralIntent(title, summary);

    return {
        readingTime: estimateReadingTime(content),
        summary: summary,
        keywords: extractKeywords(content, 5),
        category: isViral ? 'viral' : undefined
    };
}
