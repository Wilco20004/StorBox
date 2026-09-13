import { useEffect, useRef, useState } from 'react';
import { Photo } from '../types';
import CameraCapture from './CameraCapture';
import PhotoCropper from './PhotoCropper';

// What the cropper is currently working on: a file on its way in, or a photo
// already saved that's being re-framed.
type Pending =
  | { kind: 'new'; file: File; url: string }
  | { kind: 'existing'; photo: Photo };

function croppedFile(blob: Blob): File {
  // Name it .jpg because the upload endpoint filters on the extension, and the
  // cropper always hands back a JPEG.
  return new File([blob], 'crop.jpg', { type: 'image/jpeg' });
}

export default function PhotoManager({
  photos,
  onUpload,
  onDelete,
  onReplace,
}: {
  photos: Photo[];
  onUpload: (file: File) => Promise<unknown>;
  onDelete: (photoId: string) => Promise<unknown>;
  /** Swaps the image behind an existing photo, keeping its place in the order. */
  onReplace?: (photoId: string, file: File) => Promise<unknown>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Object URLs for picked files are ours to release.
  useEffect(() => {
    return () => {
      if (pending?.kind === 'new') URL.revokeObjectURL(pending.url);
    };
  }, [pending]);

  function clearPending() {
    if (pending?.kind === 'new') URL.revokeObjectURL(pending.url);
    setPending(null);
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
      clearPending();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function replace(photoId: string, file: File) {
    if (!onReplace) return;
    setUploading(true);
    setError(null);
    try {
      await onReplace(photoId, file);
      clearPending();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function queueForCrop(file: File) {
    setError(null);
    setPending({ kind: 'new', file, url: URL.createObjectURL(file) });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) queueForCrop(file);
  }

  function handleCapture(file: File) {
    setShowCamera(false);
    queueForCrop(file);
  }

  return (
    <div className="photo-manager">
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="photo-grid-item">
              <img src={`uploads/${p.file_path}`} alt="" />
              {onReplace && (
                <button
                  type="button"
                  className="photo-crop"
                  onClick={() => setPending({ kind: 'existing', photo: p })}
                  aria-label="Crop photo"
                >
                  Crop
                </button>
              )}
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
      {pending?.kind === 'new' && (
        <PhotoCropper
          src={pending.url}
          title="Crop this photo"
          onCropped={(blob) => upload(croppedFile(blob))}
          onSkip={() => upload(pending.file)}
          onCancel={clearPending}
        />
      )}
      {pending?.kind === 'existing' && (
        <PhotoCropper
          src={`uploads/${pending.photo.file_path}`}
          title="Crop this photo"
          onCropped={(blob) => replace(pending.photo.id, croppedFile(blob))}
          onCancel={clearPending}
        />
      )}
    </div>
  );
}
