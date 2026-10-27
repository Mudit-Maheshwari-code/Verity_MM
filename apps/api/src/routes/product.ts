import { Router, Request, Response } from 'express';
import { getCached } from '../cache';

const router = Router();

/** GET /api/product/:cacheId — fetch a previously cached result by its ID */
router.get('/:cacheId', (req: Request, res: Response) => {
  const { cacheId } = req.params;
  const cached = getCached(cacheId);
  if (!cached) {
    return res.status(404).json({ error: 'Result not found or expired. Please search again.' });
  }
  return res.json(cached);
});

export default router;
