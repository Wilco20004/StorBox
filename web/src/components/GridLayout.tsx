import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerDetail, ContainerSummary } from '../types';
import { cellLabel, columnLabel } from '../utils/grid';

interface Props {
  /** The grid container being drawn — grid_cols/grid_rows must be set. */
  container: ContainerDetail;
  /** Called after a bin moves, so the page can repaint from the server's answer. */
  onChanged: (updated: ContainerDetail) => void;
  /** Bin to pulse, e.g. when you arrived here from "where is this item?". */
  highlightId?: string | null;
}

function isPlaced(bin: ContainerSummary): boolean {
  return bin.grid_x !== null && bin.grid_y !== null;
}

function footprint(bin: ContainerSummary) {
  return { x: bin.grid_x as number, y: bin.grid_y as number, w: bin.grid_w || 1, h: bin.grid_h || 1 };
}

export default function GridLayout({ container, onChanged, highlightId }: Props) {
  const [rearranging, setRearranging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cols = container.grid_cols || 1;
  const rows = container.grid_rows || 1;
  const placed = container.children.filter(isPlaced);
  const unplaced = container.children.filter((c) => !isPlaced(c));
  const selected = container.children.find((c) => c.id === selectedId) || null;

  // Which cells are taken. The bin you're holding doesn't block itself, so a 2x2
  // can be nudged one cell across without having to unplace it first.
  const occupied = new Set<string>();
  for (const bin of placed) {
    if (bin.id === selectedId) continue;
    const { x, y, w, h } = footprint(bin);
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) occupied.add(`${x + dx},${y + dy}`);
    }
  }

  const freeCells: { x: number; y: number }[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!occupied.has(`${x},${y}`)) freeCells.push({ x, y });
    }
  }

  async function move(binId: string, x: number | null, y: number | null, size?: { w: number; h: number }) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.setGridPosition(binId, {
        grid_x: x,
        grid_y: y,
        ...(size ? { grid_w: size.w, grid_h: size.h } : {}),
      });
      onChanged(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Resizing keeps the bin in hand; taking it off the grid puts it down.
  async function unplace(binId: string) {
    await move(binId, null, null);
    setSelectedId(null);
  }

  function handleCellClick(x: number, y: number) {
    if (selected) {
      move(selected.id, x, y);
    }
  }

  function toggleRearranging() {
    setRearranging((was) => !was);
    setSelectedId(null);
    setError(null);
  }

  return (
    <div className="grid-layout">
      <div className="grid-toolbar">
        <p className="muted small" style={{ margin: 0 }}>
          {cols}×{rows} grid · {placed.length} placed
          {unplaced.length > 0 && ` · ${unplaced.length} waiting for a cell`}
        </p>
        <button type="button" className="button secondary small" onClick={toggleRearranging}>
          {rearranging ? 'Done' : 'Rearrange'}
        </button>
      </div>

      {rearranging && (
        <p className="muted small grid-hint">
          {selected
            ? `Holding "${selected.name}" — tap a free cell to drop it there.`
            : 'Tap a bin to pick it up, then tap the cell you want it in.'}
        </p>
      )}
      {error && <p className="error">{error}</p>}

      {/* A wide grid scrolls sideways rather than squashing cells illegibly. */}
      <div className="grid-board-scroll">
        <div
          className="grid-board"
          style={{
            gridTemplateColumns: `auto repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
        <div className="grid-corner" />
        {Array.from({ length: cols }, (_, x) => (
          <div key={`col-${x}`} className="grid-axis" style={{ gridColumn: x + 2, gridRow: 1 }}>
            {columnLabel(x)}
          </div>
        ))}
        {Array.from({ length: rows }, (_, y) => (
          <div key={`row-${y}`} className="grid-axis" style={{ gridColumn: 1, gridRow: y + 2 }}>
            {y + 1}
          </div>
        ))}

        {freeCells.map(({ x, y }) => {
          const style = { gridColumn: x + 2, gridRow: y + 2 };
          if (rearranging) {
            return (
              <button
                key={`free-${x}-${y}`}
                type="button"
                className={`grid-cell grid-cell-free${selected ? ' targetable' : ''}`}
                style={style}
                disabled={busy || !selected}
                onClick={() => handleCellClick(x, y)}
                title={cellLabel(x, y)}
              >
                <span className="grid-cell-label">{cellLabel(x, y)}</span>
              </button>
            );
          }
          return (
            <Link
              key={`free-${x}-${y}`}
              to={`/containers/new?parentId=${container.id}&gridX=${x}&gridY=${y}`}
              className="grid-cell grid-cell-free"
              style={style}
              title={`Add a bin at ${cellLabel(x, y)}`}
            >
              <span className="grid-cell-label">{cellLabel(x, y)}</span>
              <span className="grid-cell-add">+</span>
            </Link>
          );
        })}

        {placed.map((bin) => {
          const { x, y, w, h } = footprint(bin);
          const style = { gridColumn: `${x + 2} / span ${w}`, gridRow: `${y + 2} / span ${h}` };
          const className = `grid-cell grid-cell-bin${bin.id === highlightId ? ' highlight' : ''}${
            bin.id === selectedId ? ' selected' : ''
          }`;
          const body = (
            <>
              <span className="grid-cell-label">
                {cellLabel(x, y)}
                {(w > 1 || h > 1) && ` · ${w}×${h}`}
              </span>
              <span className="grid-bin-name">{bin.name}</span>
              <span className="grid-bin-count">
                {bin.total_item_count} item{bin.total_item_count === 1 ? '' : 's'}
              </span>
            </>
          );
          if (rearranging) {
            return (
              <button
                key={bin.id}
                type="button"
                className={className}
                style={style}
                disabled={busy}
                onClick={() => setSelectedId(bin.id === selectedId ? null : bin.id)}
              >
                {body}
              </button>
            );
          }
          return (
            <Link key={bin.id} to={`/containers/${bin.id}`} className={className} style={style}>
              {body}
            </Link>
          );
          })}
        </div>
      </div>

      {rearranging && selected && (
        <div className="grid-selected-actions">
          <span className="muted small">
            {selected.name} — {selected.grid_w || 1}×{selected.grid_h || 1}
          </span>
          <button
            type="button"
            className="button secondary small"
            disabled={busy}
            onClick={() => move(selected.id, selected.grid_x, selected.grid_y, { w: (selected.grid_w || 1) + 1, h: selected.grid_h || 1 })}
          >
            Wider
          </button>
          <button
            type="button"
            className="button secondary small"
            disabled={busy || (selected.grid_w || 1) <= 1}
            onClick={() => move(selected.id, selected.grid_x, selected.grid_y, { w: (selected.grid_w || 1) - 1, h: selected.grid_h || 1 })}
          >
            Narrower
          </button>
          <button
            type="button"
            className="button secondary small"
            disabled={busy}
            onClick={() => move(selected.id, selected.grid_x, selected.grid_y, { w: selected.grid_w || 1, h: (selected.grid_h || 1) + 1 })}
          >
            Taller
          </button>
          <button
            type="button"
            className="button secondary small"
            disabled={busy || (selected.grid_h || 1) <= 1}
            onClick={() => move(selected.id, selected.grid_x, selected.grid_y, { w: selected.grid_w || 1, h: (selected.grid_h || 1) - 1 })}
          >
            Shorter
          </button>
          {isPlaced(selected) && (
            <button
              type="button"
              className="button secondary small"
              disabled={busy}
              onClick={() => unplace(selected.id)}
            >
              Take off the grid
            </button>
          )}
        </div>
      )}

      {unplaced.length > 0 && (
        <div className="grid-unplaced">
          <p className="muted small" style={{ margin: '0 0 0.4rem' }}>
            Not on the layout yet{rearranging ? ' — tap one, then tap a cell' : ''}:
          </p>
          <div className="grid-unplaced-list">
            {unplaced.map((bin) => {
              const label = `${bin.name} (${bin.grid_w || 1}×${bin.grid_h || 1})`;
              if (rearranging) {
                return (
                  <button
                    key={bin.id}
                    type="button"
                    className={`grid-chip${bin.id === selectedId ? ' selected' : ''}`}
                    disabled={busy}
                    onClick={() => setSelectedId(bin.id === selectedId ? null : bin.id)}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <Link key={bin.id} to={`/containers/${bin.id}`} className="grid-chip">
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
