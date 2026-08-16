import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ItemDetail } from '../types';
import { itemPath } from '../utils/itemPath';

const SEARCH_DEBOUNCE_MS = 250;

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemDetail[] | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      api.listItems({ q: query.trim() }).then((r) => {
        setResults(r);
        setOpen(true);
      });
    }, SEARCH_DEBOUNCE_MS);
  }, [query]);

  function handleSelect(item: ItemDetail) {
    setQuery('');
    setResults(null);
    setOpen(false);
    navigate(`/items/${item.id}`);
  }

  return (
    <div className="autocomplete-field topbar-search">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Where did I put... (search items)"
      />
      {open && results && (
        <ul className="autocomplete-list">
          {results.length === 0 ? (
            <li className="autocomplete-empty">No items match "{query}".</li>
          ) : (
            results.map((item) => (
              <li key={item.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelect(item)}>
                  <strong>{item.name}</strong>
                  {itemPath(item) && <span className="muted small"> — 📍 {itemPath(item)}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
