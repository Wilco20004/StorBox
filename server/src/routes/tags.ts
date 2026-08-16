import { Router } from 'express';
import { db } from '../db';
import { Tag } from '../types';

export const tagsRouter = Router();

tagsRouter.get('/', (_req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
  const withCounts = tags.map((tag) => {
    const item_count = (
      db.prepare('SELECT COUNT(*) AS n FROM item_tags WHERE tag_id = ?').get(tag.id) as { n: number }
    ).n;
    const container_count = (
      db.prepare('SELECT COUNT(*) AS n FROM container_tags WHERE tag_id = ?').get(tag.id) as { n: number }
    ).n;
    return { ...tag, item_count, container_count };
  });
  res.json(withCounts.filter((t) => t.item_count > 0 || t.container_count > 0));
});
