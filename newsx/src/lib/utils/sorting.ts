/**
 * Robust Sorting Utility for Articles
 * Handles edge cases for date/time sorting
 */

export type SortOption = "latest" | "oldest" | "a-z" | "z-a" | "trending" | "quality";

export interface SortableArticle {
    title: string;
    publishedAt?: string | Date | null;
    createdAt?: string | Date | null;
    qualityScore?: number | null;
    readingTime?: number | null;
}

/**
 * Parse date with multiple fallback strategies
 * Returns timestamp in milliseconds, or 0 if unparseable
 */
export function parseArticleDate(article: SortableArticle): number {
    // Try publishedAt first, then createdAt as fallback
    const dateValue = article.publishedAt || article.createdAt;

    if (!dateValue) return 0;

    // Handle Date object
    if (dateValue instanceof Date) {
        const time = dateValue.getTime();
        return isNaN(time) ? 0 : time;
    }

    // Handle string date
    if (typeof dateValue === "string") {
        // Try direct parsing
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
            return parsed.getTime();
        }

        // Try common date formats
        const formats = [
            // ISO format: 2025-03-30T00:00:00Z
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
            // RFC 2822: Mon, 02 Feb 2026 08:08:54 +0530
            /^\w{3},\s+\d{1,2}\s+\w{3}\s+\d{4}/,
            // Short date: 2025-03-30
            /^(\d{4})-(\d{2})-(\d{2})$/,
        ];

        for (const format of formats) {
            if (format.test(dateValue)) {
                const parsed = new Date(dateValue);
                if (!isNaN(parsed.getTime())) {
                    return parsed.getTime();
                }
            }
        }

        // Try extracting YYYYMMDD from string
        const yyyymmddMatch = dateValue.match(/(\d{4})(\d{2})(\d{2})/);
        if (yyyymmddMatch) {
            const [, year, month, day] = yyyymmddMatch;
            const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
            if (!isNaN(date.getTime())) {
                return date.getTime();
            }
        }
    }

    return 0;
}

/**
 * Normalize title for comparison
 * Handles special characters, accents, and case
 */
export function normalizeTitle(title: string): string {
    if (!title) return "";

    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s]/g, "") // Remove special chars
        .trim();
}

/**
 * Sort articles with robust edge case handling
 */
export function sortArticles<T extends SortableArticle>(
    articles: T[],
    sortBy: SortOption
): T[] {
    // Create a copy to avoid mutating original
    const sorted = [...articles];

    switch (sortBy) {
        case "latest":
            sorted.sort((a, b) => {
                const dateA = parseArticleDate(a);
                const dateB = parseArticleDate(b);

                // If dates are equal, use title as tiebreaker
                if (dateB === dateA) {
                    return normalizeTitle(a.title).localeCompare(normalizeTitle(b.title));
                }

                // Articles with no date go to the end
                if (dateA === 0 && dateB !== 0) return 1;
                if (dateB === 0 && dateA !== 0) return -1;

                return dateB - dateA;
            });
            break;

        case "oldest":
            sorted.sort((a, b) => {
                const dateA = parseArticleDate(a);
                const dateB = parseArticleDate(b);

                // If dates are equal, use title as tiebreaker
                if (dateA === dateB) {
                    return normalizeTitle(a.title).localeCompare(normalizeTitle(b.title));
                }

                // Articles with no date go to the end
                if (dateA === 0 && dateB !== 0) return 1;
                if (dateB === 0 && dateA !== 0) return -1;

                return dateA - dateB;
            });
            break;

        case "a-z":
            sorted.sort((a, b) => {
                const titleA = normalizeTitle(a.title);
                const titleB = normalizeTitle(b.title);

                // Empty titles go to the end
                if (!titleA && titleB) return 1;
                if (titleA && !titleB) return -1;
                if (!titleA && !titleB) return 0;

                return titleA.localeCompare(titleB);
            });
            break;

        case "z-a":
            sorted.sort((a, b) => {
                const titleA = normalizeTitle(a.title);
                const titleB = normalizeTitle(b.title);

                // Empty titles go to the end
                if (!titleA && titleB) return 1;
                if (titleA && !titleB) return -1;
                if (!titleA && !titleB) return 0;

                return titleB.localeCompare(titleA);
            });
            break;

        case "quality":
            sorted.sort((a, b) => {
                const scoreA = a.qualityScore ?? 0;
                const scoreB = b.qualityScore ?? 0;

                // Higher quality first
                if (scoreB !== scoreA) {
                    return scoreB - scoreA;
                }

                // Use date as tiebreaker
                return parseArticleDate(b) - parseArticleDate(a);
            });
            break;

        case "trending":
            // Trending: prioritize recent high-quality articles
            sorted.sort((a, b) => {
                const now = Date.now();
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

                const dateA = parseArticleDate(a);
                const dateB = parseArticleDate(b);

                // Calculate recency score (0-1, higher = more recent)
                const recencyA = dateA > 0 ? Math.max(0, 1 - (now - dateA) / maxAge) : 0;
                const recencyB = dateB > 0 ? Math.max(0, 1 - (now - dateB) / maxAge) : 0;

                // Calculate quality score (0-1)
                const qualityA = (a.qualityScore ?? 50) / 100;
                const qualityB = (b.qualityScore ?? 50) / 100;

                // Combined score: 60% recency, 40% quality
                const scoreA = (recencyA * 0.6) + (qualityA * 0.4);
                const scoreB = (recencyB * 0.6) + (qualityB * 0.4);

                return scoreB - scoreA;
            });
            break;
    }

    return sorted;
}

/**
 * Group articles by date for easy display
 */
export function groupArticlesByDate<T extends SortableArticle>(
    articles: T[]
): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const article of articles) {
        const timestamp = parseArticleDate(article);
        let groupKey: string;

        if (timestamp === 0) {
            groupKey = "Unknown Date";
        } else {
            const date = new Date(timestamp);
            const articleDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            if (articleDate.getTime() === today.getTime()) {
                groupKey = "Today";
            } else if (articleDate.getTime() === yesterday.getTime()) {
                groupKey = "Yesterday";
            } else if (articleDate >= thisWeek) {
                groupKey = "This Week";
            } else {
                // Format as "Month Year"
                groupKey = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            }
        }

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(article);
    }

    return groups;
}
