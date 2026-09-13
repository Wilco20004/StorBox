import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.STORBOX_DATA_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'storbox.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ha_area_id TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- A container sits in exactly one of: a location, another container
  -- (parent_id — a shelf holding a Gridfinity tray holding bins), or nowhere at
  -- all, which is the "Holding" pile on the dashboard.
  --
  -- grid_cols/grid_rows set means this container IS a grid (e.g. a 4x3
  -- Gridfinity baseplate): its children are laid out on it, and cells are
  -- labelled column-letter + row-number, so x=2,y=3 reads "C4".
  -- grid_x/grid_y is this container's own cell within its PARENT's grid
  -- (NULL = added to the grid but not placed on it yet); grid_w/grid_h is its
  -- footprint in grid units (1x1, 2x2, ...).
  CREATE TABLE IF NOT EXISTS containers (
    id TEXT PRIMARY KEY,
    location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES containers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    description TEXT,
    grid_cols INTEGER,
    grid_rows INTEGER,
    grid_x INTEGER,
    grid_y INTEGER,
    grid_w INTEGER,
    grid_h INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- A product is the "kind of thing" several separate item instances share
  -- (e.g. "2 point plug single" when you own 7 of them scattered around the
  -- house) — created on demand the first time two items get linked, not
  -- managed as its own up-front CRUD concept.
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- An item lives in exactly one of: a container, a location directly, or a
  -- room (out of storage and in active use, e.g. moved to the living room).
  -- product_id is unrelated to placement — it's which other item instances
  -- (if any) this one is the "same kind of thing" as.
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    container_id TEXT REFERENCES containers(id) ON DELETE CASCADE,
    location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK ((container_id IS NOT NULL) + (location_id IS NOT NULL) + (room_id IS NOT NULL) = 1)
  );

  -- A loan tracks an item lent to someone outside the household inventory.
  -- returned_at IS NULL means it's still out. An item can have many loans
  -- over time, but the app only allows one active (unreturned) at a time.
  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    borrower TEXT NOT NULL,
    lent_at TEXT NOT NULL,
    due_at TEXT,
    returned_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS item_tags (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS container_tags (
    container_id TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (container_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS item_photos (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS container_photos (
    id TEXT PRIMARY KEY,
    container_id TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS location_photos (
    id TEXT PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_containers_location ON containers(location_id);
  CREATE INDEX IF NOT EXISTS idx_items_container ON items(container_id);
  CREATE INDEX IF NOT EXISTS idx_items_location ON items(location_id);
  CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_container_tags_tag ON container_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_item_photos_item ON item_photos(item_id);
  CREATE INDEX IF NOT EXISTS idx_container_photos_container ON container_photos(container_id);
  CREATE INDEX IF NOT EXISTS idx_location_photos_location ON location_photos(location_id);
  CREATE INDEX IF NOT EXISTS idx_loans_item ON loans(item_id);
`);
// idx_items_product is created further below, once product_id definitely
// exists (either from this fresh CREATE TABLE or the ADD COLUMN migration) —
// same reason idx_items_room is deferred past the room_id migration.

// "Holding" containers (not yet placed in a location) need location_id to accept
// NULL. SQLite has no ALTER COLUMN, so an existing database — created before this
// changed from NOT NULL — needs its containers table rebuilt once.
const containerLocationCol = (db.prepare('PRAGMA table_info(containers)').all() as { name: string; notnull: number }[]).find(
  (c) => c.name === 'location_id'
);
if (containerLocationCol?.notnull) {
  db.exec(`
    CREATE TABLE containers_new (
      id TEXT PRIMARY KEY,
      location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO containers_new SELECT id, location_id, name, position, description, created_at, updated_at FROM containers;
    DROP TABLE containers;
    ALTER TABLE containers_new RENAME TO containers;
    CREATE INDEX IF NOT EXISTS idx_containers_location ON containers(location_id);
  `);
}

// Items gained a room_id (and a widened CHECK to allow it) for placing an item
// directly in a room instead of a container/location — same rebuild-in-place
// approach as containers above, since SQLite can't add to a CHECK constraint
// or add a column referencing a brand-new table's rows in one step.
const itemsCols = (db.prepare('PRAGMA table_info(items)').all() as { name: string }[]).map((c) => c.name);
if (!itemsCols.includes('room_id')) {
  db.exec(`
    CREATE TABLE items_new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      container_id TEXT REFERENCES containers(id) ON DELETE CASCADE,
      location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
      room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK ((container_id IS NOT NULL) + (location_id IS NOT NULL) + (room_id IS NOT NULL) = 1)
    );
    INSERT INTO items_new (id, name, description, container_id, location_id, room_id, created_at, updated_at)
      SELECT id, name, description, container_id, location_id, NULL, created_at, updated_at FROM items;
    DROP TABLE items;
    ALTER TABLE items_new RENAME TO items;
    CREATE INDEX IF NOT EXISTS idx_items_container ON items(container_id);
    CREATE INDEX IF NOT EXISTS idx_items_location ON items(location_id);
  `);
}
// Only safe to create once room_id definitely exists — either just above via
// migration, or from a fresh install's CREATE TABLE at the top of this file.
db.exec('CREATE INDEX IF NOT EXISTS idx_items_room ON items(room_id)');

// product_id is a plain nullable FK unrelated to the placement CHECK, so
// (unlike room_id above) a simple ADD COLUMN is enough — no table rebuild.
const itemsColsAfterRoomMigration = (db.prepare('PRAGMA table_info(items)').all() as { name: string }[]).map(
  (c) => c.name
);
if (!itemsColsAfterRoomMigration.includes('product_id')) {
  db.exec('ALTER TABLE items ADD COLUMN product_id TEXT REFERENCES products(id) ON DELETE SET NULL');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_items_product ON items(product_id)');

// Container nesting + Gridfinity layout. Unlike items' room_id, none of these
// take part in a CHECK constraint and containers has none, so plain ADD COLUMNs
// are enough — no table rebuild. (A REFERENCES clause is legal in ADD COLUMN as
// long as the new column defaults to NULL, which these all do.)
const containerCols = (db.prepare('PRAGMA table_info(containers)').all() as { name: string }[]).map((c) => c.name);
const containerAdditions: [string, string][] = [
  ['parent_id', 'TEXT REFERENCES containers(id) ON DELETE CASCADE'],
  ['grid_cols', 'INTEGER'],
  ['grid_rows', 'INTEGER'],
  ['grid_x', 'INTEGER'],
  ['grid_y', 'INTEGER'],
  ['grid_w', 'INTEGER'],
  ['grid_h', 'INTEGER'],
];
for (const [column, declaration] of containerAdditions) {
  if (!containerCols.includes(column)) {
    db.exec(`ALTER TABLE containers ADD COLUMN ${column} ${declaration}`);
  }
}
// Deferred past the migration above for the same reason as idx_items_room: on an
// existing database parent_id only exists once that ADD COLUMN has run.
db.exec('CREATE INDEX IF NOT EXISTS idx_containers_parent ON containers(parent_id)');
