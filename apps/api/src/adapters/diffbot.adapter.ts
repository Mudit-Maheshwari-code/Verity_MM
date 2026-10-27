// ─────────────────────────────────────────────────────────────────────────────
// Diffbot Extract API Adapter
//
// Uses the Diffbot Extract API (Product API, Discussion API, Analyze API)
// as the automated data-fetching and parsing layer, replacing brittle
// headless scrapers and platform-specific scraping actors.
//
// Diffbot handles:
//   - Headless rendering, dynamic JavaScript execution, bot mitigation, and proxies
//   - Structured extraction of product info (title, description, price, brand)
//   - Structured extraction of review discussions (posts, authors, dates, sentiment)
//
// Documentation reference:
//   - Authentication: https://www.diffbot.com/docs/authentication
//   - Account API:    https://www.diffbot.com/docs/account
//   - Products:       https://www.diffbot.com/docs/products-overview
//   - Product API:    https://www.diffbot.com/docs/extract/product
//   - Discussion API: https://www.diffbot.com/docs/extract/discussion
//   - Analyze API:    https://www.diffbot.com/docs/extract/analyze
// ─────────────────────────────────────────────────────────────────────────────

import axios, { AxiosError } from 'axios';
import { Review } from '@verity/shared';
import { BaseAdapter, RawReviewBatch } from './base.adapter';

// ── Diffbot Response Interfaces ──────────────────────────────────────────────

export interface DiffbotAccountResponse {
  name?: string;
  email?: string;
  plan?: string;
  planCredits?: number;
  status?: string;
  created?: string;
  token?: string;
  childTokens?: string[];
  usage?: Array<{
    date: string;
    credits: number;
    extractions: number;
    nlp?: number;
  }>;
  errorCode?: number;
  error?: string;
}

interface DiffbotPostImage {
  url?: string;
  title?: string;
  width?: number;
  height?: number;
}

interface DiffbotPost {
  id?: number | string;
  parentId?: number | string;
  text?: string;
  html?: string;
  title?: string;
  author?: string;
  authorUrl?: string;
  date?: string;
  sentiment?: number; // -1.0 to 1.0
  humanLanguage?: string;
  diffbotUri?: string;
  images?: DiffbotPostImage[];
  isVerifiedPurchase?: boolean;
  helpfulVotes?: number;
  rating?: number;
}

interface DiffbotDiscussion {
  type?: string;
  title?: string;
  pageUrl?: string;
  numPosts?: number;
  numPages?: number;
  posts?: DiffbotPost[];
  diffbotUri?: string;
  nextPage?: string;
  nextPages?: string[];
}

interface DiffbotProductObject {
  type?: string;
  title?: string;
  text?: string;
  brand?: string;
  offerPrice?: string;
  regularPrice?: string;
  offerPriceDetails?: {
    symbol?: string;
    amount?: number;
    currencyCode?: string;
    text?: string;
  };
  specs?: Record<string, string>;
  pageUrl?: string;
  diffbotUri?: string;
  discussion?: DiffbotDiscussion;
}

interface DiffbotExtractResponse {
  request?: {
    pageUrl?: string;
    api?: string;
    version?: number;
  };
  objects?: Array<DiffbotProductObject & DiffbotDiscussion>;
  errorCode?: number;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive clean platform name from URL or host.
 */
function derivePlatformMeta(targetUrl: string): { platform: string; sourceName: string; sourceId: string } {
  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('amazon.')) {
      return { platform: 'amazon', sourceName: 'Amazon', sourceId: 'amazon-diffbot' };
    }
    if (host.includes('flipkart.')) {
      return { platform: 'flipkart', sourceName: 'Flipkart', sourceId: 'flipkart-diffbot' };
    }
    // Generic fallback for any other site
    const domainParts = host.replace(/^www\./, '').split('.');
    const brand = domainParts[0] ? domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) : 'Web';
    return { platform: brand.toLowerCase(), sourceName: brand, sourceId: `${brand.toLowerCase()}-diffbot` };
  } catch {
    return { platform: 'web', sourceName: 'Diffbot', sourceId: 'diffbot-extract' };
  }
}

/**
 * Attempt to extract a 1–5 star rating from post HTML, text, or sentiment.
 * Diffbot Discussion posts include sentiment (-1.0 to 1.0) and HTML.
 */
function extractRating(post: DiffbotPost): number {
  // 1. Direct explicit rating property if present
  if (typeof post.rating === 'number' && !isNaN(post.rating)) {
    return Math.min(5, Math.max(1, Math.round(post.rating)));
  }

  const combined = `${post.title || ''} ${post.html || ''} ${post.text || ''}`;

  // 2. Look for common review rating patterns in HTML/text
  // e.g. "5.0 out of 5 stars", "4 out of 5", "rated 1/5", "rating: 5"
  const outOf5Match = combined.match(/(?:rated\s+|rating:?\s*)?([1-5](?:\.\d+)?)\s*(?:out of|\/)\s*5(?:\s*stars?)?/i);
  if (outOf5Match) {
    const val = parseFloat(outOf5Match[1]);
    if (!isNaN(val)) return Math.min(5, Math.max(1, Math.round(val)));
  }

  // e.g. "5 star", "5 stars", "★ 5", "5 ★"
  const starMatch = combined.match(/([1-5])\s*(?:stars?|★)/i);
  if (starMatch) {
    const val = parseInt(starMatch[1], 10);
    if (!isNaN(val)) return Math.min(5, Math.max(1, Math.round(val)));
  }

  // Flipkart specific rating badge in HTML e.g. <div class="_3LWZlK">4.2<img
  const flipkartBadge = combined.match(/class=["'][^"']*_3LWZlK[^"']*["'][^>]*>([1-5](?:\.\d+)?)/i);
  if (flipkartBadge) {
    const val = parseFloat(flipkartBadge[1]);
    if (!isNaN(val)) return Math.min(5, Math.max(1, Math.round(val)));
  }

  // Amazon specific icon alt in HTML e.g. <i class="... a-star-5 ..."><span class="a-icon-alt">5.0 out of 5 stars</span>
  const amazonIconAlt = combined.match(/class=["'][^"']*a-icon-alt[^"']*["'][^>]*>([1-5](?:\.\d+)?)/i);
  if (amazonIconAlt) {
    const val = parseFloat(amazonIconAlt[1]);
    if (!isNaN(val)) return Math.min(5, Math.max(1, Math.round(val)));
  }

  // 3. Fallback to Diffbot's sentiment score (-1.0 to +1.0)
  if (typeof post.sentiment === 'number' && !isNaN(post.sentiment)) {
    // Map -1.0..1.0 linearly to 1..5:
    // sentiment -1.0 -> 1 star
    // sentiment  0.0 -> 3 stars
    // sentiment +1.0 -> 5 stars
    const mapped = Math.round(((post.sentiment + 1) / 2) * 4 + 1);
    return Math.min(5, Math.max(1, mapped));
  }

  // 4. Default to neutral rating
  return 3;
}

/**
 * Check if the post indicates a verified purchase.
 */
function isVerified(post: DiffbotPost): boolean {
  if (post.isVerifiedPurchase === true) return true;
  const combined = `${post.html || ''} ${post.text || ''}`;
  return /verified\s+(?:purchase|buyer)|certified\s+buyer/i.test(combined);
}

/**
 * Extract helpful votes count if present.
 */
function extractHelpfulVotes(post: DiffbotPost): number {
  if (typeof post.helpfulVotes === 'number') return post.helpfulVotes;
  const combined = `${post.html || ''} ${post.text || ''}`;
  const match = combined.match(/(\d+)\s*(?:people|users)?\s*found this helpful/i);
  if (match) {
    return parseInt(match[1], 10) || 0;
  }
  return 0;
}

/**
 * Format RFC 1123 or any date string to ISO 8601.
 */
function formatDate(raw?: string): string {
  if (!raw) return 'unknown';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? 'unknown' : d.toISOString();
}

// ── Diffbot Adapter Class ────────────────────────────────────────────────────

export class DiffbotAdapter extends BaseAdapter {
  private url: string;
  private token: string;
  private meta: { platform: string; sourceName: string; sourceId: string };

  constructor(url: string, token?: string) {
    super();
    this.url = url;
    this.token = token || process.env.DIFFBOT_TOKEN || '';
    this.meta = derivePlatformMeta(url);
  }

  get sourceId(): string {
    return this.meta.sourceId;
  }

  get sourceName(): string {
    return this.meta.sourceName;
  }

  get sourceUrl(): string {
    return this.url;
  }

  get dataType(): 'diffbot-extract' {
    return 'diffbot-extract';
  }

  /**
   * Adapter is available if DIFFBOT_TOKEN is set.
   */
  isAvailable(): boolean {
    return Boolean(this.token && this.token.trim().length > 0);
  }

  /**
   * Query the Diffbot Account API (GET https://api.diffbot.com/v4/account)
   * to verify token validity, subscription plan, and usage stats.
   */
  static async getAccountInfo(token?: string): Promise<DiffbotAccountResponse> {
    const activeToken = token || process.env.DIFFBOT_TOKEN;
    if (!activeToken) {
      throw new Error('No DIFFBOT_TOKEN provided');
    }

    const endpoint = `https://api.diffbot.com/v4/account?token=${encodeURIComponent(activeToken)}&days=31`;
    const response = await axios.get<DiffbotAccountResponse>(endpoint, {
      headers: { Accept: 'application/json' },
      timeout: 15000,
    });

    if (response.data.errorCode && response.data.errorCode !== 200) {
      throw new Error(`Diffbot Account API error ${response.data.errorCode}: ${response.data.error}`);
    }

    return response.data;
  }

  /**
   * Fetches product and review data using Diffbot Extract API.
   *
   * Flow:
   *  1. Call Diffbot Product API (GET /v3/product?discussion=true).
   *     This automatically extracts product details AND review threads via the integrated Discussion API.
   *  2. If Product API returns no reviews or if the URL points directly to a review listing,
   *     query the Diffbot Discussion API (GET /v3/discussion?fields=sentiment&maxPages=3).
   *  3. If still empty, fall back to Diffbot Analyze API (GET /v3/analyze).
   *  4. Transform posts into canonical Review objects for downstream signal analysis.
   */
  async fetchReviews(_query: string): Promise<RawReviewBatch> {
    if (!this.isAvailable()) {
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        sourceUrl: this.sourceUrl,
        reviews: [],
        error: 'DIFFBOT_TOKEN is not configured in environment variables (.env)',
      };
    }

    console.log(`[Diffbot] Fetching and parsing page with Extract API: ${this.url}`);

    try {
      // ── Step 1: Call Diffbot Product API ──────────────────────────────────
      const productResult = await this.callProductApi(this.url);

      let listingTitle = productResult.title;
      let posts: DiffbotPost[] = productResult.posts;

      // ── Step 2: Fallback to Discussion API if reviews are empty ────────────
      // If the page is a dedicated reviews thread or discussion section wasn't captured in product API
      if (posts.length === 0) {
        console.log(`[Diffbot] No reviews in Product API response; attempting Discussion API...`);
        const discussionResult = await this.callDiscussionApi(this.url);
        if (discussionResult.posts.length > 0) {
          posts = discussionResult.posts;
          if (!listingTitle && discussionResult.title) {
            listingTitle = discussionResult.title;
          }
        }
      }

      // ── Step 3: Fallback to Analyze API if still empty ─────────────────────
      if (posts.length === 0 && !listingTitle) {
        console.log(`[Diffbot] Attempting Analyze API for dynamic page classification...`);
        const analyzeResult = await this.callAnalyzeApi(this.url);
        posts = analyzeResult.posts;
        if (analyzeResult.title) {
          listingTitle = analyzeResult.title;
        }
      }

      // ── Step 4: Map Diffbot posts to Verity canonical Review objects ───────
      const reviews: Review[] = posts.map((post, index): Review => {
        const id = post.diffbotUri || `${this.sourceId}:${post.id ?? index}`;
        const rating = extractRating(post);
        const title = (post.title || '').trim();
        const body = (post.text || '').trim();
        const date = formatDate(post.date);
        const isVerifiedPurchase = isVerified(post);
        const helpfulVotes = extractHelpfulVotes(post);
        const reviewerHandle = (post.author || 'Anonymous').slice(0, 50).trim();

        return {
          id,
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          sourceUrl: this.sourceUrl,
          listingTitle: listingTitle || undefined,
          rating,
          title,
          body,
          date,
          isVerifiedPurchase,
          helpfulVotes,
          reviewerHandle,
          flags: [],
        };
      });

      console.log(`[Diffbot] Successfully parsed ${reviews.length} reviews for "${listingTitle || 'Product'}"`);

      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        sourceUrl: this.sourceUrl,
        listingTitle: listingTitle || undefined,
        reviews,
      };
    } catch (err: any) {
      const errorMsg = this.formatErrorMessage(err);
      console.error(`[Diffbot] Error extracting ${this.url}:`, errorMsg);
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        sourceUrl: this.sourceUrl,
        reviews: [],
        error: errorMsg,
      };
    }
  }

  /**
   * Call Diffbot Product API: GET https://api.diffbot.com/v3/product
   */
  private async callProductApi(targetUrl: string): Promise<{ title?: string; posts: DiffbotPost[] }> {
    const endpoint = 'https://api.diffbot.com/v3/product';
    const params = {
      token: this.token,
      url: targetUrl,
      discussion: 'true', // extract product reviews by default
      timeout: 35000,
    };

    const res = await axios.get<DiffbotExtractResponse>(endpoint, {
      params,
      headers: { Accept: 'application/json' },
      timeout: 45000,
    });

    this.checkDiffbotErrors(res.data);

    const firstObj = res.data.objects?.[0];
    const title = firstObj?.title;
    const posts = firstObj?.discussion?.posts || [];

    return { title, posts };
  }

  /**
   * Call Diffbot Discussion API: GET https://api.diffbot.com/v3/discussion
   */
  private async callDiscussionApi(targetUrl: string): Promise<{ title?: string; posts: DiffbotPost[] }> {
    const endpoint = 'https://api.diffbot.com/v3/discussion';
    const params = {
      token: this.token,
      url: targetUrl,
      fields: 'sentiment,meta,breadcrumb',
      maxPages: '3', // concatenate up to 3 pages of reviews
      timeout: 35000,
    };

    const res = await axios.get<DiffbotExtractResponse>(endpoint, {
      params,
      headers: { Accept: 'application/json' },
      timeout: 45000,
    });

    this.checkDiffbotErrors(res.data);

    const firstObj = res.data.objects?.[0];
    const title = firstObj?.title;
    const posts = firstObj?.posts || [];

    return { title, posts };
  }

  /**
   * Call Diffbot Analyze API: GET https://api.diffbot.com/v3/analyze
   */
  private async callAnalyzeApi(targetUrl: string): Promise<{ title?: string; posts: DiffbotPost[] }> {
    const endpoint = 'https://api.diffbot.com/v3/analyze';
    const params = {
      token: this.token,
      url: targetUrl,
      timeout: 35000,
    };

    const res = await axios.get<DiffbotExtractResponse>(endpoint, {
      params,
      headers: { Accept: 'application/json' },
      timeout: 45000,
    });

    this.checkDiffbotErrors(res.data);

    const firstObj = res.data.objects?.[0];
    const title = firstObj?.title;
    const posts = firstObj?.discussion?.posts || firstObj?.posts || [];

    return { title, posts };
  }

  /**
   * Validate Diffbot error codes in JSON body.
   */
  private checkDiffbotErrors(data: DiffbotExtractResponse): void {
    if (data.errorCode && data.errorCode !== 200) {
      if (data.errorCode === 401) {
        throw new Error('Diffbot API Error (401): Not authorized API token. Please check your DIFFBOT_TOKEN in .env.');
      }
      if (data.errorCode === 429) {
        throw new Error('Diffbot API Error (429): Rate limit exceeded. Please wait or check your account plan.');
      }
      if (data.errorCode === 404) {
        throw new Error('Diffbot API Error (404): Could not download the target page.');
      }
      throw new Error(`Diffbot API Error (${data.errorCode}): ${data.error || 'Unknown error'}`);
    }
  }

  /**
   * Format Axios and Diffbot errors into human-readable strings.
   */
  private formatErrorMessage(err: any): string {
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError<any>;
      if (axiosErr.response?.data?.errorCode) {
        return `Diffbot Error (${axiosErr.response.data.errorCode}): ${axiosErr.response.data.error || axiosErr.message}`;
      }
      if (axiosErr.response?.status === 401) {
        return 'Diffbot Error: 401 Unauthorized — verify your DIFFBOT_TOKEN in .env';
      }
      if (axiosErr.response?.status === 429) {
        return 'Diffbot Error: 429 Rate limit exceeded';
      }
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
        return 'Diffbot Error: Request timed out while rendering the page';
      }
      return `Diffbot HTTP ${axiosErr.response?.status || 'Error'}: ${axiosErr.message}`;
    }
    return err?.message || 'Unknown Diffbot extraction error';
  }
}
