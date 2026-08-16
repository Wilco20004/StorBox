import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Tag } from '../types';

function findOrCreateTag(name: string): Tag {
  const trimmed = name.trim();
  const existing = db.prepare('SELECT * FROM tags WHERE name = ?').get(trimmed) as Tag | undefined;
  if (existing) return existing;
  const tag: Tag = { id: uuid(), name: trimmed, created_at: new Date().toISOString() };
  db.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)').run(tag.id, tag.name, tag.created_at);
  return tag;
}

function normalizeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

export function setItemTags(itemId: string, names: string[]): void {
  const tags = normalizeNames(names).map(findOrCreateTag);
  db.prepare('DELETE FROM item_tags WHERE item_id = ?').run(itemId);
  const insert = db.prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)');
  for (const tag of tags) insert.run(itemId, tag.id);
}

export function setContainerTags(containerId: string, names: string[]): void {
  const tags = normalizeNames(names).map(findOrCreateTag);
  db.prepare('DELETE FROM container_tags WHERE container_id = ?').run(containerId);
  const insert = db.prepare('INSERT INTO container_tags (container_id, tag_id) VALUES (?, ?)');
  for (const tag of tags) insert.run(containerId, tag.id);
}

export function getTagsForItem(itemId: string): Tag[] {
  return db
    .prepare(
      `SELECT tags.* FROM tags
       JOIN item_tags ON item_tags.tag_id = tags.id
       WHERE item_tags.item_id = ?
       ORDER BY tags.name`
    )
    .all(itemId) as Tag[];
}

export function getTagsForContainer(containerId: string): Tag[] {
  return db
    .prepare(
      `SELECT tags.* FROM tags
       JOIN container_tags ON container_tags.tag_id = tags.id
       WHERE container_tags.container_id = ?
       ORDER BY tags.name`
    )
    .all(containerId) as Tag[];
}
