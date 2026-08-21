import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import './db';
import { UPLOADS_DIR } from './db';
import { locationsRouter } from './routes/locations';
import { containersRouter } from './routes/containers';
import { itemsRouter } from './routes/items';
import { tagsRouter } from './routes/tags';
import { lookupRouter } from './routes/lookup';
import { labelforgeRouter } from './routes/labelforge';
import {
  containerPhotoDeleteRouter,
  containerPhotosRouter,
  itemPhotoDeleteRouter,
  itemPhotosRouter,
  locationPhotoDeleteRouter,
  locationPhotosRouter,
} from './routes/photos';

const app = express();
const PORT = Number(process.env.PORT) || 8090;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/containers/:containerId/photos', containerPhotosRouter);
app.use('/api/container-photos', containerPhotoDeleteRouter);
app.use('/api/items/:itemId/photos', itemPhotosRouter);
app.use('/api/item-photos', itemPhotoDeleteRouter);
app.use('/api/locations/:locationId/photos', locationPhotosRouter);
app.use('/api/location-photos', locationPhotoDeleteRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/containers', containersRouter);
app.use('/api/items', itemsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/lookup', lookupRouter);
app.use('/api/labelforge', labelforgeRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const webDist = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`StorBox server listening on port ${PORT}`);
});
