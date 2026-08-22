import {
  ContainerDetail,
  ContainerOption,
  ItemDetail,
  ItemSummary,
  LabelTemplate,
  Loan,
  LoanWithItem,
  LocationDetail,
  LocationSummary,
  Photo,
  RoomDetail,
  RoomSummary,
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
  location_id: string | null;
  tags: string[];
}

export interface ItemInput {
  name: string;
  description?: string | null;
  container_id?: string | null;
  location_id?: string | null;
  room_id?: string | null;
  tags: string[];
}

export interface RoomInput {
  name: string;
}

export interface LoanInput {
  borrower: string;
  lent_at?: string;
  due_at?: string | null;
  notes?: string | null;
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
  listHoldingContainers: () => request<ContainerDetail[]>('api/containers?holding=1'),
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
  linkItems: (id: string, otherId: string) => request<ItemDetail>(`api/items/${id}/link/${otherId}`, { method: 'POST' }),
  unlinkItem: (id: string) => request<ItemDetail>(`api/items/${id}/unlink`, { method: 'POST' }),

  listTags: () => request<TagWithCounts[]>('api/tags'),

  lookupCode: (code: string) =>
    request<{ type: 'item' | 'container'; id: string }>(`api/lookup/${encodeURIComponent(code)}`),

  listRooms: () => request<RoomSummary[]>('api/rooms'),
  getRoom: (id: string) => request<RoomDetail>(`api/rooms/${id}`),
  createRoom: (data: RoomInput) => request<RoomDetail>('api/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: string, data: RoomInput) =>
    request<RoomDetail>(`api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: string) => request<void>(`api/rooms/${id}`, { method: 'DELETE' }),
  getHomeAssistantStatus: () => request<{ available: boolean }>('api/rooms/ha-status'),
  syncRoomsFromHomeAssistant: () =>
    request<{ ok: true; created: number; updated: number; total: number }>('api/rooms/sync-ha', { method: 'POST' }),

  listActiveLoans: () => request<LoanWithItem[]>('api/loans?active=1'),
  lendItem: (itemId: string, data: LoanInput) =>
    request<Loan>(`api/items/${itemId}/loans`, { method: 'POST', body: JSON.stringify(data) }),
  returnLoan: (loanId: string) => request<Loan>(`api/loans/${loanId}/return`, { method: 'PUT', body: JSON.stringify({}) }),
  deleteLoan: (loanId: string) => request<void>(`api/loans/${loanId}`, { method: 'DELETE' }),

  listLabelTemplates: () => request<LabelTemplate[]>('api/labelforge/templates'),
  renderLabel: async (template_id: string, variables: Record<string, string>) => {
    const res = await fetch('api/labelforge/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id, variables }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return URL.createObjectURL(await res.blob());
  },
  printLabel: (template_id: string, variables: Record<string, string>, copies: number) =>
    request<{ ok: true }>('api/labelforge/print', {
      method: 'POST',
      body: JSON.stringify({ template_id, variables, copies }),
    }),
};

export type { ItemSummary };
