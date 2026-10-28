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
| The vassals' names follow the **display level** already used for their colours and borders (`vassal-lod.md`, ATLAS-253), so a vassal's name comes in at the same zoom as its colour | dev, 28/10 (Claude's inference of 27/10, confirmed) |
| **The bench's faces**: Uncial Antiqua, Felipa, Almendra, Caesar Dressing, Quintessential, Fondamento, Manufacturing Consent, Germania One (all OFL, Google Fonts) and Bulgaria Moderna (CC BY-NC, credited). **Norse and Syamsiah Arabic are out**, for their licences (no redistribution; personal use only) — no permission is asked for a face (*« il y en a d'autres qui ressemblent »*) | dev, 28/10 |
| **First look on the bench**: Fondamento, mixed case (capitals alone judged *« pas terrible »*), no extra spacing, the brown ink at **50 %**, multiply — to confirm on the atlas itself | dev, 28/10 |
| **Every separate piece** of a polity carries the name where it fits (its largest only, until then) | dev, 28/10 |
| **Two lines**: one line and two are compared in each piece; two are kept when they make the name larger by a **gain** (a bench slider), or when they alone bring it to the smallest size. Broken at the space that evens the two lines; **30 %** as the start is Claude's, to tune on sight; the gap between the lines, 0.3 letter at first, tightened to **0.15** by the dev on sight | dev, 28/10 (*« tu compares les deux cas et tu prends ta décision »*) |
| **Placed on a grid, not on outlines**: one distance field gives the margin, the most inner point and the fit; a cell's precision (a few km) | dev, 28/10, on Claude's proposal |
| A name descending steeper than **80°** is read from the bottom up | Claude's choice, 28/10 — to confirm on sight |
| **An order of preference** (replaces « the horizontal within 10 % »): straight across on one line; straight across on two, when they make the name larger by the *two-line gain*; along the shape on one line, when it makes it larger by the *shape gain* — the last resort; **never along the shape on two lines**. A setting under the smallest size is out, so the shape is taken whatever its price when straight across fits nowhere. Both gains are bench sliders; 30 % and 50 % are Claude's starts | dev, 28/10 (*« la verticale devrait être la dernière alternative »*) |
| **ATLAS-301 closes ATLAS-151** (straight HTML names, judged unsightly); the **capitals' names** go with the cities layer, ATLAS-295 | dev, 28/10 |

## What exists, measured 27/10

- **The names are already there**: `years/1100/registry.json` gives each of its 142 polities a `name`, written in the
  Cartographer. But it is the **formal name, in one language** (« Kingdom of England »): step 4 adds the short one.
- **Homage levels** (`core/editor/homageLevels`, ATLAS-253): each polity's depth and the zoom's display level `L` —
  the trigger for a vassal's name.
- **The polity outlines** are in `core` (the year's rings, `editor/`), and the atlas already lays shapes on the relief
  through one projection (`scene/relief/drapeProjection`) — the event shadows' grids (`scene/events/shadows/`) are
  the model for a strip laid on it.
- `04-atlas-data.md`, « Labels & text », planned screen-space HTML labels, with big names « baked into the texture » —
  superseded for the polities' names by this plan; ATLAS-151, the HTML version, closed by this ticket (28/10).

## The method — on a grid (28/10)

The plan first said polygon offset, a vector skeleton and polylabel; on 28/10 the dev chose a grid instead. Every
cell of a grid at the display level carries its **owner** (the polity wearing that colour there), so a suzerain's
space is what its shown vassals leave it, with nothing computed — and **two names can never overlap**, each
staying in its own owner's cells: the collision pass is gone.

1. **The space** (`core/pipeline/nameSpace`): the owner's largest piece, cropped with a ring of outside cells, so
   the map's frame counts as a border.
2. **The distances** (`core/geo/distanceTransform`): each cell's exact Euclidean distance to the outside.
3. **The line** (`core/pipeline/nameLine`): the horizontal through the most inner cell (the pole of
   inaccessibility, read off the distances), or the **ridge** — the longest walk through cells at least a
   threshold from the edge, between its two farthest ends, keeping to the thickest cells, fitted with a parabola
   bent 60° at most. Three thresholds (¼, ½, ¾ of the thickest) give three ridges.
4. **The size** (`core/pipeline/namePlacement`): halving for the largest size at which, across the line from the
   letters' foot to their top, at both ends and every point between, every point keeps the margin. The largest of
   the candidates wins, the horizontal kept within 10 %. Under `minSize`, the owner is returned as too small and
   comes in closer.
5. **Fading**: every change of a name is a cross-fade between its old and new strip, never a jump (step 3).

**References** — checked on 28/10, graded for §7 of the evidence plan:
- *polylabel* (Mapbox, ISC, 2.1.0): the pole of inaccessibility of a polygon, after Garcia-Castellanos & Lombardo
  2007 — https://github.com/mapbox/polylabel. *Found.* Not used: the grid gives it directly.
- Krumpe & Mendel, *Computing Curved Area Labels in Near-Real Time*, 2020, after Barrault 2001: curved area labels
  along a pruned skeleton, fitted to arcs — https://arxiv.org/abs/2001.02938. *Found, read from its abstract.*
- *A program for automatic name placement*, Auto-Carto 6: curved names bent 60° at most —
  https://cartogis.org/docs/proceedings/archive/auto-carto-6/pdf/a-program-for-automatic-name-placement.pdf.
  *Found, read from a summary.*
- Felzenszwalb & Huttenlocher, *Distance Transforms of Sampled Functions*, Theory of Computing 8 (2012) —
  https://theoryofcomputing.org/articles/v008a019/. *Found.*
- `TextMetrics` (`width`, `actualBoundingBox*`), Baseline widely available since 2015 —
  https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics. *Found.* The atlas must measure **after its face
  has loaded**, or every size is computed for the fallback face, with no error.

## Steps — each verified and committed alone

1. **core — the placement, pure** (done 28/10): space, distances, line, size by halving, the result per level. Tested with hand-written shapes: a rectangle (straight line, known
   size), an L and a crescent (bent line), two neighbours (no overlap), a suzerain with a vassal (its name moves
   into what is left). Text measurement **injected** (a fixed width per letter in tests), since `core` has no canvas.
2. **A bench on the dev's atlas server**: 1100's polities with their current formal names — long, so the hardest case
   for the fit — in the candidate faces, the ink and its blend tunable. **The dev picks the face and the ink there.**
3. **atlas — the layer**: one strip per name laid on the relief (each vertex at the ground's height, as the shadows'),
   its own crisp texture, multiply-blended, drawn between the borders and the events; names per display level, all
   changes faded.
   **Measured on 28/10** (1100, a 1200 × 1091 grid, formal names): **~1.8 s per display level** on the main thread —
   86 owners at level 0, 28 names placed. So the atlas places them **in the worker, once per year and level**, never on
   a zoom; the zoom only cross-fades between levels already placed.
   **Step 3a, done 28/10**: the compute's third job, `placeYearNames` (`core/pipeline/yearNames`), every level in one
   call; the page measures the characters into a table, and hands the bearers by level (`editor/regionBearers`).
   **For 3b, Claude's proposal (review ARCH-001, 28/10)**: the placement holds the worker ~2 s a level, and a bake
   asked meanwhile — a texture slider, the next year — would wait behind it. The names read none of the worker's
   installed state, so **a second worker for the names alone** costs nothing but its start; the result goes through
   the same « newest call wins » gate, so a year left before its names arrive never shows them.
4. **The short name per language**: a field in the registry (format), its input in the Cartographer's polity form, the
   atlas reading it — a polity without one is named nowhere, and said once in the console.
5. **The face cut to its letters** (the dev, 28/10, once the face is chosen): the shipped file holds only the letters
   the names use, cut at build from every name in the data. Measured on 28/10 with the French alphabet, capitals and
   accents: Fondamento 23 → 12 KB, Caesar Dressing 30 → 12 KB, Uncial Antiqua 20 → 11 KB. **The build fails when a
   name holds a letter the file lacks** — otherwise that letter is drawn in a fallback face and measured at its
   width, with no error.

## Out of this plan

- Capitals and cities (ATLAS-295), seas.
