import { useEffect, useState } from 'react';

// A plain controlled <input type="number"> re-derives its displayed text from
// the numeric value on every keystroke — clear it to retype and the instant
// it goes empty, `Number('') || fallback` snaps it straight back to the
// fallback, so you can never get an empty box to type into (you end up
// typing "3" into "1" and getting "13", then deleting the "1" by hand). This
// buffers the raw text locally and only commits/clamps on blur, so clearing
// the field just shows an empty field until you type your new value.
export default function NumberInput({
  value,
  onCommit,
  min,
  ...rest
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min'>) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const parsed = parseInt(text, 10);
    const clamped = Number.isFinite(parsed) ? (min !== undefined ? Math.max(min, parsed) : parsed) : (min ?? 0);
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  return (
    <input
      type="number"
      min={min}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
      {...rest}
    />
  );
}
