import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, RoomInput } from '../api/client';

export default function RoomForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<RoomInput>({ name: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      api.getRoom(id).then((r) => setForm({ name: r.name })).catch((e) => setError(e.message));
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && id) {
        await api.updateRoom(id, form);
        navigate(`/rooms/${id}`);
      } else {
        const created = await api.createRoom(form);
        navigate(`/rooms/${created.id}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card form-card">
      <h2>{isEdit ? 'Edit room' : 'Add a room'}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Living room, Kitchen, Office"
          />
        </label>
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add room'}
        </button>
      </form>
    </div>
  );
}
