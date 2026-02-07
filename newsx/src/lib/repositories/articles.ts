import { db } from "@/lib/db";
import { NewsArticle } from "@/components/news/NewsCard";
import { normalizeTitleForCluster } from "@/lib/utils/text";

export const ArticleRepository = {
    // Create or Update an article
    async upsert(article: any) {
        try {
            await db.execute({
                sql: `INSERT INTO articles (
                        id, title, url, original_url, normalized_title, source_id, content, image, summary, 
                        lifecycle, published_at, created_at, category, 
                        quality_score, reading_time, keywords, fetch_error, last_fetched_at, guid, lang, author,
                        image_source, image_attribution, image_license_url, image_prompt
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET
                        title=excluded.title,
                        url=excluded.url,
                        original_url=excluded.original_url,
                        normalized_title=excluded.normalized_title,
                        source_id=excluded.source_id,
                        content=excluded.content,
                        image=excluded.image,
                        summary=excluded.summary,
                        lifecycle=excluded.lifecycle,
                        quality_score=excluded.quality_score,
                        published_at=excluded.published_at,
                        fetch_error=excluded.fetch_error,
                        last_fetched_at=excluded.last_fetched_at,
                        guid=excluded.guid,
                        lang=excluded.lang,
                        author=excluded.author,
                        image_source=excluded.image_source,
                        image_attribution=excluded.image_attribution,
                        image_license_url=excluded.image_license_url,
                        image_prompt=excluded.image_prompt,
                        updated_at=CURRENT_TIMESTAMP`,
                args: [
                    article.id || null,
                    article.title || null,
                    article.url || null,
                    article.originalUrl || null,
                    normalizeTitleForCluster(article.title || ""),
                    article.sourceId || null,
                    article.content || null,
                    article.image || null,
                    article.summary || null,
                    article.lifecycle || "published",
                    article.publishedAt || null,
                    article.createdAt || null,
                    article.category || null,
                    article.qualityScore || 0,
                    article.readingTime || 0,
                    JSON.stringify(article.keywords || []),
                    article.fetchError || null,
                    article.lastFetchedAt || null,
                    article.guid || null,
                    article.lang || null,
                    article.author || null,
                    article.imageSource || null,
                    article.imageAttribution || null,
                    article.imageLicenseUrl || null,
                    article.imagePrompt || null
                ]
            });
        } catch (e) {
            console.error("SQLite Upsert Error:", e);
            throw e;
        }
    },

    // Find many articles (Feed Query)
    async findPublished(limit: number = 50) {
        const result = await db.execute({
            sql: `SELECT * FROM articles 
                  WHERE lifecycle = 'published' 
                  ORDER BY published_at DESC 
                  LIMIT ?`,
            args: [limit]
        });

        return result.rows.map(this.mapRowToArticle);
    },

    async findRecent(limit: number = 50) {
        const result = await db.execute({
            sql: `SELECT * FROM articles 
                  ORDER BY created_at DESC 
                  LIMIT ?`,
            args: [limit]
        });

        return result.rows.map(this.mapRowToArticle);
    },

    async getById(id: string) {
        const result = await db.execute({
            sql: `SELECT * FROM articles WHERE id = ? LIMIT 1`,
            args: [id]
        });
        return result.rows[0] ? this.mapRowToArticle(result.rows[0]) : null;
    },

    async updateById(id: string, fields: Record<string, any>) {
        const keys = Object.keys(fields);
        if (keys.length === 0) return;

        if (fields.title && !fields.normalized_title) {
            fields.normalized_title = normalizeTitleForCluster(String(fields.title));
        }

        const setSql = keys.map((k) => `${k} = ?`).join(", ");
        const args = keys.map((k) => fields[k]);
        args.push(id);

        await db.execute({
            sql: `UPDATE articles SET ${setSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            args
        });
    },

    // Map SQLite row to frontend Article type
    // Delete articles by sourceId (Cascading Delete)
    async deleteBySourceId(sourceId: string) {
        try {
            await db.execute({
                sql: "DELETE FROM articles WHERE source_id = ?",
                args: [sourceId]
            });
        } catch (e) {
            console.error("Failed to delete articles by sourceId in SQLite:", e);
        }
    },

    // Search Articles (for /api/articles/search)
    async search(params: { q?: string; sources?: string[]; minQuality?: number; from?: string; limit?: number }) {
        let sql = "SELECT * FROM articles WHERE lifecycle = 'published'";
        const args: any[] = [];

        // 1. Date Filter
        if (params.from) {
            sql += " AND created_at >= ?";
            args.push(params.from);
        }

        // 2. Quality Filter
        if (params.minQuality && params.minQuality > 0) {
            sql += " AND quality_score >= ?";
            args.push(params.minQuality);
        }

        // 3. Source Filter
        if (params.sources && params.sources.length > 0) {
            const placeholders = params.sources.map(() => "?").join(",");
            sql += ` AND source_id IN (${placeholders})`;
            args.push(...params.sources);
        }

        // 4. Text Search (Basic LIKE)
        if (params.q) {
            const term = `%${params.q}%`;
            sql += " AND (title LIKE ? OR summary LIKE ? OR keywords LIKE ?)";
            args.push(term, term, term);
        }

        sql += " ORDER BY created_at DESC LIMIT ?";
        args.push(params.limit || 50);

        try {
            const result = await db.execute({ sql, args });
            return result.rows.map(this.mapRowToArticle);
        } catch (e) {
            console.error("SQLite Search Error:", e);
            return [];
        }
    },

    async findByLifecycle(lifecycle: string, limit: number = 50) {
        const result = await db.execute({
            sql: `SELECT * FROM articles WHERE lifecycle = ? ORDER BY created_at DESC LIMIT ?`,
            args: [lifecycle, limit]
        });
        return result.rows.map(this.mapRowToArticle);
    },

    // Source Distribution Stats (for Admin Dashboard & Search Filters)
    async getSourceStats() {
        try {
            const result = await db.execute(`
                SELECT source_id, COUNT(*) as count 
                FROM articles 
                WHERE lifecycle = 'published' 
                GROUP BY source_id 
                ORDER BY count DESC
            `);
            return result.rows.map(row => ({
                name: row.source_id as string,
                count: row.count as number
            }));
        } catch (e) {
            console.error("SQLite Source Stats Error:", e);
            return [];
        }
    },

    async countTotal() {
        const result = await db.execute(`SELECT COUNT(*) as count FROM articles`);
        return (result.rows[0]?.count as number) || 0;
    },

    async countCreatedSince(from: string) {
        const result = await db.execute({
            sql: `SELECT COUNT(*) as count FROM articles WHERE created_at >= ?`,
            args: [from]
        });
        return (result.rows[0]?.count as number) || 0;
    },

    async getRecentCreated(limit: number = 100) {
        const result = await db.execute({
            sql: `SELECT created_at FROM articles ORDER BY created_at DESC LIMIT ?`,
            args: [limit]
        });
        return result.rows.map((r) => r.created_at as string).filter(Boolean);
    },

    async backfillNormalizedTitles(sinceIso: string) {
        const result = await db.execute({
            sql: `SELECT id, title FROM articles WHERE created_at >= ? AND (normalized_title IS NULL OR normalized_title = '')`,
            args: [sinceIso]
        });
        for (const row of result.rows) {
            const id = row.id as string;
            const title = row.title as string;
            const normalized = normalizeTitleForCluster(title || "");
            await db.execute({
                sql: `UPDATE articles SET normalized_title = ? WHERE id = ?`,
                args: [normalized, id]
            });
        }
    },

    async getViralRepetitive(params: { hours?: number; minSources?: number; limit?: number }) {
        const hours = params.hours ?? 72;
        const minSources = params.minSources ?? 2;
        const limit = Math.min(params.limit ?? 50, 2000);
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        await this.backfillNormalizedTitles(since);

        const groups = await db.execute({
            sql: `
                SELECT normalized_title, COUNT(DISTINCT source_id) as sources, MAX(published_at) as latest_pub
                FROM articles
                WHERE created_at >= ? AND normalized_title IS NOT NULL AND normalized_title != ''
                GROUP BY normalized_title
                HAVING sources >= ?
                ORDER BY sources DESC, latest_pub DESC
                LIMIT ?
            `,
            args: [since, minSources, limit]
        });

        const results: NewsArticle[] = [];

        for (const row of groups.rows) {
            const normalized = row.normalized_title as string;
            const articleResult = await db.execute({
                sql: `SELECT * FROM articles 
                      WHERE normalized_title = ? 
                      ORDER BY published_at DESC 
                      LIMIT 1`,
                args: [normalized]
            });
            if (articleResult.rows[0]) {
                results.push(this.mapRowToArticle(articleResult.rows[0]));
            }
        }

        return results;
    },

    mapRowToArticle(row: any): NewsArticle {
        return {
            id: row.id as string,
            title: row.title as string,
            url: row.url as string,
            sourceId: row.source_id as string,
            content: row.content as string,
            image: row.image as string,
            summary: row.summary as string,
            lifecycle: row.lifecycle as any,
            publishedAt: row.published_at ? new Date(row.published_at as string).toISOString() : null,
            createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
            category: row.category as string,
            qualityScore: row.quality_score as number,
            readingTime: row.reading_time as number,
            keywords: JSON.parse(row.keywords as string || "[]"),
            author: row.author as string,
            fetchError: row.fetch_error as string,
            lastFetchedAt: row.last_fetched_at as string,
            imageSource: row.image_source as string,
            imageAttribution: row.image_attribution as string,
            imageLicenseUrl: row.image_license_url as string,
            imagePrompt: row.image_prompt as string,
        };
    }
};
