import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerDetail, LocationSummary } from '../types';

export default function Dashboard() {
  const [locations, setLocations] = useState<LocationSummary[] | null>(null);
  const [holding, setHolding] = useState<ContainerDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
    api.listHoldingContainers().then(setHolding).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (locations === null) return <p>Loading...</p>;

  return (
    <div>
      <div className="actions" style={{ justifyContent: 'space-between', marginTop: 0 }}>
        <h2 style={{ margin: 0 }}>Holding</h2>
        <Link to="/containers/new" className="button small">
          Add a holding container
        </Link>
      </div>
      <p className="muted small">Containers you're packing that don't have a home yet — move them once full.</p>
      {holding === null ? (
        <p className="muted">Loading...</p>
      ) : holding.length === 0 ? (
        <p className="muted">None right now.</p>
      ) : (
        <div className="card-grid">
          {holding.map((c) => (
            <Link key={c.id} to={`/containers/${c.id}`} className="entity-card">
              <div className="entity-card-photo">
                {c.photos[0] ? (
                  <img src={`uploads/${c.photos[0].file_path}`} alt={c.name} />
                ) : (
                  <div className="entity-card-photo-placeholder">📦</div>
                )}
              </div>
              <div className="entity-card-body">
                <h3>{c.name}</h3>
                <p className="muted small">
                  {c.items.length} item{c.items.length === 1 ? '' : 's'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2>Locations</h2>
      {locations.length === 0 ? (
        <div className="empty-state">
          <p>No locations yet.</p>
          <Link to="/locations/new" className="button">
            Add your first location
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
