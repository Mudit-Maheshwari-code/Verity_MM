// Re-export all types from @verity/shared
// Since we can't directly import via workspace in the web app without extra build config,
// we copy the type definitions here for the frontend.
// These must stay in sync with packages/shared/src/index.ts

export type ReviewFlag =
  | 'counterfeit_mention'
  | 'wrong_item'
  | 'packaging_issue'
  | 'quality_inconsistency'
  | 'possibly_fake_review'
  | 'duplicate_phrase'
  | 'generic_review';

export interface Review {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  listingTitle?: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  reviewerHandle: string;
  flags: ReviewFlag[];
}

export type SignalSeverity = 'high' | 'medium' | 'low';

export interface ReviewExcerpt {
  reviewId: string;
  sourceId: string;
  sourceName: string;
  snippet: string;
  rating: number;
}

export interface SignalResult {
  signalId: string;
  severity: SignalSeverity;
  label: string;
  description: string;
  affectedCount: number;
  totalReviews: number;
  evidence: ReviewExcerpt[];
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface AuthenticityReport {
  score: number;
  confidence: ConfidenceLevel;
  signals: SignalResult[];
  summary: string;
  reviewCount: number;
  sourceCount: number;
}

export type DataType = 'diffbot-extract' | 'licensed-third-party' | 'official-api' | 'scraper' | 'mock';

export interface SourceMeta {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  dataType: DataType;
  reviewCount: number;
  averageRating: number;
  error?: string;
}

export interface SearchResponse {
  cacheId: string;
  productTitle: string;
  isDemo: boolean;
  sources: SourceMeta[];
  reviews: Review[];
  report: AuthenticityReport;
  fetchedAt: string;
}
