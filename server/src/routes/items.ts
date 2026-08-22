import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Container, Item, Loan, Location, Product, Room } from '../types';
import { getTagsForItem, setItemTags } from '../services/tags';

export const itemsRouter = Router();

function resolvePlaces(item: Item) {
  const container = item.container_id
    ? (db.prepare('SELECT * FROM containers WHERE id = ?').get(item.container_id) as Container | undefined)
    : null;
  const location = db
    .prepare('SELECT * FROM locations WHERE id = ?')
    .get(item.location_id || container?.location_id) as Location | undefined;
  const room = item.room_id
    ? (db.prepare('SELECT * FROM rooms WHERE id = ?').get(item.room_id) as Room | undefined)
    : null;
  return { container: container || null, location: location || null, room: room || null };
}

// Lightweight sibling summary (same product) — placement only, no tags/photos/loans.
function loadSibling(item: Item) {
  return { id: item.id, name: item.name, ...resolvePlaces(item) };
}

function loadItemDetail(item: Item) {
  const loans = db.prepare('SELECT * FROM loans WHERE item_id = ? ORDER BY lent_at DESC').all(item.id) as Loan[];
  const product = item.product_id
    ? (db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as Product | undefined)
    : null;
  const siblings = item.product_id
    ? (db.prepare('SELECT * FROM items WHERE product_id = ? AND id != ? ORDER BY name').all(item.product_id, item.id) as Item[])
    : [];
  return {
    ...item,
    ...resolvePlaces(item),
    active_loan: loans.find((l) => !l.returned_at) || null,
    loans,
    product: product || null,
    siblings: siblings.map(loadSibling),
    tags: getTagsForItem(item.id),
    photos: db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at').all(item.id),
  };
}

function resolvePlacement(body: any, existing?: Item) {
  return {
    container_id: body.container_id !== undefined ? body.container_id || null : existing?.container_id ?? null,
    location_id: body.location_id !== undefined ? body.location_id || null : existing?.location_id ?? null,
    room_id: body.room_id !== undefined ? body.room_id || null : existing?.room_id ?? null,
  };
}

function validatePlacement(placement: { container_id: string | null; location_id: string | null; room_id: string | null }) {
  const { container_id, location_id, room_id } = placement;
  const count = [container_id, location_id, room_id].filter(Boolean).length;
  if (count !== 1) return 'Set exactly one of container_id, location_id, or room_id';
  if (container_id && !db.prepare('SELECT id FROM containers WHERE id = ?').get(container_id)) {
    return 'container_id does not exist';
  }
  if (location_id && !db.prepare('SELECT id FROM locations WHERE id = ?').get(location_id)) {
    return 'location_id does not exist';
  }
  if (room_id && !db.prepare('SELECT id FROM rooms WHERE id = ?').get(room_id)) {
    return 'room_id does not exist';
  }
  return null;
}

// GET /api/items?q=search&tag=name — used for the dashboard search box, tag browsing,
// and the "link to an existing item" autocomplete
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
  const { name, description, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const placement = resolvePlacement(req.body);
  const placementError = validatePlacement(placement);
  if (placementError) return res.status(400).json({ error: placementError });

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO items (id, name, description, container_id, location_id, room_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name.trim(), description || null, placement.container_id, placement.location_id, placement.room_id, now, now);
  if (Array.isArray(tags)) setItemTags(id, tags);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Item;
  res.status(201).json(loadItemDetail(item));
});

itemsRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as Item | undefined;
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const { name, description, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const placement = resolvePlacement(req.body, existing);
  const placementError = validatePlacement(placement);
  if (placementError) return res.status(400).json({ error: placementError });

  db.prepare(
    `UPDATE items SET name = ?, description = ?, container_id = ?, location_id = ?, room_id = ?, updated_at = ? WHERE id = ?`
  ).run(
    name.trim(),
    description || null,
    placement.container_id,
    placement.location_id,
    placement.room_id,
    new Date().toISOString(),
    req.params.id
  );
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

// POST /api/items/:id/link/:otherId — mark two items as the same product ("master
// product"): reuses either item's existing product if it has one (merging the two
// groups if both already did), otherwise creates a new product for both.
itemsRouter.post('/:id/link/:otherId', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as Item | undefined;
  const other = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.otherId) as Item | undefined;
  if (!item || !other) return res.status(404).json({ error: 'Item not found' });
  if (item.id === other.id) return res.status(400).json({ error: 'Cannot link an item to itself' });

  const now = new Date().toISOString();
  let productId = item.product_id || other.product_id;
  if (!productId) {
    productId = uuid();
    db.prepare('INSERT INTO products (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      productId,
      item.name,
      now,
      now
    );
  } else if (item.product_id && other.product_id && item.product_id !== other.product_id) {
    // Both already belonged to different products — merge the other group into this one.
    db.prepare('UPDATE items SET product_id = ? WHERE product_id = ?').run(productId, other.product_id);
    db.prepare('DELETE FROM products WHERE id = ?').run(other.product_id);
  }
  db.prepare('UPDATE items SET product_id = ?, updated_at = ? WHERE id IN (?, ?)').run(productId, now, item.id, other.id);

  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(item.id) as Item;
  res.json(loadItemDetail(updated));
});

// POST /api/items/:id/unlink — undo a mistaken link; only affects this item
itemsRouter.post('/:id/unlink', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as Item | undefined;
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const productId = item.product_id;
  db.prepare('UPDATE items SET product_id = NULL, updated_at = ? WHERE id = ?').run(new Date().toISOString(), item.id);
  if (productId) {
    const remaining = (db.prepare('SELECT COUNT(*) AS n FROM items WHERE product_id = ?').get(productId) as { n: number })
      .n;
    if (remaining === 0) db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  }
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(item.id) as Item;
  res.json(loadItemDetail(updated));
});
