import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerOption, LocationSummary } from '../types';
import TagEditor from '../components/TagEditor';
import NumberInput from '../components/NumberInput';
import { cellLabel } from '../utils/grid';

// One picker covers all three homes a container can have, so "loc:" / "cnt:"
// prefixes keep location ids and container ids apart in a single <select>.
const HOLDING = '';

function homeValue(kind: 'loc' | 'cnt', id: string): string {
  return `${kind}:${id}`;
}

export default function ContainerForm() {
  const { id, locationId: routeLocationId } = useParams<{ id?: string; locationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ name: '', position: '', description: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [home, setHome] = useState(routeLocationId ? homeValue('loc', routeLocationId) : HOLDING);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [hasGrid, setHasGrid] = useState(false);
  const [gridCols, setGridCols] = useState(4);
  const [gridRows, setGridRows] = useState(3);
  const [binW, setBinW] = useState(1);
  const [binH, setBinH] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Arriving from a "+" on a grid cell: pre-file it in that tray, in that cell.
  const prefillParentId = searchParams.get('parentId');
  const prefillX = searchParams.get('gridX');
  const prefillY = searchParams.get('gridY');

  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
    api.listContainers().then(setContainers).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!isEdit && prefillParentId) setHome(homeValue('cnt', prefillParentId));
  }, [isEdit, prefillParentId]);

  useEffect(() => {
    if (!id) return;
    api
      .getContainer(id)
      .then((c) => {
        setForm({ name: c.name, position: c.position || '', description: c.description || '' });
        setTags(c.tags.map((t) => t.name));
        setHome(c.parent ? homeValue('cnt', c.parent.id) : c.location ? homeValue('loc', c.location.id) : HOLDING);
        setHasGrid(c.grid_cols !== null && c.grid_rows !== null);
        if (c.grid_cols) setGridCols(c.grid_cols);
        if (c.grid_rows) setGridRows(c.grid_rows);
        setBinW(c.grid_w || 1);
        setBinH(c.grid_h || 1);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const parentId = home.startsWith('cnt:') ? home.slice(4) : null;
  const locationId = home.startsWith('loc:') ? home.slice(4) : null;
  const parent = containers.find((c) => c.id === parentId) || null;
  const parentIsGrid = Boolean(parent?.grid_cols && parent.grid_rows);
  // A container can go inside anything except itself or its own descendants.
  const parentOptions = containers.filter((c) => !id || (c.id !== id && !c.ancestor_ids.includes(id)));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const placingInCell = !isEdit && parentIsGrid && prefillX !== null && prefillY !== null;
    const payload = {
      ...form,
      location_id: locationId,
      parent_id: parentId,
      grid_cols: hasGrid ? gridCols : null,
      grid_rows: hasGrid ? gridRows : null,
      // Editing leaves grid_x/grid_y out entirely so the server keeps the cell
      // this bin is already in — the layout view is where cells get changed.
      ...(placingInCell ? { grid_x: Number(prefillX), grid_y: Number(prefillY) } : {}),
      ...(parentIsGrid ? { grid_w: binW, grid_h: binH } : {}),
      tags,
    };
    try {
      if (isEdit && id) {
        await api.updateContainer(id, payload);
        navigate(`/containers/${id}`);
      } else {
        const created = await api.createContainer(payload);
        navigate(`/containers/${created.id}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card form-card">
      <h2>{isEdit ? 'Edit container' : 'Add a container'}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Blue tote, Bookshelf, Bin 3"
          />
        </label>
        <label>
          Sits in
          <select value={home} onChange={(e) => setHome(e.target.value)}>
            <option value={HOLDING}>Holding (no home yet)</option>
            <optgroup label="A location">
              {locations.map((l) => (
                <option key={l.id} value={homeValue('loc', l.id)}>
                  {l.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Inside another container">
              {parentOptions.map((c) => (
                <option key={c.id} value={homeValue('cnt', c.id)}>
                  {c.path}
                  {c.grid_cols && c.grid_rows ? ` (${c.grid_cols}x${c.grid_rows} grid)` : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        {parentIsGrid && (
          <fieldset className="form-fieldset">
            <legend>Space on {parent?.name}</legend>
            <div className="field-row">
              <label>
                Width (cells)
                <NumberInput value={binW} min={1} onCommit={setBinW} />
              </label>
              <label>
                Height (cells)
                <NumberInput value={binH} min={1} onCommit={setBinH} />
              </label>
            </div>
            <p className="muted small">
              {!isEdit && prefillX !== null && prefillY !== null
                ? `Goes in cell ${cellLabel(Number(prefillX), Number(prefillY))}.`
                : "Place it on the layout from the parent container's page."}
            </p>
          </fieldset>
        )}

        <fieldset className="form-fieldset">
          <legend>Grid layout</legend>
          <label className="checkbox-label">
            <input type="checkbox" checked={hasGrid} onChange={(e) => setHasGrid(e.target.checked)} />
            Lay containers out on a grid (a Gridfinity baseplate, a pigeonhole shelf)
          </label>
          {hasGrid && (
            <>
              <div className="field-row">
                <label>
                  Columns
                  <NumberInput value={gridCols} min={1} onCommit={setGridCols} />
                </label>
                <label>
                  Rows
                  <NumberInput value={gridRows} min={1} onCommit={setGridRows} />
                </label>
              </div>
              <p className="muted small">
                Cells run across then down — {cellLabel(0, 0)} top-left through{' '}
                {cellLabel(gridCols - 1, gridRows - 1)} bottom-right.
              </p>
            </>
          )}
        </fieldset>

        <label>
          Position
          <input
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
            placeholder="e.g. Shelf 1 pos 2, Ground back"
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </label>
        <label>
          Tags
          <TagEditor value={tags} onChange={setTags} />
        </label>
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add container'}
        </button>
      </form>
    </div>
  );
}
