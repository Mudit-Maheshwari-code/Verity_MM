// ─────────────────────────────────────────────────────────────────────────────
// @verity/shared — Shared TypeScript types
// Used by both apps/api and apps/web
// ─────────────────────────────────────────────────────────────────────────────

// ── Review model ─────────────────────────────────────────────────────────────

/** The canonical internal representation of a single review, regardless of source */
export interface Review {
  id: string;                    // "{sourceId}:{original_review_id}"
  sourceId: string;              // e.g. "diffbot", "scraper-amazon", "scraper-flipkart", "mock-amazon"
  sourceName: string;            // e.g. "Amazon", "Flipkart"
  sourceUrl: string;             // Link back to the original product listing
  listingTitle?: string;         // Product title as listed on that store
  rating: number;                // Always 1–5 (normalized from any scale)
  title: string;
  body: string;                  // Full review text
  date: string;                  // ISO 8601 date string
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  reviewerHandle: string;        // Public display name only — no PII
  flags: ReviewFlag[];           // Populated by the analysis engine
}

export type ReviewFlag =
  | 'counterfeit_mention'
  | 'wrong_item'
  | 'packaging_issue'
  | 'quality_inconsistency'
  | 'possibly_fake_review'
  | 'duplicate_phrase'
  | 'generic_review';

// ── Authenticity signal ───────────────────────────────────────────────────────

export type SignalSeverity = 'high' | 'medium' | 'low';

export interface SignalResult {
  signalId: string;              // e.g. "counterfeit_mentions"
  severity: SignalSeverity;
  label: string;                 // Short human label
  description: string;           // Full sentence — shown in UI
  affectedCount: number;         // Number of reviews that triggered this signal
  totalReviews: number;
  evidence: ReviewExcerpt[];     // Up to 3 supporting excerpts
}

export interface ReviewExcerpt {
  reviewId: string;
  sourceId: string;
  sourceName: string;
  snippet: string;               // Short excerpt (≤200 chars) highlighting the signal
  rating: number;
}

// ── Authenticity report ───────────────────────────────────────────────────────

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface AuthenticityReport {
  score: number;                 // 0–100 (100 = very likely genuine)
  confidence: ConfidenceLevel;   // Based on total review count
  signals: SignalResult[];       // Active signals, sorted by severity desc
  summary: string;               // 1-sentence plain-English verdict
  reviewCount: number;           // Total reviews analyzed
  sourceCount: number;           // Number of distinct sources
}

// ── Source metadata ───────────────────────────────────────────────────────────

export type DataType = 'diffbot-extract' | 'licensed-third-party' | 'official-api' | 'scraper' | 'mock';

export interface SourceMeta {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  dataType: DataType;
  reviewCount: number;
  averageRating: number;
  error?: string;                // Set if this source failed but others succeeded
}

// ── API request / response shapes ────────────────────────────────────────────

export interface SearchRequest {
  query: string;                 // Product name OR store URL
}

export interface SearchResponse {
  cacheId: string;               // Stable ID for this result set (for sharing)
  productTitle: string;          // Best-guess normalized product title
  isDemo: boolean;               // True when using mock data
  sources: SourceMeta[];
  reviews: Review[];
  report: AuthenticityReport;
  fetchedAt: string;             // ISO 8601
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
