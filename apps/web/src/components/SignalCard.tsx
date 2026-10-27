import type { SignalResult } from '../types';
import StarRating from './StarRating';
import './SignalCard.css';

interface SignalCardProps {
  signal: SignalResult;
}

const SEVERITY_LABELS: Record<string, string> = {
  high: 'High Severity',
  medium: 'Medium Severity',
  low: 'Low Severity',
};

export default function SignalCard({ signal }: SignalCardProps) {
  const affectedPct = signal.totalReviews > 0
    ? Math.round((signal.affectedCount / signal.totalReviews) * 100)
    : 0;

  return (
    <div className={`signal-card signal-card--${signal.severity}`}>
      <div className="signal-card__header">
        <span className={`signal-card__severity signal-card__severity--${signal.severity}`}>
          {SEVERITY_LABELS[signal.severity]}
        </span>
        <span className="signal-card__count">
          {signal.affectedCount} of {signal.totalReviews} reviews
          <span className="signal-card__pct">({affectedPct}%)</span>
        </span>
      </div>

      <h3 className="signal-card__label">{signal.label}</h3>
      <p className="signal-card__description">{signal.description}</p>

      {signal.evidence.length > 0 && (
        <div className="signal-card__evidence">
          <span className="signal-card__evidence-title">Evidence</span>
          <div className="signal-card__excerpts">
            {signal.evidence.slice(0, 2).map(excerpt => (
              <div key={excerpt.reviewId} className="signal-card__excerpt">
                <div className="signal-card__excerpt-header">
                  <span className="signal-card__excerpt-source">{excerpt.sourceName}</span>
                  <StarRating rating={excerpt.rating} />
                </div>
                <p className="signal-card__excerpt-text">"{excerpt.snippet}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
