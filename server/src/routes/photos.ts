import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { db, UPLOADS_DIR } from '../db';
import { Photo } from '../types';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only jpg, png, or webp images are allowed'));
  },
});

/**
 * Swaps the image behind an existing photo, keeping its row id and created_at.
 * That matters: photos are ordered by created_at and the first one is what
 * shows as a container's cover, so re-cropping a cover photo must not quietly
 * demote it to the back of the queue the way delete-then-upload would.
 */
function replacePhotoHandler(table: 'item_photos' | 'container_photos' | 'location_photos') {
  return (req: any, res: any) => {
    const photo = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id) as Photo | undefined;
    if (!photo) {
      if (req.file) fs.unlink(path.join(UPLOADS_DIR, req.file.filename), () => {});
      return res.status(404).json({ error: 'Photo not found' });
    }
    if (!req.file) return res.status(400).json({ error: 'photo file is required' });

    const previous = photo.file_path;
    db.prepare(`UPDATE ${table} SET file_path = ? WHERE id = ?`).run(req.file.filename, photo.id);
    // Only after the row points at the new file, so a failed unlink can never
    // leave a row referencing a deleted image.
    fs.unlink(path.join(UPLOADS_DIR, previous), () => {});
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(photo.id));
  };
}

// Mounted at /api/items/:itemId/photos
export const itemPhotosRouter = Router({ mergeParams: true });

itemPhotosRouter.post('/', upload.single('photo'), (req, res) => {
  const itemId = (req.params as any).itemId as string;
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (!req.file) return res.status(400).json({ error: 'photo file is required' });

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO item_photos (id, item_id, file_path, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    itemId,
    req.file.filename,
    now
  );
  res.status(201).json(db.prepare('SELECT * FROM item_photos WHERE id = ?').get(id));
});

// Mounted at /api/item-photos
export const itemPhotoDeleteRouter = Router();

itemPhotoDeleteRouter.put('/:id', upload.single('photo'), replacePhotoHandler('item_photos'));

itemPhotoDeleteRouter.delete('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM item_photos WHERE id = ?').get(req.params.id) as Photo | undefined;
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  fs.unlink(path.join(UPLOADS_DIR, photo.file_path), () => {});
  db.prepare('DELETE FROM item_photos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Mounted at /api/containers/:containerId/photos
export const containerPhotosRouter = Router({ mergeParams: true });

containerPhotosRouter.post('/', upload.single('photo'), (req, res) => {
  const containerId = (req.params as any).containerId as string;
  const container = db.prepare('SELECT id FROM containers WHERE id = ?').get(containerId);
  if (!container) return res.status(404).json({ error: 'Container not found' });
  if (!req.file) return res.status(400).json({ error: 'photo file is required' });

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO container_photos (id, container_id, file_path, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    containerId,
    req.file.filename,
    now
  );
  res.status(201).json(db.prepare('SELECT * FROM container_photos WHERE id = ?').get(id));
});

// Mounted at /api/container-photos
export const containerPhotoDeleteRouter = Router();

containerPhotoDeleteRouter.put('/:id', upload.single('photo'), replacePhotoHandler('container_photos'));

containerPhotoDeleteRouter.delete('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM container_photos WHERE id = ?').get(req.params.id) as Photo | undefined;
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  fs.unlink(path.join(UPLOADS_DIR, photo.file_path), () => {});
  db.prepare('DELETE FROM container_photos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Mounted at /api/locations/:locationId/photos
export const locationPhotosRouter = Router({ mergeParams: true });

locationPhotosRouter.post('/', upload.single('photo'), (req, res) => {
  const locationId = (req.params as any).locationId as string;
  const location = db.prepare('SELECT id FROM locations WHERE id = ?').get(locationId);
  if (!location) return res.status(404).json({ error: 'Location not found' });
  if (!req.file) return res.status(400).json({ error: 'photo file is required' });

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO location_photos (id, location_id, file_path, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    locationId,
    req.file.filename,
    now
  );
  res.status(201).json(db.prepare('SELECT * FROM location_photos WHERE id = ?').get(id));
});

// Mounted at /api/location-photos
export const locationPhotoDeleteRouter = Router();

locationPhotoDeleteRouter.put('/:id', upload.single('photo'), replacePhotoHandler('location_photos'));

locationPhotoDeleteRouter.delete('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM location_photos WHERE id = ?').get(req.params.id) as Photo | undefined;
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  fs.unlink(path.join(UPLOADS_DIR, photo.file_path), () => {});
  db.prepare('DELETE FROM location_photos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
