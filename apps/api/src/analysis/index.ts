// ─────────────────────────────────────────────────────────────────────────────
// Analysis Engine Orchestrator
//
// Takes all normalized reviews and produces an AuthenticityReport by running
// all signal detectors, computing a score, and generating a summary.
//
// Score formula:
//   Start at 100. For each active signal:
//     subtract signal.weight × severity_multiplier
//   HIGH:   multiplier = 15
//   MEDIUM: multiplier = 8
//   LOW:    multiplier = 3
//   Clamp final score to [0, 100].
//
// Confidence:
//   < 10 reviews → 'low'
//   10–30 reviews → 'medium'
//   > 30 reviews → 'high'
// ─────────────────────────────────────────────────────────────────────────────

import { Review, AuthenticityReport, SignalResult, ConfidenceLevel } from '@verity/shared';
import { KEYWORD_SIGNALS } from './keywords';
import {
  detectKeywordSignal,
  detectReviewSpike,
  detectRatingAnomaly,
  detectVerifiedPurchaseRatio,
  detectPhraseDuplication,
  detectCrossSourceDissonance,
  detectJShapedDistribution,
  detectGenericLanguage,
} from './signals';

// Weight associated with non-keyword signals
const NON_KEYWORD_WEIGHTS: Record<string, number> = {
  review_spike: 5,
  rating_anomaly: 4,
  low_verified_ratio: 2,
  phrase_duplication: 3,   // 4 templated reviews in 27 = MEDIUM → 3×8=24 pts
  cross_source_dissonance: 4,
  j_shaped_distribution: 4,
  generic_language: 3,
};

const SEVERITY_MULTIPLIERS: Record<string, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

function computeScore(signals: SignalResult[]): number {
  let score = 100;
  for (const signal of signals) {
    const weight = NON_KEYWORD_WEIGHTS[signal.signalId] ??
      KEYWORD_SIGNALS.find((k) => k.id === signal.signalId)?.weight ?? 3;
    score -= weight * SEVERITY_MULTIPLIERS[signal.severity];
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeConfidence(reviewCount: number): ConfidenceLevel {
  if (reviewCount < 10) return 'low';
  if (reviewCount <= 30) return 'medium';
  return 'high';
}

function generateSummary(score: number, signalCount: number): string {
  if (score >= 80) return 'This product shows strong authenticity signals across reviewed sources.';
  if (score >= 60) return 'This product has mostly positive authenticity signals, though some areas warrant closer attention.';
  if (score >= 40) return 'Notable authenticity concerns detected — review the signals carefully before purchasing.';
  return `Multiple strong counterfeit or fraud signals detected (${signalCount} active signal${signalCount !== 1 ? 's' : ''}) — proceed with significant caution.`;
}

/**
 * Run all signal detectors against the combined review array and return a
 * complete AuthenticityReport. This function mutates Review.flags in-place
 * to stamp individual reviews with the signals that implicated them.
 */
export function analyzeReviews(reviews: Review[]): AuthenticityReport {
  if (reviews.length === 0) {
    return {
      score: 50,
      confidence: 'low',
      signals: [],
      summary: 'Not enough reviews to determine authenticity.',
      reviewCount: 0,
      sourceCount: 0,
    };
  }

  const activeSignals: SignalResult[] = [];

  // ── Keyword-based signals (one detector per entry in KEYWORD_SIGNALS) ──
  for (const keywordSignal of KEYWORD_SIGNALS) {
    const result = detectKeywordSignal(reviews, keywordSignal);
    if (result) activeSignals.push(result);
  }

  // ── Algorithmic signals ────────────────────────────────────────────────
  const spike = detectReviewSpike(reviews);
  if (spike) activeSignals.push(spike);

  const anomaly = detectRatingAnomaly(reviews);
  if (anomaly) activeSignals.push(anomaly);

  const verifiedRatio = detectVerifiedPurchaseRatio(reviews);
  if (verifiedRatio) activeSignals.push(verifiedRatio);

  const duplication = detectPhraseDuplication(reviews);
  if (duplication) activeSignals.push(duplication);

  const dissonance = detectCrossSourceDissonance(reviews);
  if (dissonance) activeSignals.push(dissonance);

  const jShape = detectJShapedDistribution(reviews);
  if (jShape) activeSignals.push(jShape);

  const genericLang = detectGenericLanguage(reviews);
  if (genericLang) activeSignals.push(genericLang);

  // Sort signals: HIGH first, then MEDIUM, then LOW
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  activeSignals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const score = computeScore(activeSignals);
  const sourceCount = new Set(reviews.map((r) => r.sourceId)).size;

  return {
    score,
    confidence: computeConfidence(reviews.length),
    signals: activeSignals,
    summary: generateSummary(score, activeSignals.length),
    reviewCount: reviews.length,
    sourceCount,
  };
}
