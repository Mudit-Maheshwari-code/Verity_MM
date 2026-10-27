import { useState } from 'react';
import type { Review, ReviewFlag } from '../types';
import StarRating from './StarRating';
import './ReviewCard.css';

interface ReviewCardProps {
  review: Review;
}

const FLAG_LABELS: Record<ReviewFlag, string> = {
  counterfeit_mention: 'Counterfeit mentioned',
  wrong_item: 'Wrong item received',
  packaging_issue: 'Packaging issue',
  quality_inconsistency: 'Quality inconsistency',
  possibly_fake_review: 'Possibly fake review',
  duplicate_phrase: 'Duplicate phrasing',
  generic_review: 'Generic review language',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isFlagged = review.flags.length > 0;
  const isLong = review.body.length > 320;

  return (
    <article className={`review-card${isFlagged ? ' review-card--flagged' : ''}`}>
      {/* Newspaper byline header */}
      <header className="review-card__header">
        <div className="review-card__byline">
          <span className="review-card__source">{review.sourceName}</span>
          <StarRating rating={review.rating} />
          <time className="review-card__date" dateTime={review.date}>
            {formatDate(review.date)}
          </time>
        </div>
        <div className="review-card__meta">
          <span className="review-card__handle">by {review.reviewerHandle}</span>
          {review.isVerifiedPurchase && (
            <span className="review-card__verified" title="Verified Purchase">✓ Verified</span>
          )}
        </div>
      </header>

      {/* Review title */}
      {review.title && (
        <h4 className="review-card__title">{review.title}</h4>
      )}

      {/* Review body */}
      <div className={`review-card__body${!expanded && isLong ? ' review-card__body--clamped' : ''}`}>
        <p>{review.body}</p>
      </div>

      {isLong && (
        <button
          className="review-card__expand"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Footer: flags + helpful votes */}
      {(isFlagged || review.helpfulVotes > 0) && (
        <footer className="review-card__footer">
          {isFlagged && (
            <div className="review-card__flags">
              {review.flags.map(flag => (
                <span key={flag} className="review-card__flag-chip">
                  {FLAG_LABELS[flag]}
                </span>
              ))}
            </div>
          )}
          {review.helpfulVotes > 0 && (
            <span className="review-card__helpful">
              {review.helpfulVotes} found helpful
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
