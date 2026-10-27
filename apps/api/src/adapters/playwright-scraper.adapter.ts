// ─────────────────────────────────────────────────────────────────────────────
// Playwright Scraper Adapter (Python subprocess bridge)
//
// Spawns a Python Playwright scraper to fetch reviews directly from
// e-commerce product pages. No paid APIs required.
//
// Flow: Node.js → spawn python scrapers/run.py <url> → parse JSON → reviews
//
// The Python scraper outputs JSON to stdout with a ScrapeResponse schema.
// This adapter maps that output into the canonical RawReviewBatch format
// used by the rest of the analysis pipeline.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from 'child_process';
import path from 'path';
import { Review } from '@verity/shared';
import { BaseAdapter, RawReviewBatch } from './base.adapter';

// ── Python scraper output shape ───────────────────────────────────────────────

interface ScraperReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  reviewer_name: string;
  is_verified_purchase: boolean | null;
  helpful_votes: number;
  language: string;
}

interface ScraperOutput {
  platform: string;
  product_url: string;
  product_title: string;
  reviews: ScraperReview[];
  total_reviews_on_page: number | null;
  reviews_fetched: number;
  scrape_status: string;  // "success" | "partial" | "blocked" | "captcha" | "error"
  error_message: string | null;
  scrape_duration_seconds: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export class PlaywrightScraperAdapter extends BaseAdapter {
  private url: string;
  private platform: 'amazon' | 'flipkart';
  private _sourceId: string;
  private _sourceName: string;

  constructor(url: string) {
    super();
    this.url = url;

    // Detect platform from URL
    if (/flipkart\.com/i.test(url)) {
      this.platform = 'flipkart';
      this._sourceName = 'Flipkart';
    } else if (/amazon\.(in|com|co\.uk)/i.test(url)) {
      this.platform = 'amazon';
      this._sourceName = 'Amazon';
    } else {
      throw new Error('Unsupported URL for scraper adapter');
    }

    this._sourceId = `${this.platform}-scraper`;
  }

  get sourceId(): string { return this._sourceId; }
  get sourceName(): string { return this._sourceName; }
  get sourceUrl(): string { return this.url; }
  get dataType(): 'scraper' { return 'scraper'; }

  isAvailable(): boolean {
    return true; // Always available — no API keys needed
  }

  async fetchReviews(_query: string): Promise<RawReviewBatch> {
    return new Promise((resolve) => {
      // ── Resolve paths ─────────────────────────────────────────────────────
      // Project root is 3 levels up from apps/api/src/
      const projectRoot = path.resolve(__dirname, '../../../../');
      const isWindows = process.platform === 'win32';
      const pythonExe = path.join(projectRoot, isWindows ? 'venv/Scripts/python.exe' : 'venv/bin/python');
      const scriptPath = path.join(projectRoot, 'scrapers/run.py');

      console.log(`[PlaywrightScraper] Spawning: ${pythonExe} ${scriptPath} ${this.url}`);

      const child = spawn(pythonExe, [scriptPath, this.url], {
        cwd: projectRoot,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        // Stream scraper logs to console for debugging
        const line = data.toString().trim();
        if (line) console.log(`[PlaywrightScraper:${this.platform}] ${line}`);
      });

      // ── 120-second timeout ──────────────────────────────────────────────
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        console.error(`[PlaywrightScraper] Timeout after 120s for ${this.url}`);
        resolve({
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceUrl: this.sourceUrl,
          reviews: [],
          error: 'Scraper timeout — the page took too long to load (120s limit)',
        });
      }, 120_000);

      child.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code !== 0 && stdout.trim().length === 0) {
          console.error(`[PlaywrightScraper] Exited with code ${code}`);
          resolve({
            sourceId: this.sourceId,
            sourceName: this.sourceName,
            sourceUrl: this.sourceUrl,
            reviews: [],
            error: `Scraper process exited with code ${code}`,
          });
          return;
        }

        try {
          const parsed: ScraperOutput = JSON.parse(stdout.trim());

          // Map Python review format → canonical Review format
          const reviews: Review[] = parsed.reviews.map((r, index): Review => ({
            id: r.id || `${this._sourceId}:${index}`,
            sourceId: this.sourceId,
            sourceName: this.sourceName,
            sourceUrl: this.sourceUrl,
            listingTitle: parsed.product_title || undefined,
            rating: Math.min(5, Math.max(1, Math.round(r.rating || 3))),
            title: (r.title || '').trim(),
            body: (r.body || '').trim(),
            date: r.date || 'unknown',
            isVerifiedPurchase: Boolean(r.is_verified_purchase),
            helpfulVotes: Math.max(0, r.helpful_votes || 0),
            reviewerHandle: (r.reviewer_name || 'Anonymous').slice(0, 50).trim(),
            flags: [],
          }));

          // Report status
          if (parsed.scrape_status === 'error') {
            console.error(`[PlaywrightScraper] Error: ${parsed.error_message}`);
          } else if (parsed.scrape_status === 'captcha') {
            console.warn(`[PlaywrightScraper] CAPTCHA encountered on ${this.platform}`);
          } else if (parsed.scrape_status === 'partial') {
            console.warn(`[PlaywrightScraper] Partial results: ${reviews.length} reviews`);
          } else {
            console.log(`[PlaywrightScraper] Success: ${reviews.length} reviews in ${parsed.scrape_duration_seconds}s`);
          }

          resolve({
            sourceId: this.sourceId,
            sourceName: this.sourceName,
            sourceUrl: this.sourceUrl,
            listingTitle: parsed.product_title || undefined,
            reviews,
            error: parsed.scrape_status === 'success' ? undefined : (parsed.error_message || undefined),
          });
        } catch (err: any) {
          console.error('[PlaywrightScraper] Failed to parse JSON output:', err.message);
          console.error('[PlaywrightScraper] Raw stdout:', stdout.slice(0, 500));
          resolve({
            sourceId: this.sourceId,
            sourceName: this.sourceName,
            sourceUrl: this.sourceUrl,
            reviews: [],
            error: 'Failed to parse scraper output',
          });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        console.error('[PlaywrightScraper] Failed to spawn subprocess:', err.message);
        resolve({
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceUrl: this.sourceUrl,
          reviews: [],
          error: `Failed to run scraper: ${err.message}`,
        });
      });
    });
  }
}
