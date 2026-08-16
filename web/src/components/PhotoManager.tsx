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
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
      if (fileInput.current) fileInput.current.value = '';
    } catch (e: any) {
      setError(e.message);
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
      <input ref={fileInput} type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
      {uploading && <span className="muted small"> Uploading...</span>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
