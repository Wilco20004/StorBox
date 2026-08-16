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
  location_id: string;
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
  created_at: string;
  updated_at: string;
  tags: Tag[];
  photos: Photo[];
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
  location_id: string;
  location_name: string;
}

export interface ItemDetail extends ItemSummary {
  container: ContainerSummary | null;
  location: Location | null;
}
