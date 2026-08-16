import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { LocationDetail as LocationDetailType } from '../types';
import TagChip from '../components/TagChip';
import PhotoManager from '../components/PhotoManager';

export default function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [location, setLocation] = useState<LocationDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!id) return;
    api.getLocation(id).then(setLocation).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  async function handleDelete() {
    if (!id || !location) return;
    if (!confirm(`Delete "${location.name}"? This also deletes its containers and items. This cannot be undone.`)) return;
    await api.deleteLocation(id);
    navigate('/');
  }

  if (error) return <p className="error">{error}</p>;
  if (!location) return <p>Loading...</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/">Locations</Link>
      </p>
      <div className="detail-header">
        <div>
          <h1>{location.name}</h1>
          {location.description && <p className="notes">{location.description}</p>}
          <div className="actions">
            <Link to={`/locations/${location.id}/edit`} className="button secondary">
              Edit
            </Link>
            <button className="button danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>

      <section className="card">
        <h2>Photos</h2>
        <PhotoManager
          photos={location.photos}
          onUpload={(file) => api.uploadLocationPhoto(location.id, file).then(reload)}
          onDelete={(photoId) => api.deleteLocationPhoto(photoId).then(reload)}
        />
      </section>

      <section className="card">
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Containers</h2>
          <Link to={`/locations/${location.id}/containers/new`} className="button small">
            Add container
          </Link>
        </div>
        {location.containers.length === 0 && <p className="muted">No containers yet.</p>}
        <div className="card-grid">
          {location.containers.map((c) => (
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
                {c.position && <p className="muted small">{c.position}</p>}
                <p className="muted small">
                  {c.item_count} item{c.item_count === 1 ? '' : 's'}
                </p>
                {c.tags.length > 0 && (
                  <div className="tag-list">
                    {c.tags.map((t) => (
                      <TagChip key={t.id} name={t.name} />
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Items directly in this location</h2>
          <Link to={`/items/new?locationId=${location.id}`} className="button small">
            Add item
          </Link>
        </div>
        <p className="muted small">Items that aren't inside any container — loose or too big to box up.</p>
        {location.items.length === 0 && <p className="muted">None yet.</p>}
        <ul className="entity-list">
          {location.items.map((item) => (
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
