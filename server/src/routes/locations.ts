import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Location } from '../types';
import { getTagsForContainer, getTagsForItem } from '../services/tags';

export const locationsRouter = Router();

function locationSummary(location: Location) {
  const container_count = (
    db.prepare('SELECT COUNT(*) AS n FROM containers WHERE location_id = ?').get(location.id) as { n: number }
  ).n;
  const item_count = (
    db.prepare('SELECT COUNT(*) AS n FROM items WHERE location_id = ?').get(location.id) as { n: number }
  ).n;
  return { ...location, container_count, item_count };
}

locationsRouter.get('/', (_req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY name').all() as Location[];
  res.json(locations.map(locationSummary));
});

locationsRouter.get('/:id', (req, res) => {
  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id) as Location | undefined;
  if (!location) return res.status(404).json({ error: 'Location not found' });

  const containers = db
    .prepare('SELECT * FROM containers WHERE location_id = ? ORDER BY name')
    .all(location.id) as any[];
  const containersWithExtras = containers.map((c) => ({
    ...c,
    tags: getTagsForContainer(c.id),
    item_count: (db.prepare('SELECT COUNT(*) AS n FROM items WHERE container_id = ?').get(c.id) as { n: number }).n,
    photos: db.prepare('SELECT * FROM container_photos WHERE container_id = ? ORDER BY created_at').all(c.id),
  }));

  const items = db
    .prepare('SELECT * FROM items WHERE location_id = ? ORDER BY name')
    .all(location.id) as any[];
  const itemsWithExtras = items.map((i) => ({
    ...i,
    tags: getTagsForItem(i.id),
    photos: db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at').all(i.id),
  }));

  res.json({ ...location, containers: containersWithExtras, items: itemsWithExtras });
});

locationsRouter.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO locations (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), description || null, now, now);
  res.status(201).json(db.prepare('SELECT * FROM locations WHERE id = ?').get(id));
});

locationsRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id) as Location | undefined;
  if (!existing) return res.status(404).json({ error: 'Location not found' });
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  db.prepare('UPDATE locations SET name = ?, description = ?, updated_at = ? WHERE id = ?').run(
    name.trim(),
    description ?? null,
    new Date().toISOString(),
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id));
});

locationsRouter.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found' });
  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
