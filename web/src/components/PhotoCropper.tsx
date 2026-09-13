import { useEffect, useRef, useState } from 'react';

/**
 * Square crop with drag-to-pan and a zoom slider.
 *
 * Square because that's the shape photos are actually shown in — grid cells and
 * entity cards both centre-crop to it — so without this, whatever the camera
 * happened to centre on is what survives. Deliberately no pinch-to-zoom: a
 * slider is one-handed, and this gets used standing in a garage.
 *
 * Everything here works over plain HTTP on a LAN IP: pointer events, canvas and
 * toBlob need no secure context, and the source image is same-origin so the
 * canvas never gets tainted.
 */
export default function PhotoCropper({
  src,
  title,
  onCropped,
  onSkip,
  onCancel,
}: {
  /** Object URL for a newly picked file, or an `uploads/...` path for an existing photo. */
  src: string;
  title: string;
  onCropped: (blob: Blob) => void | Promise<void>;
  /** Offered only when there's an uncropped original to fall back to. */
  onSkip?: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null
  );
  const centredRef = useRef(false);

  const [frameSize, setFrameSize] = useState(320);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The scale at which the image exactly covers the frame — the floor, so no
  // blank bars can ever creep into the crop.
  const baseScale = natural ? Math.max(frameSize / natural.w, frameSize / natural.h) : 1;
  const scale = baseScale * zoom;
  const drawnW = natural ? natural.w * scale : 0;
  const drawnH = natural ? natural.h * scale : 0;

  function clamp(next: { x: number; y: number }, w: number, h: number) {
    return {
      x: Math.min(0, Math.max(frameSize - w, next.x)),
      y: Math.min(0, Math.max(frameSize - h, next.y)),
    };
  }

  useEffect(() => {
    function measure() {
      const available = frameRef.current?.parentElement?.clientWidth ?? 320;
      setFrameSize(Math.max(200, Math.min(360, available - 8)));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setError('Could not load that image');
    img.src = src;
  }, [src]);

  // Start centred once the image is measured; after that a frame resize only
  // re-clamps, so it never yanks the view away from what you just framed up.
  useEffect(() => {
    if (!natural) return;
    const cover = Math.max(frameSize / natural.w, frameSize / natural.h);
    const w = natural.w * cover * zoom;
    const h = natural.h * cover * zoom;
    if (!centredRef.current) {
      centredRef.current = true;
      setOffset(clamp({ x: (frameSize - w) / 2, y: (frameSize - h) / 2 }, w, h));
    } else {
      setOffset((current) => clamp(current, w, h));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, frameSize]);

  function handleZoom(next: number) {
    if (!natural) return;
    const nextScale = baseScale * next;
    const nextW = natural.w * nextScale;
    const nextH = natural.h * nextScale;
    // Zoom about the centre of the frame, so the bit you're looking at stays put.
    const centreX = (frameSize / 2 - offset.x) / drawnW;
    const centreY = (frameSize / 2 - offset.y) / drawnH;
    setZoom(next);
    setOffset(clamp({ x: frameSize / 2 - centreX * nextW, y: frameSize / 2 - centreY * nextH }, nextW, nextH));
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    // Not every browser will capture every pointer id (it throws rather than
    // no-opping); the drag still works off the move handler without capture.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no capture available — dragging still tracks until pointerup */
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset(
      clamp(
        { x: drag.originX + (e.clientX - drag.startX), y: drag.originY + (e.clientY - drag.startY) },
        drawnW,
        drawnH
      )
    );
  }

  function endDrag(e: React.PointerEvent) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  async function handleApply() {
    const img = imageRef.current;
    if (!img || !natural) return;
    setBusy(true);
    setError(null);
    try {
      // Frame coordinates back to source pixels: whatever is under the square.
      const sourceSize = frameSize / scale;
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const out = Math.max(1, Math.min(1200, Math.round(sourceSize)));

      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not prepare the crop');
      ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, out, out);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Your browser could not produce the cropped image');
      await onCropped(blob);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="cropper-overlay" role="dialog" aria-label={title}>
      <div className="cropper">
        <h3>{title}</h3>
        {error && <p className="error">{error}</p>}
        <div
          ref={frameRef}
          className="cropper-frame"
          style={{ width: frameSize, height: frameSize }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {natural ? (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                width: drawnW,
                height: drawnH,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          ) : (
            <p className="muted">Loading...</p>
          )}
          <div className="cropper-grid-lines" />
        </div>
        <label className="cropper-zoom">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            disabled={!natural || busy}
            onChange={(e) => handleZoom(Number(e.target.value))}
          />
        </label>
        <p className="muted small">Drag the photo to choose what stays in the square.</p>
        <div className="actions">
          <button type="button" className="button" disabled={!natural || busy} onClick={handleApply}>
            {busy ? 'Saving...' : 'Use this crop'}
          </button>
          {onSkip && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                Promise.resolve(onSkip()).catch((e: any) => {
                  setError(e.message);
                  setBusy(false);
                });
              }}
            >
              Use whole photo
            </button>
          )}
          <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
