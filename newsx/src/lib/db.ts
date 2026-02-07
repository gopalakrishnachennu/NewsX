import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({
  url,
  authToken,
});

type ColumnDef = {
  name: string;
  type: string;
  defaultSql?: string;
};

async function ensureColumns(table: string, columns: ColumnDef[]) {
  const info = await db.execute(`PRAGMA table_info(${table});`);
  const existing = new Set(info.rows.map((r: any) => String(r.name)));

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    const defaultClause = col.defaultSql ? ` DEFAULT ${col.defaultSql}` : "";
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}${defaultClause};`);
  }
}

// Helper to initialize the database schema if it doesn't exist
export async function initDB() {
  try {
    await db.execute("PRAGMA journal_mode = WAL;");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT,
        url TEXT,
        original_url TEXT,
        normalized_title TEXT,
        source_id TEXT,
        content TEXT,
        image TEXT,
        summary TEXT,
        lifecycle TEXT,
        published_at DATETIME,
        created_at DATETIME,
        updated_at DATETIME,
        category TEXT,
        quality_score INTEGER,
        reading_time INTEGER,
        keywords TEXT,
        fetch_error TEXT,
        last_fetched_at DATETIME,
        guid TEXT,
        lang TEXT,
        author TEXT
      );
    `);

    // Create index for fast retrieval
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_published_at ON articles(published_at DESC);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_lifecycle ON articles(lifecycle);`);
    await ensureColumns("articles", [
      { name: "original_url", type: "TEXT" },
      { name: "normalized_title", type: "TEXT" },
      { name: "fetch_error", type: "TEXT" },
      { name: "last_fetched_at", type: "DATETIME" },
      { name: "guid", type: "TEXT" },
      { name: "lang", type: "TEXT" },
      { name: "author", type: "TEXT" },
      { name: "image_source", type: "TEXT" },
      { name: "image_attribution", type: "TEXT" },
      { name: "image_license_url", type: "TEXT" },
      { name: "image_prompt", type: "TEXT" }
    ]);

    // Feeds Table
    await db.execute(`
              CREATE TABLE IF NOT EXISTS feeds (
                id TEXT PRIMARY KEY,
                source_id TEXT,
                url TEXT,
                type TEXT,
                active BOOLEAN,
                health_status TEXT,
                health_reliability_score INTEGER,
                health_last_check DATETIME,
                health_last_success DATETIME,
                health_error_count_24h INTEGER,
                health_consecutive_failures INTEGER,
                health_last_error TEXT,
                health_avg_response_time INTEGER,
                fetch_interval_minutes INTEGER,
                last_fetched_at DATETIME,
                last_seen_article_date DATETIME,
                last_content_hash TEXT,
                last_etag TEXT,
                last_modified TEXT,
                recent_hashes TEXT,
                created_at DATETIME,
                updated_at DATETIME
              );
            `);
    await ensureColumns("feeds", [
      { name: "health_reliability_score", type: "INTEGER" },
      { name: "health_last_check", type: "DATETIME" },
      { name: "health_last_success", type: "DATETIME" },
      { name: "health_error_count_24h", type: "INTEGER" },
      { name: "health_consecutive_failures", type: "INTEGER" },
      { name: "health_last_error", type: "TEXT" },
      { name: "health_avg_response_time", type: "INTEGER" },
      { name: "fetch_interval_minutes", type: "INTEGER" },
      { name: "last_seen_article_date", type: "DATETIME" },
      { name: "last_content_hash", type: "TEXT" },
      { name: "last_etag", type: "TEXT" },
      { name: "last_modified", type: "TEXT" },
      { name: "recent_hashes", type: "TEXT" },
    ]);

    // Logs Table
    await db.execute(`
              CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT,
                message TEXT,
                context TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              );
            `);

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);`);
    await db.execute(`
              CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );
            `);

    console.log("✅ SQLite Database initialized");
  } catch (error) {
    console.error("❌ Failed to init DB:", error);
  }
}
