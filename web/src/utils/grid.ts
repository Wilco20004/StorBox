/**
 * Cell naming for grid containers, mirroring server/src/services/containers.ts —
 * columns are letters across the top, rows are numbers down the side, so the
 * third column of the fourth row reads "C4".
 */

export function columnLabel(x: number): string {
  let label = '';
  let n = x;
  while (n >= 0) {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function cellLabel(x: number, y: number): string {
  return `${columnLabel(x)}${y + 1}`;
}
