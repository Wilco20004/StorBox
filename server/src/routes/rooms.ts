import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Room } from '../types';
import { getTagsForItem } from '../services/tags';
import { fetchHomeAssistantAreas, homeAssistantAvailable } from '../ha';

export const roomsRouter = Router();

function loadRoomDetail(room: Room) {
  const items = db.prepare('SELECT * FROM items WHERE room_id = ? ORDER BY name').all(room.id) as any[];
  const itemsWithExtras = items.map((i) => ({
    ...i,
    tags: getTagsForItem(i.id),
    photos: db.prepare('SELECT * FROM item_photos WHERE item_id = ? ORDER BY created_at').all(i.id),
  }));
  return { ...room, items: itemsWithExtras };
}

// GET /api/rooms — list, each with an item count
roomsRouter.get('/', (_req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY name').all() as Room[];
  const withCounts = rooms.map((r) => ({
    ...r,
    item_count: (db.prepare('SELECT COUNT(*) AS n FROM items WHERE room_id = ?').get(r.id) as { n: number }).n,
  }));
  res.json(withCounts);
});

// GET /api/rooms/ha-status — whether this add-on can reach Home Assistant's API to sync Areas
roomsRouter.get('/ha-status', (_req, res) => {
  res.json({ available: homeAssistantAvailable() });
});

// POST /api/rooms/sync-ha — create/update rooms to match Home Assistant's current Areas
roomsRouter.post('/sync-ha', async (_req, res) => {
  try {
    const areas = await fetchHomeAssistantAreas();
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    for (const area of areas) {
      const existing = db.prepare('SELECT id, name FROM rooms WHERE ha_area_id = ?').get(area.id) as
        | { id: string; name: string }
        | undefined;
      if (existing) {
        if (existing.name !== area.name) {
          db.prepare('UPDATE rooms SET name = ?, updated_at = ? WHERE id = ?').run(area.name, now, existing.id);
        }
        updated++;
      } else {
        db.prepare('INSERT INTO rooms (id, name, ha_area_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
          uuid(),
          area.name,
          area.id,
          now,
          now
        );
        created++;
      }
    }
    res.json({ ok: true, created, updated, total: areas.length });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

roomsRouter.get('/:id', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as Room | undefined;
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(loadRoomDetail(room));
});

roomsRouter.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO rooms (id, name, ha_area_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    id,
    name.trim(),
    null,
    now,
    now
  );
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room;
  res.status(201).json(loadRoomDetail(room));
});

roomsRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as Room | undefined;
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  db.prepare('UPDATE rooms SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), new Date().toISOString(), req.params.id);
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as Room;
  res.json(loadRoomDetail(room));
});

roomsRouter.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
