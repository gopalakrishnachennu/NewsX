import { Article, ArticleLifecycle } from "@/types";
import { ArticleRepository } from "@/lib/repositories/articles";
import crypto from "crypto";

export const ArticleService = {
    async getRecent(limitCount = 20) {
        return ArticleRepository.findPublished(limitCount) as unknown as Article[];
    },

    async getById(id: string) {
        return (await ArticleRepository.getById(id)) as unknown as Article | null;
    },

    async create(article: Omit<Article, "id">) {
        const id = crypto.randomUUID();
        await ArticleRepository.upsert({
            id,
            ...article,
            createdAt: new Date().toISOString(),
            publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
        });
        return id;
    },

    async updateLifecycle(id: string, lifecycle: ArticleLifecycle) {
        await ArticleRepository.updateById(id, { lifecycle });
    },

    async getByLifecycle(lifecycle: ArticleLifecycle, limitCount = 20) {
        return (await ArticleRepository.findByLifecycle(lifecycle, limitCount)) as unknown as Article[];
    },

    async processArticle(id: string, content: string, title: string) {
        const { QualityFilters } = await import("../quality");
        const { logger } = await import("../logger");

        logger.info("Processing article", { articleId: id, titleLength: title.length });

        // Check quality
        const clickbaitCheck = QualityFilters.isClickbait(title);
        const wordCountCheck = QualityFilters.hasMinWordCount(content, 100);
        const prCheck = QualityFilters.isPressRelease(title, content);

        const isLowQuality = clickbaitCheck.isClickbait || !wordCountCheck || prCheck;
        const qualityScore = 100 - (clickbaitCheck.score) - (prCheck ? 50 : 0) - (wordCountCheck ? 0 : 30);

        if (isLowQuality) {
            logger.warn("Low quality article detected", {
                articleId: id,
                metrics: { clickbait: clickbaitCheck.isClickbait, wordCount: wordCountCheck, pr: prCheck }
            });
        }

        await ArticleRepository.updateById(id, {
            quality_score: Math.max(0, qualityScore),
            lifecycle: isLowQuality ? "blocked" : "processed"
        });

        logger.info("Article processed", { articleId: id, qualityScore, status: isLowQuality ? 'blocked' : 'processed' });

        return { isLowQuality, qualityScore };
    }
};
