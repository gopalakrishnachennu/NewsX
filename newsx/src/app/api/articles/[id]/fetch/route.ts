import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { LogService } from "@/lib/services/logs";
import type { Article } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARTICLES = "articles";

// Extract the first meaningful image from HTML
function extractImage(html: string): string | null {
    // Try og:image first (most reliable)
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
        html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    if (ogMatch?.[1]) return ogMatch[1];

    // Try twitter:image
    const twitterMatch = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i) ||
        html.match(/<meta[^>]*content="([^"]+)"[^>]*name="twitter:image"/i);
    if (twitterMatch?.[1]) return twitterMatch[1];

    // Try first large image in article/main
    const articleSection = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
        html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";

    const imgMatch = articleSection.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
    if (imgMatch?.[1] && !imgMatch[1].includes("avatar") && !imgMatch[1].includes("icon")) {
        return imgMatch[1];
    }

    // Fallback to any image with reasonable size indicators
    const allImgs = html.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/gi);
    for (const match of allImgs) {
        const src = match[1];
        if (src &&
            !src.includes("logo") &&
            !src.includes("avatar") &&
            !src.includes("icon") &&
            !src.includes("sprite") &&
            !src.includes("1x1") &&
            src.length > 20) {
            return src;
        }
    }

    return null;
}

// Simple HTML content extractor
function extractContent(html: string): { content: string; image: string | null } {
    const image = extractImage(html);

    // Remove scripts, styles, nav, footer, header, aside
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

    // Try to find main content area
    const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const contentMatch = text.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    const targetHtml = articleMatch?.[1] || mainMatch?.[1] || contentMatch?.[1] || text;

    // Strip remaining HTML tags
    const plainText = targetHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return {
        content: plainText.slice(0, 10000),
        image
    };
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: articleId } = await params;
    if (!articleId) {
        return NextResponse.json({ error: "Missing article id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    try {
        const db = dbAdmin();
        const articleRef = db.collection(ARTICLES).doc(articleId);
        const articleSnap = await articleRef.get();

        if (!articleSnap.exists) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        const article = articleSnap.data() as Article;

        // Idempotent: skip if content exists (unless forced)
        if (article.content && article.content.length > 100 && !force) {
            await LogService.info("Fetch skipped (content exists)", { articleId });
            return NextResponse.json({
                ok: true,
                skipped: true,
                message: "Content already exists"
            });
        }

        // Fetch the article URL
        await LogService.info("Fetching article content", { articleId, url: article.url });

        const response = await fetch(article.url, {
            headers: {
                "User-Agent": "NewsXBot/1.0 (+https://newsx.app)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
        });

        if (!response.ok) {
            const errorMsg = `HTTP ${response.status}`;
            await articleRef.update({
                fetchError: errorMsg,
                lastFetchedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await LogService.error("Fetch failed", { articleId, error: errorMsg });
            return NextResponse.json({ ok: false, error: errorMsg }, { status: 422 });
        }

        const html = await response.text();
        const { content, image } = extractContent(html);

        if (content.length < 50) {
            const errorMsg = "Content too short";
            await articleRef.update({
                fetchError: errorMsg,
                lastFetchedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await LogService.warn("Content extraction failed", { articleId, contentLength: content.length });
            return NextResponse.json({ ok: false, error: errorMsg }, { status: 422 });
        }

        // Run quality filters
        const { QualityFilters } = await import("@/lib/quality");

        const clickbaitCheck = QualityFilters.isClickbait(article.title);
        const wordCountCheck = QualityFilters.hasMinWordCount(content, 100);
        const prCheck = QualityFilters.isPressRelease(article.title, content);

        const isLowQuality = clickbaitCheck.isClickbait || !wordCountCheck || prCheck;
        const qualityScore = Math.max(0, 100 - clickbaitCheck.score - (prCheck ? 50 : 0) - (wordCountCheck ? 0 : 30));

        // Update article with content AND image
        await articleRef.update({
            content,
            image: image || article.image || "",
            qualityScore,
            lifecycle: isLowQuality ? "blocked" : "processed",
            fetchError: FieldValue.delete(),
            lastFetchedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await LogService.info("Article processed", {
            articleId,
            contentLength: content.length,
            hasImage: !!image,
            qualityScore,
            lifecycle: isLowQuality ? "blocked" : "processed",
        });

        return NextResponse.json({
            ok: true,
            contentLength: content.length,
            hasImage: !!image,
            qualityScore,
            lifecycle: isLowQuality ? "blocked" : "processed",
        });
    } catch (error: any) {
        const errorMsg = error?.message || "Unknown error";
        await LogService.error("Fetch exception", { articleId, error: errorMsg });

        try {
            const db = dbAdmin();
            await db.collection(ARTICLES).doc(articleId).update({
                fetchError: errorMsg,
                lastFetchedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } catch {
            // Ignore update failure
        }

        return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
    }
}
