import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SearchRequest, SearchResponse, SourceMeta } from '@verity/shared';
import {
  fetchAmazonReviews as mockFetchAmazon,
  fetchFlipkartReviews as mockFetchFlipkart,
  getMockProductTitle,
} from '../adapters/mock.adapter';
import { BaseAdapter, RawReviewBatch } from '../adapters/base.adapter';
import { DiffbotAdapter } from '../adapters/diffbot.adapter';
import { PlaywrightScraperAdapter } from '../adapters/playwright-scraper.adapter';
import { normalizeReviews } from '../normalizer';
import { analyzeReviews } from '../analysis';
import { getCached, setCached, normalizeCacheKey } from '../cache';

const router = Router();

// ── Adapter architecture ──────────────────────────────────────────────────────
// Diffbot Extract API is the primary live data-fetching layer for all URLs.
// Direct Playwright headless browser scraper serves as local fallback.
// Curated mock review datasets serve keyword searches and offline demo mode.

// ── POST /api/search ──────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const { query } = req.body as SearchRequest;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query is required' });
  }
  if (query.length > 500) {
    return res.status(400).json({ error: 'query must be 500 characters or fewer' });
  }

  const q = query.trim();
  const cacheKey = normalizeCacheKey(q);

  // ── Cache hit ───────────────────────────────────────────────────────────────
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Search] Cache hit for: "${q}"`);
    return res.json(cached);
  }

  console.log(`[Search] Fetching reviews for: "${q}"`);

  // ── Determine active adapters ───────────────────────────────────────────────
  const isUrl = q.startsWith('http://') || q.startsWith('https://');
  let activeAdapters: BaseAdapter[] = [];

  if (isUrl) {
    const diffbot = new DiffbotAdapter(q);
    if (diffbot.isAvailable()) {
      console.log(`[Search] Routing URL "${q}" to Diffbot Extract API`);
      activeAdapters = [diffbot];
    } else {
      console.warn(`[Search] DIFFBOT_TOKEN not found — falling back to Playwright scraper adapter`);
      try {
        activeAdapters = [new PlaywrightScraperAdapter(q)];
      } catch (err) {
        console.warn(`[Search] Unsupported URL for Playwright fallback: ${q}`);
      }
    }
  }

  const isDemo = activeAdapters.length === 0 && !isUrl; // Keyword searches use curated demo data

  if (isDemo) {
    console.log('[Search] No API keys found — using demo mock data');
  }

  // ── Fan-out to adapters ─────────────────────────────────────────────────────
  let batches: RawReviewBatch[];
  let finalIsDemo = isDemo;

  if (isDemo) {
    // Demo mode: return mock data for both Amazon and Flipkart
    batches = [mockFetchAmazon(q), mockFetchFlipkart(q)];
  } else {
    // Live mode: fan out to all available real adapters in parallel
    const results = await Promise.allSettled(
      activeAdapters.map((adapter) => adapter.fetchReviews(q))
    );

    batches = results.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      const adapter = activeAdapters[i];
      console.error(`[Search] Adapter ${adapter.sourceId} failed:`, (result.reason as Error).message);
      return {
        sourceId: adapter.sourceId,
        sourceName: adapter.sourceName,
        sourceUrl: adapter.sourceUrl,
        reviews: [],
        error: (result.reason as Error).message,
      } as RawReviewBatch;
    });

    // If ALL real adapters failed, fall back to mock data
    const allFailed = batches.every((b) => b.reviews.length === 0 && b.error);
    if (allFailed) {
      console.warn('[Search] All real adapters failed — falling back to demo mock data');
      batches = [mockFetchAmazon(q), mockFetchFlipkart(q)];
      finalIsDemo = true;
    }
  }

  // ── Normalize reviews ───────────────────────────────────────────────────────
  const allReviews = batches.flatMap((batch) => normalizeReviews(batch));

  // ── Run analysis engine ─────────────────────────────────────────────────────
  const report = analyzeReviews(allReviews);

  // ── Build per-source metadata ───────────────────────────────────────────────
  const sources: SourceMeta[] = batches.map((batch) => {
    const batchReviews = allReviews.filter((r) => r.sourceId === batch.sourceId);
    const avgRating =
      batchReviews.length > 0
        ? batchReviews.reduce((sum, r) => sum + r.rating, 0) / batchReviews.length
        : 0;

    const realAdapter = activeAdapters.find((a) => a.sourceId === batch.sourceId);

    return {
      sourceId: batch.sourceId,
      sourceName: batch.sourceName,
      sourceUrl: batch.sourceUrl,
      dataType: finalIsDemo ? 'mock' : (realAdapter?.dataType ?? 'scraper'),
      reviewCount: batchReviews.length,
      averageRating: parseFloat(avgRating.toFixed(2)),
      error: batch.error,
    } satisfies SourceMeta;
  });

  // ── Derive product title ────────────────────────────────────────────────────
  const productTitle =
    batches.find((b) => b.listingTitle)?.listingTitle ??
    (finalIsDemo ? getMockProductTitle(q) : q.startsWith('http') ? 'Product' : q);

  // ── Build and cache response ────────────────────────────────────────────────
  const response: SearchResponse = {
    cacheId: uuidv4(),
    productTitle,
    isDemo: finalIsDemo,
    sources,
    reviews: allReviews,
    report,
    fetchedAt: new Date().toISOString(),
  };

  setCached(cacheKey, response);
  // Also index by cacheId for shareable links via GET /api/product/:cacheId
  setCached(response.cacheId, response);

  return res.json(response);
});

export default router;
