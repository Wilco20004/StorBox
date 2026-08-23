import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { LabelTemplate } from '../types';
import NumberInput from './NumberInput';

export default function LabelForgePrint({ seed }: { seed: Record<string, string> }) {
  const [templates, setTemplates] = useState<LabelTemplate[] | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [copies, setCopies] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    api
      .listLabelTemplates()
      .then(setTemplates)
      .catch((e) => setError(`Could not reach LabelForge: ${e.message}`));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const template = templates?.find((t) => t.id === templateId) || null;

  async function selectTemplate(id: string) {
    setTemplateId(id);
    setStatus(null);
    setError(null);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    const t = templates?.find((tpl) => tpl.id === id);
    const next: Record<string, string> = {};
    t?.variables.forEach((v) => {
      next[v] = seed[v] || '';
    });
    if (t?.image_variable && seed.code) {
      // The template's image can be overridden by a caller-supplied variable —
      // hand it a real QR code of this box's own code, generated client-side,
      // instead of leaving it to the template's static fallback picture.
      next[t.image_variable] = await QRCode.toDataURL(seed.code, { margin: 1 });
    }
    setValues(next);
  }

  async function handlePreview() {
    if (!template) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const url = await api.renderLabel(template.id, values);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePrint() {
    if (!template) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await api.printLabel(template.id, values, copies);
      setStatus('Sent to the printer.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (templates && templates.length === 0) {
    return (
      <div className="card form-card labelforge-print no-print">
        <h3>Print on Brother QL (via LabelForge)</h3>
        <p className="muted small">No templates yet — create one in LabelForge, then come back here.</p>
      </div>
    );
  }

  const available = Object.entries(seed)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <div className="card form-card labelforge-print no-print">
      <h3>Print on Brother QL (via LabelForge)</h3>
      {available.length > 0 && (
        <p className="muted small">
          This label can auto-fill a template's <code>{'{{...}}'}</code> fields named:{' '}
          {available.map((k) => (
            <code key={k}>{k} </code>
          ))}
          — and if the template's image has an override variable, it's auto-filled with this box's QR code.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {!templates && !error && <p className="muted">Loading templates...</p>}
      {templates && templates.length > 0 && (
        <>
          <label>
            Template
            <select value={templateId} onChange={(e) => selectTemplate(e.target.value)}>
              <option value="">Choose a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.label_size})
                </option>
              ))}
            </select>
          </label>

          {template && (
            <>
              {template.variables.map((v) =>
                v === template.image_variable ? (
                  <p key={v} className="muted small">
                    {v}: {values[v] ? 'auto-filled with this box\'s QR code' : 'no code available — using the template\'s default image'}
                  </p>
                ) : (
                  <label key={v}>
                    {v}
                    {seed[v] && <span className="muted small"> (auto-filled)</span>}
                    <input
                      value={values[v] || ''}
                      onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                    />
                  </label>
                )
              )}
              <label>
                Copies
                <NumberInput value={copies} onCommit={setCopies} min={1} />
              </label>

              {previewUrl && (
                <div className="labelforge-preview">
                  <img src={previewUrl} alt="Label preview" />
                </div>
              )}

              {status && <p className="muted small">{status}</p>}

              <div className="actions">
                <button className="button secondary" type="button" onClick={handlePreview} disabled={busy}>
                  Preview
                </button>
                <button className="button" type="button" onClick={handlePrint} disabled={busy}>
                  {busy ? 'Working...' : 'Print'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
