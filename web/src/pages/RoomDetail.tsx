import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { RoomDetail as RoomDetailType } from '../types';
import TagChip from '../components/TagChip';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!id) return;
    api.getRoom(id).then(setRoom).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  async function handleDelete() {
    if (!id || !room) return;
    if (!confirm(`Delete "${room.name}"? This also deletes the items in it. This cannot be undone.`)) return;
    await api.deleteRoom(id);
    navigate('/rooms');
  }

  if (error) return <p className="error">{error}</p>;
  if (!room) return <p>Loading...</p>;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/rooms">Rooms</Link>
      </p>
      <div className="detail-header">
        <div>
          <h1>{room.name}</h1>
          {room.ha_area_id && <p className="muted small">Synced from Home Assistant</p>}
          <div className="actions">
            <Link to={`/rooms/${room.id}/edit`} className="button secondary">
              Edit
            </Link>
            <button className="button danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>

      <section className="card">
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>Items</h2>
          <Link to={`/items/new?roomId=${room.id}`} className="button small">
            Add item
          </Link>
        </div>
        {room.items.length === 0 && <p className="muted">No items here yet.</p>}
        <ul className="entity-list">
          {room.items.map((item) => (
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
