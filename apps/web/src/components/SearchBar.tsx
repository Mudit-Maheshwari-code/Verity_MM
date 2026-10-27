import { useState, useRef, useEffect } from 'react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export default function SearchBar({ onSearch, isLoading, initialValue = '' }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when navigating between searches (e.g. results → new search → results)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);


  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSearch(trimmed);
  }

  const trimmedValue = value.trim();
  const isUrl = trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://');
  const isAmazon = isUrl && trimmedValue.toLowerCase().includes('amazon');
  const isFlipkart = isUrl && trimmedValue.toLowerCase().includes('flipkart');

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <label className="search-bar__label" htmlFor="verity-search">
        Search by product name or paste a store URL
      </label>
      <div className="search-bar__row">
        <div className="search-bar__input-wrap">
          {isUrl && (
            <div className="search-bar__platform-badge" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'var(--color-surface-alt)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', pointerEvents: 'none' }}>
              {isAmazon ? 'Amazon' : isFlipkart ? 'Flipkart' : 'URL'}
            </div>
          )}
          <input
            ref={inputRef}
            id="verity-search"
            className="search-bar__input"
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Paste a Flipkart or Amazon product URL…"
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
            style={isUrl ? { paddingLeft: '85px' } : {}}
          />
          <div className="search-bar__underline" />
        </div>
        <button
          type="submit"
          className={`search-bar__btn${isLoading ? ' search-bar__btn--loading' : ''}`}
          disabled={isLoading || !value.trim()}
          aria-label="Verify product"
        >
          {isLoading ? (
            <span className="search-bar__spinner" aria-hidden="true" />
          ) : (
            'Verify'
          )}
        </button>
      </div>
      <div className="search-bar__hint" style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        Or search by product name for demo results
      </div>
    </form>
  );
}
