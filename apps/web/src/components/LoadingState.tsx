import './LoadingState.css';

export default function LoadingState() {
  return (
    <div className="loading-state" aria-busy="true" aria-label="Loading results">
      {/* Product title skeleton */}
      <div className="loading-state__header">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--subtitle" />
      </div>

      <div className="loading-state__columns">
        {/* Left column */}
        <div className="loading-state__left">
          {/* Gauge skeleton */}
          <div className="skeleton-card">
            <div className="skeleton skeleton--gauge" />
            <div className="skeleton skeleton--score" />
            <div className="skeleton skeleton--meta" />
          </div>

          {/* Signal skeletons */}
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton-card skeleton-card--signal">
              <div className="skeleton skeleton--tag" />
              <div className="skeleton skeleton--heading" />
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line skeleton--line-short" />
            </div>
          ))}

          {/* Source panel skeleton */}
          <div className="skeleton-card">
            <div className="skeleton skeleton--heading" />
            {[0, 1].map(i => (
              <div key={i} className="loading-state__source-row">
                <div className="skeleton skeleton--source-name" />
                <div className="skeleton skeleton--source-stat" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="loading-state__right">
          {/* Filter tabs skeleton */}
          <div className="loading-state__tabs">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton--tab" />
            ))}
          </div>

          {/* Review card skeletons */}
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-card">
              <div className="loading-state__byline">
                <div className="skeleton skeleton--source-name" />
                <div className="skeleton skeleton--stars" />
                <div className="skeleton skeleton--date" />
              </div>
              <div className="skeleton skeleton--review-title" />
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line skeleton--line-short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
