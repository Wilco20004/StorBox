import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerDetail as ContainerDetailType, ContainerOption, LocationSummary } from '../types';
import TagChip from '../components/TagChip';
import PhotoManager from '../components/PhotoManager';
import GridLayout from '../components/GridLayout';

// Same "loc:" / "cnt:" encoding the container form uses, so one <select> can
// offer locations and containers side by side.
function homeValue(kind: 'loc' | 'cnt', id: string): string {
  return `${kind}:${id}`;
}

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [container, setContainer] = useState<ContainerDetailType | null>(null);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [moveTo, setMoveTo] = useState('');
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?highlight=<binId> — set when you jump here from an item, to point at the
  // exact cell the thing you're looking for is in.
  const highlightId = searchParams.get('highlight');

  function reload() {
    if (!id) return;
    api.getContainer(id).then(setContainer).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);
  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
    api.listContainers().then(setContainers).catch((e) => setError(e.message));
  }, [id]);

  async function handleDelete() {
    if (!id || !container) return;
    const alsoContainers = container.child_count > 0 ? ` and the ${container.child_count} container(s) inside it` : '';
    if (!confirm(`Delete "${container.name}"? This also deletes the items${alsoContainers}. This cannot be undone.`)) {
      return;
    }
    await api.deleteContainer(id);
    if (container.parent) navigate(`/containers/${container.parent.id}`);
    else if (container.location) navigate(`/locations/${container.location.id}`);
    else navigate('/');
  }

  async function handleMove(target: string) {
    if (!container) return;
    setMoving(true);
    setError(null);
    try {
      await api.updateContainer(container.id, {
        name: container.name,
        position: container.position,
        description: container.description,
        tags: container.tags.map((t) => t.name),
        location_id: target.startsWith('loc:') ? target.slice(4) : null,
        parent_id: target.startsWith('cnt:') ? target.slice(4) : null,
      });
      setMoveTo('');
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  }

  if (error && !container) return <p className="error">{error}</p>;
  if (!container) return <p>Loading...</p>;

  const isGrid = container.grid_cols !== null && container.grid_rows !== null;
  const currentHome = container.parent
    ? homeValue('cnt', container.parent.id)
    : container.location
      ? homeValue('loc', container.location.id)
      : '';
  // Can't file a container inside itself or anything already inside it.
  const moveTargets = containers.filter((c) => c.id !== container.id && !c.ancestor_ids.includes(container.id));

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/">Locations</Link>
        {container.root_location && (
          <>
            {' / '}
            <Link to={`/locations/${container.root_location.id}`}>{container.root_location.name}</Link>
          </>
        )}
        {!container.root_location && ' / Holding'}
        {container.ancestors.map((a) => (
          <span key={a.id}>
            {' / '}
            <Link to={`/containers/${a.id}`}>{a.name}</Link>
          </span>
        ))}
      </p>
      <div className="detail-header">
        <div>
          <h1>{container.name}</h1>
          {container.cell && (
            <p>
              🧩 Cell {container.cell}
              {(container.grid_w || 1) > 1 || (container.grid_h || 1) > 1
                ? ` · ${container.grid_w || 1}×${container.grid_h || 1}`
                : ''}
              {container.parent && (
                <>
                  {' on '}
                  <Link to={`/containers/${container.parent.id}`}>{container.parent.name}</Link>
                </>
              )}
            </p>
          )}
          {!container.cell && container.parent && (
            <p>
              📦 Inside <Link to={`/containers/${container.parent.id}`}>{container.parent.name}</Link>
              {container.parent.grid_cols ? ' — not placed on its layout yet' : ''}
            </p>
          )}
          {container.position && <p>📍 {container.position}</p>}
          {container.description && <p className="notes">{container.description}</p>}
          {container.tags.length > 0 && (
            <div className="tag-list">
              {container.tags.map((t) => (
                <TagChip key={t.id} name={t.name} linkTo={`/tags/${encodeURIComponent(t.name)}`} />
              ))}
            </div>
          )}
          <div className="actions">
            <Link to={`/containers/${container.id}/edit`} className="button secondary">
              Edit
            </Link>
            <Link to={`/containers/${container.id}/label`} className="button secondary">
              Print label
            </Link>
            <button className="button danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {isGrid && (
        <section className="card">
          <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Layout</h2>
            <Link to={`/containers/new?parentId=${container.id}`} className="button small">
              Add bin
            </Link>
          </div>
          <GridLayout container={container} onChanged={setContainer} highlightId={highlightId} />
        </section>
      )}

      {!isGrid && (
        <section className="card">
          <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
            <h2 style={{ margin: 0 }}>Containers inside</h2>
            <Link to={`/containers/new?parentId=${container.id}`} className="button small">
              Add container
            </Link>
          </div>
          {container.children.length === 0 ? (
            <p className="muted">
              None. Nest a container in here for a shelf-inside-a-cupboard, or give this one a grid layout to lay bins
              out on it.
            </p>
          ) : (
            <div className="card-grid">
              {container.children.map((c) => (
                <Link key={c.id} to={`/containers/${c.id}`} className="entity-card">
                  <div className="entity-card-photo">
                    {c.photos[0] ? (
                      <img src={`uploads/${c.photos[0].file_path}`} alt={c.name} />
                    ) : (
                      <div className="entity-card-photo-placeholder">📦</div>
                    )}
                  </div>
                  <div className="entity-card-body">
                    <h3>{c.name}</h3>
                    <p className="muted small">
                      {c.total_item_count} item{c.total_item_count === 1 ? '' : 's'}
                      {c.child_count > 0 && `, ${c.child_count} container${c.child_count === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2>Where it lives</h2>
        <p className="muted">
          {container.parent ? (
            <>
              Inside <Link to={`/containers/${container.parent.id}`}>{container.parent.name}</Link>
              {container.root_location && (
                <>
                  {', in '}
                  <Link to={`/locations/${container.root_location.id}`}>{container.root_location.name}</Link>
                </>
              )}
              .
            </>
          ) : container.location ? (
            <>
              Currently in <Link to={`/locations/${container.location.id}`}>{container.location.name}</Link>.
            </>
          ) : (
            'Currently in Holding — not yet placed anywhere.'
          )}
        </p>
        <div className="actions">
          <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            <option value="">Move to...</option>
            <optgroup label="A location">
              {locations
                .filter((l) => homeValue('loc', l.id) !== currentHome)
                .map((l) => (
                  <option key={l.id} value={homeValue('loc', l.id)}>
                    {l.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Inside another container">
              {moveTargets
                .filter((c) => homeValue('cnt', c.id) !== currentHome)
                .map((c) => (
                  <option key={c.id} value={homeValue('cnt', c.id)}>
                    {c.path}
                    {c.grid_cols && c.grid_rows ? ` (${c.grid_cols}x${c.grid_rows} grid)` : ''}
                  </option>
                ))}
            </optgroup>
          </select>
          <button
            type="button"
            className="button secondary"
            disabled={!moveTo || moving}
            onClick={() => handleMove(moveTo)}
          >
            Move
          </button>
          {currentHome !== '' && (
            <button type="button" className="button secondary" disabled={moving} onClick={() => handleMove('')}>
              Move to Holding
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Photos</h2>
        <PhotoManager
          photos={container.photos}
          onUpload={(file) => api.uploadContainerPhoto(container.id, file).then(reload)}
          onDelete={(photoId) => api.deleteContainerPhoto(photoId).then(reload)}
        />
      </section>

      <section className="card">
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Items</h2>
          <Link to={`/items/new?containerId=${container.id}`} className="button small">
            Add item
          </Link>
        </div>
        {container.items.length === 0 && <p className="muted">No items yet.</p>}
        <ul className="entity-list">
          {container.items.map((item) => (
            <li key={item.id} className="entity-row">
              <div className="entity-row-photo">
                {item.photos[0] ? (
                  <img src={`uploads/${item.photos[0].file_path}`} alt={item.name} />
                ) : (
                  <div className="entity-card-photo-placeholder">🏷️</div>
                )}
              </div>
              <div className="entity-row-body">
                <Link to={`/items/${item.id}`}>
                  <strong>{item.name}</strong>
                </Link>
                {item.tags.length > 0 && (
                  <div className="tag-list">
                    {item.tags.map((t) => (
                      <TagChip key={t.id} name={t.name} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
