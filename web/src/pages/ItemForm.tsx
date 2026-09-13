import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerOption, LocationSummary, RoomSummary } from '../types';
import TagEditor from '../components/TagEditor';
import ItemAutocomplete from '../components/ItemAutocomplete';

type Placement = 'container' | 'location' | 'room';

export default function ItemForm() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ name: '', description: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [placement, setPlacement] = useState<Placement>('container');
  const [containerId, setContainerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [linkToItemId, setLinkToItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listContainers().then(setContainers).catch((e) => setError(e.message));
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
    api.listRooms().then(setRooms).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (id) {
      api
        .getItem(id)
        .then((item) => {
          setForm({ name: item.name, description: item.description || '' });
          setTags(item.tags.map((t) => t.name));
          if (item.container_id) {
            setPlacement('container');
            setContainerId(item.container_id);
          } else if (item.location_id) {
            setPlacement('location');
            setLocationId(item.location_id);
          } else if (item.room_id) {
            setPlacement('room');
            setRoomId(item.room_id);
          }
        })
        .catch((e) => setError(e.message));
    } else {
      const initialContainerId = searchParams.get('containerId');
      const initialLocationId = searchParams.get('locationId');
      const initialRoomId = searchParams.get('roomId');
      if (initialLocationId) {
        setPlacement('location');
        setLocationId(initialLocationId);
      } else if (initialContainerId) {
        setPlacement('container');
        setContainerId(initialContainerId);
      } else if (initialRoomId) {
        setPlacement('room');
        setRoomId(initialRoomId);
      }
    }
  }, [id, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      tags,
      container_id: placement === 'container' ? containerId : null,
      location_id: placement === 'location' ? locationId : null,
      room_id: placement === 'room' ? roomId : null,
    };
    try {
      let itemId: string;
      if (isEdit && id) {
        await api.updateItem(id, payload);
        itemId = id;
      } else {
        const created = await api.createItem(payload);
        itemId = created.id;
      }
      if (linkToItemId) await api.linkItems(itemId, linkToItemId);
      navigate(`/items/${itemId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    placement === 'container' ? Boolean(containerId) : placement === 'location' ? Boolean(locationId) : Boolean(roomId);

  return (
    <div className="card form-card">
      <h2>{isEdit ? 'Edit item' : 'Add an item'}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <ItemAutocomplete
            value={form.name}
            onChange={(value) => {
              setForm({ ...form, name: value });
              setLinkToItemId(null);
            }}
            onSelect={(item) => {
              setForm({ ...form, name: item.name });
              setLinkToItemId(item.id);
            }}
            excludeId={id}
            placeholder="e.g. Camping stove"
            required
          />
        </label>
        {linkToItemId && (
          <p className="muted small">
            Will link to the existing "{form.name}" — they'll show up together as linked items, wherever each
            one actually is.
          </p>
        )}
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </label>
        <label>
          Where is it?
          <div className="radio-row">
            <label>
              <input
                type="radio"
                checked={placement === 'container'}
                onChange={() => setPlacement('container')}
              />
              In a container
            </label>
            <label>
              <input
                type="radio"
                checked={placement === 'location'}
                onChange={() => setPlacement('location')}
              />
              Directly in a location
            </label>
            <label>
              <input type="radio" checked={placement === 'room'} onChange={() => setPlacement('room')} />
              In a room (in use)
            </label>
          </div>
        </label>
        {placement === 'container' && (
          <label>
            Container
            <select value={containerId} onChange={(e) => setContainerId(e.target.value)} required>
              <option value="" disabled>
                Select a container
              </option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.path}
                  {c.position ? ` (${c.position})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {placement === 'location' && (
          <label>
            Location
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="" disabled>
                Select a location
              </option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {placement === 'room' && (
          <label>
            Room
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
              <option value="" disabled>
                Select a room
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Tags
          <TagEditor value={tags} onChange={setTags} />
        </label>
        <button className="button" type="submit" disabled={saving || !canSubmit}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add item'}
        </button>
      </form>
    </div>
  );
}
