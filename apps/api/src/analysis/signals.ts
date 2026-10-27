// ─────────────────────────────────────────────────────────────────────────────
// Authenticity Signal Detectors
//
// Each function takes the full normalized review array and returns a
// SignalResult if the signal fires, or null if it does not.
//
// Design principles:
//   - Every threshold has an explanation comment above it
//   - No magic numbers without rationale
//   - Signals are independent — they don't call each other
//   - Evidence excerpts are capped at 3 to keep responses lean
// ─────────────────────────────────────────────────────────────────────────────

import { Review, SignalResult, SignalSeverity, ReviewExcerpt } from '@verity/shared';
import { KEYWORD_SIGNALS, KeywordSignal } from './keywords';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract a short snippet from review body that contains the matched keyword.
 * Centers the snippet on the keyword with context on both sides.
 */
function extractSnippet(body: string, keyword: string, maxLen = 180): string {
  const lower = body.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return body.slice(0, maxLen) + (body.length > maxLen ? '…' : '');
  const start = Math.max(0, idx - 60);
  const end = Math.min(body.length, idx + keyword.length + 100);
  const snippet = (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
  return snippet.slice(0, maxLen + 2);
}

/**
 * Given a fraction (0-1) and two thresholds, return the severity level or null.
 */
function getSeverity(
  fraction: number,
  thresholdMedium: number,
  thresholdHigh: number
): SignalSeverity | null {
  if (fraction >= thresholdHigh) return 'high';
  if (fraction >= thresholdMedium) return 'medium';
  return null;
}

/**
 * Build up to 3 ReviewExcerpt objects from matching reviews.
 */
function buildEvidence(reviews: Review[], keyword: string, matchedIds: Set<string>): ReviewExcerpt[] {
  const evidence: ReviewExcerpt[] = [];
  for (const r of reviews) {
    if (!matchedIds.has(r.id)) continue;
    evidence.push({
      reviewId: r.id,
      sourceId: r.sourceId,
      sourceName: r.sourceName,
      snippet: extractSnippet(r.body, keyword),
      rating: r.rating,
    });
    if (evidence.length >= 3) break;
  }
  return evidence;
}

// ── Signal 1: Keyword-based detectors ────────────────────────────────────────

/**
 * Scans all review bodies for a set of keywords associated with a specific
 * signal category (counterfeit, wrong item, packaging, quality).
 * Returns a SignalResult if enough reviews match, null otherwise.
 */
export function detectKeywordSignal(
  reviews: Review[],
  signal: KeywordSignal
): SignalResult | null {
  if (reviews.length === 0) return null;

  const matchedIds = new Set<string>();
  let firstMatchedKeyword = signal.keywords[0];

  for (const review of reviews) {
    const bodyLower = (review.body + ' ' + review.title).toLowerCase();
    for (const kw of signal.keywords) {
      if (bodyLower.includes(kw.toLowerCase())) {
        matchedIds.add(review.id);
        // Tag the review with the appropriate flag
        if (!review.flags.includes(signal.reviewFlag)) {
          review.flags.push(signal.reviewFlag);
        }
        if (matchedIds.size === 1) firstMatchedKeyword = kw;
        break; // Only one keyword match per review needed
      }
    }
  }

  const affectedCount = matchedIds.size;
  const fraction = affectedCount / reviews.length;
  const severity = getSeverity(fraction, signal.thresholdMedium, signal.thresholdHigh);

  if (!severity) return null;

  const evidence = buildEvidence(reviews, firstMatchedKeyword, matchedIds);
  const pct = Math.round(fraction * 100);

  return {
    signalId: signal.id,
    severity,
    label: signal.label,
    description: `${affectedCount} of ${reviews.length} reviews (${pct}%) mention ${signal.label.toLowerCase()}.`,
    affectedCount,
    totalReviews: reviews.length,
    evidence,
  };
}

// ── Signal 2: Unverified 5-star review spike ─────────────────────────────────

/**
 * Detects a sudden cluster of unverified 5-star reviews within a short window.
 *
 * Threshold rationale:
 *   - Window: 14 days — review farms often push a batch quickly then go quiet
 *   - Min cluster size: 5 — fewer than 5 could be coincidence
 *   - Min fraction of total: 15% — the spike must be significant relative to all reviews
 *     to avoid flagging products with huge genuine review volumes
 */
export function detectReviewSpike(reviews: Review[]): SignalResult | null {
  const WINDOW_DAYS = 14;
  const MIN_CLUSTER = 5;
  const MIN_FRACTION = 0.15;

  // Only consider unverified 5-star reviews with a parseable date
  const suspicious = reviews.filter(
    (r) => r.rating === 5 && !r.isVerifiedPurchase && r.date !== 'unknown'
  );

  if (suspicious.length < MIN_CLUSTER) return null;

  // Sort by date ascending
  const sorted = [...suspicious].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Sliding window: find the densest cluster
  let maxCluster: Review[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const windowStart = new Date(sorted[i].date).getTime();
    const windowEnd = windowStart + WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const cluster = sorted.filter(
      (r) => new Date(r.date).getTime() <= windowEnd && new Date(r.date).getTime() >= windowStart
    );
    if (cluster.length > maxCluster.length) maxCluster = cluster;
  }

  if (maxCluster.length < MIN_CLUSTER) return null;
  if (maxCluster.length / reviews.length < MIN_FRACTION) return null;

  // Flag each review in the cluster
  for (const r of maxCluster) {
    if (!r.flags.includes('possibly_fake_review')) r.flags.push('possibly_fake_review');
  }

  const matchedIds = new Set(maxCluster.map((r) => r.id));
  const evidence = buildEvidence(maxCluster, '', matchedIds);
  const severity: SignalSeverity = maxCluster.length >= 8 ? 'high' : 'medium';

  return {
    signalId: 'review_spike',
    severity,
    label: 'Suspicious review spike',
    description: `${maxCluster.length} unverified 5-star reviews appeared within a 14-day window — a pattern associated with review farming.`,
    affectedCount: maxCluster.length,
    totalReviews: reviews.length,
    evidence,
  };
}

// ── Signal 3: Bimodal rating distribution ────────────────────────────────────

/**
 * Detects a bimodal (1s and 5s) rating distribution which indicates
 * possible review brigading or astroturfing.
 *
 * Threshold rationale:
 *   - If >80% of reviews are either 1★ or 5★ with very few 2-4★ reviews,
 *     this is statistically unusual for a genuine product
 *   - Requires at least 15 reviews to be meaningful
 *   - HIGH if >90%, MEDIUM if >80%
 */
export function detectRatingAnomaly(reviews: Review[]): SignalResult | null {
  const MIN_REVIEWS = 15;
  if (reviews.length < MIN_REVIEWS) return null;

  const extremes = reviews.filter((r) => r.rating === 1 || r.rating === 5);
  const fraction = extremes.length / reviews.length;

  const severity = getSeverity(fraction, 0.80, 0.90);
  if (!severity) return null;

  const matchedIds = new Set(extremes.map((r) => r.id));
  const evidence = buildEvidence(reviews, '', matchedIds);
  const pct = Math.round(fraction * 100);

  return {
    signalId: 'rating_anomaly',
    severity,
    label: 'Polarized rating distribution',
    description: `${pct}% of reviews are either 1★ or 5★, with very few mid-range ratings — a pattern associated with astroturfing or review brigading.`,
    affectedCount: extremes.length,
    totalReviews: reviews.length,
    evidence,
  };
}

// ── Signal 4: Low verified purchase ratio ────────────────────────────────────

/**
 * Flags when the verified purchase ratio falls unusually low across a
 * sufficient number of reviews.
 *
 * Threshold rationale:
 *   - <30% verified across ≥20 reviews: LOW signal
 *   - <15% verified across ≥20 reviews: MEDIUM signal
 *   - Requires ≥20 reviews because small samples skew easily
 *   - Note: Flipkart may not return verified purchase flags reliably;
 *     this signal is more relevant for Amazon data
 */
export function detectVerifiedPurchaseRatio(reviews: Review[]): SignalResult | null {
  const MIN_REVIEWS = 20;
  if (reviews.length < MIN_REVIEWS) return null;

  const verified = reviews.filter((r) => r.isVerifiedPurchase).length;
  const fraction = verified / reviews.length;
  const unverifiedFraction = 1 - fraction;

  // Note: thresholds are on the unverified fraction
  const severity = getSeverity(unverifiedFraction, 0.70, 0.85);
  if (!severity) return null;

  const pct = Math.round(fraction * 100);

  return {
    signalId: 'low_verified_ratio',
    severity,
    label: 'Low verified purchase rate',
    description: `Only ${pct}% of ${reviews.length} reviews are from verified purchasers — significantly below the typical rate for genuine products.`,
    affectedCount: reviews.length - verified,
    totalReviews: reviews.length,
    evidence: [],
  };
}

// ── Signal 5: Near-duplicate phrase detection ────────────────────────────────

/**
 * Detects reviews that share suspiciously identical multi-word phrases —
 * a hallmark of review farming where the same template is reused.
 *
 * Threshold rationale:
 *   - Phrase length: ≥8 words — shorter phrases may coincidentally match
 *   - Min occurrences: ≥3 reviews sharing the same phrase = signal
 *   - MEDIUM severity; review farming evidence alone isn't definitive
 */
export function detectPhraseDuplication(reviews: Review[]): SignalResult | null {
  const MIN_PHRASE_WORDS = 8;
  const MIN_OCCURRENCES = 3;

  // Build a map of normalized 8-word n-grams → review IDs that contain them
  const phraseMap = new Map<string, string[]>();

  for (const review of reviews) {
    const words = review.body.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i <= words.length - MIN_PHRASE_WORDS; i++) {
      const phrase = words.slice(i, i + MIN_PHRASE_WORDS).join(' ');
      if (!phraseMap.has(phrase)) phraseMap.set(phrase, []);
      phraseMap.get(phrase)!.push(review.id);
    }
  }

  // Find the phrase with the most matches
  let topPhrase = '';
  let topIds: string[] = [];
  for (const [phrase, ids] of phraseMap.entries()) {
    const unique = [...new Set(ids)];
    if (unique.length > topIds.length) {
      topPhrase = phrase;
      topIds = unique;
    }
  }

  if (topIds.length < MIN_OCCURRENCES) return null;

  const matchedIds = new Set(topIds);

  // Flag affected reviews
  for (const r of reviews) {
    if (matchedIds.has(r.id) && !r.flags.includes('duplicate_phrase')) {
      r.flags.push('duplicate_phrase');
    }
  }

  const evidence = buildEvidence(reviews, topPhrase, matchedIds);
  const severity: SignalSeverity = topIds.length >= 5 ? 'high' : 'medium';

  return {
    signalId: 'phrase_duplication',
    severity,
    label: 'Duplicate review phrases',
    description: `${topIds.length} reviews share identical phrasing ("${topPhrase.slice(0, 60)}…") — consistent with templated fake reviews.`,
    affectedCount: topIds.length,
    totalReviews: reviews.length,
    evidence,
  };
}

// ── Signal 6: Cross-source rating dissonance ──────────────────────────────────

/**
 * Detects when Amazon and Flipkart ratings for the same product differ
 * significantly, which can indicate rating manipulation on one platform.
 *
 * Threshold rationale:
 *   - ≥1.5 star gap: MEDIUM — noticeable but could reflect seller differences
 *   - ≥2.0 star gap: HIGH — very unlikely to occur for the same genuine product
 *   - Requires ≥8 reviews per source for statistical reliability
 */
export function detectCrossSourceDissonance(reviews: Review[]): SignalResult | null {
  const MIN_PER_SOURCE = 8;
  const MEDIUM_GAP = 1.5;
  const HIGH_GAP = 2.0;

  // Group by source
  const bySource = new Map<string, Review[]>();
  for (const r of reviews) {
    if (!bySource.has(r.sourceName)) bySource.set(r.sourceName, []);
    bySource.get(r.sourceName)!.push(r);
  }

  const sources = [...bySource.entries()].filter(([, rs]) => rs.length >= MIN_PER_SOURCE);
  if (sources.length < 2) return null;

  const avgs = sources.map(([name, rs]) => ({
    name,
    avg: rs.reduce((sum, r) => sum + r.rating, 0) / rs.length,
    count: rs.length,
  }));

  const maxAvg = Math.max(...avgs.map((s) => s.avg));
  const minAvg = Math.min(...avgs.map((s) => s.avg));
  const gap = maxAvg - minAvg;

  const severity = getSeverity(gap, MEDIUM_GAP, HIGH_GAP);
  if (!severity) return null;

  const highSrc = avgs.find((s) => s.avg === maxAvg)!;
  const lowSrc = avgs.find((s) => s.avg === minAvg)!;

  return {
    signalId: 'cross_source_dissonance',
    severity,
    label: 'Cross-store rating gap',
    description: `${highSrc.name} averages ${highSrc.avg.toFixed(1)}★ across ${highSrc.count} reviews, while ${lowSrc.name} averages ${lowSrc.avg.toFixed(1)}★ across ${lowSrc.count} — a ${gap.toFixed(1)}-star gap suggests rating manipulation on one platform.`,
    affectedCount: reviews.length,
    totalReviews: reviews.length,
    evidence: [],
  };
}

// ── Signal 7: J-shaped rating distribution ───────────────────────────────────

/**
 * Detects J-shaped rating distribution (mostly 5★, almost no 2-4★).
 * Threshold: 5★ > 80% AND 2-4★ < 10% -> MEDIUM
 * Threshold: 5★ > 90% AND 2-4★ < 5% -> HIGH
 * Requires >= 15 reviews.
 */
export function detectJShapedDistribution(reviews: Review[]): SignalResult | null {
  const MIN_REVIEWS = 15;
  if (reviews.length < MIN_REVIEWS) return null;

  const total = reviews.length;
  const count5 = reviews.filter((r) => r.rating === 5).length;
  const count2to4 = reviews.filter((r) => r.rating >= 2 && r.rating <= 4).length;

  const frac5 = count5 / total;
  const frac2to4 = count2to4 / total;

  let severity: SignalSeverity | null = null;
  if (frac5 > 0.90 && frac2to4 < 0.05) {
    severity = 'high';
  } else if (frac5 > 0.80 && frac2to4 < 0.10) {
    severity = 'medium';
  }

  if (!severity) return null;

  const affected = reviews.filter((r) => r.rating === 5);
  const matchedIds = new Set(affected.map((r) => r.id));
  const evidence = buildEvidence(reviews, '', matchedIds);
  const pct5 = Math.round(frac5 * 100);
  const pct2to4 = Math.round(frac2to4 * 100);

  return {
    signalId: 'j_shaped_distribution',
    severity,
    label: 'Suspicious rating pattern',
    description: `${pct5}% of reviews are 5-star while only ${pct2to4}% are 2-4 stars — a J-shaped distribution commonly seen in manipulated reviews.`,
    affectedCount: count5,
    totalReviews: total,
    evidence,
  };
}

// ── Signal 8: Generic Language ───────────────────────────────────────────────

/**
 * Flags reviews that use overly generic praise without product-specific details.
 * Threshold: >25% -> MEDIUM, >40% -> HIGH
 * Requires >= 10 reviews.
 */
export function detectGenericLanguage(reviews: Review[]): SignalResult | null {
  const MIN_REVIEWS = 10;
  if (reviews.length < MIN_REVIEWS) return null;

  const genericPhrases = ["great", "good", "excellent", "amazing", "best", "awesome", "nice", "perfect", "love it", "highly recommend"];
  const matchedIds = new Set<string>();

  // Extract corpus vocabulary (words > 4 letters) from longer reviews to approximate product-specific nouns
  const corpusWords = new Map<string, number>();
  for (const r of reviews) {
    const words = (r.title + " " + r.body).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 4);
    if (words.length > 5) {
      for (const w of words) corpusWords.set(w, (corpusWords.get(w) || 0) + 1);
    }
  }
  // Top 10 frequent long words as "product nouns"
  const topCorpusWords = [...corpusWords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);

  for (const r of reviews) {
    const text = (r.title + " " + r.body).toLowerCase();
    const words = text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const uniqueWords = new Set(words);
    const diversity = uniqueWords.size / words.length;

    let isGeneric = false;

    if (words.length < 15) {
      // Very short reviews with generic phrases and NO top corpus words
      const hasGeneric = genericPhrases.some(phrase => text.includes(phrase));
      const hasProductNouns = topCorpusWords.some(w => text.includes(w));
      if (hasGeneric && !hasProductNouns) {
        isGeneric = true;
      }
    } else if (diversity < 0.5) {
      // Low lexical diversity
      isGeneric = true;
    }

    if (isGeneric) {
      matchedIds.add(r.id);
      if (!r.flags.includes('generic_review' as any)) {
        r.flags.push('generic_review' as any);
      }
    }
  }

  const fraction = matchedIds.size / reviews.length;
  const severity = getSeverity(fraction, 0.25, 0.40);

  if (!severity) return null;

  const evidence = buildEvidence(reviews, '', matchedIds);
  const pct = Math.round(fraction * 100);

  return {
    signalId: 'generic_language',
    severity,
    label: 'Generic review language',
    description: `${pct}% of reviews use overly generic praise or lack product-specific details, which often indicates inauthentic reviews.`,
    affectedCount: matchedIds.size,
    totalReviews: reviews.length,
    evidence,
  };
}

// ── Export all detectors ──────────────────────────────────────────────────────

export const ALL_KEYWORD_SIGNAL_DETECTORS = KEYWORD_SIGNALS;
