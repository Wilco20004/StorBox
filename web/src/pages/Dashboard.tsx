import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ItemDetail, LocationSummary } from '../types';
import TagChip from '../components/TagChip';

const SEARCH_DEBOUNCE_MS = 250;

function itemPath(item: ItemDetail): string {
  if (item.container) return `${item.container.name}${item.location ? ` · ${item.location.name}` : ''}`;
  if (item.location) return item.location.name;
  return '';
}

export default function Dashboard() {
  const [locations, setLocations] = useState<LocationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemDetail[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.listLocations().then(setLocations).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      api.listItems({ q: query.trim() }).then(setResults).catch((e) => setError(e.message));
    }, SEARCH_DEBOUNCE_MS);
  }, [query]);

  return (
    <div>
      <div className="search-bar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where did I put... (search items by name)"
        />
      </div>

      {error && <p className="error">{error}</p>}

      {results !== null ? (
        results.length === 0 ? (
          <p className="muted">No items match "{query}".</p>
        ) : (
          <ul className="entity-list">
            {results.map((item) => (
              <li key={item.id} className="entity-row">
                <div className="entity-row-body">
                  <Link to={`/items/${item.id}`}>
                    <strong>{item.name}</strong>
                  </Link>
                  {itemPath(item) && <p className="muted small">📍 {itemPath(item)}</p>}
                  {item.tags.length > 0 && (
                    <div className="tag-list">
                      {item.tags.map((t) => (
                        <TagChip key={t.id} name={t.name} linkTo={`/tags/${encodeURIComponent(t.name)}`} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : locations === null ? (
        <p>Loading...</p>
      ) : locations.length === 0 ? (
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
                <div className="entity-card-photo-placeholder">📍</div>
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
