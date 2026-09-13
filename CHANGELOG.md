<!-- https://developers.home-assistant.io/docs/add-ons/presentation#keeping-a-changelog -->

## 1.10.0

- Bins on a grid layout now show a **photo**, so a tray reads at a glance
  instead of making you decode names like "2x1 3cm". A bin uses its own
  first photo; if it hasn't got one, it falls back to the first photo of an
  item inside it — which is the common case, since bins tend to get named
  for their size rather than their contents. The picture fills the cell
  with the cell name, bin name and item count riding on a gradient scrim so
  they stay readable over any image.
- The same cover-photo fallback now applies to container cards on the
  dashboard, location pages and inside other containers, so a photographed
  item gives its container a picture everywhere, not just on grids.
- Photos can now be **cropped**, since square cells and cards centre-crop
  whatever the camera happened to frame. Picking or taking a photo opens a
  square crop with drag-to-pan and a zoom slider (**Use whole photo** skips
  it and uploads the original untouched, as before). Photos already in the
  app get a **Crop** button, so existing pictures can be re-framed without
  re-taking them. Works on containers, items and locations.
- Re-cropping keeps the photo's identity — same row, same timestamp — so
  re-framing a container's first photo doesn't quietly demote it out of
  being that container's cover picture, the way deleting and re-uploading
  would have.
- Grid cells are now **square and a fixed size** rather than stretching to
  fill the window. On a wide screen a 2x2 bin was being drawn 208x72 — the
  same shape as a 1x1 — which misrepresented the tray and letterboxed the
  new photos. Cells are now 88px on a desktop and 60px on a phone, and a
  2x2 is drawn at exactly twice a 1x1 in both directions.

## 1.9.0

- Containers can now go **inside other containers**, to any depth — a shelf
  in the garage, a tray on the shelf, bins in the tray. Every container's
  page has a **Where it lives** section that can move it into a location,
  into another container, or back to Holding, and breadcrumbs everywhere
  now show the whole chain rather than just the location.
- Any container can be given a **grid layout** (columns x rows, e.g. 4x3) —
  built for Gridfinity baseplates, but equally a pigeonhole shelf or a
  drawer organiser. Containers nested in a grid are drawn on an interactive
  layout on its page: each bin sits in its cell at its real footprint
  (1x1, 2x2, ...), showing how many items are in it. Cells are named
  spreadsheet-style, letters across and numbers down, so the third column
  of the fourth row is `C4`.
- Tap **Rearrange** on a layout to pick a bin up and drop it in a free cell,
  resize it a cell at a time, or take it off the grid entirely; tapping an
  empty cell in normal mode adds a bin straight into it. Bins added without
  a cell wait in a strip under the layout until you place them. Overlapping
  bins, bins hanging off the edge, and shrinking a grid out from under the
  bins already on it are all refused with a message naming the bin in the
  way.
- An item in a bin now knows where it really is: its page shows the full
  path (`C2 Fasteners · Gridfinity tray · Workbench shelf · Garage`), with a
  **Show on layout** link that opens the tray and pulses the exact cell.
  Previously an item in a nested container showed no location at all,
  because the bin it was in had none of its own.
- Container listings now count what's inside the containers nested in them,
  so a tray full of bins no longer reads "0 items".
- The new columns are plain nullable additions to `containers` (no CHECK
  constraint is involved, unlike `room_id`), so existing databases pick
  them up without a table rebuild. Verified against a seeded pre-1.9.0
  database with real rows: all seven columns and the parent index were
  added, and every location, container, item, tag, loan and photo survived
  unchanged.

## 1.8.2

- Fixed the **Copies** field on the LabelForge print panel snapping back to
  `1` on every keystroke while clearing it to type a different number, so
  you'd end up typing "3" into "1" and getting "13", then having to delete
  the leftover "1" by hand. The field now lets you freely clear and retype;
  it only clamps back to a valid number (minimum 1) when you click away.
  Verified the fix directly against the live DOM: clearing now actually
  empties the field instead of resetting, and typing straight after gives
  the number you typed, not it appended to the old one.

## 1.8.1

- Relabeled 1.8.0's linking feature from "Same product" to **Linked
  items**: the mechanism was always a plain symmetric link (no naming or
  placement requirement), but the wording implied it only worked for
  duplicates. Confirmed it already handles two differently-named items in
  different kinds of storage (e.g. a gazebo in a container, linked to its
  poles kept loose in a location) — no code change beyond copy, verified
  live with exactly that scenario in both directions.

## 1.8.0

- Added item linking: when you have several of the same thing scattered
  across containers/locations/rooms (e.g. "2 point plug single" x7), the
  Name field on Add/Edit item is now a live autocomplete (not a dropdown)
  — matching existing items show up as you type, and picking one links
  the new item to it as the same "product". Every linked item's page gets
  a **Same product** section listing the others and where they currently
  are. Items that already existed before this feature can be linked
  retroactively the same way, via a search box in that same section.
  Linking two items that each already had their own group of linked items
  merges the groups; **Unlink** on any item's page undoes just that one.
  `items.product_id` is a plain nullable column (unlike room_id/location_id,
  it isn't part of the placement rule), so existing databases pick it up
  via a simple column addition — no table rebuild needed this time.

## 1.7.0

- Added **Rooms** — a place for items that are out of storage and in
  active use (e.g. a multiplug moved from a storage bin to the living
  room), distinct from Locations. Any item's page has a **Placement**
  section to move it between a container, a location, or a room in one
  action. Rooms can sync automatically from Home Assistant's Areas (the
  add-on now requests `homeassistant_api` access for this) or be added
  manually — the Rooms page detects which is available and only shows the
  sync button when it'll actually work.
- Added **Lending**: mark any item as lent to someone on a date, with an
  optional due-back date, and mark it returned later. The dashboard's new
  **Lent out** section lists everything currently out, across the whole
  inventory, with a one-click return. Loan history stays on the item's
  page. This is independent of where the item is placed — lending is a
  status layered on top, not a move.
- `items.room_id` required a widened placement rule (exactly one of
  container/location/room, not just container/location) — existing
  databases migrate automatically on first start (another one-time
  internal table rebuild, same reason and same care as containers'
  location_id in 1.6.0). Verified against a seeded old-schema database
  with real items in both a container and a location that existing data
  survives and the new room/lending flows work immediately after.

## 1.6.2

- Replaced 1.6.1's **Take photo** (a plain file input's `capture`
  attribute) with a real in-page camera view (`getUserMedia`, same
  approach as the Scan page): confirmed on a real Android phone that the
  `capture` attribute doesn't reliably open the camera any more — modern
  Chrome's system Photo Picker intercepts the file input and shows the
  gallery instead, regardless of the attribute. The live view needs a
  secure origin same as Scan does; see "Camera access for scanning and
  taking photos" below.

## 1.6.1

- Every photo uploader (locations, containers, items) now offers **Take
  photo** alongside **Upload photo** — on a phone, it opens the camera
  directly instead of the gallery/file picker. Uses a plain file input's
  `capture` attribute rather than `getUserMedia`, so it needs no secure
  context and works over the plain-HTTP LAN access this app commonly runs
  under.

## 1.6.0

- Containers can now exist without a location ("Holding" — for packing
  before you've decided where something will live) and can be moved
  between locations, or in and out of Holding, from a new **Location**
  section on the container's own page. The dashboard has a new **Holding**
  section listing them, and **Add container** in the top nav creates one
  without requiring a location up front. Existing databases are migrated
  automatically on first start after upgrading (a one-time internal table
  rebuild, since SQLite can't just relax a NOT NULL constraint in place) —
  no data is lost.

## 1.5.2

- Switched to LabelForge 1.2.0's image "override variable": StorBox now
  generates the QR code itself (client-side, from `code`) and sends it as
  whatever variable the template's image declares, instead of relying on
  LabelForge to render a `{{code}}`-templated QR internally (LabelForge
  1.1.0/StorBox 1.5.1's approach). The print panel shows that field as
  "auto-filled with this box's QR code" rather than a text box — still
  zero typing.

## 1.5.1

- Defined a fixed set of variable names StorBox sends to LabelForge —
  `name`, `location`, `container`, `position`, `code` — documented in
  DOCS.md, so a LabelForge template built with those exact names comes out
  fully auto-filled with no manual typing. The print panel lists which of
  these apply to the specific container/item you're printing. (Superseded
  by 1.5.2 for the image/QR part above — text variables unchanged.)

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
