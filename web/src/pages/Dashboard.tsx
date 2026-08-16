import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { LocationSummary } from '../types';

export default function Dashboard() {
  const [locations, setLocations] = useState<LocationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (locations === null) return <p>Loading...</p>;

  if (locations.length === 0) {
    return (
      <div className="empty-state">
        <p>No locations yet.</p>
        <Link to="/locations/new" className="button">
          Add your first location
        </Link>
      </div>
    );
  }

  return (
    <div className="card-grid">
      {locations.map((loc) => (
        <Link key={loc.id} to={`/locations/${loc.id}`} className="entity-card">
          <div className="entity-card-photo">
            {loc.photos[0] ? (
              <img src={`uploads/${loc.photos[0].file_path}`} alt={loc.name} />
            ) : (
              <div className="entity-card-photo-placeholder">📍</div>
            )}
          </div>
          <div className="entity-card-body">
            <h3>{loc.name}</h3>
            <p className="muted">
              {loc.container_count} container{loc.container_count === 1 ? '' : 's'}, {loc.item_count} item
              {loc.item_count === 1 ? '' : 's'}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
