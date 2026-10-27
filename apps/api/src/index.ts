import path from 'path';
import dotenv from 'dotenv';

// Load .env from the project root (two levels up from apps/api/src/index.ts)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import searchRouter from './routes/search';
import productRouter from './routes/product';
import diffbotRouter from './routes/diffbot';
import { DiffbotAdapter } from './adapters/diffbot.adapter';
import { initDb, isDbConnected, getRecentReports } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST'],
}));
app.use(compression());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/search', searchRouter);
app.use('/api/product', productRouter);
app.use('/api/diffbot', diffbotRouter);

// ── Recent reports endpoint ───────────────────────────────────────────────────
app.get('/api/reports/recent', async (_req, res) => {
  const reports = await getRecentReports(10);
  res.json({ reports });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const hasDiffbot = !!process.env.DIFFBOT_TOKEN;
  const dbConnected = isDbConnected();

  let diffbotAccount = null;
  if (hasDiffbot) {
    try {
      const info = await DiffbotAdapter.getAccountInfo();
      diffbotAccount = {
        name: info.name,
        plan: info.plan,
        planCredits: info.planCredits,
        status: info.status,
      };
    } catch (err: any) {
      diffbotAccount = { error: err.message };
    }
  }

  res.json({
    status: 'ok',
    mode: hasDiffbot ? 'live' : 'demo',
    primaryExtractor: hasDiffbot ? 'diffbot-extract-api' : 'playwright-or-mock',
    database: dbConnected ? 'connected' : 'in-memory-only',
    adapters: {
      'diffbot-extract': hasDiffbot,
      'playwright-scraper': true,
      mock: true,
    },
    diffbot: diffbotAccount,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  const hasDiffbot = !!process.env.DIFFBOT_TOKEN;

  console.log(`\n  Verity API  →  http://localhost:${PORT}`);
  console.log(`  Mode: ${hasDiffbot ? 'LIVE (Diffbot Extract API active)' : 'DEMO/SCRAPER (using Playwright fallback / mock datasets)'}`);
  if (hasDiffbot) console.log('  ✓ Diffbot Extract API token active (Product & Discussion Extractors)');
  if (!hasDiffbot) console.log('  ℹ Add DIFFBOT_TOKEN to .env for high-speed cloud extraction without local browser');

  // Initialize PostgreSQL database connection & tables if DATABASE_URL is set
  await initDb();
  console.log('');
});

export default app;
