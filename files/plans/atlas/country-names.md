# Country names on the map — ATLAS-301 (2026-10-27, for 2026-10-28)

> The dev's request, 2026-10-27, from two references (a Crusader Kings III map, a YouTube map of 1501, both on the
> ticket as layout references, not sources): **each polity's name written inside the space it occupies, as large as
> that space allows**, laid on the map, bent along its shape. First goal: **see whether the principle works** (the
> dev: *« l'important déjà c'est de voir si le principe fonctionne »*).

## Decisions

| decision | by |
| --- | --- |
| The name sits in the polity's own space, **as large as the space allows**, measured from the text's real extent and the area available | dev, 27/10 |
| **A margin between the text and the borders**, so a letter never touches one (*« il doit y avoir de la marge »*) | dev, 27/10 |
| The ink is **not black**: a dark brown, partly transparent, **blended (multiply)** so the name takes on the polity's colour | dev, 27/10 |
| The lettering is chosen **on sight, on a bench**, among a few open-licence (OFL) faces — an uncial, Roman capitals, old-print small caps, a Carolingian hand if one exists under an open licence (*« peut-être une Caroline »*) | dev, 27/10 |
| **When the direct vassals are shown**, each carries its own name in its own space, and the suzerain's name is **recomputed in the space left to it** (its territory minus its vassals') | dev, 27/10 |
| **Everything changes by fading**: a name that appears, disappears, grows or moves fades, never jumps (*« tout apparaît en fondu, tout se rafraîchit en fondu »*) | dev, 27/10 |
| The short display name is **a field per language in the registry, entered in the Cartographer**; a polity without one carries no name, and the console says so | dev, 27/10 (*« on peut déjà faire comme ça »*) |
| **Not baked into a map-wide texture**: one strip per name laid on the relief, with its own texture — a map-wide bake blurs at zoom, as the baked coastline did (rejected 2026-09) | Claude's proposal, 27/10 — the dev asked for « comme un layer » between the borders and the events; the strip is that layer, drawn crisp |
| The names layer is drawn **between the borders and the events** | dev, 27/10 |
| The vassals' names follow the **display level** already used for their colours and borders (`vassal-lod.md`, ATLAS-253), so a vassal's name comes in at the same zoom as its colour | Claude's inference, 27/10 — to confirm |

## What exists, measured 27/10

- **The names are already there**: `years/1100/registry.json` gives each of its 142 polities a `name`, written in the
  Cartographer. But it is the **formal name, in one language** (« Kingdom of England »): step 4 adds the short one.
- **Homage levels** (`core/editor/homageLevels`, ATLAS-253): each polity's depth and the zoom's display level `L` —
  the trigger for a vassal's name.
- **The polity outlines** are in `core` (the year's rings, `editor/`), and the atlas already lays shapes on the relief
  through one projection (`scene/relief/drapeProjection`) — the event shadows' grids (`scene/events/shadows/`) are
  the model for a strip laid on it.
- `04-atlas-data.md`, « Labels & text », planned screen-space HTML labels, with big names « baked into the texture » —
  superseded for the polities' names by this plan; ATLAS-151 (Backlog) carries the HTML version — **the dev decides
  whether this ticket replaces it**.

## The method

1. **The space**: a polity's region at the display level — its own rings, minus its shown vassals' — shrunk inward by
   the **margin**. A polity in pieces (islands, enclaves) is named in its **largest piece**.
2. **The line**: the longest path through the middle of that space — its skeleton (medial axis), pruned to its main
   branch and smoothed into a gentle curve; a nearly round space gets a straight horizontal line through its most
   inner point. Reading direction: left to right, never upside down.
3. **The size**: each letter's real width measured (`CanvasRenderingContext2D.measureText`, in the chosen face and its
   letter spacing); a **binary search** on the size for the largest one whose whole band — the curve offset by half
   the letter height either side — stays inside the shrunk space.
4. **Collisions**: the largest names placed first; a smaller name that overlaps one already placed, or fits under a
   minimum size, is left out at this level and comes in closer.
5. **Fading**: every change of a name — shown, hidden, resized, moved when its vassals appear — is a cross-fade between
   its old and new strip, never a jump.

**References** — all **from memory, to be found and verified before step 1** (graded for §7 of the evidence plan):
- *polylabel* (Mapbox, ISC licence): the pole of inaccessibility of a polygon — the point farthest from its edges;
  the anchor for round spaces. *From memory.*
- Area names set along the skeleton of the area, a standard technique of automated cartography (curved labels in GIS
  and in game maps). *From memory; the source paper not recalled — to find.*
- `measureText` and the canvas text metrics. *From memory; check against MDN.*

## Steps — each verified and committed alone

1. **core — the placement, pure**: space (rings minus vassals, shrunk by the margin), skeleton line, size by binary
   search, collisions, the result per level. Tested with hand-written shapes: a rectangle (straight line, known
   size), an L and a crescent (bent line), two neighbours (no overlap), a suzerain with a vassal (its name moves
   into what is left). Text measurement **injected** (a fixed width per letter in tests), since `core` has no canvas.
2. **A bench on the dev's atlas server**: 1100's polities with their current formal names — long, so the hardest case
   for the fit — in the candidate faces, the ink and its blend tunable. **The dev picks the face and the ink there.**
3. **atlas — the layer**: one strip per name laid on the relief (each vertex at the ground's height, as the shadows'),
   its own crisp texture, multiply-blended, drawn between the borders and the events; names per display level, all
   changes faded.
4. **The short name per language**: a field in the registry (format), its input in the Cartographer's polity form, the
   atlas reading it — a polity without one is named nowhere, and said once in the console.

## Open, for the dev

- Does ATLAS-301 replace ATLAS-151 (straight HTML names)?
- Confirm the vassals' names follow the display level of ATLAS-253.
- Capitals, seas and cities are out of this plan.
