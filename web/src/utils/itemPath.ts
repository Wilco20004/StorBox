import { ItemDetail } from '../types';

export function itemPath(item: ItemDetail): string {
  if (item.container) return `${item.container.name}${item.location ? ` · ${item.location.name}` : ''}`;
  if (item.location) return item.location.name;
  return '';
}
