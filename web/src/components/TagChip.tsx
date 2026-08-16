import { Link } from 'react-router-dom';

const HUES = [355, 25, 45, 90, 150, 190, 220, 260, 300, 330];

function hueForTag(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return HUES[Math.abs(hash) % HUES.length];
}

export default function TagChip({
  name,
  onRemove,
  linkTo,
}: {
  name: string;
  onRemove?: () => void;
  linkTo?: string;
}) {
  const hue = hueForTag(name);
  const style = {
    background: `hsl(${hue}, 65%, 94%)`,
    color: `hsl(${hue}, 55%, 30%)`,
  };
  const content = (
    <>
      {name}
      {onRemove && (
        <button
          type="button"
          className="tag-chip-remove"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          aria-label={`Remove tag ${name}`}
        >
          ×
        </button>
      )}
    </>
  );
  if (linkTo) {
    return (
      <Link to={linkTo} className="tag-chip" style={style}>
        {content}
      </Link>
    );
  }
  return (
    <span className="tag-chip" style={style}>
      {content}
    </span>
  );
}
