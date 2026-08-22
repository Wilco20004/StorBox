import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { ItemDetail } from '../types';
import { itemPath } from '../utils/itemPath';

const SEARCH_DEBOUNCE_MS = 250;

// A plain text input with live suggestions underneath, not a <select> — lets a
// name field double as a way to find and link to an existing item of the same
// kind (e.g. typing "2 point plug" while adding a 7th one) without forcing a
// rigid pick-from-a-list interaction.
export default function ItemAutocomplete({
  value,
  onChange,
  onSelect,
  excludeId,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: ItemDetail) => void;
  excludeId?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [results, setResults] = useState<ItemDetail[] | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      api.listItems({ q: value.trim() }).then((r) => {
        const filtered = excludeId ? r.filter((i) => i.id !== excludeId) : r;
        setResults(filtered);
        setOpen(true);
      });
    }, SEARCH_DEBOUNCE_MS);
  }, [value, excludeId]);

  function handleSelect(item: ItemDetail) {
    setOpen(false);
    setResults(null);
    onSelect(item);
  }

  return (
    <div className="autocomplete-field">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results && results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        required={required}
      />
      {open && results && results.length > 0 && (
        <ul className="autocomplete-list">
          {results.map((item) => (
            <li key={item.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelect(item)}>
                <strong>{item.name}</strong>
                {itemPath(item) && <span className="muted small"> — 📍 {itemPath(item)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
