// Home Assistant Ingress serves the app under a random, per-session path
// (containing "hassio_ingress"). That's fine for browsing, but useless for a
// QR code printed on a physical label — the token can change. Labels should
// point at the add-on's direct-access URL (the exposed port) instead, which
// is stable for as long as the add-on's host/port don't change.
export function getStableUrl(hashPath: string): { url: string | null; viaIngress: boolean } {
  const { origin, pathname } = window.location;
  const viaIngress = pathname.includes('hassio_ingress');
  if (viaIngress) return { url: null, viaIngress: true };
  return { url: `${origin}${pathname}${hashPath}`, viaIngress: false };
}
