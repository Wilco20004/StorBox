import { useRef, useState } from 'react';
import { Photo } from '../types';
import CameraCapture from './CameraCapture';

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
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await upload(file);
  }

  async function handleCapture(file: File) {
    setShowCamera(false);
    await upload(file);
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
      <input ref={fileInput} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
      <div className="actions">
        <button
          type="button"
          className="button secondary small"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          Upload photo
        </button>
        <button type="button" className="button secondary small" onClick={() => setShowCamera(true)} disabled={uploading}>
          Take photo
        </button>
        {uploading && <span className="muted small">Uploading...</span>}
      </div>
      {error && <p className="error">{error}</p>}
      {showCamera && <CameraCapture onCapture={handleCapture} onCancel={() => setShowCamera(false)} />}
    </div>
  );
}
