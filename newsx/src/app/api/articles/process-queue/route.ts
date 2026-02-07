import { NextResponse } from "next/server";
import { LogService } from "@/lib/services/logs";
import crypto from "crypto";
import { enrichContent } from "@/lib/utils/content-enrichment";
import { getRandomUserAgent } from "@/lib/utils/user-agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for processing

const BATCH_SIZE = 50;
const WORKER_ID = crypto.randomBytes(4).toString("hex");

async function fetchArticleContent(articleId: string, articleUrl: string): Promise<{
    ok: boolean;
    content?: string;
    image?: string | null;
    error?: string;
}> {
    try {
        const origin = (() => {
            try {
                return new URL(articleUrl).origin;
            } catch {
                return "https://newsx.app";
            }
        })();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(articleUrl, {
            headers: {
                "User-Agent": getRandomUserAgent(),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Referer": "https://www.google.com/", // Better to fake coming from Google
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "cross-site",
                "Upgrade-Insecure-Requests": "1",
            },
            redirect: "follow",
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
            const html = await response.text();

            // Extract image from og:image or twitter:image
            let image: string | null = null;
            const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
            if (ogMatch?.[1]) {
                image = ogMatch[1];
            } else {
                const twitterMatch = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i);
                if (twitterMatch?.[1]) image = twitterMatch[1];
            }

            const plainText = extractMainContent(html);
            if (plainText.length < 50) return { ok: false, error: "Content too short" };

            return { ok: true, content: plainText, image };
        } else if (response.status === 403 || response.status === 401) {
            // Fallback: Try Google Web Cache
            await LogService.info("Direct access blocked, trying Google Cache", { url: articleUrl });
            const cacheUrl = `http://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(articleUrl)}`;

            try {
                const cacheRes = await fetch(cacheUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
                    }
                });

                if (cacheRes.ok) {
                    const html = await cacheRes.text();
                    const plainText = extractMainContent(html);
                    if (plainText.length > 100) {
                        return { ok: true, content: plainText, image: null };
                    }
                }
            } catch (e: any) {
                await LogService.error("Google Cache attempt failed", { error: e.message });
            }
            return { ok: false, error: `Blocked (HTTP ${response.status}) & Cache Miss` };
        }

        return { ok: false, error: `HTTP ${response.status}` };
    } catch (error: any) {
        const message = error?.name === "AbortError" ? "Timeout" : (error?.message || "Fetch failed");
        return { ok: false, error: message };
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), BATCH_SIZE);

    try {
        await LogService.info("Queue processor started", { worker: WORKER_ID, limit });

        const { ArticleRepository } = await import("@/lib/repositories/articles");
        const queuedArticles = await ArticleRepository.findByLifecycle("queued", limit);

        if (queuedArticles.length === 0) {
            await LogService.info("Queue empty", { worker: WORKER_ID });
            return NextResponse.json({ ok: true, processed: 0, message: "Queue empty" });
        }

        let processed = 0;
        let skipped = 0;
        let failed = 0;

        for (const article of queuedArticles) {
            // Process limit check is handled by .limit() in query mostly, but good safety
            if (processed >= limit) break;

            const articleId = article.id;

            // OPTIMIZATION: Removed locking to save 1 Write per article.
            // Risk: Rare double-processing if crons overlap perfectly.
            // Benefit: 50% reduction in writes.

            // Fetch content
            const result = await fetchArticleContent(articleId, article.url);

            if (result.ok && result.content) {
                // Run quality filters
                const { QualityFilters } = await import("@/lib/quality");
                const clickbaitCheck = QualityFilters.isClickbait(article.title);
                const wordCountCheck = QualityFilters.hasMinWordCount(result.content, 100);
                const prCheck = QualityFilters.isPressRelease(article.title, result.content);

                const isLowQuality = clickbaitCheck.isClickbait || !wordCountCheck || prCheck;
                const qualityScore = Math.max(0, 100 - clickbaitCheck.score - (prCheck ? 50 : 0) - (wordCountCheck ? 0 : 30));

                // Enrich content
                // Enrich content - Pass title for viral detection
                const enriched = enrichContent(result.content, article.summary || "", article.title || "");

                const now = new Date().toISOString();
                const publishedAt = article.publishedAt ? String(article.publishedAt) : null;

                await ArticleRepository.updateById(articleId, {
                    content: result.content,
                    image: result.image || article.image || "",
                    quality_score: qualityScore,
                    lifecycle: isLowQuality ? "blocked" : "published",
                    fetch_error: null,
                    last_fetched_at: now,
                    ...(publishedAt ? { published_at: publishedAt } : {}),
                    reading_time: enriched.readingTime ?? null,
                    keywords: JSON.stringify(enriched.keywords || []),
                    summary: enriched.summary || article.summary || "",
                    category: enriched.category || article.category || null,
                });

                processed++;
            } else {
                const err = result.error || "Fetch failed";
                const isBlocked = /HTTP\s+(401|403|429)/.test(err);
                const now = new Date().toISOString();

                // If blocked by site, don't keep retrying forever.
                // Publish with existing summary/image so it shows up, but mark fetch_error.
                await ArticleRepository.updateById(articleId, {
                    fetch_error: err,
                    lifecycle: isBlocked ? "published" : "error",
                    last_fetched_at: now,
                });
                failed++;
            }

            // Small delay to avoid rate limiting
            await new Promise((r) => setTimeout(r, 200));
        }

        const duration = Date.now() - startTime;
        await LogService.info("Queue processor completed", {
            worker: WORKER_ID,
            processed,
            skipped,
            failed,
            durationMs: duration,
        });

        return NextResponse.json({
            ok: true,
            processed,
            skipped,
            failed,
            durationMs: duration,
        });
    } catch (error: any) {
        const errorMsg = error?.message || "Unknown error";
        await LogService.error("Queue processor failed", { worker: WORKER_ID, error: errorMsg });
        return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
    }
}

// Convenience GET handler so browser opens don't 405
export async function GET(request: Request) {
    return POST(request);
}

function extractMainContent(html: string): string {
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

    // Prioritize <article> or <main>
    const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const targetHtml = articleMatch?.[1] || mainMatch?.[1] || text;

    return targetHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10000);
}
