export interface Location {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Container {
  id: string;
  location_id: string;
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
