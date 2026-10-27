// ─────────────────────────────────────────────────────────────────────────────
// VERITY AUTHENTICITY SIGNAL KEYWORDS
//
// These keyword lists are intentionally inspectable and adjustable.
// To add a new signal: add an entry to KEYWORD_SIGNALS below.
// To adjust sensitivity: change the threshold values.
//
// Threshold rationale:
//   - counterfeit: ≥2% of reviews = MEDIUM flag, ≥5% = HIGH flag
//     Even 1-2 genuine counterfeit reports in 50 reviews is a serious signal.
//     Counterfeit language is rarely used unless the reviewer has a real concern.
//
//   - wrongItem: ≥3% MEDIUM, ≥6% HIGH — common fulfillment error, slightly
//     higher bar than counterfeit since it can be an innocent shipping mistake.
//
//   - packaging: ≥4% MEDIUM, ≥8% HIGH — packaging complaints vary by seller tier
//     and are sometimes subjective (e.g. "no box" for a budget cable is normal).
//     Higher threshold prevents over-flagging economy products.
//
//   - quality: ≥8% LOW, ≥15% MEDIUM — quality opinions are subjective and
//     product-category dependent; needs a higher bar to avoid noise.
//     LOW severity added because quality signals alone don't indicate fraud.
// ─────────────────────────────────────────────────────────────────────────────

import { ReviewFlag } from '@verity/shared';

export interface KeywordSignal {
  id: string;
  label: string;
  keywords: string[];
  /** Score penalty contribution per active signal (0-10) */
  weight: number;
  /** Fraction of reviews (0-1) needed to trigger MEDIUM severity */
  thresholdMedium: number;
  /** Fraction of reviews (0-1) needed to trigger HIGH severity */
  thresholdHigh: number;
  /** The ReviewFlag value stamped on individual reviews that match */
  reviewFlag: ReviewFlag;
}

export const KEYWORD_SIGNALS: KeywordSignal[] = [
  {
    id: 'counterfeit_mentions',
    label: 'Counterfeit mentions',
    keywords: [
      'fake', 'counterfeit', 'knockoff', 'replica', 'not genuine',
      'not authentic', 'bootleg', 'copy', 'imitation', 'fraud', 'duplicate product',
      'original nahi', 'nakli', 'duplicate item',
    ],
    weight: 9,
    thresholdMedium: 0.02,
    thresholdHigh: 0.05,
    reviewFlag: 'counterfeit_mention',
  },
  {
    id: 'wrong_item',
    label: 'Wrong item received',
    keywords: [
      'wrong item', 'not what i ordered', 'different product', 'not as described',
      'not as pictured', 'received different', 'switched', 'different from photos',
      'wrong product', 'alag item', 'galat product',
    ],
    weight: 7,
    // Raised from 3% to 5% — a single wrong-item review in a 27-review set should
    // not trigger MEDIUM. Requires ≥2 reviews in a 40-review set to fire.
    thresholdMedium: 0.05,
    thresholdHigh: 0.08,
    reviewFlag: 'wrong_item',
  },
  {
    id: 'packaging_issues',
    label: 'Suspicious packaging',
    keywords: [
      'no box', 'no packaging', 'generic packaging', 'repackaged', 'open box',
      'unsealed', 'tampered', 'no manual', 'no accessories', 'packaging different',
      'damaged packaging', 'torn packaging',
    ],
    weight: 5,
    thresholdMedium: 0.04,
    thresholdHigh: 0.08,
    reviewFlag: 'packaging_issue',
  },
  {
    id: 'quality_inconsistency',
    label: 'Quality inconsistency',
    keywords: [
      'build quality', 'feels cheap', 'poor quality', 'broke after',
      'stopped working', 'falls apart', 'flimsy', 'loose', 'plastic feels cheap',
      'not durable', 'broke in', 'dead on arrival', 'doa',
    ],
    // Weight reduced to 2: quality opinions are subjective and category-expected
    // for budget electronics. Earbuds with genuine quality problems should score
    // ~60s, not ~15. Only repeated systemic failure should push below 50.
    weight: 2,
    // Raised thresholds: ≥15% of reviews = MEDIUM, ≥25% = HIGH
    // At 27 reviews: fires MEDIUM only if ≥4 reviews mention quality issues
    // (previously fired HIGH at 41%, costing 3×15=45 pts from a single signal)
    thresholdMedium: 0.15,
    thresholdHigh: 0.25,
    reviewFlag: 'quality_inconsistency',
  },
];
