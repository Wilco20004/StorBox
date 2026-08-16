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

## Data persistence

StorBox stores its SQLite database and uploaded photos under `/data`, so
your inventory persists across add-on restarts and upgrades.
