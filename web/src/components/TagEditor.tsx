import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TagChip from './TagChip';

export default function TagEditor({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    api.listTags().then((tags) => setAllTags(tags.map((t) => t.name))).catch(() => {});
  }, []);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  const suggestions = allTags.filter(
    (t) => t.toLowerCase().includes(input.trim().toLowerCase()) && !value.some((v) => v.toLowerCase() === t.toLowerCase())
  );

  return (
    <div className="autocomplete-field tag-editor">
      <div className="tag-editor-chips">
        {value.map((t) => (
          <TagChip key={t} name={t} onRemove={() => removeTag(t)} />
        ))}
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          placeholder={value.length === 0 ? 'Add a tag and press Enter' : 'Add another...'}
          autoComplete="off"
        />
      </div>
      {showSuggestions && input.trim() && suggestions.length > 0 && (
        <ul className="autocomplete-list">
          {suggestions.slice(0, 8).map((s) => (
            <li key={s}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addTag(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
