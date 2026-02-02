/**
 * URL Normalization Utilities
 * Ensures consistent URL storage for valid deduplication
 */

export function normalizeUrl(url: string): string {
    if (!url) return "";

    try {
        const parsed = new URL(url.trim());

        // 1. Remove tracking parameters
        const paramsToRemove = [
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "fbclid", "gclid", "ref", "source"
        ];

        paramsToRemove.forEach(param => parsed.searchParams.delete(param));

        // 2. Remove hash (unless specifically needed, distinct for some SPAs but usually valid to strip for news)
        parsed.hash = "";

        // 3. Normalize protocol (prefer https)
        if (parsed.protocol === "http:") {
            parsed.protocol = "https:";
        }

        // 4. Remove trailing slash
        let normalized = parsed.toString();
        if (normalized.endsWith("/") && normalized.length > 1) {
            normalized = normalized.slice(0, -1);
        }

        return normalized;
    } catch {
        // Return original if parsing fails (fallback)
        return url.trim();
    }
}
