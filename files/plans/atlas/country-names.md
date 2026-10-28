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
| **Placed on a grid, not on outlines**: one distance field gives the margin, the most inner point and the fit; a cell's precision (a few km) | dev, 28/10, on Claude's proposal |
| A name descending steeper than **80°** is read from the bottom up | Claude's choice, 28/10 — to confirm on sight |
| The horizontal is kept when it is **within 10 %** of the best curved size | Claude's choice, 28/10 — to confirm on sight |
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
4. **The short name per language**: a field in the registry (format), its input in the Cartographer's polity form, the
   atlas reading it — a polity without one is named nowhere, and said once in the console.

## Out of this plan

- Capitals and cities (ATLAS-295), seas.
