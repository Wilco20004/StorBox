import {
  ContainerDetail,
  ContainerOption,
  ItemDetail,
  ItemSummary,
  LocationDetail,
  LocationSummary,
  Photo,
  TagWithCounts,
} from '../types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface LocationInput {
  name: string;
  description?: string | null;
}

export interface ContainerInput {
  name: string;
  position?: string | null;
  description?: string | null;
  location_id: string;
  tags: string[];
}

export interface ItemInput {
  name: string;
  description?: string | null;
  container_id?: string | null;
  location_id?: string | null;
  tags: string[];
}

export const api = {
  listLocations: () => request<LocationSummary[]>('api/locations'),
  getLocation: (id: string) => request<LocationDetail>(`api/locations/${id}`),
  createLocation: (data: LocationInput) =>
    request<LocationSummary>('api/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: LocationInput) =>
    request<LocationSummary>(`api/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id: string) => request<void>(`api/locations/${id}`, { method: 'DELETE' }),
  uploadLocationPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return request<Photo>(`api/locations/${id}/photos`, { method: 'POST', body: form });
  },
  deleteLocationPhoto: (id: string) => request<void>(`api/location-photos/${id}`, { method: 'DELETE' }),

  listContainers: () => request<ContainerOption[]>('api/containers'),
  getContainer: (id: string) => request<ContainerDetail>(`api/containers/${id}`),
  listContainersByTag: (tag: string) =>
    request<ContainerDetail[]>(`api/containers?tag=${encodeURIComponent(tag)}`),
  createContainer: (data: ContainerInput) =>
    request<ContainerDetail>('api/containers', { method: 'POST', body: JSON.stringify(data) }),
  updateContainer: (id: string, data: ContainerInput) =>
    request<ContainerDetail>(`api/containers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContainer: (id: string) => request<void>(`api/containers/${id}`, { method: 'DELETE' }),
  uploadContainerPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return request<Photo>(`api/containers/${id}/photos`, { method: 'POST', body: form });
  },
  deleteContainerPhoto: (id: string) => request<void>(`api/container-photos/${id}`, { method: 'DELETE' }),

  listItems: (params?: { q?: string; tag?: string }) => {
    const search = new URLSearchParams(params as Record<string, string>).toString();
    return request<ItemDetail[]>(`api/items${search ? `?${search}` : ''}`);
  },
  getItem: (id: string) => request<ItemDetail>(`api/items/${id}`),
  createItem: (data: ItemInput) =>
    request<ItemDetail>('api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: string, data: ItemInput) =>
    request<ItemDetail>(`api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id: string) => request<void>(`api/items/${id}`, { method: 'DELETE' }),
  uploadItemPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return request<Photo>(`api/items/${id}/photos`, { method: 'POST', body: form });
  },
  deleteItemPhoto: (id: string) => request<void>(`api/item-photos/${id}`, { method: 'DELETE' }),

  listTags: () => request<TagWithCounts[]>('api/tags'),

  lookupCode: (code: string) =>
    request<{ type: 'item' | 'container'; id: string }>(`api/lookup/${encodeURIComponent(code)}`),
};

export type { ItemSummary };
