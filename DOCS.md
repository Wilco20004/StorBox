# StorBox

Track where your stuff actually is: Locations (rooms, garage, attic) contain
Containers (boxes, shelves, bins) with a position (e.g. "Shelf 1 pos 2" or
"Ground back"), and Items live either inside a container or directly in a
location. Items and containers can both be tagged and photographed. No
accounts, no login, no monetary values — just "where did I put that."

## Setup

1. Install the add-on and start it.
2. Open the StorBox panel from the sidebar (Ingress) or the "Open Web UI" link.
3. Add a location (e.g. "Garage"), then add containers inside it with a
   position (e.g. "Shelf 1 pos 2"), then add items — either inside a
   container or directly in the location if they don't live in a box.
4. Tag items and containers as you go (e.g. "electronics", "seasonal",
   "fragile") and attach photos so you can recognize them at a glance.
5. Use the search box on the home page to find an item by name, or click any
   tag to browse everything tagged with it.
6. Print a QR label from any container or item's page ("Print label") and
   stick it on the physical box. To find it again later, open **Scan** in the
   top nav and point your camera at the label — it jumps straight to that
   container or item. The code only means something to StorBox's own
   scanner; it's not a link, so it keeps working however you access StorBox
   (Ingress or direct).

## Camera access for scanning

Scanning uses your browser's camera (`getUserMedia`), which browsers only
allow on secure origins — HTTPS, or `localhost`. If StorBox is served over
plain HTTP on your local network (common for a bare IP address like
`http://10.1.1.3:8090`), most browsers will block camera access for the Scan
page even though the rest of the app works fine. Access it over HTTPS (e.g.
Home Assistant's own SSL setup, or Nabu Casa remote access) to use the
scanner, or configure your browser to trust that origin as secure for
testing on your own trusted home network.

## Data persistence

StorBox stores its SQLite database and uploaded photos under `/data`, so
your inventory persists across add-on restarts and upgrades.
