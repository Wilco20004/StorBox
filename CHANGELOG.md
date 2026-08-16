<!-- https://developers.home-assistant.io/docs/add-ons/presentation#keeping-a-changelog -->

## 1.2.0

- Reworked QR labels: the printed code is now a bare id, not a URL, and only
  means something to StorBox's own in-app scanner (new **Scan** page, uses
  your camera to read a label and jump straight to that container/item).
  Avoids the previous approach's Ingress-vs-direct-URL caveat entirely, since
  the code no longer needs to resolve outside the app.

## 1.1.0

- Added printable QR code labels for containers and items. The code links to
  the add-on's direct-access URL (not the Ingress URL, which is a per-session
  token) so a label printed once and stuck on a box keeps working.

## 1.0.0

- Initial release. Locations, Containers (with position), and Items, with
  tags and photo galleries. No login, no monetary values. Sidebar panel and
  embedded Ingress UI work out of the box (HashRouter + relative asset/API
  paths, same approach as the Planty add-on).
