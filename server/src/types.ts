export interface Location {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Container {
  id: string;
  location_id: string | null;
  name: string;
  position: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  container_id: string | null;
  location_id: string | null;
  room_id: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  ha_area_id: string | null;
  created_at: string;
  updated_at: string;
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

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Photo {
  id: string;
  file_path: string;
  created_at: string;
}
