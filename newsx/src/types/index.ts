export type Role = 'owner' | 'editor' | 'analyst' | 'viewer';

export interface User {
  uid: string;
  email: string;
  role: Role;
  lastLogin: Date; // Timestamp in Firestore
}

export type ArticleLifecycle = 'queued' | 'processed' | 'clustered' | 'published' | 'archived' | 'blocked';

export interface Article {
  id: string;
  title: string;
  url: string;
  sourceId: string;
  clusterId: string | null;
  content: string;
  summary: string;
  image: string;
  lifecycle: ArticleLifecycle;
  qualityScore: number;
  publishedAt: Date;
  fetchedAt: Date;
  lang: string;
  region?: 'IN' | 'US' | 'GLOBAL';
  entities?: {
    people: string[];
    companies: string[];
    locations: string[];
  };
  // Ingestion tracking
  fetchError?: string;
  lastFetchedAt?: Date;
  processingLock?: {
    worker: string;
    lockedAt: Date;
  };
  // Content enrichment
  readingTime?: number; // minutes
  keywords?: string[];
  author?: string;
  category?: string;
}

export interface Cluster {
  id: string;
  title: string;
  summaryBullets: string[];
  category: 'Tech' | 'Finance' | 'Politics' | string;
  sentiment?: 'Positive' | 'Negative' | 'Neutral';
  articleCount: number;
  velocity: number;
  hotnessScore: number;
  narrativeAngles?: string[];
  updatedAt: Date;
}

export type FeedHealthStatus = 'healthy' | 'warning' | 'error' | 'disabled';

export interface FeedHealth {
  status: FeedHealthStatus;
  reliabilityScore: number;
  lastCheck: Date;
  lastSuccess?: Date;
  errorCount24h: number;
  consecutiveFailures: number;
  lastError?: string;
  avgResponseTime?: number;
}

export interface Feed {
  id: string;
  sourceId: string;
  url: string;
  type: 'rss' | 'atom' | 'sitemap' | 'html';
  active: boolean;
  health: FeedHealth;
  // Advanced Fetching
  fetchIntervalMinutes?: number;
  lastFetchedAt?: any; // Firestore Timestamp
  lastSeenArticleDate?: any; // Firestore Timestamp
  updatedAt?: any;
  // Smart Caching
  lastContentHash?: string;
  lastETag?: string;
  lastModified?: string;
  recentHashes?: string[]; // Optimization: hash of last 50-100 article URLs to skip DB checks
}

export interface QueueJob {
  id: string;
  type: 'sweep_feed' | 'fetch_url' | 'process_article' | 'cluster_update';
  priority: number;
  status: 'queued' | 'leased' | 'running' | 'succeeded' | 'failed';
  attempts: number;
  nextRunAt: Date;
}

