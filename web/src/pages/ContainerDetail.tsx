import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerDetail as ContainerDetailType, LocationSummary } from '../types';
import TagChip from '../components/TagChip';
import PhotoManager from '../components/PhotoManager';

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [container, setContainer] = useState<ContainerDetailType | null>(null);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [moveTo, setMoveTo] = useState('');
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!id) return;
    api.getContainer(id).then(setContainer).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);
  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
  }, []);

  async function handleDelete() {
    if (!id || !container) return;
    if (!confirm(`Delete "${container.name}"? This also deletes the items inside it. This cannot be undone.`)) return;
    await api.deleteContainer(id);
    navigate(container.location ? `/locations/${container.location.id}` : '/');
  }

  async function handleMove(locationId: string | null) {
    if (!container) return;
    setMoving(true);
    setError(null);
    try {
      await api.updateContainer(container.id, {
        name: container.name,
        position: container.position,
        description: container.description,
        tags: container.tags.map((t) => t.name),
        location_id: locationId,
      });
      setMoveTo('');
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!container) return <p>Loading...</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/">Locations</Link>
        {container.location && (
          <>
            {' '}
            / <Link to={`/locations/${container.location.id}`}>{container.location.name}</Link>
          </>
        )}
        {!container.location && ' / Holding'}
      </p>
      <div className="detail-header">
        <div>
          <h1>{container.name}</h1>
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

      <section className="card">
        <h2>Location</h2>
        <p className="muted">
          {container.location ? (
            <>
              Currently in <Link to={`/locations/${container.location.id}`}>{container.location.name}</Link>.
            </>
          ) : (
            'Currently in Holding — not yet placed in a location.'
          )}
        </p>
        <div className="actions">
          <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
            <option value="">Move to...</option>
            {locations
              .filter((l) => l.id !== container.location?.id)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="button secondary"
            disabled={!moveTo || moving}
            onClick={() => handleMove(moveTo)}
          >
            Move
          </button>
          {container.location && (
            <button type="button" className="button secondary" disabled={moving} onClick={() => handleMove(null)}>
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
