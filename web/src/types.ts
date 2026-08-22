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

export interface ContainerSummary {
  id: string;
  location_id: string | null;
  name: string;
  position: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  photos: Photo[];
  item_count: number;
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
  container: ContainerSummary | null;
  location: Location | null;
  room: Room | null;
}

export interface LocationDetail extends Location {
  photos: Photo[];
  containers: ContainerSummary[];
  items: ItemSummary[];
}

export interface ContainerDetail extends ContainerSummary {
  location: Location | null;
  items: ItemSummary[];
}

export interface ContainerOption {
  id: string;
  name: string;
  position: string | null;
  location_id: string | null;
  location_name: string | null;
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
  container: ContainerSummary | null;
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
