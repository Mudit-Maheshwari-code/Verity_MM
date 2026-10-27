import { Pool } from 'pg';
import { SearchResponse } from '@verity/shared';

let pool: Pool | null = null;
let isConnected = false;

/**
 * Initializes PostgreSQL connection pool and runs auto-migration
 * to ensure the product_reports table exists.
 */
export async function initDb(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('  ℹ DATABASE_URL not set — operating with in-memory LRU caching');
    return false;
  }

  try {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    });

    // Test connection
    const client = await pool.connect();

    // Auto-create product_reports table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS product_reports (
        id VARCHAR(64) PRIMARY KEY,
        query TEXT NOT NULL,
        product_title TEXT,
        product_url TEXT,
        score INTEGER NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        total_reviews INTEGER NOT NULL,
        report_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_product_reports_query ON product_reports(query);
    `;

    await client.query(createTableQuery);
    client.release();

    isConnected = true;
    console.log('  ✓ PostgreSQL database connected & product_reports table verified');
    return true;
  } catch (error: any) {
    console.error(`  ⚠ Failed to connect to PostgreSQL: ${error.message}`);
    isConnected = false;
    return false;
  }
}

/**
 * Check if the database connection pool is active.
 */
export function isDbConnected(): boolean {
  return isConnected && pool !== null;
}

/**
 * Persist a generated search response & authenticity report into the database.
 */
export async function saveReport(
  id: string,
  query: string,
  searchResponse: SearchResponse,
  productUrl?: string
): Promise<void> {
  if (!pool || !isConnected) return;

  const insertQuery = `
    INSERT INTO product_reports (
      id, query, product_title, product_url, score, risk_level, total_reviews, report_data, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (id) DO UPDATE SET
      product_title = EXCLUDED.product_title,
      score = EXCLUDED.score,
      risk_level = EXCLUDED.risk_level,
      total_reviews = EXCLUDED.total_reviews,
      report_data = EXCLUDED.report_data,
      created_at = NOW();
  `;

  const score = searchResponse.report.score;
  const riskLevel = score >= 75 ? 'low' : score >= 45 ? 'moderate' : 'high';
  const totalReviews = searchResponse.report.reviewCount;

  try {
    await pool.query(insertQuery, [
      id,
      query.toLowerCase().trim(),
      searchResponse.productTitle,
      productUrl ?? null,
      score,
      riskLevel,
      totalReviews,
      JSON.stringify(searchResponse),
    ]);
  } catch (err: any) {
    console.error(`[DB] Error saving report: ${err.message}`);
  }
}

/**
 * Look up a previously cached report from the database by query string.
 */
export async function getReportFromDb(query: string): Promise<SearchResponse | null> {
  if (!pool || !isConnected) return null;

  const selectQuery = `
    SELECT report_data
    FROM product_reports
    WHERE query = $1
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  try {
    const res = await pool.query(selectQuery, [query.toLowerCase().trim()]);
    if (res.rows.length > 0) {
      return res.rows[0].report_data as SearchResponse;
    }
  } catch (err: any) {
    console.error(`[DB] Error fetching report: ${err.message}`);
  }

  return null;
}

/**
 * Fetch a list of recently analyzed products for dashboard or history views.
 */
export async function getRecentReports(limit = 10): Promise<Array<{
  id: string;
  query: string;
  productTitle: string;
  score: number;
  riskLevel: string;
  totalReviews: number;
  createdAt: string;
}>> {
  if (!pool || !isConnected) return [];

  const selectQuery = `
    SELECT id, query, product_title, score, risk_level, total_reviews, created_at
    FROM product_reports
    ORDER BY created_at DESC
    LIMIT $1;
  `;

  try {
    const res = await pool.query(selectQuery, [limit]);
    return res.rows.map((row) => ({
      id: row.id,
      query: row.query,
      productTitle: row.product_title,
      score: row.score,
      riskLevel: row.risk_level,
      totalReviews: row.total_reviews,
      createdAt: row.created_at,
    }));
  } catch (err: any) {
    console.error(`[DB] Error fetching recent reports: ${err.message}`);
    return [];
  }
}
