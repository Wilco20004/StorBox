import { ItemDetail, ItemSibling } from '../types';

/**
 * One-line answer to "where is it?" — deepest first, so the container you'd
 * actually open comes first: "A2 bin · Tray 4x3 · Shelf · Garage".
 */
export function itemPath(item: ItemDetail | ItemSibling): string {
  if (item.container) {
    const here = item.container.cell ? `${item.container.cell} ${item.container.name}` : item.container.name;
    const parts = [here, ...[...item.container.ancestors].reverse().map((a) => a.name)];
    if (item.location) parts.push(item.location.name);
    return parts.join(' · ');
  }
  if (item.room) return item.room.name;
  if (item.location) return item.location.name;
  return '';
}
