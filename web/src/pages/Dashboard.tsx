import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ContainerDetail, LoanWithItem, LocationSummary } from '../types';

export default function Dashboard() {
  const [locations, setLocations] = useState<LocationSummary[] | null>(null);
  const [holding, setHolding] = useState<ContainerDetail[] | null>(null);
  const [loans, setLoans] = useState<LoanWithItem[] | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reloadLoans() {
    api.listActiveLoans().then(setLoans).catch((e) => setError(e.message));
  }

  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
    api.listHoldingContainers().then(setHolding).catch((e) => setError(e.message));
    reloadLoans();
  }, []);

  async function handleReturn(loanId: string) {
    setReturning(loanId);
    setError(null);
    try {
      await api.returnLoan(loanId);
      reloadLoans();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReturning(null);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (locations === null) return <p>Loading...</p>;

  return (
    <div>
      {loans !== null && loans.length > 0 && (
        <>
          <h2>Lent out</h2>
          <ul className="entity-list">
            {loans.map((l) => (
              <li key={l.id} className="entity-row">
                <div className="entity-row-body">
                  <Link to={`/items/${l.item.id}`}>
                    <strong>{l.item.name}</strong>
                  </Link>
                  <p className="muted small">
                    Lent to {l.borrower} since {l.lent_at.slice(0, 10)}
                    {l.due_at && ` — due back ${l.due_at.slice(0, 10)}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="button secondary small"
                  disabled={returning === l.id}
                  onClick={() => handleReturn(l.id)}
                >
                  Mark as returned
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

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
                  {c.total_item_count} item{c.total_item_count === 1 ? '' : 's'}
                  {c.child_count > 0 &&
                    ` in ${c.child_count} container${c.child_count === 1 ? '' : 's'}`}
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
