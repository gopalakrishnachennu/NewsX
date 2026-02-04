import { NextResponse } from "next/server";
import { FeedRepository } from "@/lib/repositories/feeds";
import { ArticleRepository } from "@/lib/repositories/articles";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import type { Feed } from "@/types";
import { logger } from "@/lib/logger";
import { fetchWithRetry } from "@/lib/utils/retry";
import { parseRelativeDate, extractUnixTimestampFromUrl } from "@/lib/utils/content-enrichment";

// Health monitoring constants
const AUTO_DISABLE_THRESHOLD = 5;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const parseCustomDate = (raw: string): Date | undefined => {
        const value = raw.trim();

        // Example: "Tuesday, February 03, 2026, 23:24 GMT +5:30"
        // Example: "Tue, February 03, 2026, 11:24 PM IST"
        const longMonth = value.match(
            /^(?:\w{3,9},?\s+)?([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:GMT|UTC|IST)?\s*([+\-]\d{1,2}:?\d{2})?$/i
        );
        if (longMonth) {
            const [, mon, day, year, hh, mm, ss, ampm, tz] = longMonth;
            const monthMap: Record<string, number> = {
                jan: 1, january: 1,
                feb: 2, february: 2,
                mar: 3, march: 3,
                apr: 4, april: 4,
                may: 5,
                jun: 6, june: 6,
                jul: 7, july: 7,
                aug: 8, august: 8,
                sep: 9, sept: 9, september: 9,
                oct: 10, october: 10,
                nov: 11, november: 11,
                dec: 12, december: 12,
            };
            const monthNum = monthMap[mon.toLowerCase()];
            if (!monthNum) return undefined;

            let hour = parseInt(hh, 10);
            if (ampm) {
                const upper = ampm.toUpperCase();
                if (upper === "PM" && hour < 12) hour += 12;
                if (upper === "AM" && hour === 12) hour = 0;
            }

            const second = ss ? parseInt(ss, 10) : 0;
            let offset = tz;

            if (!offset) {
                // If no offset, assume IST
                offset = "+05:30";
            } else if (/^[+\-]\d{2}$/.test(offset)) {
                offset = `${offset}:00`;
            } else if (/^[+\-]\d{4}$/.test(offset)) {
                offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
            }

            const iso = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(second).padStart(2, "0")}${offset}`;
            const parsed = new Date(iso);
            return isNaN(parsed.getTime()) ? undefined : parsed;
        }

        return undefined;
    };

    let parsedFromRss: Date | undefined;

    for (const rawValue of dateFields) {
        if (rawValue) {
            try {
                let dateStr = String(rawValue).trim();

                const customParsed = parseCustomDate(dateStr);
                if (customParsed) {
                    parsedFromRss = customParsed;
                    break;
                }

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

                // Debug log for date parsing (only if needed, or verbose)
                // console.log(`Parsed RSS Date: ${dateStr} -> ${parsed.toISOString()}`);

                // Validate date: 
                // 1. Not Invalid
                // 2. Not more than 24 hours in the future (Relaxed from 1h to handle TZ messes)
                // 3. Not older than 20 years (sanity)
                const now = Date.now();
                if (!isNaN(parsed.getTime()) &&
                    parsed.getTime() < now + 24 * 60 * 60 * 1000 &&
                    parsed.getTime() > now - 20 * 365 * 24 * 60 * 60 * 1000) {
                    parsedFromRss = parsed;
                    break;
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
        if (!parsedFromRss) return urlDate;

        // If RSS date differs significantly from URL date, prefer URL date with RSS time-of-day
        const diffMs = Math.abs(parsedFromRss.getTime() - urlDate.getTime());
        if (diffMs > 12 * 60 * 60 * 1000) {
            const merged = new Date(Date.UTC(
                urlDate.getUTCFullYear(),
                urlDate.getUTCMonth(),
                urlDate.getUTCDate(),
                parsedFromRss.getUTCHours(),
                parsedFromRss.getUTCMinutes(),
                parsedFromRss.getUTCSeconds()
            ));
            return merged;
        }
    }

    // Try 3: Extract Unix timestamp from URL
    const unixDate = extractUnixTimestampFromUrl(url);
    if (unixDate && unixDate.getTime() < Date.now() + 86400000) {
        return parsedFromRss || unixDate;
    }

    // Try 4: Extract date from GUID
    const guid = item.guid?.["#text"] || item.guid || item.id;
    const guidDate = extractDateFromGuid(String(guid || ""));
    if (guidDate && guidDate.getTime() < Date.now() + 86400000) {
        return parsedFromRss || guidDate;
    }

    // Try 5: Parse relative dates from description if present
    const description = String(item.description || "").trim();
    if (description) {
        const relativeDate = parseRelativeDate(description.substring(0, 100));
        if (relativeDate && relativeDate.getTime() < Date.now() + 86400000) {
            return parsedFromRss || relativeDate;
        }
    }

    return parsedFromRss;
}

function resolvePublishedAt(item: any, sourceId: string | undefined): Date | undefined {
    const url = String(item.link?.["#text"] || item.link || "").trim();
    const urlDate = extractDateFromUrl(url);
    const rssDate = parseRssDate(item);

    // Per-feed overrides: Zee / Mid-Day often have inconsistent RSS dates.
    const source = (sourceId || "").toLowerCase();
    const preferUrlDateSources = new Set(["zee", "zeenews", "mid-day", "midday"]);

    if (preferUrlDateSources.has(source) && urlDate) {
        if (rssDate) {
            // Merge URL date with RSS time-of-day when available
            return new Date(Date.UTC(
                urlDate.getUTCFullYear(),
                urlDate.getUTCMonth(),
                urlDate.getUTCDate(),
                rssDate.getUTCHours(),
                rssDate.getUTCMinutes(),
                rssDate.getUTCSeconds()
            ));
        }
        return urlDate;
    }

    // Default fallback priority
    return rssDate || urlDate || undefined;
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

    let feed: Feed | null = null;

    try {
        feed = await FeedRepository.getById(id);
        if (!feed) {
            return NextResponse.json({ ok: false, error: "Feed not found" }, { status: 404 });
        }
        const recentHashes = new Set(feed.recentHashes || []);
        const processedHashes: string[] = [];

        // FETCH INTERVAL CHECK
        // If not forced, check if we need to fetch
        const fetchIntervalMinutes = feed.fetchIntervalMinutes || 30; // Default 30m
        const lastFetchedAt = feed.lastFetchedAt ? new Date(feed.lastFetchedAt as any).getTime() : 0;
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
            const now = new Date();
            await FeedRepository.upsert({
                ...feed,
                lastFetchedAt: now,
                health: {
                    ...feed.health,
                    status: "healthy",
                    lastSuccess: now,
                    lastCheck: now,
                    consecutiveFailures: 0,
                },
                updatedAt: now,
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
            const now = new Date();
            await FeedRepository.upsert({
                ...feed,
                lastFetchedAt: now,
                lastETag: response.headers.get("etag") || feed.lastETag,
                lastModified: response.headers.get("last-modified") || feed.lastModified,
                health: {
                    ...feed.health,
                    status: "healthy",
                    lastSuccess: now,
                    lastCheck: now,
                    consecutiveFailures: 0,
                },
                updatedAt: now,
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
        let created = 0;
        let updated = 0;
        let skippedCount = 0;

        // Level 1: Smart Date Filtering
        // We track the NEWEST article date we have ever seen for this feed.
        // We can safely ignore any itemOLDER than this date.
        // NOTE: We add a small buffer (e.g., 1 min) to handle second-precision mismatches or updates.
        // But for strict "New Items Only", > is correct.
        let maxPublishedAt = feed.lastSeenArticleDate ? new Date(feed.lastSeenArticleDate as any).getTime() : 0;

        // If we are forcing, we might want to re-process old items. 
        // If not forcing, strict filter.
        const dateThreshold = force ? 0 : maxPublishedAt;

        for (const item of items) {
            if (!item.url) continue;

            const normalizedUrl = normalizeUrl(item.url);

            // Check Date (Level 1 Filter)
            const publishedAt = resolvePublishedAt(item, feed.sourceId);

            // Skip if older than what we've seen (Optimization: Avoid DB Read)
            if (publishedAt && publishedAt.getTime() <= dateThreshold) {
                // If it's the exact same time, it might be the same article.
                // If strictly older, definitely skip.
                // We'll skip <= to be aggressive on quota.
                skippedCount++;
                continue;
            }

            if (publishedAt && publishedAt.getTime() > maxPublishedAt) {
                maxPublishedAt = publishedAt.getTime();
            }

            const articleId = hashUrl(normalizedUrl);

            // Level 0: Recent Hash Check (Optimization: Avoid DB Read)
            if (!force && recentHashes.has(articleId)) {
                skippedCount++;
                processedHashes.push(articleId); // Keep it alive in the list
                continue;
            }

            // NOW we read (only for fresh items)
            const existing = await ArticleRepository.getById(articleId);
            const isNew = !existing;

            // Check if we should update
            if (!isNew && existing) {
                // ... (Existing update logic)
                if (!force && existing.title === item.title) {
                    skippedCount++;
                    continue;
                }

                await ArticleRepository.updateById(articleId, {
                    title: item.title,
                    summary: item.summary && !existing.summary ? item.summary : existing.summary,
                    image: item.image && !existing.image ? item.image : existing.image,
                    // Lock publish date after first set; only set if missing
                    ...(!existing.publishedAt && publishedAt ? { published_at: publishedAt.toISOString() } : {}),
                });
                updated++;
            } else {
                // INSERT NEW
                await ArticleRepository.upsert({
                    id: articleId,
                    title: item.title,
                    url: normalizedUrl,
                    originalUrl: item.url,
                    sourceId: feed.sourceId,
                    summary: item.summary || null,
                    image: item.image || null,
                    content: "",
                    lifecycle: "queued",
                    qualityScore: 0,
                    lang: "en",
                    guid: item.guid || null,
                    publishedAt: publishedAt ? publishedAt.toISOString() : null,
                    createdAt: new Date().toISOString(),
                });
                created++;
            }

            // Add to processed list for next time
            processedHashes.push(articleId);
        }

        // UPDATE FEED METADATA
        const now = new Date();
        const lastSeen = maxPublishedAt > 0 ? new Date(maxPublishedAt) : feed.lastSeenArticleDate;
        await FeedRepository.upsert({
            ...feed,
            lastFetchedAt: now,
            ...(lastSeen ? { lastSeenArticleDate: lastSeen } : {}),
            lastContentHash: currentHash,
            lastETag: response.headers.get("etag") || null,
            lastModified: response.headers.get("last-modified") || null,
            recentHashes: Array.from(new Set([...processedHashes, ...(feed.recentHashes || [])])).slice(0, 200),
            health: {
                ...feed.health,
                status: "healthy",
                lastSuccess: now,
                lastCheck: now,
                consecutiveFailures: 0,
                errorCount24h: 0,
            },
            updatedAt: now,
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
        if (feed) {
            const now = new Date();
            const consecutiveFailures = (feed.health?.consecutiveFailures || 0) + 1;
            const status = consecutiveFailures >= AUTO_DISABLE_THRESHOLD ? "disabled" : "error";
            await FeedRepository.upsert({
                ...feed,
                health: {
                    ...feed.health,
                    status,
                    lastError: message,
                    lastCheck: now,
                    errorCount24h: (feed.health?.errorCount24h || 0) + 1,
                    consecutiveFailures,
                },
                updatedAt: now,
            });
        }
        return NextResponse.json({ ok: false, error: `Sweep failed: ${message}` }, { status: 500 });
    }
}
