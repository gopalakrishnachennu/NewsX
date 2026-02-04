import { NextResponse } from "next/server";
import { LogService } from "@/lib/services/logs";
import crypto from "crypto";
import { enrichContent } from "@/lib/utils/content-enrichment";

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
        const response = await fetch(articleUrl, {
            headers: {
                "User-Agent": "NewsXBot/1.0 (+https://newsx.app)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
        });

        if (!response.ok) {
            return { ok: false, error: `HTTP ${response.status}` };
        }

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

        // Simple content extraction
        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

        const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        const targetHtml = articleMatch?.[1] || mainMatch?.[1] || text;

        const plainText = targetHtml
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 10000);

        if (plainText.length < 50) {
            return { ok: false, error: "Content too short" };
        }

        return { ok: true, content: plainText, image };
    } catch (error: any) {
        return { ok: false, error: error?.message || "Fetch failed" };
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
                // ... error handling
                await ArticleRepository.updateById(articleId, {
                    fetch_error: result.error,
                    lifecycle: "error",
                    last_fetched_at: new Date().toISOString(),
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
