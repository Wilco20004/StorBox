import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerOption, ItemDetail as ItemDetailType, LocationSummary, RoomSummary } from '../types';
import TagChip from '../components/TagChip';
import PhotoManager from '../components/PhotoManager';
import ItemAutocomplete from '../components/ItemAutocomplete';
import { itemPath } from '../utils/itemPath';

type PlacementType = 'container' | 'location' | 'room';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemDetailType | null>(null);
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [moveType, setMoveType] = useState<PlacementType>('room');
  const [moveTarget, setMoveTarget] = useState('');
  const [moving, setMoving] = useState(false);
  const [borrower, setBorrower] = useState('');
  const [lentAt, setLentAt] = useState(today());
  const [dueAt, setDueAt] = useState('');
  const [lending, setLending] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    if (!id) return;
    api.getItem(id).then(setItem).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);
  useEffect(() => {
    api.listContainers().then(setContainers).catch((e) => setError(e.message));
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
    api.listRooms().then(setRooms).catch((e) => setError(e.message));
  }, []);

  async function handleDelete() {
    if (!id || !item) return;
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    await api.deleteItem(id);
    if (item.container) navigate(`/containers/${item.container.id}`);
    else if (item.room) navigate(`/rooms/${item.room.id}`);
    else if (item.location) navigate(`/locations/${item.location.id}`);
    else navigate('/');
  }

  async function handleMove() {
    if (!item || !moveTarget) return;
    setMoving(true);
    setError(null);
    try {
      await api.updateItem(item.id, {
        name: item.name,
        description: item.description,
        tags: item.tags.map((t) => t.name),
        container_id: moveType === 'container' ? moveTarget : null,
        location_id: moveType === 'location' ? moveTarget : null,
        room_id: moveType === 'room' ? moveTarget : null,
      });
      setMoveTarget('');
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMoving(false);
    }
  }

  async function handleLend(e: React.FormEvent) {
    e.preventDefault();
    if (!item || !borrower.trim()) return;
    setLending(true);
    setError(null);
    try {
      await api.lendItem(item.id, { borrower: borrower.trim(), lent_at: lentAt, due_at: dueAt || null });
      setBorrower('');
      setDueAt('');
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLending(false);
    }
  }

  async function handleReturn(loanId: string) {
    setLending(true);
    setError(null);
    try {
      await api.returnLoan(loanId);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLending(false);
    }
  }

  async function handleLink(otherId: string) {
    if (!item) return;
    setLinking(true);
    setError(null);
    try {
      await api.linkItems(item.id, otherId);
      setLinkQuery('');
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink() {
    if (!item) return;
    setLinking(true);
    setError(null);
    try {
      await api.unlinkItem(item.id);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLinking(false);
    }
  }

  if (error && !item) return <p className="error">{error}</p>;
  if (!item) return <p>Loading...</p>;

  const moveOptions =
    moveType === 'container'
      ? containers.filter((c) => c.id !== item.container?.id)
      : moveType === 'location'
        ? locations.filter((l) => l.id !== item.location?.id)
        : rooms.filter((r) => r.id !== item.room?.id);

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
        {item.room && (
          <>
            {' / '}
            <Link to={`/rooms/${item.room.id}`}>{item.room.name}</Link>
          </>
        )}
      </p>
      <div className="detail-header">
        <div>
          <h1>{item.name}</h1>
          {item.description && <p className="notes">{item.description}</p>}
          {item.active_loan && (
            <p className="muted">
              🤝 Lent to <strong>{item.active_loan.borrower}</strong> since {item.active_loan.lent_at.slice(0, 10)}
              {item.active_loan.due_at && ` (due ${item.active_loan.due_at.slice(0, 10)})`}
            </p>
          )}
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
            <Link to={`/items/${item.id}/label`} className="button secondary">
              Print label
            </Link>
            <button className="button danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Placement</h2>
        <p className="muted">
          Currently{' '}
          {item.container ? (
            <>
              in container <Link to={`/containers/${item.container.id}`}>{item.container.name}</Link>
            </>
          ) : item.room ? (
            <>
              in room <Link to={`/rooms/${item.room.id}`}>{item.room.name}</Link>
            </>
          ) : item.location ? (
            <>
              directly in <Link to={`/locations/${item.location.id}`}>{item.location.name}</Link>
            </>
          ) : (
            'unplaced'
          )}
          .
        </p>
        <div className="actions">
          <select
            value={moveType}
            onChange={(e) => {
              setMoveType(e.target.value as PlacementType);
              setMoveTarget('');
            }}
          >
            <option value="room">Move to a room</option>
            <option value="container">Move to a container</option>
            <option value="location">Move directly to a location</option>
          </select>
          <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
            <option value="">Choose...</option>
            {moveOptions.map((o: any) => (
              <option key={o.id} value={o.id}>
                {moveType === 'container' ? `${o.location_name || 'Holding'} / ${o.name}` : o.name}
              </option>
            ))}
          </select>
          <button type="button" className="button secondary" disabled={!moveTarget || moving} onClick={handleMove}>
            Move
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Same product</h2>
        {item.product ? (
          <>
            <p className="muted small">
              Linked as the same product as {item.siblings.length} other item{item.siblings.length === 1 ? '' : 's'}.
            </p>
            {item.siblings.length > 0 && (
              <ul className="entity-list">
                {item.siblings.map((s) => (
                  <li key={s.id} className="entity-row">
                    <div className="entity-row-body">
                      <Link to={`/items/${s.id}`}>
                        <strong>{s.name}</strong>
                      </Link>
                      {itemPath(s) && <p className="muted small">📍 {itemPath(s)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="actions">
              <button type="button" className="button secondary" disabled={linking} onClick={handleUnlink}>
                Unlink
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted small">
              Not linked to any other item yet. If you have more than one of these (e.g. "2 point plug single"),
              search for it below to link them together.
            </p>
            <ItemAutocomplete
              value={linkQuery}
              onChange={setLinkQuery}
              onSelect={(other) => handleLink(other.id)}
              excludeId={item.id}
              placeholder="Search for a matching item..."
            />
          </>
        )}
      </section>

      <section className="card">
        <h2>Lending</h2>
        {item.active_loan ? (
          <>
            <p className="muted">
              Lent to <strong>{item.active_loan.borrower}</strong> since {item.active_loan.lent_at.slice(0, 10)}
              {item.active_loan.due_at && ` — due back ${item.active_loan.due_at.slice(0, 10)}`}.
            </p>
            <div className="actions">
              <button
                type="button"
                className="button secondary"
                disabled={lending}
                onClick={() => handleReturn(item.active_loan!.id)}
              >
                Mark as returned
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleLend}>
            <div className="field-row">
              <label>
                Lent to
                <input value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="e.g. Person A" required />
              </label>
              <label>
                Date
                <input type="date" value={lentAt} onChange={(e) => setLentAt(e.target.value)} required />
              </label>
              <label>
                Due back (optional)
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </label>
              <button className="button secondary" type="submit" disabled={lending || !borrower.trim()}>
                {lending ? 'Saving...' : 'Lend this item'}
              </button>
            </div>
          </form>
        )}
        {item.loans.filter((l) => l.returned_at).length > 0 && (
          <>
            <h3>History</h3>
            <ul className="entity-list">
              {item.loans
                .filter((l) => l.returned_at)
                .map((l) => (
                  <li key={l.id} className="entity-row">
                    <div className="entity-row-body">
                      <strong>{l.borrower}</strong>
                      <p className="muted small">
                        {l.lent_at.slice(0, 10)} → returned {l.returned_at!.slice(0, 10)}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>

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
