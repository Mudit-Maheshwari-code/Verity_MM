import type { SourceMeta } from '../types';
import './SourcePanel.css';

interface SourcePanelProps {
  sources: SourceMeta[];
}

const DATA_TYPE_LABELS: Record<string, string> = {
  'diffbot-extract': 'Diffbot Extract',
  'licensed-third-party': 'Licensed',
  'official-api': 'Official API',
  'scraper': 'Scraped',
  'mock': 'Demo',
};

export default function SourcePanel({ sources }: SourcePanelProps) {
  return (
    <div className="source-panel">
      <h3 className="source-panel__heading">Data Sources</h3>
      <div className="source-panel__table">
        {sources.map(source => (
          <div
            key={source.sourceId}
            className={`source-panel__row${source.error ? ' source-panel__row--error' : ''}`}
          >
            {source.error ? (
              <>
                <div className="source-panel__name">{source.sourceName}</div>
                <div className="source-panel__unavailable">Source unavailable</div>
              </>
            ) : (
              <>
                <div className="source-panel__name">
                  <a
                    href={source.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-panel__link"
                  >
                    {source.sourceName}
                  </a>
                  <span className={`source-panel__dtype source-panel__dtype--${source.dataType}`}>
                    {DATA_TYPE_LABELS[source.dataType] ?? source.dataType}
                  </span>
                </div>
                <div className="source-panel__stats">
                  <span className="source-panel__stat">
                    <span className="source-panel__stat-value">{source.reviewCount.toLocaleString()}</span>
                    <span className="source-panel__stat-label">reviews</span>
                  </span>
                  <span className="source-panel__divider">·</span>
                  <span className="source-panel__stat">
                    <span className="source-panel__stat-value">{source.averageRating.toFixed(1)}</span>
                    <span className="source-panel__stat-label">/ 5 avg</span>
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
