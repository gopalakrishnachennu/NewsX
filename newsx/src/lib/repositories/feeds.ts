import { db } from "@/lib/db";
import { Feed } from "@/types";
import { dbAdminFeedsBackup } from "@/lib/firebase-admin";

export const FeedRepository = {
    // Read: Get all feeds (from SQLite)
    async getAll(): Promise<Feed[]> {
        try {
            const result = await db.execute("SELECT * FROM feeds ORDER BY created_at DESC");
            return result.rows.map(this.mapRowToFeed);
        } catch (e) {
            console.error("Failed to fetch feeds from SQLite:", e);
            return [];
        }
    },

    // Write: Upsert a feed (sync from Firebase to SQLite)
    async upsert(feed: Feed) {
        try {
            await db.execute({
                sql: `INSERT INTO feeds (
                        id, source_id, url, type, active, health_status,
                        health_reliability_score, health_last_check, health_last_success,
                        health_error_count_24h, health_consecutive_failures, health_last_error, health_avg_response_time,
                        fetch_interval_minutes, last_fetched_at, last_seen_article_date,
                        last_content_hash, last_etag, last_modified, recent_hashes,
                        created_at, updated_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(id) DO UPDATE SET
                        url=excluded.url,
                        active=excluded.active,
                        health_status=excluded.health_status,
                        last_fetched_at=excluded.last_fetched_at,
                        health_reliability_score=excluded.health_reliability_score,
                        health_last_check=excluded.health_last_check,
                        health_last_success=excluded.health_last_success,
                        health_error_count_24h=excluded.health_error_count_24h,
                        health_consecutive_failures=excluded.health_consecutive_failures,
                        health_last_error=excluded.health_last_error,
                        health_avg_response_time=excluded.health_avg_response_time,
                        fetch_interval_minutes=excluded.fetch_interval_minutes,
                        last_seen_article_date=excluded.last_seen_article_date,
                        last_content_hash=excluded.last_content_hash,
                        last_etag=excluded.last_etag,
                        last_modified=excluded.last_modified,
                        recent_hashes=excluded.recent_hashes,
                        updated_at=excluded.updated_at`,
                args: [
                    feed.id,
                    feed.sourceId,
                    feed.url,
                    feed.type,
                    feed.active ? 1 : 0,
                    feed.health?.status || "healthy",
                    feed.health?.reliabilityScore ?? 100,
                    feed.health?.lastCheck ? new Date(feed.health.lastCheck).toISOString() : new Date().toISOString(),
                    feed.health?.lastSuccess ? new Date(feed.health.lastSuccess).toISOString() : null,
                    feed.health?.errorCount24h ?? 0,
                    feed.health?.consecutiveFailures ?? 0,
                    feed.health?.lastError ?? null,
                    feed.health?.avgResponseTime ?? null,
                    feed.fetchIntervalMinutes ?? null,
                    feed.lastFetchedAt ? new Date(feed.lastFetchedAt.toMillis ? feed.lastFetchedAt.toMillis() : feed.lastFetchedAt).toISOString() : null,
                    feed.lastSeenArticleDate ? new Date(feed.lastSeenArticleDate.toMillis ? feed.lastSeenArticleDate.toMillis() : feed.lastSeenArticleDate).toISOString() : null,
                    feed.lastContentHash || null,
                    feed.lastETag || null,
                    feed.lastModified || null,
                    feed.recentHashes ? JSON.stringify(feed.recentHashes) : null,
                    feed.createdAt ? new Date((feed as any).createdAt.toMillis ? (feed as any).createdAt.toMillis() : (feed as any).createdAt).toISOString() : new Date().toISOString(),
                    feed.updatedAt ? new Date(feed.updatedAt.toMillis ? feed.updatedAt.toMillis() : feed.updatedAt).toISOString() : new Date().toISOString()
                ]
            });
        } catch (e) {
            console.error("Failed to upsert feed to SQLite:", e);
        }
    },

    // Delete a feed
    async delete(id: string) {
        try {
            await db.execute({
                sql: "DELETE FROM feeds WHERE id = ?",
                args: [id]
            });
        } catch (e) {
            console.error("Failed to delete feed from SQLite:", e);
        }
    },

    async getById(id: string): Promise<Feed | null> {
        try {
            const result = await db.execute({
                sql: "SELECT * FROM feeds WHERE id = ? LIMIT 1",
                args: [id]
            });
            return result.rows[0] ? this.mapRowToFeed(result.rows[0]) : null;
        } catch (e) {
            console.error("Failed to fetch feed from SQLite:", e);
            return null;
        }
    },

    // SYNC: Read-Through Cache Logic
    // If SQLite is empty, pull ALL from Firebase
    async syncFromFirebase() {
        try {
            console.log("🔄 Syncing Feeds from Firebase to SQLite...");
            const dbFirestore = dbAdminFeedsBackup();
            const snapshot = await dbFirestore.collection("feeds").get();

            if (snapshot.empty) return;

            for (const doc of snapshot.docs) {
                const feed = { id: doc.id, ...doc.data() } as Feed;
                await this.upsert(feed);
            }
            console.log(`✅ Synced ${snapshot.size} feeds to SQLite.`);
            return snapshot.size;
        } catch (e) {
            console.error("Failed to sync feeds from Firebase:", e);
            throw e;
        }
    },

    mapRowToFeed(row: any): Feed {
        return {
            id: row.id as string,
            sourceId: row.source_id as string,
            url: row.url as string,
            type: row.type as any,
            active: Boolean(row.active),
            health: {
                status: row.health_status as any,
                reliabilityScore: row.health_reliability_score ?? 100,
                lastCheck: row.health_last_check ? new Date(row.health_last_check as string) : new Date(),
                lastSuccess: row.health_last_success ? new Date(row.health_last_success as string) : undefined,
                errorCount24h: row.health_error_count_24h ?? 0,
                consecutiveFailures: row.health_consecutive_failures ?? 0,
                lastError: row.health_last_error ?? undefined,
                avgResponseTime: row.health_avg_response_time ?? undefined
            },
            lastFetchedAt: row.last_fetched_at ? new Date(row.last_fetched_at as string) : undefined,
            lastSeenArticleDate: row.last_seen_article_date ? new Date(row.last_seen_article_date as string) : undefined,
            lastContentHash: row.last_content_hash ?? undefined,
            lastETag: row.last_etag ?? undefined,
            lastModified: row.last_modified ?? undefined,
            recentHashes: row.recent_hashes ? JSON.parse(row.recent_hashes as string) : undefined,
            fetchIntervalMinutes: row.fetch_interval_minutes ?? undefined,
            // ... other fields can be mocked or extended if needed for UI
        };
    }
};
