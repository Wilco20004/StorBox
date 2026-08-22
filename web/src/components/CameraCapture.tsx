import { useEffect, useRef, useState } from 'react';

export default function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Bypasses the plain file input's capture attribute, which Android's
      // system Photo Picker overrides on modern Chrome — it shows the gallery
      // picker instead of the camera regardless of the attribute's presence.
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser has no camera access (getUserMedia unavailable) — use Upload photo instead.');
        setStarting(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStarting(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera access for this page, or use Upload photo instead.'
            : `Could not access the camera: ${e.message || e.name}. Use Upload photo instead.`
        );
        setStarting(false);
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9
    );
  }

  return (
    <div className="camera-capture-overlay">
      <div className="camera-capture">
        {error && <p className="error">{error}</p>}
        {starting && !error && <p className="muted">Requesting camera access...</p>}
        <video
          ref={videoRef}
          className="camera-capture-video"
          playsInline
          muted
          style={{ display: error ? 'none' : undefined }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="actions">
          {!error && !starting && (
            <button type="button" className="button" onClick={handleCapture}>
              Capture
            </button>
          )}
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
