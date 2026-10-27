import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import type { SearchResponse, Review } from '../types';
import AuthenticityGauge from '../components/AuthenticityGauge';
import SignalCard from '../components/SignalCard';
import ReviewCard from '../components/ReviewCard';
import SourcePanel from '../components/SourcePanel';
import DemoBanner from '../components/DemoBanner';
import LoadingState from '../components/LoadingState';
import ScrapingProgress from '../components/ScrapingProgress';
import SearchBar from '../components/SearchBar';
import './ResultsPage.css';

type FilterTab = 'all' | 'amazon' | 'flipkart' | 'flagged';

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') ?? '';

  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isSearching, setIsSearching] = useState(false);

  const fetchResults = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    setActiveTab('all');
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${apiBase}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json: SearchResponse = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      fetchResults(query);
    } else {
      navigate('/');
    }
  }, [query, fetchResults, navigate]);

  function handleSearch(newQuery: string) {
    setIsSearching(true);
    navigate(`/results?q=${encodeURIComponent(newQuery)}`);
  }

  // Filter reviews by active tab
  const filteredReviews: Review[] = data?.reviews.filter((r) => {
    if (activeTab === 'amazon') return r.sourceName.toLowerCase().includes('amazon');
    if (activeTab === 'flipkart') return r.sourceName.toLowerCase().includes('flipkart');
    if (activeTab === 'flagged') return r.flags.length > 0;
    return true;
  }) ?? [];

  // Tab counts
  const tabCounts = data ? {
    all: data.reviews.length,
    amazon: data.reviews.filter((r) => r.sourceName.toLowerCase().includes('amazon')).length,
    flipkart: data.reviews.filter((r) => r.sourceName.toLowerCase().includes('flipkart')).length,
    flagged: data.reviews.filter((r) => r.flags.length > 0).length,
  } : { all: 0, amazon: 0, flipkart: 0, flagged: 0 };

  if (isLoading) {
    const isUrl = query.trim().startsWith('http://') || query.trim().startsWith('https://');
    return (
      <div className="results-page">
        <div className="results-page__search-bar-row">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} initialValue={query} />
        </div>
        {isUrl ? <ScrapingProgress url={query} /> : <LoadingState />}
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-page results-page--error">
        <div className="results-page__error-content">
          <p className="results-page__error-eyebrow">Error</p>
          <h2 className="results-page__error-headline">Couldn't fetch reviews</h2>
          <p className="results-page__error-detail">{error}</p>
          <div className="results-page__error-actions">
            <button className="btn btn--primary" onClick={() => fetchResults(query)}>
              Try again
            </button>
            <Link to="/" className="btn btn--ghost">New search</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'amazon', label: 'Amazon' },
    { id: 'flipkart', label: 'Flipkart' },
    { id: 'flagged', label: 'Flagged' },
  ];

  return (
    <div className="results-page">
      {/* Search bar row */}
      <div className="results-page__search-bar-row">
        <SearchBar onSearch={handleSearch} isLoading={isSearching} initialValue={query} />
      </div>

      {/* Demo banner */}
      {data.isDemo && <DemoBanner />}

      {/* Product header */}
      <div className="results-page__product-header">
        <div className="results-page__product-header-inner">
          <p className="results-page__fetched-at">
            Analyzed {new Date(data.fetchedAt).toLocaleString('en-IN', {
              dateStyle: 'medium', timeStyle: 'short',
            })}
            {data.isDemo && <span className="results-page__demo-tag"> · Demo data</span>}
          </p>
          <h1 className="results-page__product-title">{data.productTitle}</h1>
          <p className="results-page__product-meta">
            {data.report.reviewCount} reviews across {data.report.sourceCount} source{data.report.sourceCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Main split layout */}
      <div className="results-page__body">
        {/* Left panel — gauge + signals + sources */}
        <aside className="results-page__left">
          <AuthenticityGauge
            score={data.report.score}
            confidence={data.report.confidence}
            reviewCount={data.report.reviewCount}
          />

          {/* One-line summary */}
          <p className="results-page__summary">{data.report.summary}</p>

          {/* Data Confidence (Live / Diffbot / Scraper Mode) */}
          {data.sources.some(s => s.dataType === 'scraper' || s.dataType === 'diffbot-extract') && (
            <div className="results-page__data-confidence" style={{ background: 'var(--color-surface-alt)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)' }}>Data Confidence</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: 'var(--space-xs)' }}>
                <strong>{data.report.reviewCount} reviews retrieved</strong> from the product page.
              </p>
              {data.report.reviewCount < 10 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--score-low)' }}>
                  ⚠️ Low confidence: We couldn't retrieve many reviews. The authenticity score might not be fully representative.
                </p>
              )}
            </div>
          )}

          {/* Signals */}
          {data.report.signals.length > 0 ? (
            <div className="results-page__signals">
              <h2 className="results-page__signals-heading">Detected Signals</h2>
              {data.report.signals.map((signal) => (
                <SignalCard key={signal.signalId} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="results-page__no-signals">
              <span className="results-page__no-signals-icon">✓</span>
              <p>No authenticity signals detected.</p>
            </div>
          )}

          {/* Source panel */}
          <SourcePanel sources={data.sources} />
        </aside>

        {/* Right panel — review feed */}
        <main className="results-page__right">
          {/* Filter tabs */}
          <div className="results-page__tabs" role="tablist" aria-label="Filter reviews">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                className={`results-page__tab${activeTab === id ? ' results-page__tab--active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
                <span className="results-page__tab-count">{tabCounts[id]}</span>
              </button>
            ))}
          </div>

          {/* Reviews */}
          <div className="results-page__reviews" role="tabpanel">
            {filteredReviews.length === 0 ? (
              <div className="results-page__empty-tab">
                <p>No reviews in this category.</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
