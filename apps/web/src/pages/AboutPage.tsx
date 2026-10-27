import './AboutPage.css';

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-page__content">
        <header className="about-page__header">
          <p className="about-page__eyebrow">Methodology &amp; Transparency</p>
          <h1 className="about-page__headline">How Verity works</h1>
          <p className="about-page__intro">
            Verity is not a review aggregator — it's an authenticity signal engine. Here's
            exactly what it does, what it doesn't do, and why you should still exercise
            your own judgment.
          </p>
        </header>

        <div className="about-page__sections">
          <section className="about-page__section">
            <h2>What Verity does</h2>
            <p>
              When you paste a product URL from Flipkart or Amazon, Verity launches a
              headless browser, scrapes up to 150 reviews directly from the product page,
              then runs a set of heuristic signal detectors across the review set. Each
              detector looks for a specific pattern associated with counterfeit products,
              review manipulation, or quality fraud.
            </p>
            <p>
              The result is an <strong>explainable authenticity score</strong> — not a
              black-box number. Every point deducted from the score corresponds to a specific,
              labeled signal you can read and verify yourself.
            </p>
          </section>

          <section className="about-page__section">
            <h2>The eight signals</h2>
            <div className="about-page__signals-table">
              <div className="about-page__signal-row about-page__signal-row--header">
                <span>Signal</span>
                <span>What triggers it</span>
                <span>Weight</span>
              </div>
              {[
                ['Counterfeit mentions', 'Keywords: "fake", "counterfeit", "knockoff", "nakli", etc. in review text', 'High'],
                ['Wrong item received', '"wrong item", "not as described", "different product", "alag item", etc.', 'High'],
                ['Suspicious packaging', '"no box", "generic packaging", "repackaged", "tampered", etc.', 'Medium'],
                ['Quality inconsistency', '"feels cheap", "stopped working", "broke after", "flimsy", etc.', 'Low'],
                ['Review spike', '5+ unverified 5★ reviews within a 14-day window making up ≥15% of total', 'Medium'],
                ['Cross-store rating gap', 'Amazon and Flipkart average ratings differ by ≥1.5★ (with ≥8 reviews each)', 'Medium'],
                ['J-shaped distribution', '>80% five-star ratings with <10% mid-range — near-unanimous praise is suspicious', 'Medium'],
                ['Generic review language', 'Reviews with very low vocabulary diversity and no product-specific details', 'Medium'],
              ].map(([signal, trigger, weight]) => (
                <div key={signal} className="about-page__signal-row">
                  <span className="about-page__signal-name">{signal}</span>
                  <span className="about-page__signal-trigger">{trigger}</span>
                  <span className={`about-page__signal-weight about-page__signal-weight--${weight.toLowerCase()}`}>
                    {weight}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="about-page__section">
            <h2>The scoring formula</h2>
            <p>
              Each search starts with a score of 100. For every active signal, a penalty
              is subtracted:
            </p>
            <div className="about-page__formula">
              <div className="about-page__formula-row">
                <span className="about-page__formula-label">HIGH severity signal</span>
                <span className="about-page__formula-penalty">− (weight × 15)</span>
              </div>
              <div className="about-page__formula-row">
                <span className="about-page__formula-label">MEDIUM severity signal</span>
                <span className="about-page__formula-penalty">− (weight × 8)</span>
              </div>
              <div className="about-page__formula-row">
                <span className="about-page__formula-label">LOW severity signal</span>
                <span className="about-page__formula-penalty">− (weight × 3)</span>
              </div>
            </div>
            <p>
              The final score is clamped to [0, 100]. Confidence is labeled based on review
              count: <em>low</em> (&lt;10 reviews), <em>medium</em> (10–30), <em>high</em> (&gt;30).
            </p>
          </section>

          <section className="about-page__section">
            <h2>Data sources</h2>
            <p>
              Verity uses <strong>Playwright</strong> (headless Chromium) to scrape review
              data directly from product pages — no paid APIs, no API keys, no third-party
              services required.
            </p>
            <p>
              When you paste a product URL, Verity launches a headless browser, navigates
              to the reviews section, paginates through pages, and extracts up to 150 reviews.
              A built-in SQLite cache avoids re-scraping the same product within 24 hours.
            </p>
            <div className="about-page__source-table">
              {[
                { store: 'Amazon', actor: 'scrapers/amazon.py', type: 'Direct scraping (Playwright)' },
                { store: 'Flipkart', actor: 'scrapers/flipkart.py', type: 'Direct scraping (Playwright)' },
                { store: 'Demo', actor: 'mock.adapter.ts', type: 'Curated mock data' },
              ].map(({ store, actor, type }) => (
                <div key={store} className="about-page__source-row">
                  <span className="about-page__source-store">{store}</span>
                  <code className="about-page__source-actor">{actor}</code>
                  <span className="about-page__source-type">{type}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="about-page__section">
            <h2>Legal &amp; ethical notes</h2>
            <p>
              Verity scrapes publicly-visible product review pages using a headless browser.
              Scrapers include throttling (2-6 second delays between pages), realistic
              User-Agent identification, and stop gracefully when CAPTCHAs are encountered — 
              no bypass is attempted. This is a portfolio/research project, not a production service.
            </p>
            <p>
              <strong>No private data is stored.</strong> Verity only uses publicly-displayed
              reviewer handles and review text — never email addresses, real names beyond
              what the store shows publicly, or contact information.
            </p>
            <p>
              Every review is <strong>always attributed</strong> to its original store and
              links back to the original listing.
            </p>
          </section>

          <section className="about-page__section">
            <h2>Limitations</h2>
            <ul className="about-page__limitations">
              <li>
                <strong>Keyword-based signals are imperfect.</strong> A review saying "not
                fake at all" could trigger a counterfeit signal. Evidence excerpts let you
                inspect exactly which text caused each signal.
              </li>
              <li>
                <strong>Sample-based analysis.</strong> Adapters fetch up to ~80 reviews per
                source. Products with thousands of reviews are analyzed on a sample.
              </li>
              <li>
                <strong>Search by name is imprecise.</strong> Paste a product URL for
                accurate matching. Keyword searches return whatever the scraper finds first.
              </li>
              <li>
                <strong>Score is indicative, not definitive.</strong> A high score does not
                guarantee a genuine product. A low score does not prove a counterfeit. Use
                Verity as one input among several.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
