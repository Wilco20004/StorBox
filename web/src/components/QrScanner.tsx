import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QrScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser has no camera access (getUserMedia unavailable).');
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
        tick();
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera access for this page and reload.'
            : `Could not access the camera: ${e.message || e.name}`
        );
        setStarting(false);
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result?.data) {
            onScan(result.data);
            return; // stop the loop; parent decides what happens next
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="qr-scanner">
      {error && <p className="error">{error}</p>}
      {starting && !error && <p className="muted">Requesting camera access...</p>}
      <video ref={videoRef} className="qr-scanner-video" playsInline muted style={{ display: error ? 'none' : undefined }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
