import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import type { ArticleLifecycle, Feed, FeedHealth } from "@/types";
import { logger } from "@/lib/logger";
import { fetchWithRetry } from "@/lib/utils/retry";
import { parseRelativeDate, extractUnixTimestampFromUrl } from "@/lib/utils/content-enrichment";

// Health monitoring constants
const MAX_CONSECUTIVE_FAILURES = 5;
const AUTO_DISABLE_THRESHOLD = 5;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FEEDS = "feeds";
const ARTICLES = "articles";

type ParsedItem = {
    title: string;
    url: string;
    publishedAt?: Date;
    summary?: string;
    image?: string;
    guid?: string;
};

function toArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

/**
 * Extract date from URL patterns like:
 * - /20250330/ or /en/20250330/
 * - /2025/03/30/
 * - /2025-03-30/
 */
function extractDateFromUrl(url: string): Date | undefined {
    // Pattern 1: YYYYMMDD in path (e.g., /20250330/)
    const yyyymmddMatch = url.match(/\/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\//);
    if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch;
        const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
        if (!isNaN(date.getTime())) return date;
    }

    // Pattern 2: YYYY/MM/DD in path
    const slashMatch = url.match(/\/(\d{4})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\//);
    if (slashMatch) {
        const [, year, month, day] = slashMatch;
        const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
        if (!isNaN(date.getTime())) return date;
    }

    // Pattern 3: YYYY-MM-DD in path
    const dashMatch = url.match(/\/(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\//);
    if (dashMatch) {
        const [, year, month, day] = dashMatch;
        const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
        if (!isNaN(date.getTime())) return date;
    }

    return undefined;
}

/**
 * Extract date from GUID patterns like:
 * - wspg20250330142as -> 2025-03-30
 */
function extractDateFromGuid(guid: string | undefined): Date | undefined {
    if (!guid) return undefined;

    // Pattern: any prefix followed by YYYYMMDD
    const match = guid.match(/(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
    if (match) {
        const [, year, month, day] = match;
        const yearNum = parseInt(year);
        // Validate year is reasonable (2000-2100)
        if (yearNum >= 2000 && yearNum <= 2100) {
            const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
            if (!isNaN(date.getTime())) return date;
        }
    }

    return undefined;
}

/**
 * Smart date parser that tries multiple sources:
 * 1. Standard RSS date fields (pubDate, published, dc:date, etc.)
 * 2. URL patterns (/YYYYMMDD/, /YYYY/MM/DD/)
 * 3. GUID patterns with embedded dates
 */
function parseRssDate(item: any): Date | undefined {
    // Try 1: Standard RSS date fields
    const dateFields = [
        item.pubDate,
        item.published,
        item['dc:date'],
        item.date,
        item.updated,
    ];

    for (const rawValue of dateFields) {
        if (rawValue) {
            try {
                let dateStr = String(rawValue).trim();

                // Check if date string has timezone info
                // Regex checks for: Z, +00:00, -0000, GMT, UTC, IST at the end
                const hasTimezone = /Z$|[+\-]\d{2}:?\d{2}$|[A-Z]{3,5}$/i.test(dateStr);

                // If strictly numeric ISO (YYYY-MM-DDTHH:mm:ss), it often has no TZ.
                // But we mainly care about RFC822 (Mon, 02 Feb 2026 15:30:00)

                if (!hasTimezone) {
                    // Assume Indian Standard Time (IST) for NewsX context
                    // This fixes "Mon, 02 Feb 20:30:00" being treated as UTC (which shifts to Next Day IST)
                    dateStr += " +0530";
                }

                const parsed = new Date(dateStr);

                // Validate date: 
                // 1. Not Invalid
                // 2. Not more than 1 hour in the future (Clock skew/Bad publisher)
                // 3. Not older than 20 years (sanity)
                const now = Date.now();
                if (!isNaN(parsed.getTime()) &&
                    parsed.getTime() < now + 60 * 60 * 1000 &&
                    parsed.getTime() > now - 20 * 365 * 24 * 60 * 60 * 1000) {
                    return parsed;
                }
            } catch {
                continue;
            }
        }
    }

    // Try 2: Extract date from URL (YYYYMMDD pattern)
    const url = String(item.link?.["#text"] || item.link || "").trim();
    const urlDate = extractDateFromUrl(url);
    if (urlDate && urlDate.getTime() < Date.now() + 86400000) {
        return urlDate;
    }

    // Try 3: Extract Unix timestamp from URL
    const unixDate = extractUnixTimestampFromUrl(url);
    if (unixDate && unixDate.getTime() < Date.now() + 86400000) {
        return unixDate;
    }

    // Try 4: Extract date from GUID
    const guid = item.guid?.["#text"] || item.guid || item.id;
    const guidDate = extractDateFromGuid(String(guid || ""));
    if (guidDate && guidDate.getTime() < Date.now() + 86400000) {
        return guidDate;
    }

    // Try 5: Parse relative dates from description if present
    const description = String(item.description || "").trim();
    if (description) {
        const relativeDate = parseRelativeDate(description.substring(0, 100));
        if (relativeDate && relativeDate.getTime() < Date.now() + 86400000) {
            return relativeDate;
        }
    }

    return undefined;
}

function extractItems(xmlText: string): ParsedItem[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        removeNSPrefix: false // Keep namespace prefixes to distinguish content:encoded vs description
    });
    const data = parser.parse(xmlText);

    // Helpers to extract complex fields
    const getSummary = (item: any) => {
        const encoded = item["content:encoded"] || item["content"];
        const desc = item.description || item.summary;
        // Prefer robust content, clean up CDATA if needed (parser handles CDATA usually)
        let text = typeof encoded === 'string' ? encoded : (typeof desc === 'string' ? desc : "");
        // Strip HTML tags for summary (simple regex)
        return text.replace(/<[^>]*>?/gm, "").substring(0, 300).trim();
    };

    const getImage = (item: any) => {
        // 1. Check media:content
        const media = item["media:content"] || item["media:group"]?.["media:content"];
        if (media) {
            const m = Array.isArray(media) ? media[0] : media;
            if (m?.["@_url"]) return m["@_url"];
        }

        // 2. Check enclosure
        if (item.enclosure) {
            const enc = Array.isArray(item.enclosure) ? item.enclosure[0] : item.enclosure;
            if (enc?.["@_type"]?.startsWith("image") && enc?.["@_url"]) return enc["@_url"];
        }

        // 3. Check simple image tag
        if (typeof item.image === "string") return item.image;
        if (item.image?.url) return item.image.url;

        // 4. Try parsing from description HTML
        const desc = item.description || item["content:encoded"];
        if (typeof desc === "string") {
            const match = desc.match(/src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|webp|gif))["']/i);
            if (match) return match[1];
        }

        return "";
    };

    if (data?.rss?.channel?.item) {
        return toArray<any>(data.rss.channel.item)
            .map((item) => ({
                title: String(item.title || "").trim(),
                url: String(item.link?.["#text"] || item.link || "").trim(),
                publishedAt: parseRssDate(item),
                summary: getSummary(item),
                image: getImage(item),
                guid: String(item.guid?.["#text"] || item.guid || item.id || "").trim()
            }))
            .filter((item) => item.url);
    }

    if (data?.feed?.entry) {
        return toArray<any>(data.feed.entry)
            .map((entry) => {
                const links = toArray<any>(entry.link);
                const href = links.find((l) => l?.["@_rel"] !== "self")?.["@_href"] || links[0]?.["@_href"];
                return {
                    title: String(entry.title?.["#text"] || entry.title || "").trim(),
                    url: String(href || "").trim(),
                    publishedAt: parseRssDate(entry),
                    summary: getSummary(entry),
                    image: getImage(entry)
                };
            })
            .filter((item) => item.url);
    }

    // Sitemap support (usually no images/summary)
    if (data?.urlset?.url) {
        return toArray<any>(data.urlset.url)
            .map((entry) => ({
                title: "",
                url: String(entry.loc || "").trim(),
                publishedAt: entry.lastmod ? new Date(entry.lastmod) : extractDateFromUrl(String(entry.loc || "")),
                summary: "",
                image: ""
            }))
            .filter((item) => item.url);
    }

    return [];
}

function hashUrl(url: string) {
    return crypto.createHash("sha1").update(url).digest("hex");
}

function isValidUrl(url: string) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

// ... imports
import { normalizeUrl } from "@/lib/utils/normalization";

// ... existing code ...

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        logger.error("Sweep missing feed id", undefined, {});
        return NextResponse.json({ ok: false, error: "Missing feed id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    try {
        const db = dbAdmin();
        const feedRef = db.collection(FEEDS).doc(id);
        const feedSnap = await feedRef.get();

        if (!feedSnap.exists) {
            return NextResponse.json({ ok: false, error: "Feed not found" }, { status: 404 });
        }

        const feed = feedSnap.data() as Feed;

        // FETCH INTERVAL CHECK
        // If not forced, check if we need to fetch
        const fetchIntervalMinutes = feed.fetchIntervalMinutes || 30; // Default 30m
        const lastFetchedAt = feed.lastFetchedAt?.toMillis() || 0;
        const timeSinceLastFetch = Date.now() - lastFetchedAt;
        const intervalMs = fetchIntervalMinutes * 60 * 1000;

        if (!force && timeSinceLastFetch < intervalMs) {
            // Skip fetch
            return NextResponse.json({
                ok: true,
                skipped: true,
                message: `Skipped: Interval ${fetchIntervalMinutes}m not passed. Next fetch in ${Math.round((intervalMs - timeSinceLastFetch) / 60000)}m.`
            });
        }

        if (feed.health?.status === "disabled") {
            // ... existing disabled check ...
            // (Keep existing disabled logic)
            logger.warn("Sweep skipped - feed disabled", { feedId: id, consecutiveFailures: feed.health.consecutiveFailures });
            return NextResponse.json({
                ok: false,
                error: `Feed is disabled. Re-enable manually.`,
                disabled: true
            }, { status: 422 });
        }

        logger.info("Sweep start", { feedId: id, url: feed?.url });

        // ... fetch logic (Keep existing fetchWithRetry) ...
        // ... fetch logic (Keep existing fetchWithRetry) ...
        const headers: Record<string, string> = {
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "accept": "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        };

        // Level 3: Protocol Caching (Conditional GET)
        if (!force && feed.lastETag) headers["If-None-Match"] = feed.lastETag;
        if (!force && feed.lastModified) headers["If-Modified-Since"] = feed.lastModified;

        const { response, error, attempts, totalTimeMs } = await fetchWithRetry(feed.url, {
            redirect: "follow",
            headers,
            cache: "no-store",
        });

        if (error) {
            throw new Error(`Feed fetch failed: ${error.message}`);
        }

        if (!response) {
            throw new Error("Feed fetch failed: No response"); // Should not happen with fetchWithRetry
        }

        // Handle 304 Not Modified
        if (response.status === 304) {
            logger.info("Sweep skipped - 304 Not Modified", { feedId: id });
            await feedRef.update({
                lastFetchedAt: FieldValue.serverTimestamp(),
                "health.lastSuccess": FieldValue.serverTimestamp(),
                "health.status": "healthy",
                "health.consecutiveFailures": 0,
            });
            return NextResponse.json({
                ok: true,
                skipped: true,
                message: "Skipped: 304 Not Modified (Protocol Cache)",
                nextFetchInMinutes: fetchIntervalMinutes
            });
        }

        if (!response.ok) {
            throw new Error(`Feed fetch failed: HTTP ${response.status}`);
        }

        const xmlText = await response.text();

        // Level 2: Content Hashing (Skip if content identical)
        const currentHash = crypto.createHash("sha256").update(xmlText).digest("hex");
        if (!force && feed.lastContentHash === currentHash) {
            logger.info("Sweep skipped - Content Hash Match", { feedId: id });
            await feedRef.update({
                lastFetchedAt: FieldValue.serverTimestamp(),
                "health.lastSuccess": FieldValue.serverTimestamp(),
                "health.status": "healthy",
                "health.consecutiveFailures": 0,
                // Update headers if changed even if body didn't (rare but good hygiene)
                ...(response.headers.get("etag") && { lastETag: response.headers.get("etag") }),
                ...(response.headers.get("last-modified") && { lastModified: response.headers.get("last-modified") }),
            });
            return NextResponse.json({
                ok: true,
                skipped: true,
                message: "Skipped: Content Unchanged (Hash Match)",
                nextFetchInMinutes: fetchIntervalMinutes
            });
        }

        const items = extractItems(xmlText);

        // DEDUPLICATION & PROCESSING
        const batch = db.batch();
        let created = 0;
        let updated = 0;
        let skippedCount = 0;

        // Level 1: Smart Date Filtering
        // We track the NEWEST article date we have ever seen for this feed.
        // We can safely ignore any itemOLDER than this date.
        // NOTE: We add a small buffer (e.g., 1 min) to handle second-precision mismatches or updates.
        // But for strict "New Items Only", > is correct.
        let maxPublishedAt = feed.lastSeenArticleDate?.toMillis() || 0;

        // If we are forcing, we might want to re-process old items. 
        // If not forcing, strict filter.
        const dateThreshold = force ? 0 : maxPublishedAt;

        for (const item of items) {
            if (!item.url) continue;

            const normalizedUrl = normalizeUrl(item.url);

            // Check Date (Level 1 Filter)
            let publishedAt = item.publishedAt;
            if (!publishedAt) publishedAt = new Date();

            // Skip if older than what we've seen (Optimization: Avoid DB Read)
            if (publishedAt.getTime() <= dateThreshold) {
                // If it's the exact same time, it might be the same article.
                // If strictly older, definitely skip.
                // We'll skip <= to be aggressive on quota.
                skippedCount++;
                continue;
            }

            if (publishedAt.getTime() > maxPublishedAt) {
                maxPublishedAt = publishedAt.getTime();
            }

            const articleId = hashUrl(normalizedUrl);
            const articleRef = db.collection(ARTICLES).doc(articleId);

            // NOW we read (only for fresh items)
            const docSnap = await articleRef.get();

            const isNew = !docSnap.exists;
            const existing = isNew ? null : docSnap.data();

            // Check if we should update
            if (!isNew && existing) {
                // ... (Existing update logic)
                if (!force && existing.title === item.title) {
                    skippedCount++;
                    continue;
                }

                batch.update(articleRef, {
                    title: item.title,
                    updatedAt: FieldValue.serverTimestamp(),
                    ...(item.summary && !existing.summary && { summary: item.summary }),
                    ...(item.image && !existing.image && { image: item.image }),
                    ...(force && { publishedAt: Timestamp.fromDate(publishedAt) }),
                });
                updated++;
            } else {
                // INSERT NEW
                batch.set(articleRef, {
                    title: item.title,
                    url: normalizedUrl, // Store normalized
                    originalUrl: item.url,
                    sourceId: feed.sourceId,
                    summary: item.summary || null,
                    image: item.image || null,
                    content: "",
                    lifecycle: "queued",
                    qualityScore: 0,
                    lang: "en",
                    guid: item.guid || null,
                    publishedAt: Timestamp.fromDate(publishedAt),
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                created++;
            }
        }

        if (created > 0 || updated > 0) {
            await batch.commit();
        }

        // UPDATE FEED METADATA
        await feedRef.update({
            lastFetchedAt: FieldValue.serverTimestamp(),
            lastSeenArticleDate: Timestamp.fromMillis(maxPublishedAt),
            lastContentHash: currentHash, // Store new hash
            lastETag: response.headers.get("etag") || null,
            lastModified: response.headers.get("last-modified") || null,
            "health.lastSuccess": FieldValue.serverTimestamp(),
            "health.status": "healthy",
            "health.consecutiveFailures": 0,
            "health.errorCount24h": 0,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            ok: true,
            created,
            updated,
            skipped: items.length - (created + updated), // approximate
            total: items.length,
            nextFetchInMinutes: fetchIntervalMinutes
        });

    } catch (error: any) {
        // ... Error handling (Keep existing robust error handling)
        console.error("Sweep failed", error);
        // ... (Return error response)
        const message = error?.message || "unknown error";
        return NextResponse.json({ ok: false, error: `Sweep failed: ${message}` }, { status: 500 });
    }
}

