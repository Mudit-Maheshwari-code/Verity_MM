// ─────────────────────────────────────────────────────────────────────────────
// Review Normalizer
//
// Validates, clamps, and sanitizes reviews coming from any adapter before
// passing them to the analysis engine.
//
// Responsibilities:
//   1. Reject reviews missing required fields (id, body, rating)
//   2. Clamp rating to [1, 5]
//   3. Ensure date is a parseable ISO string (fallback: 'unknown')
//   4. Sanitize reviewerHandle (trim, max 50 chars)
//   5. Initialize flags to [] so the engine can safely push to it
//   6. Deduplicate by id within the batch
// ─────────────────────────────────────────────────────────────────────────────

import { Review } from '@verity/shared';
import { RawReviewBatch } from '../adapters/base.adapter';

/**
 * Checks whether a string is a parseable date.
 * Accepts ISO 8601 strings and common date formats.
 * Returns 'unknown' if the date cannot be parsed.
 */
function normalizeDate(raw: string): string {
  if (!raw || raw === 'unknown') return 'unknown';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return 'unknown';
  return d.toISOString();
}

/**
 * Normalize and validate all reviews in a batch.
 * Invalid reviews are silently dropped (logged in dev).
 * Duplicate IDs within the batch are also dropped.
 */
export function normalizeReviews(batch: RawReviewBatch): Review[] {
  const seen = new Set<string>();
  const valid: Review[] = [];

  for (const review of batch.reviews) {
    // ── Required field checks ──────────────────────────────────────────────
    if (!review.id || typeof review.id !== 'string') {
      console.debug('[Normalizer] Dropped review: missing id');
      continue;
    }
    if (!review.body || review.body.trim().length === 0) {
      console.debug(`[Normalizer] Dropped review ${review.id}: empty body`);
      continue;
    }
    if (typeof review.rating !== 'number' || isNaN(review.rating)) {
      console.debug(`[Normalizer] Dropped review ${review.id}: invalid rating`);
      continue;
    }

    // ── Deduplication ──────────────────────────────────────────────────────
    if (seen.has(review.id)) {
      console.debug(`[Normalizer] Dropped duplicate review id: ${review.id}`);
      continue;
    }
    seen.add(review.id);

    // ── Sanitized copy ─────────────────────────────────────────────────────
    valid.push({
      id: review.id.trim(),
      sourceId: review.sourceId || batch.sourceId,
      sourceName: review.sourceName || batch.sourceName,
      sourceUrl: review.sourceUrl || batch.sourceUrl,
      listingTitle: review.listingTitle || batch.listingTitle,
      // Clamp rating to [1, 5] — some scrapers return out-of-range values
      rating: Math.min(5, Math.max(1, Math.round(review.rating))),
      title: (review.title || '').trim().slice(0, 200),
      body: review.body.trim(),
      date: normalizeDate(review.date),
      isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
      helpfulVotes: Math.max(0, Math.round(review.helpfulVotes || 0)),
      reviewerHandle: (review.reviewerHandle || 'Anonymous').trim().slice(0, 50),
      // Always reset flags — the analysis engine fills these
      flags: [],
    });
  }

  return valid;
}
