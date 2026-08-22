import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Container, Location } from '../types';
import { getTagsForContainer, getTagsForItem, setContainerTags } from '../services/tags';

export const containersRouter = Router();

function loadContainerDetail(container: Container) {
  const location = container.location_id
    ? (db.prepare('SELECT * FROM locations WHERE id = ?').get(container.location_id) as Location | undefined)
    : undefined;
  const items = db
    .prepare('SELECT * FROM items WHERE container_id = ? ORDER BY name')
    .all(container.id) as any[];
  const itemsWithExtras = items.map((i) => ({
    ...i,
    tags: getTagsForItem(i.id),
    photos: db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at').all(i.id),
  }));
  return {
    ...container,
    location: location || null,
    tags: getTagsForContainer(container.id),
    photos: db.prepare('SELECT * FROM container_photos WHERE container_id = ? ORDER BY created_at').all(container.id),
    items: itemsWithExtras,
  };
}

// GET /api/containers?tag=name — full detail, used for tag browsing
// GET /api/containers?holding=1 — full detail, containers not yet placed in a location
// GET /api/containers (no query) — lightweight list with location name (null if holding), used for the item-placement picker
containersRouter.get('/', (req, res) => {
  const { tag, holding } = req.query as { tag?: string; holding?: string };
  if (tag) {
    const containers = db
      .prepare(
        `SELECT containers.* FROM containers
         JOIN container_tags ON container_tags.container_id = containers.id
         JOIN tags ON tags.id = container_tags.tag_id
         WHERE tags.name = ?
         ORDER BY containers.name`
      )
      .all(tag) as Container[];
    return res.json(containers.map(loadContainerDetail));
  }
  if (holding) {
    const containers = db
      .prepare('SELECT * FROM containers WHERE location_id IS NULL ORDER BY name')
      .all() as Container[];
    return res.json(
      containers.map((c) => ({
        ...loadContainerDetail(c),
        item_count: (db.prepare('SELECT COUNT(*) AS n FROM items WHERE container_id = ?').get(c.id) as { n: number })
          .n,
      }))
    );
  }
  const containers = db
    .prepare(
      `SELECT containers.id, containers.name, containers.position, containers.location_id, locations.name AS location_name
       FROM containers
       LEFT JOIN locations ON locations.id = containers.location_id
       ORDER BY locations.name, containers.name`
    )
    .all();
  res.json(containers);
});

containersRouter.get('/:id', (req, res) => {
  const container = db.prepare('SELECT * FROM containers WHERE id = ?').get(req.params.id) as Container | undefined;
  if (!container) return res.status(404).json({ error: 'Container not found' });
  res.json(loadContainerDetail(container));
});

containersRouter.post('/', (req, res) => {
  const { location_id, name, position, description, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (location_id && !db.prepare('SELECT id FROM locations WHERE id = ?').get(location_id)) {
    return res.status(400).json({ error: 'location_id does not exist' });
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO containers (id, location_id, name, position, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, location_id || null, name.trim(), position || null, description || null, now, now);
  if (Array.isArray(tags)) setContainerTags(id, tags);
  const container = db.prepare('SELECT * FROM containers WHERE id = ?').get(id) as Container;
  res.status(201).json(loadContainerDetail(container));
});

containersRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM containers WHERE id = ?').get(req.params.id) as Container | undefined;
  if (!existing) return res.status(404).json({ error: 'Container not found' });
  const { location_id, name, position, description, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const targetLocationId = location_id !== undefined ? location_id : existing.location_id;
  if (targetLocationId && !db.prepare('SELECT id FROM locations WHERE id = ?').get(targetLocationId)) {
    return res.status(400).json({ error: 'location_id does not exist' });
  }

  db.prepare(
    `UPDATE containers SET location_id = ?, name = ?, position = ?, description = ?, updated_at = ? WHERE id = ?`
  ).run(
    targetLocationId || null,
    name.trim(),
    position || null,
    description || null,
    new Date().toISOString(),
    req.params.id
  );
  if (Array.isArray(tags)) setContainerTags(req.params.id, tags);
  const container = db.prepare('SELECT * FROM containers WHERE id = ?').get(req.params.id) as Container;
  res.json(loadContainerDetail(container));
});

containersRouter.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM containers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Container not found' });
  db.prepare('DELETE FROM containers WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
