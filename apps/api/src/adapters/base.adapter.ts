// ─────────────────────────────────────────────────────────────────────────────
// Base adapter interface
// All source adapters (Amazon, Flipkart, mock) must extend BaseAdapter.
// ─────────────────────────────────────────────────────────────────────────────

import { Review, SourceMeta } from '@verity/shared';

/** The raw batch of reviews returned by a single adapter call */
export interface RawReviewBatch {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  listingTitle?: string;
  reviews: Review[];
  /** Set when the adapter encountered an error but returned partial/empty data */
  error?: string;
}

/** Every source adapter must implement this contract */
export abstract class BaseAdapter {
  abstract get sourceId(): string;
  abstract get sourceName(): string;
  abstract get sourceUrl(): string;
  abstract get dataType(): SourceMeta['dataType'];

  /**
   * Returns true when the adapter can operate (i.e. required env vars are set).
   * The orchestrator checks this before including the adapter in a fan-out.
   */
  abstract isAvailable(): boolean;

  /** Fetch reviews for the given query (product name or store URL) */
  abstract fetchReviews(query: string): Promise<RawReviewBatch>;
}
