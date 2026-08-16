import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Location } from '../types';
import TagEditor from '../components/TagEditor';

export default function ContainerForm() {
  const { id, locationId } = useParams<{ id?: string; locationId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [location, setLocation] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: '', position: '', description: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      api
        .getContainer(id)
        .then((c) => {
          setForm({ name: c.name, position: c.position || '', description: c.description || '' });
          setTags(c.tags.map((t) => t.name));
          setLocation(c.location);
        })
        .catch((e) => setError(e.message));
    } else if (locationId) {
      api.getLocation(locationId).then((l) => setLocation(l)).catch((e) => setError(e.message));
    }
  }, [id, locationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetLocationId = id ? location?.id : locationId;
    if (!targetLocationId) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && id) {
        await api.updateContainer(id, { ...form, location_id: targetLocationId, tags });
        navigate(`/containers/${id}`);
      } else {
        const created = await api.createContainer({ ...form, location_id: targetLocationId, tags });
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
      {location && (
        <p className="breadcrumb">
          <Link to={`/locations/${location.id}`}>{location.name}</Link>
        </p>
      )}
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
