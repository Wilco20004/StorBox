import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { RoomSummary } from '../types';

export default function RoomsList() {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [haAvailable, setHaAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    api.listRooms().then(setRooms).catch((e) => setError(e.message));
  }

  useEffect(reload, []);
  useEffect(() => {
    api.getHomeAssistantStatus().then((s) => setHaAvailable(s.available)).catch(() => setHaAvailable(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setStatus(null);
    try {
      const result = await api.syncRoomsFromHomeAssistant();
      setStatus(`Synced ${result.total} area${result.total === 1 ? '' : 's'} (${result.created} new, ${result.updated} updated).`);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
        <h1 style={{ margin: 0 }}>Rooms</h1>
        <div className="actions" style={{ margin: 0 }}>
          {haAvailable && (
            <button type="button" className="button secondary" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync from Home Assistant'}
            </button>
          )}
          <Link to="/rooms/new" className="button">
            Add room
          </Link>
        </div>
      </div>
      <p className="muted small">
        Rooms are where items go once they're out of storage and in active use — e.g. a multiplug moved from a
        storage container to the living room.
        {!haAvailable && ' This add-on has no Home Assistant API access configured, so rooms here are managed manually.'}
      </p>
      {status && <p className="muted small">{status}</p>}
      {error && <p className="error">{error}</p>}

      {rooms === null ? (
        <p className="muted">Loading...</p>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <p>No rooms yet.</p>
          <Link to="/rooms/new" className="button">
            Add your first room
          </Link>
        </div>
      ) : (
        <ul className="entity-list">
          {rooms.map((r) => (
            <li key={r.id} className="entity-row">
              <div className="entity-row-body">
                <Link to={`/rooms/${r.id}`}>
                  <strong>{r.name}</strong>
                </Link>
                <p className="muted small">
                  {r.item_count} item{r.item_count === 1 ? '' : 's'}
                  {r.ha_area_id ? ' · synced from Home Assistant' : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
