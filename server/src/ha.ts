// Home Assistant add-ons get SUPERVISOR_TOKEN injected automatically (when
// config.yaml declares homeassistant_api: true) and can reach Core's REST
// API through the Supervisor proxy at http://supervisor/core — no manual
// long-lived token needed from the user. Only present when actually running
// as an installed add-on under Supervisor; absent in plain `npm run dev`.
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;
const HA_CORE_BASE = 'http://supervisor/core';

export function homeAssistantAvailable(): boolean {
  return Boolean(SUPERVISOR_TOKEN);
}

// Area registry has no plain REST endpoint, but Core's /api/template does —
// it renders a Jinja2 template server-side, and areas()/area_name() are
// built-in template functions. Building the id/name pairs inside the
// template avoids needing a second call per area.
const AREAS_TEMPLATE = `{% set ns = namespace(items=[]) %}{% for a in areas() %}{% set ns.items = ns.items + [{'id': a, 'name': area_name(a)}] %}{% endfor %}{{ ns.items | tojson }}`;

export async function fetchHomeAssistantAreas(): Promise<{ id: string; name: string }[]> {
  if (!SUPERVISOR_TOKEN) {
    throw new Error('Not running under Home Assistant Supervisor — add rooms manually instead.');
  }
  const res = await fetch(`${HA_CORE_BASE}/api/template`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPERVISOR_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: AREAS_TEMPLATE }),
  });
  if (!res.ok) {
    throw new Error(`Home Assistant returned ${res.status}`);
  }
  const text = await res.text();
  return JSON.parse(text);
}
