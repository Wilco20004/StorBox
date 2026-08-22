import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Loan } from '../types';

// Mounted at /api/items/:itemId/loans
export const itemLoansRouter = Router({ mergeParams: true });

itemLoansRouter.post('/', (req, res) => {
  const itemId = (req.params as any).itemId as string;
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const active = db.prepare('SELECT id FROM loans WHERE item_id = ? AND returned_at IS NULL').get(itemId);
  if (active) return res.status(400).json({ error: 'This item is already lent out' });

  const { borrower, lent_at, due_at, notes } = req.body;
  if (!borrower?.trim()) return res.status(400).json({ error: 'borrower is required' });

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO loans (id, item_id, borrower, lent_at, due_at, returned_at, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`
  ).run(id, itemId, borrower.trim(), lent_at || now, due_at || null, notes || null, now, now);
  res.status(201).json(db.prepare('SELECT * FROM loans WHERE id = ?').get(id));
});

// Mounted at /api/loans
export const loansRouter = Router();

// GET /api/loans?active=1 — used by the dashboard's "Lent out" section
loansRouter.get('/', (req, res) => {
  const { active } = req.query as { active?: string };
  const loans = (
    active
      ? db.prepare('SELECT * FROM loans WHERE returned_at IS NULL ORDER BY lent_at').all()
      : db.prepare('SELECT * FROM loans ORDER BY lent_at DESC').all()
  ) as Loan[];
  const withItems = loans.map((l) => ({
    ...l,
    item: db.prepare('SELECT id, name FROM items WHERE id = ?').get(l.item_id),
  }));
  res.json(withItems);
});

loansRouter.put('/:id/return', (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id) as Loan | undefined;
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const returnedAt = req.body?.returned_at || new Date().toISOString();
  db.prepare('UPDATE loans SET returned_at = ?, updated_at = ? WHERE id = ?').run(
    returnedAt,
    new Date().toISOString(),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id));
});

loansRouter.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM loans WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Loan not found' });
  db.prepare('DELETE FROM loans WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
