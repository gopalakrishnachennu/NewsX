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

export interface Feed {
  id: string;
  sourceId: string;
  url: string;
  type: 'rss' | 'atom' | 'sitemap' | 'html';
  active: boolean;
  health: {
    status: 'healthy' | 'warning' | 'error';
    reliabilityScore: number;
    lastCheck: Date;
    errorCount24h: number;
  };
}

export interface QueueJob {
  id: string;
  type: 'sweep_feed' | 'fetch_url' | 'process_article' | 'cluster_update';
  priority: number;
  status: 'queued' | 'leased' | 'running' | 'succeeded' | 'failed';
  attempts: number;
  nextRunAt: Date;
}
