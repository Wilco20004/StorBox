# StorBox

Track where your stuff actually is: Locations (garage, attic, storage
closet) contain Containers (boxes, shelves, bins) with a position (e.g.
"Shelf 1 pos 2" or "Ground back"), and Items live inside a container,
directly in a location, or — once they're out of storage and in active use
— in a **Room** (see below; not the same thing as a Location). Locations,
containers, and items can all have photos, and items and containers can
both be tagged. No accounts, no login, no monetary values — just "where did
I put that."

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

## Holding containers and moving things around

A container doesn't need a location right away. Use **Add container** in
the top nav (or "Add a holding container" on the dashboard) to create one
without picking a location — it shows up under **Holding** on the
dashboard instead of under a location. Pack it, tag it, add items to it
like any other container, and once it's full, open it and use the
**Where it lives** section to move it to wherever it'll actually live.

That same **Where it lives** section works on any container, not just
holding ones — pick a different location (or another container, see below)
and hit **Move** to relocate it, or **Move to Holding** to pull it back
out. Nothing about the container's items, tags, or photos changes when it
moves.

## Containers inside containers, and grid layouts

A container can sit inside another container, as deep as you like: a
shelf in the garage, a Gridfinity tray on the shelf, bins in the tray,
items in the bins. Pick the parent from the **Sits in** field when adding
or editing a container, or from **Where it lives** on its page. A
container only ever has one home — moving it into another container takes
it out of its location, and vice versa. Its real location is whatever the
outermost container in the chain sits in, and that's what breadcrumbs and
item pages show.

### Grid layouts

Tick **Lay containers out on a grid** on a container and give it a column
and row count (4 x 3 for a 4-wide, 3-deep Gridfinity baseplate) and its
page gains an interactive **Layout**. Anything nested inside it is drawn
in its own cell at its real footprint, with the number of items in it.

- **Cells are named across then down** — letters for columns, numbers for
  rows, so the third column of the fourth row is `C4`. Same convention as
  a spreadsheet.
- **Bin size** is set in cells on the container form — a 1x1 Gridfinity
  bin, a 2x2, a 4x1 tray, whatever it physically occupies.
- **Tap an empty cell** to add a bin straight into it.
- **Tap Rearrange**, then tap a bin to pick it up and tap a free cell to
  drop it there. While a bin is held you can also make it wider, narrower,
  taller or shorter a cell at a time, or take it off the grid.
- **Bins with no cell yet** wait in a strip under the layout — useful when
  you've labelled a batch of bins before deciding where they go. Tap one
  in Rearrange mode, then tap a cell.

Bins that would overlap, or hang off the edge, are refused with a message
naming the bin in the way, and a grid can't be shrunk out from under the
bins already placed on it — move or unplace them first.

### Finding something in a bin

An item's page shows the full path to it, deepest first — e.g.
`C2 Fasteners · Gridfinity tray · Workbench shelf · Garage` — so you know
which cell of which tray to open. Next to it, **Show on layout** opens the
tray's page and pulses the exact cell the item is in.

## Rooms — items out of storage and in active use

A **Room** is where an item goes once it's not really "in storage"
anymore — e.g. a multiplug moved from a storage bin to the living room.
Rooms are a separate concept from Locations: a Location is a place you
store boxes (garage, attic); a Room is a place you use things. Open
**Rooms** in the top nav to create one, or see below to pull them in from
Home Assistant automatically.

Any item's page has a **Placement** section: pick "Move to a room" (or
container, or location) and hit **Move** to relocate it — this works
regardless of where the item currently is, so moving something from a
storage container straight into a room, or back again, is one action.

### Pulling rooms in from Home Assistant

If StorBox has access to Home Assistant's API (it does automatically when
installed as a Home Assistant add-on — no setup needed), the Rooms page
shows a **Sync from Home Assistant** button that creates a Room for each
of your HA Areas (and renames existing ones if you rename the Area in HA).
If that access isn't available for some reason (e.g. running StorBox
outside of Home Assistant's Supervisor), the button won't appear and the
page says so — just add rooms manually with **Add room** instead; nothing
else about the feature depends on the sync working.

## Lending items

Any item's page has a **Lending** section. Fill in who you're lending it
to and a date (a due-back date is optional) and hit **Lend this item** —
the item's page and header both show it's out, and the dashboard's **Lent
out** section lists every item currently lent across your whole inventory
with a one-click **Mark as returned**. An item can only be lent to one
person at a time; past loans stay visible as history on the item's page.
Lending doesn't change where an item is placed (container/location/room) —
it's a separate status layered on top, since the hammer still "lives" in
the toolbox even while it's out with a neighbor.

## Linking items together

Link items that belong together even if they're stored separately and
named differently — this covers two related cases:

- **Duplicates**: you own several of the same thing kept in different
  places (seven "2 point plug single" adapters spread across containers
  and rooms) and want to find all of them from any one of them.
- **One thing in parts**: a gazebo whose frame lives in a container but
  whose poles are loose directly in a location — different names,
  different kinds of storage, but really one thing.

Start typing a name in the **Name** field on Add/Edit item; if anything
already in your inventory matches, it shows up right under the field as
you type (not a dropdown — pick it or keep typing your own text). Picking
a suggestion links the item you're adding to it. Any linked item's page
has a **Linked items** section listing every item linked to it and exactly
where each one currently is, regardless of what it's called or how it's
placed.

Items that already existed before you started linking things work the
same way after the fact — open one, and if it isn't linked to anything yet
its **Linked items** section has its own search box; find and pick the
matching item there (its name doesn't need to be similar — search for
"poles" from the gazebo's page and it'll turn up) to link them. Linking two
items that were each already part of a different group merges both groups
into one. **Unlink** on any item's page removes just that one from its
group, leaving the rest linked.

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
| `location`  | The Location at the top of its chain                  | ✓ | ✓ |
| `container` | The parent container's name                           | only if nested inside one | only if inside a container |
| `position`  | Where it sits — free-text position, or the grid cell   | ✓ (its own position, else its cell) | its container's cell, else that container's position |
| `code`      | The bare id also used for StorBox's own QR label       | ✓ | ✓ |

With nested containers, `location` is the Location at the top of the chain
rather than one the container holds directly — a bin inside a tray inside a
shelf in the Garage prints "Garage", not a blank. A bin on a grid gets its
cell (e.g. `C2`) as its `position`, and the tray it's on as `container`.

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
