export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface TagWithCounts extends Tag {
  item_count: number;
  container_count: number;
}

export interface Photo {
  id: string;
  file_path: string;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationSummary extends Location {
  container_count: number;
  item_count: number;
  photos: Photo[];
}

export interface ContainerCrumb {
  id: string;
  name: string;
}

/** The grid facts every container carries, whether or not it uses them. */
export interface ContainerGrid {
  /** Both set means this container is a grid others are laid out on. */
  grid_cols: number | null;
  grid_rows: number | null;
  /** This container's own cell on its parent's grid; null until it is placed. */
  grid_x: number | null;
  grid_y: number | null;
  grid_w: number | null;
  grid_h: number | null;
  /** Rendered form of grid_x/grid_y, e.g. "C4". Null when unplaced. */
  cell: string | null;
}

export interface ContainerSummary extends ContainerGrid {
  id: string;
  location_id: string | null;
  parent_id: string | null;
  name: string;
  position: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  photos: Photo[];
  /** Own first photo, else the first photo on an item inside it; null if neither. */
  cover_photo: Photo | null;
  cover_photo_source: 'container' | 'item' | null;
  /** Items directly in this container. */
  item_count: number;
  /** Containers nested directly inside it — bins on a grid, boxes on a shelf. */
  child_count: number;
  /** item_count plus everything in the containers nested inside it. */
  total_item_count: number;
}

/** Placement-only view of a container, as returned alongside an item. */
export interface ContainerRef extends ContainerGrid {
  id: string;
  name: string;
  position: string | null;
  location_id: string | null;
  parent_id: string | null;
  ancestors: ContainerCrumb[];
}

export interface ItemSummary {
  id: string;
  name: string;
  description: string | null;
  container_id: string | null;
  location_id: string | null;
  room_id: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  photos: Photo[];
}

export interface Product {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ItemSibling {
  id: string;
  name: string;
  container: ContainerRef | null;
  location: Location | null;
  room: Room | null;
}

export interface LocationDetail extends Location {
  photos: Photo[];
  containers: ContainerSummary[];
  items: ItemSummary[];
}

export interface ContainerDetail extends ContainerSummary {
  /** The location this container sits in directly — null when nested or in Holding. */
  location: Location | null;
  /** The location at the top of the chain, which is where it really is. */
  root_location: Location | null;
  parent: ContainerSummary | null;
  /** Outermost first, not including this container. */
  ancestors: ContainerCrumb[];
  /** Containers nested inside: placed bins first in reading order, then unplaced. */
  children: ContainerSummary[];
  items: ItemSummary[];
}

export interface ContainerOption extends ContainerGrid {
  id: string;
  name: string;
  position: string | null;
  location_id: string | null;
  parent_id: string | null;
  location_name: string | null;
  /** How many containers deep this one is nested. */
  depth: number;
  /** Outermost first — lets a picker exclude a whole subtree. */
  ancestor_ids: string[];
  /** "Garage › Shelf › Tray 4x3 › A1 bin" */
  path: string;
}

export interface Room {
  id: string;
  name: string;
  ha_area_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomSummary extends Room {
  item_count: number;
}

export interface RoomDetail extends Room {
  items: ItemSummary[];
}

export interface Loan {
  id: string;
  item_id: string;
  borrower: string;
  lent_at: string;
  due_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanWithItem extends Loan {
  item: { id: string; name: string };
}

export interface ItemDetail extends ItemSummary {
  container: ContainerRef | null;
  location: Location | null;
  room: Room | null;
  loans: Loan[];
  active_loan: Loan | null;
  product: Product | null;
  siblings: ItemSibling[];
}

export interface LabelTemplate {
  id: string;
  name: string;
  label_size: string;
  length_mm: number | null;
  variables: string[];
  image_variable: string | null;
}
