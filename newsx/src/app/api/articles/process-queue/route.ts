import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { LogService } from "@/lib/services/logs";
import crypto from "crypto";
import { enrichContent } from "@/lib/utils/content-enrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for processing

const ARTICLES = "articles";
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
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
        const db = dbAdmin();
        await LogService.info("Queue processor started", { worker: WORKER_ID, limit });

        // Fetch recent articles and filter in memory to avoid composite index
        const snapshot = await db
            .collection(ARTICLES)
            .orderBy("createdAt", "desc")
            .limit(100) // Get more to filter
            .get();

        // Filter for queued articles in memory
        const queuedDocs = snapshot.docs.filter((doc) => doc.data().lifecycle === "queued");

        if (queuedDocs.length === 0) {
            await LogService.info("Queue empty", { worker: WORKER_ID });
            return NextResponse.json({ ok: true, processed: 0, message: "Queue empty" });
        }

        let processed = 0;
        let skipped = 0;
        let failed = 0;

        for (const doc of queuedDocs) {
            if (processed >= limit) break;

            const articleId = doc.id;
            const article = doc.data();
            const articleRef = db.collection(ARTICLES).doc(articleId);

            // Check processing lock
            const lock = article.processingLock;
            if (lock?.lockedAt) {
                const lockTime = lock.lockedAt instanceof Timestamp
                    ? lock.lockedAt.toMillis()
                    : new Date(lock.lockedAt).getTime();

                if (Date.now() - lockTime < LOCK_TIMEOUT_MS) {
                    skipped++;
                    continue; // Still locked by another worker
                }
            }

            // Skip if content already exists
            if (article.content && article.content.length > 100) {
                skipped++;
                continue;
            }

            // Claim lock
            await articleRef.update({
                processingLock: {
                    worker: WORKER_ID,
                    lockedAt: FieldValue.serverTimestamp(),
                },
                updatedAt: FieldValue.serverTimestamp(),
            });

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

                // Enrich content with reading time, summary, keywords
                const enriched = enrichContent(result.content, article.summary || "");

                await articleRef.update({
                    content: result.content,
                    image: result.image || article.image || "",
                    qualityScore,
                    lifecycle: isLowQuality ? "blocked" : "processed",
                    fetchError: FieldValue.delete(),
                    lastFetchedAt: FieldValue.serverTimestamp(),
                    processingLock: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp(),
                    // Content enrichment fields
                    readingTime: enriched.readingTime,
                    keywords: enriched.keywords,
                    summary: enriched.summary || article.summary || "",
                });

                processed++;
            } else {
                // Record error and release lock
                await articleRef.update({
                    fetchError: result.error,
                    lastFetchedAt: FieldValue.serverTimestamp(),
                    processingLock: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp(),
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
