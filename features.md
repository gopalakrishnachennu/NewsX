# Additional & Missing Features for Your News Aggregator

Below is a **gap analysis + feature expansion** that complements your current architecture (serverless, Firestore-first, high-scale). These are **practical, low-regret additions**—not fluff.

---

## 1️⃣ Core Platform Features (Commonly Expected, Currently Missing)

### 🔐 Role-Based Access Control (RBAC)
**Why:** You’ll eventually need multiple admins or analysts.

**Add:**
- Roles: `Owner`, `Editor`, `Analyst`, `Read-Only`
- Firestore Security Rules per role
- Audit who changed sources, feeds, or configs

---

### 📝 Editorial Overrides (Human-in-the-Loop)
**Why:** AI + automation still needs control.

**Add:**
- Manually pin/unpin articles or clusters
- Edit titles, summaries, categories
- Merge / split clusters manually

---

### ⏱ Article Lifecycle States
**Why:** Prevent stale or low-quality content flooding APIs.

**States:**
- `queued → processed → clustered → published → archived`
- TTL auto-archive after X hours/days
- API can filter by lifecycle stage

---

### 🧹 Content Quality Filters
**Why:** News feeds contain junk.

**Add Rules:**
- Min word count threshold
- Block press-release patterns
- Duplicate image detection (hash-based)
- Clickbait title detection (regex-based, no ML)

---

## 2️⃣ Feed & Ingestion Enhancements

### 🌍 Geo & Language Detection
**Why:** Global news sorting is impossible without this.

**Add:**
- Auto-detect language (`en`, `hi`, `ja`, etc.)
- Country inference via domain + NER
- API filters: `?lang=en&region=IN`

---

### 🕵️ Feed Change Detection
**Why:** Avoid re-scraping unchanged content.

**Add:**
- Hash content body
- Skip ingestion if unchanged
- Saves cost + improves speed

---

### 🧠 Adaptive Crawl Frequency
**Why:** Not all feeds deserve equal priority.

**Logic:**
- High-reliability feeds → crawl every 2–5 min
- Low-quality feeds → backoff automatically
- Firestore-driven dynamic cron config

---

### 🔄 Feed Auto-Healing
**Why:** Feeds break constantly.

**Add:**
- Detect 404 / 403 patterns
- Auto-disable feed temporarily
- Alert admin + retry after cooldown

---

## 3️⃣ Search, Discovery & Personalization

### 🎯 User Preference Layer (Optional, Powerful)
**Why:** Enables "Google News-style" feeds.

**Add:**
- Follow topics / sources
- Keyword exclusions
- Personalized ranking

---

### 🔔 Alerts & Subscriptions
**Why:** Retention + engagement.

**Add:**
- Keyword alerts ("RBI rate hike")
- Source alerts
- Webhook / Email / Push-ready hooks

---

### 🧵 Story Timeline View
**Why:** Makes clusters far more valuable.

**Add:**
- Timeline of articles per cluster
- Show how story evolved
- Highlight breaking vs follow-ups

---

## 4️⃣ Analytics & Intelligence (Low Cost, High Value)

### 📈 Trend Velocity Metrics
**Why:** Hotness ≠ importance.

**Add Metrics:**
- Articles/hour growth
- Source diversity score
- Social-share proxy (time + size heuristic)

---

### 🧠 Narrative Angle Detection (Lightweight NLP)
**Why:** Same story, different perspectives.

**Add:**
- Detect angles: `political`, `economic`, `human-interest`
- Rule-based + embedding similarity

---

### 🏷 Entity Extraction
**Why:** Enables structured browsing.

**Extract:**
- People
- Companies
- Locations

**Store as:** Firestore arrays

---

## 5️⃣ API & Developer Experience

### 🔑 API Keys & Rate Limiting
**Why:** Public APIs get abused.

**Add:**
- Key-based access tiers
- Rate limits per key
- Usage analytics per consumer

---

### 🧪 Preview / Sandbox Mode
**Why:** Safe experimentation.

**Add:**
- Dry-run ingestion
- Preview cluster formation
- Test feed configs without publishing

---

### 📦 Webhooks
**Why:** Plug into anything.

**Triggers:**
- New cluster created
- Story crosses hotness threshold
- Feed failures

---

## 6️⃣ Compliance, Safety & Reliability

### 🧾 Legal & Compliance Layer
**Why:** News scraping ≠ free-for-all.

**Add:**
- Respect `robots.txt`
- Source-level usage policies
- Attribution enforcement

---

### 🧯 Kill Switches
**Why:** Production safety.

**Add:**
- Global ingestion pause
- Per-feed emergency stop
- Cost spike protection

---

### 🧪 Replayable Jobs
**Why:** Debugging serverless systems is painful.

**Add:**
- Store raw fetch responses (TTL-based)
- Replay failed jobs from admin UI

---

## 7️⃣ Optional “Wow” Features (Investor Candy 🍬)

### 📰 Bias & Source Leaning Indicators
- Left / Right / Neutral tagging (rule-based)

### 🎙 Audio Briefings
- Auto-generate 60-second news audio

### 🧠 Multi-Language Summaries
- One article → summaries in multiple languages

### 🧩 Topic Graph
- Visual graph of clusters & relationships

---

## 8️⃣ If You Want a Clean V2 Roadmap

**Phase 1 (Must-Have):**
RBAC, lifecycle states, quality filters, rate limiting

**Phase 2 (Growth):**
Personalization, alerts, entity extraction, trend velocity

**Phase 3 (Moat):**
Narrative detection, bias scoring, audio news, topic graphs

---

If you want next:
- Firestore schema changes for these features
- Admin UI wireframe
- Cost impact analysis per feature
- V2 pitch deck framing (very strong for investors)

Just tell me 🔥


---

# 🔥 V2 SYSTEM DESIGN EXTENSIONS (DETAILED)

This section adds **Firestore schema updates**, **Admin Control-Room UI**, **Firebase cost impact**, and **product positioning**.

---

## 1️⃣ Firestore Schema Updates (Production‑Ready)

### 📰 `articles` (extended)
```json
articles/{articleId}
{
  title: string,
  url: string,
  sourceId: string,
  clusterId: string | null,
  content: string,
  summary: string,
  image: string,
  entities: {
    people: string[],
    companies: string[],
    locations: string[]
  },
  language: "en" | "hi" | "ja",
  region: "IN" | "US" | "GLOBAL",
  lifecycle: "queued" | "processed" | "published" | "archived",
  qualityScore: number,
  createdAt: timestamp,
  expiresAt: timestamp
}
```

TTL index on `expiresAt`

---

### 🧵 `clusters` (story intelligence)
```json
clusters/{clusterId}
{
  title: string,
  summaryBullets: string[],
  category: "Tech" | "Finance" | "Politics",
  sentiment: "Positive" | "Negative" | "Neutral",
  entities: {
    people: string[],
    companies: string[]
  },
  articleCount: number,
  velocity: number,
  hotnessScore: number,
  narrativeAngles: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

### 🔁 `queue_jobs`
```json
queue_jobs/{jobId}
{
  url: string,
  sourceId: string,
  status: "pending" | "processing" | "failed" | "done",
  attempts: number,
  leaseUntil: timestamp,
  error: string | null,
  createdAt: timestamp
}
```

---

### 🔐 `users`
```json
users/{uid}
{
  role: "owner" | "editor" | "analyst" | "viewer",
  lastLogin: timestamp
}
```

---

### 📊 `metrics_daily`
```json
metrics_daily/{yyyy-mm-dd}
{
  articlesIngested: number,
  clustersCreated: number,
  apiReads: number,
  feedErrors: number
}
```

Uses `FieldValue.increment`

---

## 2️⃣ Admin Control‑Room UI (Live Ops Dashboard)

### 🎛 Main Layout
```
┌──────────────────────────────────────────────┐
│  LIVE INGESTION STATUS  ● Active Workers: 12 │
├──────────────────────────────────────────────┤
│ Queue  | Clusters | Feeds | Errors | Metrics │
├──────────────────────────────────────────────┤
│ ▶ Processing URL: techcrunch.com/...          │
│ ▶ Processing URL: bloomberg.com/...           │
│ ▶ Processing URL: bbc.com/...                 │
└──────────────────────────────────────────────┘
```

---

### 🔄 Queue Panel
- Live list of `processing` jobs
- Retry / Kill job buttons
- Lease countdown timer

---

### 🧵 Cluster Panel
- Trending clusters (velocity graph)
- Manual merge / split
- Pin cluster

---

### 🧯 Health Panel
- Feed reliability heatmap
- Error spikes (last 60 mins)
- Auto-disabled feeds

---

### 📈 Metrics Panel
- Articles / minute (sparkline)
- Reads per API endpoint
- Source contribution pie

Firestore `onSnapshot()` everywhere

---

## 3️⃣ Feature → Firebase Cost Impact (Critical)

| Feature | Firestore Reads | Writes | Cost Risk |
|------|------|------|------|
| Ingestion Queue | Medium | High | ⚠️ |
| Clustering | Low | Medium | ✅ |
| Vector Search | Medium | Medium | ⚠️ |
| Analytics Counters | Low | Low | ✅ |
| Live Dashboard | High | Low | ⚠️ |

### Cost Controls
- Batch writes (500 max)
- Avoid collection group scans
- TTL cleanup
- Backoff low‑quality feeds

---

## 4️⃣ Positioning: News Aggregator → News Intelligence Platform

### ❌ Aggregator
"We collect news from many sites"

### ✅ Intelligence Platform
"We detect narratives, trends, sentiment, and story evolution in real‑time"

---

### Your Differentiators
- Story clustering (not links)
- Velocity‑based trend detection
- Narrative angle detection
- Entity‑level browsing
- Live operational transparency

---

### One‑Line Pitch
> "A real‑time news intelligence engine that turns thousands of articles into structured, actionable stories."

---

## 5️⃣ Investor‑Grade Moat Summary

| Layer | Why Hard to Copy |
|----|----|
| Distributed Queue | Serverless lease model |
| Story Clustering | Non‑ML but scalable |
| Real‑Time Ops | Firestore listeners |
| Cost Efficiency | No Kafka / Elastic |

---

If you want next:
- Exact Firestore indexes
- Security rules (RBAC)
- Vercel edge caching strategy
- Pitch deck slides

Say the word 🚀


---

# Firestore Schema Updates (V2)

This section proposes **collections, document shapes, indexes, and security-rule notes** to support:
RBAC, lifecycle states, quality filters, rate limiting, geo/language, auto-healing, trend velocity, entity extraction, alerts, editorial overrides, replayable jobs, kill switches.

> Design goals: **low read amplification**, **bounded write fanout**, **cheap queries**, **time-windowed analytics**, and **safe serverless concurrency**.

---

## A) Collections Overview

### 1) `sources/{sourceId}`
Stores publishers (TechCrunch, CNN, etc.)

**Fields**
- `name` (string)
- `domain` (string)
- `active` (bool)
- `country` (string, optional, e.g., `IN`)
- `defaultLang` (string, optional, e.g., `en`)
- `createdAt`, `updatedAt` (timestamp)
- `policy` (map)
  - `robotsRespect` (bool)
  - `attributionRequired` (bool)
  - `allowScrapeFallback` (bool)

### 2) `feeds/{feedId}`
Each source can have multiple feeds (RSS, sitemap, Google News sitemap, HTML fallback)

**Fields**
- `sourceId` (ref/id)
- `type` (string enum: `rss|atom|sitemap|gnews_sitemap|html`)
- `url` (string)
- `active` (bool)
- `selectors` (map, optional)
  - `title`, `content`, `author`, `date`, `image`
- `crawl` (map)
  - `baseIntervalSec` (number)  
  - `adaptive` (bool)
  - `minIntervalSec` (number)
  - `maxIntervalSec` (number)
- `health` (map)
  - `successCount24h` (number)
  - `errorCount24h` (number)
  - `consecutiveErrors` (number)
  - `reliabilityScore` (number 0..100)
  - `lastSuccessAt` (timestamp)
  - `lastErrorAt` (timestamp)
  - `cooldownUntil` (timestamp, optional)
- `lastSweepAt` (timestamp)
- `nextSweepAt` (timestamp)
- `createdAt`, `updatedAt`

### 3) `articles/{articleId}`
Raw-ish article after extraction; used for dedupe and cluster membership.

**Suggested `articleId`:** stable hash, e.g. `sha1(normalizedUrl)`.

**Fields**
- `url` (string)
- `canonicalUrl` (string)
- `sourceId`, `feedId` (id)
- `title` (string)
- `excerpt` (string)
- `author` (string|null)
- `publishedAt` (timestamp)
- `fetchedAt` (timestamp)
- `lang` (string)
- `region` (string optional)
- `content` (map)
  - `text` (string or truncated string)
  - `wordCount` (number)
  - `hash` (string) // content hash for change detection
- `image` (map)
  - `url` (string)
  - `score` (number)
  - `width`, `height` (number)
  - `type` (string, e.g. `og|jsonld|body`)
- `quality` (map)
  - `clickbaitScore` (number 0..100)
  - `isLowQuality` (bool)
  - `reasons` (array<string>)
- `lifecycle` (string enum: `queued|processed|clustered|published|archived|blocked`)
- `clusterId` (string|null)
- `editor` (map)
  - `pinned` (bool)
  - `hidden` (bool)
  - `overrideTitle` (string|null)
  - `overrideCategory` (string|null)
  - `overrideSummary` (array<string>|null)
  - `lastEditedBy` (uid|null)
  - `lastEditedAt` (timestamp|null)
- `entities` (map)
  - `people` (array<string>)
  - `orgs` (array<string>)
  - `places` (array<string>)
- `embedding` (vector) (optional)
- `createdAt`, `updatedAt`
- `expireAt` (timestamp) // Firestore TTL for auto-archive (or raw retention)

**Index notes**
- Composite index: `lifecycle + publishedAt desc`
- Composite index: `lang + publishedAt desc`
- Composite index: `sourceId + publishedAt desc`
- Composite index: `clusterId + publishedAt asc`

### 4) `clusters/{clusterId}`
Your “Story” object.

**Fields**
- `title` (string)
- `summary` (array<string>, optional)
- `category` (string)
- `createdAt`, `updatedAt`
- `firstSeenAt`, `lastSeenAt` (timestamp)
- `lang` (string)
- `region` (string|null)
- `stats` (map)
  - `articleCount` (number)
  - `sourceCount` (number)
  - `hotnessScore` (number)
  - `velocityScore` (number) // growth rate
  - `diversityScore` (number) // cross-source spread
  - `engagementScore` (number) // optional proxy
- `editor` (map)
  - `pinned` (bool)
  - `hidden` (bool)
  - `mergedInto` (clusterId|null)
  - `manualTitle` (string|null)
  - `manualSummary` (array<string>|null)
  - `lastEditedBy`, `lastEditedAt`
- `entities` (map)
  - `people`, `orgs`, `places` (array<string>)
- `timeline` (map)
  - `lastArticleAt` (timestamp)
- `expireAt` (timestamp) // TTL after N days if you want to prune

**Subcollections (recommended)**
- `clusters/{clusterId}/items/{articleId}`
  - `publishedAt` (timestamp)
  - `sourceId` (string)
  - `angle` (string optional)
  - `rank` (number)

This avoids writing large arrays onto the cluster doc.

### 5) Queue: `jobs/{jobId}`
Distributed job queue with lease system.

**Fields**
- `type` (string enum: `sweep_feed|fetch_url|process_article|cluster_update|summarize_cluster`)
- `priority` (number)
- `payload` (map) // feedId, url, etc
- `status` (string enum: `queued|leased|running|succeeded|failed|dead`)
- `lease` (map)
  - `holder` (string) // worker instance id
  - `expiresAt` (timestamp)
- `attempts` (number)
- `maxAttempts` (number)
- `lastError` (map)
  - `code` (string)
  - `message` (string)
  - `at` (timestamp)
- `createdAt`, `updatedAt`
- `nextRunAt` (timestamp)
- `expireAt` (timestamp) // TTL for cleanup

**Query pattern**
- Workers query `status==queued` and `nextRunAt<=now` order by `priority desc, createdAt asc` limit N
- Use transaction to set `status=leased`, `lease.expiresAt=now+X`.

### 6) Replay store (debug): `job_payloads/{jobId}` (optional)
Store raw HTML/headers for replay.

**Fields**
- `jobId`
- `request` (map)
- `responseMeta` (map)
- `rawHtml` (string, compressed if possible)
- `createdAt`
- `expireAt` (timestamp) // TTL to control cost

### 7) Admin config / kill switches: `config/{docId}`
**Docs**
- `config/runtime`
  - `ingestionPaused` (bool)
  - `scrapeFallbackPaused` (bool)
  - `maxConcurrency` (number)
  - `costGuard` (map)
    - `maxJobsPerMin` (number)
    - `maxWritesPerMin` (number)
- `config/ranking`
  - weights for hotness/velocity/diversity
- `config/qualityRules`
  - thresholds and toggles

### 8) RBAC: `roles/{uid}`
**Fields**
- `role` (string enum: `owner|editor|analyst|readonly`)
- `createdAt`, `updatedAt`

### 9) Audit log: `audit/{eventId}`
**Fields**
- `actorUid` (string)
- `action` (string, e.g. `feed.disable`, `cluster.pin`)
- `targetType` (string)
- `targetId` (string)
- `diff` (map)
- `at` (timestamp)

### 10) Alerts: `alerts/{alertId}`
Keyword/source/topic subscriptions.

**Fields**
- `ownerUid` (string)
- `type` (string enum: `keyword|source|entity|clusterHotness`)
- `query` (string) // keyword or entity
- `sourceId` (string|null)
- `lang` (string|null)
- `threshold` (map)
  - `hotnessMin` (number|null)
  - `velocityMin` (number|null)
- `channel` (map)
  - `webhookUrl` (string|null)
  - `email` (string|null)
  - `push` (bool)
- `active` (bool)
- `createdAt`, `updatedAt`

**Delivery** (optional)
- `alerts/{alertId}/events/{eventId}`
  - `clusterId`, `articleId`, `triggeredAt`, `payload`

### 11) Rate limiting & API keys: `apiKeys/{keyId}`
**Fields**
- `name` (string)
- `ownerUid` (string)
- `tier` (string enum: `free|pro|internal`)
- `limits` (map)
  - `rpm` (number)
  - `rpd` (number)
- `active` (bool)
- `createdAt`, `updatedAt`

**Counters**
- `rateLimits/{keyId}_{yyyyMMddHHmm}`
  - `count` (number) // FieldValue.increment
  - `expireAt` (timestamp) // TTL (e.g., 2 days)

---

## B) Security Rules Notes (high-level)

- Public API reads only from:
  - `articles` where `lifecycle == 'published'` and `editor.hidden != true`
  - `clusters` where `editor.hidden != true`
- Admin writes require role checks from `roles/{uid}`.
- All queue and config writes should be **server-only** (service account).

---

## C) Analytics Model (cost-safe)

### Distributed counters (cheap writes, cheap reads)
Use rolling time buckets to avoid massive fanout.

**Collections**
- `metrics_ingestion/{yyyyMMddHH}` → `{ articles: inc, jobs: inc, failures: inc }`
- `metrics_sources/{sourceId}_{yyyyMMdd}` → `{ articles: inc, failures: inc }`
- `metrics_clusters/{clusterId}_{yyyyMMddHH}` → `{ views: inc, clicks: inc }`

Set TTL to prune older buckets.

---

# Admin Control-Room UI (Queue + Clusters + Health)

Below is a **single-screen “war room” layout** designed for fast ops.

---

## 1) Layout Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│ Top Bar:  Search ▢▢  |  Pause Ingestion [toggle] |  Env: prod | Me │
├────────────────────────────────────────────────────────────────────┤
│ Left Nav                                                         │
│  • Control Room  • Sources  • Feeds  • Queue  • Clusters          │
│  • Quality Rules • Alerts   • API Keys • Audit Log                │
├────────────────────────────────────────────────────────────────────┤
│ CONTROL ROOM (single dashboard)                                   │
│                                                                    │
│ [KPI Tiles]                                                       │
│  Ingest/min  Jobs/min  Fail/min  P95 job latency  Cost guard       │
│                                                                    │
│ [Live Queue Stream]                 [Feed Health Heatmap]          │
│  - running now (URLs)                - top failing feeds           │
│  - leased/queued counts              - reliability score           │
│  - last errors                        - cooldown timers            │
│                                                                    │
│ [Trending Clusters]                 [Cluster Drill Preview]        │
│  - hotness + velocity                - selected cluster timeline   │
│  - source diversity                  - top entities                │
│  - pinned/hidden actions             - articles list               │
│                                                                    │
│ [Error Inbox]                        [Actions]                     │
│  - recurring failures                - replay job                  │
│  - blocked domains                   - disable feed                │
│  - 403/404 patterns                  - adjust crawl rate           │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2) Core Screens + Components

### A) Control Room (default landing)
**Sections**
- KPI Tiles (near real-time)
- Live Queue Stream (onSnapshot)
- Feed Health Heatmap
- Trending Clusters
- Error Inbox

**Actions available everywhere**
- Pause ingestion (kill switch)
- Disable feed
- Replay job
- Pin/hide cluster

### B) Queue Monitor
**Table columns**
- `status`, `type`, `priority`, `attempts`, `lease.expiresAt`, `payload.url/feedId`, `lastError`

**Filters**
- status: queued/leased/running/failed
- type
- feedId/sourceId
- “only recurring failures”

**Buttons**
- Retry now
- Dead-letter
- Replay with debug capture

### C) Cluster Workbench
**Left:** clusters list (hotness, velocity, diversity)  
**Right:** cluster details
- timeline
- articles list
- entity chips
- editorial overrides
- merge/split tools

### D) Feed Health
- heatmap by feed reliability
- graph: errors vs success over time
- auto-heal events & cooldown countdown

---

## 3) UX Details that make it feel “pro”
- Show **job lease countdown** with “stuck job” detection
- “Why this feed is failing” panel (403, robots, selector mismatch)
- One-click: “lower crawl rate”, “pause for 30 min”, “disable fallback scraping”
- Cluster timeline: “breaking” vs “follow-up” labels

---

# Feature → Cost Impact Map (Firebase-first)

This maps features to the **cost drivers**: reads, writes, storage, egress, and function time.

> Firebase billing pain usually comes from: **high fanout writes**, **unbounded listeners**, **large docs**, **chatty admin UI**, and **full reprocessing loops**.

---

## Cost Cheatsheet (Rules of Thumb)
- Prefer **subcollections** over growing arrays.
- Prefer **time-bucket counters** over per-event writes.
- Keep admin UI listeners **scoped** (top 50, last 1h).
- Use **TTL** aggressively for jobs, debug payloads, metric buckets.

---

## Cost Table

### 1) RBAC + Audit Logs
- **Writes:** low (only on admin actions)
- **Reads:** low
- **Storage:** low
- **Risk:** none

### 2) Lifecycle states + TTL archiving
- **Writes:** moderate (state transitions)
- **Reads:** reduces public reads by filtering old content
- **Storage:** reduced with TTL
- **Risk:** none (good cost saver)

### 3) Quality filters (min word count, clickbait regex)
- **Function time:** moderate (parsing)
- **Writes:** small extra fields
- **Cost:** usually small, saves downstream costs

### 4) Manual editorial overrides
- **Writes:** low
- **Reads:** low
- **Cost:** tiny

### 5) API keys + rate limiting
- **Writes:** adds counter increments (can be medium)
- **Reads:** 1–2 reads per request if not cached
- **Optimize:** verify key via in-memory cache on edge, bucket counters per minute w/ TTL

### 6) Geo/lang detection
- **Function time:** low–moderate
- **Writes:** small
- **Cost:** small

### 7) Feed auto-healing + adaptive crawl
- **Writes:** moderate (health updates)
- **Saves:** big savings by reducing useless crawls
- **Net:** usually cost-negative (saves money)

### 8) Trend velocity metrics
- **Writes:** use bucketed counters; moderate
- **Reads:** cheap
- **Risk:** if you update too frequently per article → costs climb

### 9) Entity extraction
- **Function time:** medium if NLP heavy
- **Writes:** arrays of strings
- **Optimize:** limit to top N entities; dedupe

### 10) Alerts/subscriptions
- **Reads:** can spike if implemented via polling
- **Best:** trigger on cluster updates; evaluate only relevant alerts
- **Cost:** medium if many users

### 11) Replayable jobs (raw HTML store)
- **Storage:** high if you store raw HTML
- **Best:** TTL 24–72h + store only on failure
- **Cost:** controlled if TTL is strict

### 12) Vector search (embeddings)
- **Writes:** adds vector field
- **Storage:** higher per doc
- **Function time:** embedding generation costs (external API)
- **Best:** do embeddings at cluster-level first (not every article)

### 13) AI summarization/tags
- **External API cost:** potentially highest
- **Optimize:** summarize clusters, not articles; cache results; only summarize hot clusters

---

# Positioning: “News Intelligence Platform” (not just an aggregator)

## The positioning shift
**Aggregator** = collects links.  
**Intelligence platform** = turns news into **structured signals**.

## Your 4 core pillars
1) **Signal Quality**: dedupe, quality filters, attribution, lifecycle controls
2) **Story Graph**: clustering + timelines + entities + narrative angles
3) **Trend Engine**: velocity + diversity + hotness = early detection
4) **Action Layer**: alerts, webhooks, API keys, dashboards

## One-line pitch
“Real-time news signals, clustered into evolving stories, with reliability scoring and trend velocity—delivered via an API and ops-grade control room.”

## 3 buyer personas (choose 1–2 for focus)
- **Creators/Media**: find what’s trending early + story summaries
- **Brands/PR**: alerts on company/entity mentions + sentiment/angles
- **Investors/Analysts**: trend velocity + source diversity + narrative shifts

## Moat language (investor-friendly)
- “Serverless distributed ingestion + lease queue (infinite scale)”
- “Cost-aware crawl intelligence (adaptive + auto-heal)”
- “Story graph with timeline + entity intelligence (structured news)”

---

# Next Implementation Steps (Fast)

## Step 1 — Add collections + security
- `roles`, `audit`, `config`, `apiKeys`, `rateLimits` buckets

## Step 2 — Upgrade ingestion pipeline
- lifecycle states
- feed health scoring + cooldown
- content hash change detection

## Step 3 — Control Room UI
- onSnapshot listeners (scoped)
- drill-down pages: queue, clusters, feeds

## Step 4 — Trend + entity + alerts
- bucketed metrics
- entity extraction top N
- alert triggers on cluster updates

