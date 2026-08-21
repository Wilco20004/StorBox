<!-- https://developers.home-assistant.io/docs/add-ons/presentation#keeping-a-changelog -->

## 1.5.1

- Defined a fixed set of variable names StorBox sends to LabelForge —
  `name`, `location`, `container`, `position`, `code` — documented in
  DOCS.md, so a LabelForge template built with those exact names comes out
  fully auto-filled with no manual typing. The print panel now lists which
  of these apply to the specific container/item you're printing. Pairs with
  LabelForge 1.1.0's QR-code-from-variable image type: give a template a
  `{{code}}` QR image to get a real scannable code on the printed label,
  instead of a static picture.

## 1.5.0

- Added real label printing via the LabelForge add-on: each container/item's
  label page now has a "Print on Brother QL (via LabelForge)" panel — pick a
  template, fill in its variables (prefilled with the item/container name,
  position, and code where they match), preview, and print. This is in
  addition to the existing browser-printed QR label, not a replacement.
  LabelForge's URL is configurable via the new **labelforge_url** add-on
  option.

## 1.4.0

- Added photos to Locations, matching Containers and Items. The Dashboard's
  location cards show the first photo as a thumbnail.

## 1.3.0

- Added a master search box in the top nav, available from every page. Type
  an item name to jump straight to it; results show which container and
  location it's in. The home page no longer has its own separate search box.

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
