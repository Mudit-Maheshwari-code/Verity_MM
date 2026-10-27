import { useState } from 'react';
import './DemoBanner.css';

interface DemoBannerProps {
  onDismiss?: () => void;
}

export default function DemoBanner({ onDismiss }: DemoBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div className="demo-banner" role="alert">
      <div className="demo-banner__inner">
        <span className="demo-banner__icon" aria-hidden="true">◈</span>
        <p className="demo-banner__text">
          You're viewing <strong>demo data</strong>. Paste a product URL to analyze real reviews.{' '}
          <a
            href="https://github.com/verity/verity#setup"
            className="demo-banner__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            See setup guide →
          </a>
        </p>
        <button
          className="demo-banner__dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss demo notice"
        >
          ×
        </button>
      </div>
    </div>
  );
}
