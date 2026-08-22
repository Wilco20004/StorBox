import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { LocationSummary } from '../types';
import TagEditor from '../components/TagEditor';

export default function ContainerForm() {
  const { id, locationId: routeLocationId } = useParams<{ id?: string; locationId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ name: '', position: '', description: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [locationId, setLocationId] = useState(routeLocationId || '');
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (id) {
      api
        .getContainer(id)
        .then((c) => {
          setForm({ name: c.name, position: c.position || '', description: c.description || '' });
          setTags(c.tags.map((t) => t.name));
          setLocationId(c.location?.id || '');
        })
        .catch((e) => setError(e.message));
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { ...form, location_id: locationId || null, tags };
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
          Location
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Holding (no location yet)</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
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
