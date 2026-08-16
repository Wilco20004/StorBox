import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Container, Item, Location } from '../types';
import { getTagsForItem, setItemTags } from '../services/tags';

export const itemsRouter = Router();

function loadItemDetail(item: Item) {
  const container = item.container_id
    ? (db.prepare('SELECT * FROM containers WHERE id = ?').get(item.container_id) as Container | undefined)
    : null;
  const location = db
    .prepare('SELECT * FROM locations WHERE id = ?')
    .get(item.location_id || container?.location_id) as Location | undefined;
  return {
    ...item,
    container: container || null,
    location: location || null,
    tags: getTagsForItem(item.id),
    photos: db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at').all(item.id),
  };
}

// GET /api/items?q=search&tag=name — used for the dashboard search box and tag browsing
itemsRouter.get('/', (req, res) => {
  const { q, tag } = req.query as { q?: string; tag?: string };
  let items: Item[];
  if (tag) {
    items = db
      .prepare(
        `SELECT items.* FROM items
         JOIN item_tags ON item_tags.item_id = items.id
         JOIN tags ON tags.id = item_tags.tag_id
         WHERE tags.name = ?
         ORDER BY items.name`
      )
      .all(tag) as Item[];
  } else if (q?.trim()) {
    const like = `%${q.trim()}%`;
    items = db
      .prepare('SELECT * FROM items WHERE name LIKE ? OR description LIKE ? ORDER BY name')
      .all(like, like) as Item[];
  } else {
    items = db.prepare('SELECT * FROM items ORDER BY name').all() as Item[];
  }
  res.json(items.map(loadItemDetail));
});

itemsRouter.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as Item | undefined;
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(loadItemDetail(item));
});

itemsRouter.post('/', (req, res) => {
  const { name, description, container_id, location_id, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!container_id && !location_id) {
    return res.status(400).json({ error: 'container_id or location_id is required' });
  }
  if (container_id && location_id) {
    return res.status(400).json({ error: 'set only one of container_id or location_id' });
  }
  if (container_id && !db.prepare('SELECT id FROM containers WHERE id = ?').get(container_id)) {
    return res.status(400).json({ error: 'container_id does not exist' });
  }
  if (location_id && !db.prepare('SELECT id FROM locations WHERE id = ?').get(location_id)) {
    return res.status(400).json({ error: 'location_id does not exist' });
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO items (id, name, description, container_id, location_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name.trim(), description || null, container_id || null, location_id || null, now, now);
  if (Array.isArray(tags)) setItemTags(id, tags);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item;
  res.status(201).json(loadItemDetail(item));
});

itemsRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as Item | undefined;
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const { name, description, container_id, location_id, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const nextContainerId = container_id !== undefined ? container_id : existing.container_id;
  const nextLocationId = location_id !== undefined ? location_id : existing.location_id;
  if (!nextContainerId && !nextLocationId) {
    return res.status(400).json({ error: 'container_id or location_id is required' });
  }
  if (nextContainerId && nextLocationId) {
    return res.status(400).json({ error: 'set only one of container_id or location_id' });
  }
  if (nextContainerId && !db.prepare('SELECT id FROM containers WHERE id = ?').get(nextContainerId)) {
    return res.status(400).json({ error: 'container_id does not exist' });
  }
  if (nextLocationId && !db.prepare('SELECT id FROM locations WHERE id = ?').get(nextLocationId)) {
    return res.status(400).json({ error: 'location_id does not exist' });
  }

  db.prepare(
    `UPDATE items SET name = ?, description = ?, container_id = ?, location_id = ?, updated_at = ? WHERE id = ?`
  ).run(name.trim(), description || null, nextContainerId || null, nextLocationId || null, new Date().toISOString(), req.params.id);
  if (Array.isArray(tags)) setItemTags(req.params.id, tags);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as Item;
  res.json(loadItemDetail(item));
});

itemsRouter.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
