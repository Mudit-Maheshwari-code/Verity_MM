import { LRUCache } from 'lru-cache';
import { SearchResponse } from '@verity/shared';

const TTL_MINUTES = parseInt(process.env.CACHE_TTL_MINUTES || '60', 10);

const cache = new LRUCache<string, SearchResponse>({
  max: 200,                        // max 200 cached unique searches
  ttl: TTL_MINUTES * 60 * 1000,   // convert minutes → milliseconds
});

/** Retrieve a cached search result. Returns undefined on cache miss. */
export function getCached(key: string): SearchResponse | undefined {
  return cache.get(key);
}

/** Store a search result in the cache. */
export function setCached(key: string, value: SearchResponse): void {
  cache.set(key, value);
}

/**
 * Normalize a query string into a stable cache key.
 * Lowercases, trims, and collapses whitespace so that
 * "USB-C Cable ", "usb-c cable", and "USB-C cable" all hit the same entry.
 */
export function normalizeCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}
