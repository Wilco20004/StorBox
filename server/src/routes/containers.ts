import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { Container, Location } from '../types';
import { getTagsForItem, setContainerTags } from '../services/tags';
import {
  cellLabel,
  containerSummary,
  getAncestors,
  getContainer,
  getDescendantIds,
  getRootLocation,
  validateGridSize,
  validatePlacementOnGrid,
} from '../services/containers';

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
  const parent = container.parent_id ? getContainer(container.parent_id) : undefined;
  // Placed children first, reading across the grid the way you would scan it by
  // eye; the not-yet-placed ones trail behind alphabetically.
  const children = (db.prepare('SELECT * FROM containers WHERE parent_id = ?').all(container.id) as Container[])
    .map(containerSummary)
    .sort((a, b) => {
      const aPlaced = a.grid_y !== null && a.grid_x !== null;
      const bPlaced = b.grid_y !== null && b.grid_x !== null;
      if (aPlaced !== bPlaced) return aPlaced ? -1 : 1;
      if (aPlaced && bPlaced) {
        if (a.grid_y !== b.grid_y) return (a.grid_y as number) - (b.grid_y as number);
        if (a.grid_x !== b.grid_x) return (a.grid_x as number) - (b.grid_x as number);
      }
      return a.name.localeCompare(b.name);
    });
  return {
    ...containerSummary(container),
    location: location || null,
    root_location: getRootLocation(container),
    parent: parent ? containerSummary(parent) : null,
    ancestors: getAncestors(container).map((a) => ({ id: a.id, name: a.name })),
    children,
    items: itemsWithExtras,
  };
}

/**
 * Flat picker list: every container with the full path you would read aloud,
 * plus its ancestor ids so a caller can exclude a subtree (you cannot file a
 * container inside itself). Sorted by path so the list reads as a tree.
 */
function listContainerOptions() {
  const containers = db.prepare('SELECT * FROM containers').all() as Container[];
  const byId = new Map(containers.map((c) => [c.id, c]));
  const locations = new Map(
    (db.prepare('SELECT id, name FROM locations').all() as { id: string; name: string }[]).map((l) => [l.id, l.name])
  );

  function ancestorIds(container: Container): string[] {
    const ids: string[] = [];
    let current = container;
    while (current.parent_id && byId.has(current.parent_id) && ids.length < 50) {
      ids.unshift(current.parent_id);
      current = byId.get(current.parent_id) as Container;
    }
    return ids;
  }

  return containers
    .map((c) => {
      const ancestors = ancestorIds(c);
      const rootId = ancestors[0] || c.id;
      const rootLocationId = (byId.get(rootId) as Container).location_id;
      const locationName = rootLocationId ? locations.get(rootLocationId) || null : null;
      const parts = ancestors.map((id) => (byId.get(id) as Container).name);
      if (locationName) parts.unshift(locationName);
      return {
        id: c.id,
        name: c.name,
        position: c.position,
        location_id: c.location_id,
        parent_id: c.parent_id,
        location_name: locationName,
        grid_cols: c.grid_cols,
        grid_rows: c.grid_rows,
        grid_x: c.grid_x,
        grid_y: c.grid_y,
        cell: c.grid_x !== null && c.grid_y !== null ? cellLabel(c.grid_x, c.grid_y) : null,
        depth: ancestors.length,
        ancestor_ids: ancestors,
        path: [...parts, c.name].join(' › '),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

// GET /api/containers?tag=name — full detail, used for tag browsing
// GET /api/containers?holding=1 — full detail, top-level containers with no location yet
// GET /api/containers (no query) — flat picker list with full paths
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
    // parent_id IS NULL matters: a bin inside a tray has no location of its own,
    // but it is not homeless — it would otherwise show up in the Holding pile.
    const containers = db
      .prepare('SELECT * FROM containers WHERE location_id IS NULL AND parent_id IS NULL ORDER BY name')
      .all() as Container[];
    return res.json(containers.map(loadContainerDetail));
  }
  res.json(listContainerOptions());
});

containersRouter.get('/:id', (req, res) => {
  const container = getContainer(req.params.id);
  if (!container) return res.status(404).json({ error: 'Container not found' });
  res.json(loadContainerDetail(container));
});

/**
 * Where a container lives: inside another container, directly in a location, or
 * nowhere (Holding). Only ever one of them, so setting either side clears the
 * other — moving a bin to a location takes it off its parent's grid.
 */
function resolveHome(body: any, existing?: Container): { location_id: string | null; parent_id: string | null } {
  if (body.parent_id !== undefined) {
    const parentId = body.parent_id || null;
    if (parentId) return { parent_id: parentId, location_id: null };
    return {
      parent_id: null,
      location_id: body.location_id !== undefined ? body.location_id || null : existing?.location_id ?? null,
    };
  }
  if (body.location_id !== undefined) {
    return { parent_id: null, location_id: body.location_id || null };
  }
  return { parent_id: existing?.parent_id ?? null, location_id: existing?.location_id ?? null };
}

function validateHome(
  home: { location_id: string | null; parent_id: string | null },
  existing?: Container
): string | null {
  if (home.location_id && !db.prepare('SELECT id FROM locations WHERE id = ?').get(home.location_id)) {
    return 'location_id does not exist';
  }
  if (home.parent_id) {
    const parent = getContainer(home.parent_id);
    if (!parent) return 'parent_id does not exist';
    if (existing) {
      if (parent.id === existing.id) return 'A container cannot be inside itself';
      if (getDescendantIds(existing.id).includes(parent.id)) {
        return `"${parent.name}" is already inside "${existing.name}" — that would make a loop`;
      }
    }
  }
  return null;
}

function intOrNull(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Works out this container's footprint on its parent's grid. A container that is
 * not on a grid at all carries no placement, and changing parents drops the old
 * cell — B3 on one tray means nothing on another.
 */
function resolveGridPlacement(
  body: any,
  home: { parent_id: string | null },
  existing?: Container
): { grid_x: number | null; grid_y: number | null; grid_w: number | null; grid_h: number | null } | { error: string } {
  const parent = home.parent_id ? getContainer(home.parent_id) : undefined;
  if (!parent?.grid_cols || !parent.grid_rows) {
    return { grid_x: null, grid_y: null, grid_w: null, grid_h: null };
  }

  const parentChanged = existing ? existing.parent_id !== home.parent_id : true;
  const keep = parentChanged ? null : existing ?? null;
  const grid_w = body.grid_w !== undefined ? intOrNull(body.grid_w) ?? 1 : keep?.grid_w ?? 1;
  const grid_h = body.grid_h !== undefined ? intOrNull(body.grid_h) ?? 1 : keep?.grid_h ?? 1;
  const grid_x = body.grid_x !== undefined ? intOrNull(body.grid_x) : keep?.grid_x ?? null;
  const grid_y = body.grid_y !== undefined ? intOrNull(body.grid_y) : keep?.grid_y ?? null;

  if (grid_w < 1 || grid_h < 1) return { error: 'Bin size must be at least 1x1' };
  if (grid_w > parent.grid_cols || grid_h > parent.grid_rows) {
    return { error: `A ${grid_w}x${grid_h} bin does not fit on a ${parent.grid_cols}x${parent.grid_rows} grid` };
  }
  // Only one of x/y set is half a placement — treat it as not placed yet.
  if (grid_x === null || grid_y === null) return { grid_x: null, grid_y: null, grid_w, grid_h };

  const error = validatePlacementOnGrid(parent, { x: grid_x, y: grid_y, w: grid_w, h: grid_h }, existing?.id);
  if (error) return { error };
  return { grid_x, grid_y, grid_w, grid_h };
}

function validateGridDimensions(cols: number | null, rows: number | null): string | null {
  if ((cols === null) !== (rows === null)) return 'A grid layout needs both a column and a row count';
  if (cols === null || rows === null) return null;
  if (cols < 1 || rows < 1) return 'Grid columns and rows must be 1 or more';
  if (cols > 26 || rows > 99) return 'Grids are limited to 26 columns and 99 rows';
  return null;
}

containersRouter.post('/', (req, res) => {
  const { name, position, description, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const home = resolveHome(req.body);
  const homeError = validateHome(home);
  if (homeError) return res.status(400).json({ error: homeError });

  const grid_cols = intOrNull(req.body.grid_cols);
  const grid_rows = intOrNull(req.body.grid_rows);
  const dimensionError = validateGridDimensions(grid_cols, grid_rows);
  if (dimensionError) return res.status(400).json({ error: dimensionError });

  const placement = resolveGridPlacement(req.body, home);
  if ('error' in placement) return res.status(400).json({ error: placement.error });

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO containers (id, location_id, parent_id, name, position, description,
       grid_cols, grid_rows, grid_x, grid_y, grid_w, grid_h, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    home.location_id,
    home.parent_id,
    name.trim(),
    position || null,
    description || null,
    grid_cols,
    grid_rows,
    placement.grid_x,
    placement.grid_y,
    placement.grid_w,
    placement.grid_h,
    now,
    now
  );
  if (Array.isArray(tags)) setContainerTags(id, tags);
  res.status(201).json(loadContainerDetail(getContainer(id) as Container));
});

containersRouter.put('/:id', (req, res) => {
  const existing = getContainer(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Container not found' });
  const { name, position, description, tags } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const home = resolveHome(req.body, existing);
  const homeError = validateHome(home, existing);
  if (homeError) return res.status(400).json({ error: homeError });

  const grid_cols = req.body.grid_cols !== undefined ? intOrNull(req.body.grid_cols) : existing.grid_cols;
  const grid_rows = req.body.grid_rows !== undefined ? intOrNull(req.body.grid_rows) : existing.grid_rows;
  const dimensionError = validateGridDimensions(grid_cols, grid_rows);
  if (dimensionError) return res.status(400).json({ error: dimensionError });
  const sizeError = validateGridSize(existing, grid_cols, grid_rows);
  if (sizeError) return res.status(400).json({ error: sizeError });

  const placement = resolveGridPlacement(req.body, home, existing);
  if ('error' in placement) return res.status(400).json({ error: placement.error });

  db.prepare(
    `UPDATE containers SET location_id = ?, parent_id = ?, name = ?, position = ?, description = ?,
       grid_cols = ?, grid_rows = ?, grid_x = ?, grid_y = ?, grid_w = ?, grid_h = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    home.location_id,
    home.parent_id,
    name.trim(),
    position || null,
    description || null,
    grid_cols,
    grid_rows,
    placement.grid_x,
    placement.grid_y,
    placement.grid_w,
    placement.grid_h,
    new Date().toISOString(),
    req.params.id
  );
  if (Array.isArray(tags)) setContainerTags(req.params.id, tags);
  res.json(loadContainerDetail(getContainer(req.params.id) as Container));
});

/**
 * PUT /api/containers/:id/grid-position — the tap-a-bin-then-tap-a-cell move on
 * the layout view. Deliberately narrow: it only ever touches the cell and size,
 * so rearranging a grid cannot clobber a name or a tag list by round-tripping
 * the whole container. Responds with the parent's detail — the view being
 * rearranged — so the caller repaints from one response.
 */
containersRouter.put('/:id/grid-position', (req, res) => {
  const container = getContainer(req.params.id);
  if (!container) return res.status(404).json({ error: 'Container not found' });
  const parent = container.parent_id ? getContainer(container.parent_id) : undefined;
  if (!parent?.grid_cols || !parent.grid_rows) {
    return res.status(400).json({ error: 'This container is not inside a grid' });
  }

  const grid_x = intOrNull(req.body.grid_x);
  const grid_y = intOrNull(req.body.grid_y);
  const grid_w = req.body.grid_w !== undefined ? intOrNull(req.body.grid_w) ?? 1 : container.grid_w || 1;
  const grid_h = req.body.grid_h !== undefined ? intOrNull(req.body.grid_h) ?? 1 : container.grid_h || 1;
  if (grid_w < 1 || grid_h < 1) return res.status(400).json({ error: 'Bin size must be at least 1x1' });

  const placed = grid_x !== null && grid_y !== null;
  if (placed) {
    const error = validatePlacementOnGrid(parent, { x: grid_x, y: grid_y, w: grid_w, h: grid_h }, container.id);
    if (error) return res.status(400).json({ error });
  }

  db.prepare('UPDATE containers SET grid_x = ?, grid_y = ?, grid_w = ?, grid_h = ?, updated_at = ? WHERE id = ?').run(
    placed ? grid_x : null,
    placed ? grid_y : null,
    grid_w,
    grid_h,
    new Date().toISOString(),
    container.id
  );
  res.json(loadContainerDetail(getContainer(parent.id) as Container));
});

containersRouter.delete('/:id', (req, res) => {
  const existing = getContainer(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Container not found' });
  db.prepare('DELETE FROM containers WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
