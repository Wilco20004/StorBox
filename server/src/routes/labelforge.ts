import { Router } from 'express';
import { getLabelForgeUrl } from '../settings';

export const labelforgeRouter = Router();

// Proxies to the LabelForge add-on so the frontend never needs LabelForge's
// URL directly — it can change (config option) without a frontend rebuild,
// and it keeps StorBox's own Ingress-safe relative-fetch convention intact.

labelforgeRouter.get('/templates', async (_req, res) => {
  try {
    const upstream = await fetch(`${getLabelForgeUrl()}/api/templates`);
    if (!upstream.ok) {
      return res.status(502).json({ error: `LabelForge returned ${upstream.status}` });
    }
    res.json(await upstream.json());
  } catch (e) {
    res.status(502).json({ error: `Could not reach LabelForge: ${(e as Error).message}` });
  }
});

labelforgeRouter.post('/render', async (req, res) => {
  try {
    const upstream = await fetch(`${getLabelForgeUrl()}/api/labels/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return res.status(502).json({ error: `LabelForge returned ${upstream.status}${detail ? `: ${detail}` : ''}` });
    }
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: `Could not reach LabelForge: ${(e as Error).message}` });
  }
});

labelforgeRouter.post('/print', async (req, res) => {
  try {
    const upstream = await fetch(`${getLabelForgeUrl()}/api/labels/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const body = (await upstream.json().catch(() => ({}))) as { detail?: string };
    if (!upstream.ok) {
      return res.status(502).json({ error: body.detail || `LabelForge returned ${upstream.status}` });
    }
    res.json(body);
  } catch (e) {
    res.status(502).json({ error: `Could not reach LabelForge: ${(e as Error).message}` });
  }
});
