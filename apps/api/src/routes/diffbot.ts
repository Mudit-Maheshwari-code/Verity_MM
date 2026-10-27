import { Router, Request, Response } from 'express';
import { DiffbotAdapter } from '../adapters/diffbot.adapter';

const router = Router();

/**
 * GET /api/diffbot/account
 *
 * Adheres to Diffbot Account API (https://www.diffbot.com/docs/account):
 * GET https://api.diffbot.com/v4/account?token=<DIFFBOT_TOKEN>&days=31
 *
 * Returns account plan, monthly plan credits, status, child tokens,
 * and daily API usage volume.
 */
router.get('/account', async (_req: Request, res: Response) => {
  const token = process.env.DIFFBOT_TOKEN;
  if (!token) {
    return res.status(401).json({
      errorCode: 401,
      error: 'DIFFBOT_TOKEN environment variable is not configured in .env',
      help: 'Register at https://www.diffbot.com and add DIFFBOT_TOKEN to .env',
    });
  }

  try {
    const accountInfo = await DiffbotAdapter.getAccountInfo(token);
    return res.json({
      status: 'ok',
      account: accountInfo,
    });
  } catch (err: any) {
    console.error('[Diffbot Route] Failed to get account info:', err.message);
    const statusCode = err.message.includes('401') ? 401 : 500;
    return res.status(statusCode).json({
      error: err.message,
    });
  }
});

export default router;
