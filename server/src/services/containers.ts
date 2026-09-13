import { db } from '../db';
import { Container, Location, Photo } from '../types';
import { getTagsForContainer } from './tags';

/** Guards the ancestor walk against a cycle that somehow got past validation. */
const MAX_DEPTH = 50;

/** 0 -> "A", 25 -> "Z", 26 -> "AA" — spreadsheet-style column letters. */
export function columnLabel(x: number): string {
  let label = '';
  let n = x;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

/** Grid cells read column-letter first, row-number second: x=2, y=3 -> "C4". */
export function cellLabel(x: number, y: number): string {
  return `${columnLabel(x)}${y + 1}`;
}

export function getContainer(id: string): Container | undefined {
  return db.prepare('SELECT * FROM containers WHERE id = ?').get(id) as Container | undefined;
}

/** Ancestors of a container, outermost first, not including the container itself. */
export function getAncestors(container: Container): Container[] {
  const chain: Container[] = [];
  let current = container;
  for (let depth = 0; depth < MAX_DEPTH && current.parent_id; depth += 1) {
    const parent = getContainer(current.parent_id);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/**
 * The location a container ultimately sits in — its own for a top-level
 * container, or its outermost ancestor's for a nested one. Null while the whole
 * chain is still in Holding.
 */
export function getRootLocation(container: Container): Location | null {
  const ancestors = getAncestors(container);
  const root = ancestors[0] || container;
  if (!root.location_id) return null;
  return (db.prepare('SELECT * FROM locations WHERE id = ?').get(root.location_id) as Location | undefined) || null;
}

/** Every container beneath this one, at any depth. Used for cycle checks and counts. */
export function getDescendantIds(id: string): string[] {
  const found: string[] = [];
  let frontier = [id];
  for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth += 1) {
    const placeholders = frontier.map(() => '?').join(', ');
    const children = db
      .prepare(`SELECT id FROM containers WHERE parent_id IN (${placeholders})`)
      .all(...frontier) as { id: string }[];
    frontier = children.map((c) => c.id).filter((childId) => !found.includes(childId));
    found.push(...frontier);
  }
  return found;
}

export function directItemCount(id: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM items WHERE container_id = ?').get(id) as { n: number }).n;
}

/** Items in this container plus everything in the containers nested inside it. */
export function totalItemCount(id: string): number {
  const ids = [id, ...getDescendantIds(id)];
  const placeholders = ids.map(() => '?').join(', ');
  return (
    db.prepare(`SELECT COUNT(*) AS n FROM items WHERE container_id IN (${placeholders})`).get(...ids) as { n: number }
  ).n;
}

export function getPhotos(id: string) {
  return db.prepare('SELECT * FROM container_photos WHERE container_id = ? ORDER BY created_at').all(id);
}

/**
 * The picture to show for a container at a glance: its own first photo, else
 * the first photo on an item directly inside it. A bin you never photographed
 * still shows what's in it once you've photographed its contents — which is the
 * common case, since bins tend to get named for their size ("2x1 3cm"), not
 * their contents. Deliberately does not recurse into nested containers: every
 * listing calls this, and a cover dredged up from three levels down would
 * confuse more than it helps.
 */
export function coverPhoto(id: string): { photo: Photo; source: 'container' | 'item' } | null {
  const own = db
    .prepare('SELECT id, file_path, created_at FROM container_photos WHERE container_id = ? ORDER BY created_at LIMIT 1')
    .get(id) as Photo | undefined;
  if (own) return { photo: own, source: 'container' };

  const fromItem = db
    .prepare(
      `SELECT item_photos.id, item_photos.file_path, item_photos.created_at
       FROM item_photos
       JOIN items ON items.id = item_photos.item_id
       WHERE items.container_id = ?
       ORDER BY items.name, item_photos.created_at
       LIMIT 1`
    )
    .get(id) as Photo | undefined;
  return fromItem ? { photo: fromItem, source: 'item' } : null;
}

/**
 * The shape every list of containers renders: identity, placement, grid facts,
 * and the counts needed to say "6 bins, 23 items" without a second request.
 */
export function containerSummary(container: Container) {
  const childCount = (
    db.prepare('SELECT COUNT(*) AS n FROM containers WHERE parent_id = ?').get(container.id) as { n: number }
  ).n;
  const cover = coverPhoto(container.id);
  return {
    ...container,
    cell: container.grid_x !== null && container.grid_y !== null ? cellLabel(container.grid_x, container.grid_y) : null,
    tags: getTagsForContainer(container.id),
    photos: getPhotos(container.id),
    cover_photo: cover?.photo ?? null,
    cover_photo_source: cover?.source ?? null,
    item_count: directItemCount(container.id),
    child_count: childCount,
    total_item_count: totalItemCount(container.id),
  };
}

/** "Garage › Shelf › Tray 4x3" — the human-readable home of a container. */
export function pathLabel(container: Container): string {
  const parts = getAncestors(container).map((a) => a.name);
  const location = getRootLocation(container);
  if (location) parts.unshift(location.name);
  parts.push(container.name);
  return parts.join(' › ');
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function placedChildren(parentId: string, excludeId?: string): (Container & Rect)[] {
  return (
    db
      .prepare('SELECT * FROM containers WHERE parent_id = ? AND grid_x IS NOT NULL AND grid_y IS NOT NULL')
      .all(parentId) as Container[]
  )
    .filter((c) => c.id !== excludeId)
    .map((c) => ({ ...c, x: c.grid_x as number, y: c.grid_y as number, w: c.grid_w || 1, h: c.grid_h || 1 }));
}

/**
 * Checks a bin's footprint against its parent's grid: inside the bounds, and not
 * sitting on top of a sibling. Returns an error message, or null when it fits.
 */
export function validatePlacementOnGrid(parent: Container, rect: Rect, excludeId?: string): string | null {
  if (!parent.grid_cols || !parent.grid_rows) {
    return `"${parent.name}" has no grid layout, so it has no cells to place this in`;
  }
  if (rect.x < 0 || rect.y < 0 || rect.w < 1 || rect.h < 1) return 'Grid position and size must be positive';
  if (rect.x + rect.w > parent.grid_cols || rect.y + rect.h > parent.grid_rows) {
    return `A ${rect.w}x${rect.h} at ${cellLabel(rect.x, rect.y)} runs off the edge of the ${parent.grid_cols}x${
      parent.grid_rows
    } grid`;
  }
  const clash = placedChildren(parent.id, excludeId).find((c) => overlaps(rect, c));
  if (clash) {
    return `${cellLabel(rect.x, rect.y)} overlaps "${clash.name}" at ${cellLabel(clash.x, clash.y)}`;
  }
  return null;
}

/**
 * Shrinking a grid is only safe while every bin already on it still fits.
 * Reports the ones that would fall off rather than silently unplacing them.
 */
export function validateGridSize(container: Container, cols: number | null, rows: number | null): string | null {
  if ((cols === null) !== (rows === null)) return 'A grid layout needs both a column and a row count';
  if (cols === null || rows === null) {
    const placed = placedChildren(container.id);
    if (placed.length > 0) {
      return `Remove the ${placed.length} bin${placed.length === 1 ? '' : 's'} on the layout before turning the grid off`;
    }
    return null;
  }
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
    return 'Grid columns and rows must be whole numbers of 1 or more';
  }
  if (cols > 26 || rows > 99) return 'Grids are limited to 26 columns and 99 rows';
  const outside = placedChildren(container.id).filter((c) => c.x + c.w > cols || c.y + c.h > rows);
  if (outside.length > 0) {
    return `A ${cols}x${rows} grid would leave ${outside
      .map((c) => `"${c.name}" (${cellLabel(c.x, c.y)})`)
      .join(', ')} off the edge`;
  }
  return null;
}
