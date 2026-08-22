# StorBox

Track where your stuff actually is: Locations (rooms, garage, attic) contain
Containers (boxes, shelves, bins) with a position (e.g. "Shelf 1 pos 2" or
"Ground back"), and Items live either inside a container or directly in a
location. Locations, containers, and items can all have photos, and items and
containers can both be tagged. No accounts, no login, no monetary values —
just "where did I put that."

## Setup

1. Install the add-on and start it.
2. Open the StorBox panel from the sidebar (Ingress) or the "Open Web UI" link.
3. Add a location (e.g. "Garage"), then add containers inside it with a
   position (e.g. "Shelf 1 pos 2"), then add items — either inside a
   container or directly in the location if they don't live in a box.
4. Tag items and containers as you go (e.g. "electronics", "seasonal",
   "fragile") and attach photos so you can recognize them at a glance.
5. Use the search box in the top nav (available on every page) to find an
   item by name — results show which container and location it's in. Click
   any tag to browse everything tagged with it.
6. Print a QR label from any container or item's page ("Print label") and
   stick it on the physical box. To find it again later, open **Scan** in the
   top nav and point your camera at the label — it jumps straight to that
   container or item. The code only means something to StorBox's own
   scanner; it's not a link, so it keeps working however you access StorBox
   (Ingress or direct).

## Holding containers and moving between locations

A container doesn't need a location right away. Use **Add container** in
the top nav (or "Add a holding container" on the dashboard) to create one
without picking a location — it shows up under **Holding** on the
dashboard instead of under a location. Pack it, tag it, add items to it
like any other container, and once it's full, open it and use the
**Location** section to move it to wherever it'll actually live.

That same **Location** section works on any container, not just holding
ones — pick a different location and hit **Move** to relocate it, or
**Move to Holding** to pull it back out of a location. Nothing about the
container's items, tags, or photos changes when it moves.

## Printing on a Brother QL label printer (via LabelForge)

If you also run the **LabelForge** add-on, the same label page has a
"Print on Brother QL (via LabelForge)" panel below the QR code: pick a
template you've designed in LabelForge, then **Preview** or **Print**. Any
of the template's `{{variable}}` fields that match one of StorBox's own
variable names below are filled in automatically — no typing needed for
those.

### Variables StorBox provides

Design your LabelForge template's text fields using exactly these names to
get a fully auto-filled label:

| Variable    | Meaning                                              | Container labels | Item labels |
| ----------- | ----------------------------------------------------- | ----------------- | ----------- |
| `name`      | The container's or item's own name                    | ✓ | ✓ |
| `location`  | The top-level Location's name                         | ✓ | ✓ |
| `container` | The parent container's name                           | — | only if inside a container |
| `position`  | The parent container's position (e.g. "Shelf 1 pos 2") | ✓ (its own position) | only if inside a container with one set |
| `code`      | The bare id also used for StorBox's own QR label       | ✓ | ✓ |

For a label that's scannable by StorBox's own **Scan** page, give the
template's image an **override variable** (LabelForge 1.2.0+, any name you
like — set it in LabelForge's template editor). StorBox detects it (via the
template's `image_variable`) and automatically generates a real QR code of
`code` to fill it, replacing whatever picture the template uses as its
fallback/preview. Nothing to type — the print panel shows that variable as
"auto-filled with this box's QR code" instead of a text box.

The panel only auto-fills variables that apply to the specific
container/item you're printing from (e.g. `container` and `position` are
blank for an item that isn't inside a container) — it lists exactly which
ones are available for that label above the template picker.

StorBox talks to LabelForge through its own backend, not directly from the
browser, so LabelForge's address is set once via the **labelforge_url**
add-on option (in the **Configuration** tab) rather than baked into the
frontend. This must be LabelForge's directly exposed port (e.g.
`http://10.1.1.3:8095`) — **not** a Home Assistant frontend/Ingress link
like `https://your-ha-domain/app/...`, which serves the HA UI shell for
every path rather than LabelForge's JSON API. If the panel shows "Could not
reach LabelForge", check that option and that the LabelForge add-on is
running.

## Camera access for scanning and taking photos

Scanning, and the **Take photo** button on any photo uploader, both use
your browser's camera (`getUserMedia`), which browsers only allow on secure
origins — HTTPS, or `localhost`. If StorBox is served over plain HTTP on
your local network (common for a bare IP address like
`http://10.1.1.3:8090`), most browsers will block camera access there even
though the rest of the app works fine — **Take photo** will show an error
naming the problem and point you at **Upload photo** instead. Access
StorBox over HTTPS (e.g. Home Assistant's own SSL setup, or Nabu Casa
remote access) to use the camera, or configure your browser to trust that
origin as secure for testing on your own trusted home network.

## Data persistence

StorBox stores its SQLite database and uploaded photos under `/data`, so
your inventory persists across add-on restarts and upgrades.
