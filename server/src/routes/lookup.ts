import { Router } from 'express';
import { db } from '../db';

export const lookupRouter = Router();

// GET /api/lookup/:id — resolves a scanned label code (a bare container/item id)
// to the entity it belongs to, without the code needing to encode a type or URL.
lookupRouter.get('/:id', (req, res) => {
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.id);
  if (item) return res.json({ type: 'item', id: req.params.id });
  const container = db.prepare('SELECT id FROM containers WHERE id = ?').get(req.params.id);
  if (container) return res.json({ type: 'container', id: req.params.id });
  res.status(404).json({ error: 'No item or container matches that code' });
});
