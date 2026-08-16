import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ItemDetail as ItemDetailType } from '../types';
import TagChip from '../components/TagChip';
import PhotoManager from '../components/PhotoManager';

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!id) return;
    api.getItem(id).then(setItem).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  async function handleDelete() {
    if (!id || !item) return;
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await api.deleteItem(id);
    if (item.container) navigate(`/containers/${item.container.id}`);
    else if (item.location) navigate(`/locations/${item.location.id}`);
    else navigate('/');
  }

  if (error) return <p className="error">{error}</p>;
  if (!item) return <p>Loading...</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/">Locations</Link>
        {item.location && (
          <>
            {' / '}
            <Link to={`/locations/${item.location.id}`}>{item.location.name}</Link>
          </>
        )}
        {item.container && (
          <>
            {' / '}
            <Link to={`/containers/${item.container.id}`}>{item.container.name}</Link>
          </>
        )}
      </p>
      <div className="detail-header">
        <div>
          <h1>{item.name}</h1>
          {item.description && <p className="notes">{item.description}</p>}
          {item.tags.length > 0 && (
            <div className="tag-list">
              {item.tags.map((t) => (
                <TagChip key={t.id} name={t.name} linkTo={`/tags/${encodeURIComponent(t.name)}`} />
              ))}
            </div>
          )}
          <div className="actions">
            <Link to={`/items/${item.id}/edit`} className="button secondary">
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
          photos={item.photos}
          onUpload={(file) => api.uploadItemPhoto(item.id, file).then(reload)}
          onDelete={(photoId) => api.deleteItemPhoto(photoId).then(reload)}
        />
      </section>
    </div>
  );
}
