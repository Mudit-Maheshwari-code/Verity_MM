import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import './SearchPage.css';

const DEMO_PRODUCTS = [
  { label: 'USB-C Cable', query: 'USB-C fast charging cable' },
  { label: 'Wireless Earbuds', query: 'wireless bluetooth earbuds' },
  { label: 'Phone Charger', query: 'phone charger adapter' },
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  function handleSearch(query: string) {
    setIsLoading(true);
    navigate(`/results?q=${encodeURIComponent(query)}`);
  }

  return (
    <main className="search-page">
      {/* Dot-grid background texture */}
      <div className="search-page__grid" aria-hidden="true" />

      <div className="search-page__content">
        {/* Editorial headline */}
        <div className="search-page__hero">
          <p className="search-page__eyebrow">Paste a product URL · Amazon &amp; Flipkart</p>
          <h1 className="search-page__headline">
            Know what you're{' '}
            <em>actually</em>{' '}
            buying.
          </h1>
          <p className="search-page__tagline">
            Verity aggregates reviews directly from product URLs and surfaces authenticity
            signals — so you can spot counterfeits before they arrive.
          </p>
        </div>

        {/* Search */}
        <div className="search-page__search">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Demo quick-links */}
        <div className="search-page__demos">
          <span className="search-page__demos-label">Try a demo:</span>
          <button className="search-page__demo-chip" onClick={() => handleSearch('https://www.flipkart.com/apple-20w-usb-c-power-adapter/p/itm1') }>
            Flipkart USB Cable
          </button>
          <button className="search-page__demo-chip" onClick={() => handleSearch('https://www.amazon.com/dp/B08J5F3G18') }>
            Amazon Earbuds
          </button>
          {DEMO_PRODUCTS.map(({ label, query }) => (
            <button
              key={label}
              className="search-page__demo-chip"
              onClick={() => handleSearch(query)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Editorial footer note */}
        <div className="search-page__footnote">
          <p>
            Verity analyzes review text for authenticity signals — not a replacement for your
            own judgment. <a href="/about">How it works →</a>
          </p>
        </div>
      </div>
    </main>
  );
}
