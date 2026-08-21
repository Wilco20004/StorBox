import fs from 'fs';

// Home Assistant Supervisor writes the add-on's current config options to
// /data/options.json before starting the container, same as LabelForge does.
const OPTIONS_PATH = process.env.STORBOX_OPTIONS_PATH || '/data/options.json';

// NOT https://ha.wccx.co.za/app/c62709c5_labelforge — that's a browser
// bookmark into the authenticated HA frontend SPA, which serves the same
// index.html for every path (confirmed: /api/templates returned HA's launch
// screen HTML, not JSON). A backend fetch needs LabelForge's own directly
// exposed port instead — see LabelForge's config.yaml (ports: 8095/tcp).
const DEFAULT_LABELFORGE_URL = 'http://10.1.1.3:8095';

function readOptions(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(OPTIONS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function getLabelForgeUrl(): string {
  const options = readOptions();
  const raw =
    (typeof options.labelforge_url === 'string' && options.labelforge_url) ||
    process.env.LABELFORGE_URL ||
    DEFAULT_LABELFORGE_URL;
  return raw.replace(/\/+$/, '');
}
