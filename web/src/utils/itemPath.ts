import { ItemDetail, ItemSibling } from '../types';

export function itemPath(item: ItemDetail | ItemSibling): string {
  if (item.container) return `${item.container.name}${item.location ? ` · ${item.location.name}` : ''}`;
  if (item.room) return item.room.name;
  if (item.location) return item.location.name;
  return '';
}
