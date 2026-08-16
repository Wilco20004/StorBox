import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, LocationInput } from '../api/client';

export default function LocationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<LocationInput>({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      api.getLocation(id).then((loc) => setForm({ name: loc.name, description: loc.description || '' })).catch((e) => setError(e.message));
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && id) {
        await api.updateLocation(id, form);
        navigate(`/locations/${id}`);
      } else {
        const created = await api.createLocation(form);
        navigate(`/locations/${created.id}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card form-card">
      <h2>{isEdit ? 'Edit location' : 'Add a location'}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Garage, Attic, Office closet"
          />
        </label>
        <label>
          Description
          <textarea
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </label>
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add location'}
        </button>
      </form>
    </div>
  );
}
