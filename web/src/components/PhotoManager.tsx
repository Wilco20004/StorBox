import { useRef, useState } from 'react';
import { Photo } from '../types';

export default function PhotoManager({
  photos,
  onUpload,
  onDelete,
}: {
  photos: Photo[];
  onUpload: (file: File) => Promise<unknown>;
  onDelete: (photoId: string) => Promise<unknown>;
}) {
  const uploadInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="photo-manager">
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="photo-grid-item">
              <img src={`uploads/${p.file_path}`} alt="" />
              <button type="button" className="photo-delete" onClick={() => onDelete(p.id)} aria-label="Delete photo">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {/* capture="environment" opens the camera directly on mobile (ignored on desktop, falling
          back to a normal file picker) — unlike getUserMedia, it needs no secure context, so it
          works over the plain-HTTP LAN access this app commonly runs under. */}
      <input ref={uploadInput} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <input
        ref={captureInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <div className="actions">
        <button
          type="button"
          className="button secondary small"
          onClick={() => uploadInput.current?.click()}
          disabled={uploading}
        >
          Upload photo
        </button>
        <button
          type="button"
          className="button secondary small"
          onClick={() => captureInput.current?.click()}
          disabled={uploading}
        >
          Take photo
        </button>
        {uploading && <span className="muted small">Uploading...</span>}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
