# Country names on the map — ATLAS-301 (2026-10-27, for 2026-10-28)

> The dev's request, 2026-10-27, from two references (a Crusader Kings III map, a YouTube map of 1501, both on the
> ticket as layout references, not sources): **each polity's name written inside the space it occupies, as large as
> that space allows**, laid on the map, bent along its shape. First goal: **see whether the principle works** (the
> dev: _« l'important déjà c'est de voir si le principe fonctionne »_).

## Decisions

| decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | by                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| The name sits in the polity's own space, **as large as the space allows**, measured from the text's real extent and the area available                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | dev, 27/10                                                                                                                               |
| **A margin between the text and the borders**, so a letter never touches one (_« il doit y avoir de la marge »_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | dev, 27/10                                                                                                                               |
| The ink is **not black**: a dark brown, partly transparent, **blended (multiply)** so the name takes on the polity's colour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | dev, 27/10                                                                                                                               |
| The lettering is chosen **on sight, on a bench**, among a few open-licence (OFL) faces — an uncial, Roman capitals, old-print small caps, a Carolingian hand if one exists under an open licence (_« peut-être une Caroline »_)                                                                                                                                                                                                                                                                                                                                                                                                                                                          | dev, 27/10                                                                                                                               |
| **When the direct vassals are shown**, each carries its own name in its own space, and the suzerain's name is **recomputed in the space left to it** (its territory minus its vassals')                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | dev, 27/10                                                                                                                               |
| **Everything changes by fading**: a name that appears, disappears, grows or moves fades, never jumps (_« tout apparaît en fondu, tout se rafraîchit en fondu »_)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | dev, 27/10                                                                                                                               |
| The short display name is **a field per language in the registry, entered in the Cartographer**; a polity without one carries no name, and the console says so                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | dev, 27/10 (_« on peut déjà faire comme ça »_)                                                                                           |
| **Not baked into a map-wide texture**: one strip per name laid on the relief, with its own texture — a map-wide bake blurs at zoom, as the baked coastline did (rejected 2026-09)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude's proposal, 27/10 — the dev asked for « comme un layer » between the borders and the events; the strip is that layer, drawn crisp |
| The names layer is drawn **between the borders and the events**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | dev, 27/10                                                                                                                               |
| The vassals' names follow the **display level** already used for their colours and borders (`vassal-lod.md`, ATLAS-253), so a vassal's name comes in at the same zoom as its colour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | dev, 28/10 (Claude's inference of 27/10, confirmed)                                                                                      |
| **The bench's faces**: Uncial Antiqua, Felipa, Almendra, Caesar Dressing, Quintessential, Fondamento, Manufacturing Consent, Germania One (all OFL, Google Fonts) and Bulgaria Moderna (CC BY-NC, credited). **Norse and Syamsiah Arabic are out**, for their licences (no redistribution; personal use only) — no permission is asked for a face (_« il y en a d'autres qui ressemblent »_)                                                                                                                                                                                                                                                                                             | dev, 28/10                                                                                                                               |
| **First look on the bench**: Fondamento, mixed case (capitals alone judged _« pas terrible »_), no extra spacing, the brown ink at **50 %**, multiply — to confirm on the atlas itself                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | dev, 28/10                                                                                                                               |
| **Every separate piece** of a polity carries the name where it fits (its largest only, until then)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | dev, 28/10                                                                                                                               |
| **Two lines**: one line and two are compared in each piece; two are kept when they make the name larger by a **gain** (a bench slider), or when they alone bring it to the smallest size. Broken at the space that evens the two lines; **30 %** as the start is Claude's, to tune on sight; the gap between the lines, 0.3 letter at first, tightened to **0.15** by the dev on sight                                                                                                                                                                                                                                                                                                   | dev, 28/10 (_« tu compares les deux cas et tu prends ta décision »_)                                                                     |
| **On the atlas, each name is a flat sheet at the height of the highest ground under it**, not draped: draped, the names bent over the hills past reading (Hungary, the Empire of the Romans) — _« des fois, ça l'est tellement qu'en fait, c'est illisible »_. The ink at **75 %** (_« moins de transparence »_), in **multiply** — the ordinary blend tried on the atlas, and multiply put back (_« remets un multiply »_)                                                                                                                                                                                                                                                              | dev, 28/10                                                                                                                               |
| **Placed on a grid, not on outlines**: one distance field gives the margin, the most inner point and the fit; a cell's precision (a few km)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | dev, 28/10, on Claude's proposal                                                                                                         |
| A name descending steeper than **80°** is read from the bottom up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Claude's choice, 28/10 — to confirm on sight                                                                                             |
| **An order of preference** (replaces « the horizontal within 10 % »): straight across on one line; straight across on two, when they make the name larger by the _two-line gain_; along the shape on one line, when it makes it larger by the _shape gain_ — the last resort; **never along the shape on two lines**. A setting under the smallest size is out, so the shape is taken whatever its price when straight across fits nowhere. Both gains are bench sliders; 30 % and 50 % are Claude's starts                                                                                                                                                                              | dev, 28/10 (_« la verticale devrait être la dernière alternative »_)                                                                     |
| **ATLAS-301 closes ATLAS-151** (straight HTML names, judged unsightly); the **capitals' names** go with the cities layer, ATLAS-295                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | dev, 28/10                                                                                                                               |
| **Short from afar, full close up**: each piece carries both forms; the short one gives way to the full one, by a fade, once the full one is readable on screen (_« je suis d'accord pour qu'il y ait des noms courts lorsque c'est dézoomé. Ça peut devenir les noms longs »_)                                                                                                                                                                                                                                                                                                                                                                                                           | dev, 28/10 night — the switch on screen size is Claude's mechanism                                                                       |
| **A name may spill over its borders a little** to be larger, as on the Crusader Kings capture (_« peut-être un peu déborder des fois pour pouvoir avoir des textes encore plus gros »_); the overflow is a panel setting, a spilling candidate paying the border weight. **1.75 cells, border weight 0.1** (_« agrandis le débordement, progressivement »_): at 4, England 8.4 → 11.2, Mide 5.1 → 9.5, Denmark 10.4 → 13.6, but judged too much on the map (_« 4 cellules c'est trop »_, then 3 and 2.5: _« réduis encore un tout petit peu »_, _« descends le débordement à deux »_, then 1.75 (29/10) — the islets' names spread over the sea); 6 measured worse (Denmark back to 6.7) | dev, 28/10 night — the steps measured by Claude                                                                                          |
| **Every name shows** (_« il faut qu'on arrive à tout afficher »_): no name is refused for its size any more — it shows once readable on screen — **8 px** an em, so most names show from the furthest zoom (_« qu'on puisse voir un maximum de choses tout de suite »_; 14 px first hid England there); the placement keeps a floor of **1.5 cells**                                                                                                                                                                                                                                                                                                                                     | dev, 28/10 night — the readability rule is Claude's                                                                                      |
| **The white edge from afar only, by the camera's zoom** (_« quand c'est complètement dézoomé, il y a un contour autour des textes. Et une fois que c'est zoomé, il n'y a plus de contours blancs »_): whole up to zoom 0.1, gone at 0.4 (Claude's starts), the same for every name — first tied to each name's size on screen, which kept it around small names close up. Its width is held inside the letter's tile (`HALO_MAX_EM`), or a small name sat in a white box                                                                                                                                                                                                                 | dev, 28/10 night                                                                                                                         |
| **Names come in by waves**: classes of size from one power of a ratio to the next (2.5 to start, Claude's: 1, 2.5, 6.25, 15.6 cells), each class at one zoom — one at a time, each name came in at its own (_« chaque label a son rythme d'apparition […] ça fait un peu bizarre »_); a panel setting, read every frame                                                                                                                                                                                                                                                                                                                                                                  | dev, 29/10 — the classes are Claude's proposal, _« ce sera plus cohérent »_                                                              |
| **A name spills over the sea and unclaimed land only, never onto a neighbour, nor past the map's frame** — the overlaps the dev showed came from names spilling into the next country (_« il faudrait que ça ne se chevauche pas »_)                                                                                                                                                                                                                                                                                                                                                                                                                                                     | dev, 29/10, on Claude's proposal                                                                                                         |
| **Three forms of a name, two by zoom**: the name from afar, the full name close up (_« deux niveaux de nom, et puis voilà »_, seeing « DAN » written large over the Danishmendids when the abbreviation was a zoom of its own); **the abbreviation only where the name fits nowhere** (_« nom abrégé. Surtout pour les petits vassaux »_), provisionally the short name's first three letters (_« voire même les trois premières lettres »_), to be entered in the Cartographer with the short name (step 4)                                                                                                                                                                             | dev, 29/10                                                                                                                               |
| **No name over another**: each name placed marks its cells, its white edge's half cell included; a later name keeps off every other piece's cells (its own piece's other forms excepted), smaller or on another line, the largest pieces first, the names before the abbreviations, the full names last (`core/pipeline/nameOccupancy`)                                                                                                                                                                                                                                                                                                                                                  | dev, 29/10, on Claude's proposal — the order is Claude's                                                                                 |
| **The rule, as it stands (supersedes the readability, the waves, the abbreviation and the forms by zoom above)**: each piece carries **one** name — its full name where it reaches 4 cells, its short name otherwise, the short name being the full one with its title cut to initials (« K. of France », « Zirid E. of Ifriqiya »; a name with no title stays whole); **no abbreviation, nothing progressive**: a level shows all its names at once, the sovereigns from afar, everyone as soon as the vassals show (_« je veux des noms, qu'on lit, qu'on comprend »_, _« dès que les vassaux ils apparaissent, tout apparaît »_)                                                      | dev, 29/10                                                                                                                               |
| **A watermark at the closest zoom**: over the last steps of the zoom (from 0.85, Claude's start) every name fades to **40 %** of its opacity (50 % first, then *« un peu plus de transparence au zoom complet »*), their blur its own and lighter than the borders' (0.6 px), ink and white edge alike, so the cities' dots and names can come over them (*« il faudrait limite qu'on n'ait que les noms en filigrane […] commençons à cinquante pour cent »*) | dev, 29/10 |
| **A polity with no short name shows its name without its title** (« France »), and the console lists it — *« faut afficher les informations, c'est primordial »*; supersedes « a polity without one carries no name » above. The short name itself is entered in the Cartographer, CARTO-307 | dev, 29/10 midday |
| **The name as it is written**, capitals and small letters, never forced to capitals; a little more line spacing if a name ever takes two lines — the aim being one line | dev, 29/10 midday (*« on essaye comme ça d'abord, on regarde ensuite, on décide »*) |
| **The construction of « The gap to the reference » is the next work** (axes A → F), measured on six shapes of 1100 frozen as a fixture | dev, 29/10 midday (*« je te laisse la main »*) |
| **The centring weight stays at 1**: proposed lower for Norway, measured useless once the overflow came — Norway's mainland went from 5.5 to 17.5 by the overflow alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Claude, 28/10 night, measured                                                                                                            |

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

- _polylabel_ (Mapbox, ISC, 2.1.0): the pole of inaccessibility of a polygon, after Garcia-Castellanos & Lombardo
  2007 — https://github.com/mapbox/polylabel. _Found._ Not used: the grid gives it directly.
- Krumpe & Mendel, _Computing Curved Area Labels in Near-Real Time_, 2020, after Barrault 2001: curved area labels
  along a pruned skeleton, fitted to arcs — https://arxiv.org/abs/2001.02938. _Found, read from its abstract._
- _A program for automatic name placement_, Auto-Carto 6: curved names bent 60° at most —
  https://cartogis.org/docs/proceedings/archive/auto-carto-6/pdf/a-program-for-automatic-name-placement.pdf.
  _Found, read from a summary._
- Felzenszwalb & Huttenlocher, _Distance Transforms of Sampled Functions_, Theory of Computing 8 (2012) —
  https://theoryofcomputing.org/articles/v008a019/. _Found._
- `TextMetrics` (`width`, `actualBoundingBox*`), Baseline widely available since 2015 —
  https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics. _Found._ The atlas must measure **after its face
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
   **The lesson of 28–29/10, for the contribution** (the dev, 29/10: _« quand on va contribuer, on va suivre l'exemple
   de Crusader Kings avec des noms plus courts, comme ça ce sera beaucoup plus facile »_): a polity is entered with a
   short display name from the start, as Crusader Kings III names its realms — the night spent on rules that cut and
   abbreviate formal names (« Kingdom of France » → « K. of France ») is what a short name written by the contributor
   avoids. Until then, the title cut to its initials stands in (`loading/stages/names.ts`, `provisionalShortName`).
5. **The face cut to its letters** (the dev, 28/10, once the face is chosen): the shipped file holds only the letters
   the names use, cut at build from every name in the data. Measured on 28/10 with the French alphabet, capitals and
   accents: Fondamento 23 → 12 KB, Caesar Dressing 30 → 12 KB, Uncial Antiqua 20 → 11 KB. **The build fails when a
   name holds a letter the file lacks** — otherwise that letter is drawn in a fallback face and measured at its
   width, with no error.

## Out of this plan

- Capitals and cities (ATLAS-295), seas.

## The gap to the reference — read on 2026-10-29, 4 am (Fable, at the dev's request)

> The dev, 29/10: Opus went round in circles on the names, each retouch bringing a side effect; the only lead was
> shorter names. He asked for a fresh reading of the two captures on ATLAS-301, of the atlas as it stands, and of the
> algorithm. Nothing here is coded; it is what to build next, with the reason for each line.

**What the reference does, always the same way** (the Crusader Kings III capture; the 1501 map confirms it). One name per
realm, in spaced capitals, on **one gentle arc along the realm's length**; the letters' **height comes from the realm's
thickness**, their **spread from the letter-spacing**, which covers 70–90 % of the length — CUMANIA across the whole
steppe, SELJUK, SONG. BYZANTINE EMPIRE **crosses the Aegean** from one end of the realm to the other. FRANCE, NORWAY,
ENGLAND are read **standing**, bottom to top. OTTOMAN EMPIRE (1501) bends 90° round the Marmara, GREAT HORDE slants 50°.
**Never two lines.** A small realm has a small name, or none at that zoom. And the names are short: POLAND, HUNGARY,
FATIMID — no « Kingdom of » anywhere at the sovereigns' level.

**What the atlas does today** (zoomed out, 1100): EMPIRE OF THE ROMANS horizontal and small in the Balkan part alone —
the Aegean splits the realm into two pieces, each named apart; CUMANS covers a quarter of the steppe; KINGDOM OF
GEORGIA, DUKLJA, PRINCIPALITY OF CHERNIGOV, LORDSHIP OF PEREYASLAV over two lines; KINGDOM OF HUNGARY roughly follows
its basin; almost no arc; sizes alike everywhere, with no clear relation to the area.

**Why — five differences of construction, not of tuning** (`core/pipeline/nameCandidates`, `nameFit`, `nameChoice`,
`nameArc`, `nameSpace`):

1. **The name's length is chained to its size.** Tracking is fixed (0.12 em); to cover the shape the name must grow, and
   the size is bounded by the thinnest crossing on its line, by the margin and by a 30-cell cap (`maxSize`). Hence a
   short name in the middle of a long shape. In CK height and length are **two variables**: the height from the
   thickness, the spacing stretched to fill the arc.
2. **A name's space is the realm's land, not its hull.** A crescent's arc (Byzantium round the Aegean) runs through the
   sea; the sea is *outside* (the overflow allowed is 1.75 cells, the Aegean is a hundred): the arc candidate dies at
   size 0, the horizontal stops at the coast, and the Bosphorus cuts the realm into two pieces, each named. CK names the
   realm **once**, on its hull, sea included.
3. **The seven-weight comparison** (`scoreName`: size, centre, cover, bend, slant, border, two lines). Size dominates
   (weight 1, relative to the largest candidate), so the winner is whichever line avoids the thin crossings — the
   horizontal through the fat part, or two lines. Each shape picks a different winner by a hair: hence the mix of
   horizontal / slanted / two-line names **and the side effects** — a weight moved reshuffles the winners map-wide.
   That is the mechanism behind the circling. CK has **no competition**: one deterministic construction, three
   parameters.
4. **Two lines** — never in CK; here allowed whenever they enlarge the name, which kills the arc and the regularity.
5. **The shape is penalised for what CK does**: bend (0.2) and slant (0.3) are maluses; in CK the curve follows the
   shape and a standing name is ordinary.

The dev's lead — shorter names — is right but second: the registry's short name (step 4) is the real answer, and until
then « France » rather than « K. of France » (an abbreviation, which he refused). Alone it will not do: CUMANS is
already short and covers a quarter.

**The axes, in order:**

- **A. One construction, no competition.** Per realm, the axis arc (`nameArc`: principal axis of the cells, a parabola on
  the spine, bend ≤ 60°); the horizontal is its special case for a compact shape. The seven weights go; what stays are
  hard rules (fits / does not; readable / not).
- **B. Height and length decoupled.** Height = a share (≈ 0.6) of the median land thickness along the arc (the room
  across, `nameFit.roomAcross`, read over the middle of the arc), with no 30-cell cap or a far higher one; length =
  the tracking stretched between two bounds (0 to ≈ 0.6 em) to cover ≈ 75 % of the arc; the height yields to the length
  only when, at the least tracking, the name outruns the arc.
- **C. The space is the realm's hull.** The arc may cross the sea and unclaimed land — bounded by neighbours and other
  names only (`Fitting.bound`, `covered`), no longer by `edge`; pieces of one realm parted by a strait are **one** space
  to name (merge pieces whose hulls lie within a few cells); a far piece (Norway's Iceland) is named only above a share
  of the largest (≈ 20 %).
- **D. No two lines** — or only for a compact shape (aspect < 1.5) and a long name.
- **E. The short name by default at the sovereigns' level**, the full one for the panel; until step 4, the title stripped
  (« France »), not abbreviated.
- **F. Standing reading past 80°** already exists (`STEEPEST_DESCENT`) and becomes ordinary once the slant malus is gone.

**How not to circle tomorrow.** Freeze six shapes of 1100 as a fixture — Byzantium (a crescent round a sea), the Cumans
(wide), France (compact), Norway (long and standing), Hungary (a basin), a small duchy — with the expected properties as
tests (cover ≥ 0.6, bend ≤ 60°, one line, size monotonic in thickness), and the bench `/names.html` for the eye. **A
construction with three parameters has no side effects; a score with seven weights has them by nature.** Every change is
measured on the six before it is kept.

## The construction, as built — 29/10, afternoon

Axes A to F coded on the dev's « je te laisse la main », measured on the fixture first: six countries of 1100 frozen by
`files/spikes/name-fixture/build-fixture.ts` into `core/src/pipeline/testing/names1100.json` (the owner grid the atlas
places on, cropped with the neighbours), their properties asserted in `namePlacement.fixture.test.ts`, and a probe
(`files/spikes/name-fixture/measure.ts`) printing each country's name, size, cover, turn, lines and places.

- **Realms** (`nameRealm`, axis C): a country's pieces parted by a strait of 12 cells or less (~100 km) are one realm,
  the sea between them open to the letters; a far realm is named from a fifth of the largest **or from 2 000 cells**
  — the second rule is Claude's, found on the fixture: 1100 gives Norway Greenland (72 946 cells), its mainland
  (11 299, larger than France) was under a fifth of it.
- **One construction** (`nameConstruction`, axes A, B, D): the arc along the realm (aspect ≥ 1.4) or the horizontal
  (compact); letters 0.6 of the median thickness on land over the line's middle; spacing stretched to cover 0.75 of
  the line, 0.6 em at most; a long name set smaller to cover 0.9 at most, unspaced; shrunk by 8 % until the letters
  keep off neighbours (a cell's bite) and other names. **No weight, no candidate, never two lines.**
- **Removed**: `nameCandidates`, `nameChoice` (the seven weights), `nameBreak` (two lines), the ridge walk, the size
  search, the margin and the overflow settings.
- **The names** (axis E): the short form is the formal name without its title — « France », « Kievan Rus » — never
  an abbreviation; the full one where it reaches 4 cells. No capitals by default. The registry's own short name is
  CARTO-307.

**Measured on the fixture** (letters 0.55 em, the defaults; `files/spikes/name-fixture/measure.ts`):

| country | before: size, cover, places | after: size, cover, turn, places |
| --- | --- | --- |
| Byzantium | 7.4, 0.36, 5 | 16.3, 0.69, 39°, 1 |
| Cumans | 18.5, 0.67, 1 | 19.9, 0.77, 17°, 1 |
| France | 5.6, 0.50, 1 | 11.7, 0.84, 32°, 1 |
| Norway | 30 on Greenland, 55 places | its mainland, Iceland and Greenland, 3 places |
| Hungary | 8.3, 0.87, 1 | 10.2, 0.87, 50°, 1 |
| Brittany | 4.7, two lines | 8, 0.83, 46°, one line |

## The dev's look on the map — 29/10, 15:40

*« C'est beaucoup mieux »*, then four screenshots. Three compact countries written straight across and small (the Holy
Roman Empire, England, Novgorod lost at the top), and Byzantium's name over Rum, which could not be named. Pomerania's
name over the Liutizians, seen the same way: *« c'est exactement la même chose »*.

- **The cause of the fourth, a defect of 29/10, morning**: the distance to a neighbour was unsigned, so every cell inside
  one read half a cell from its edge, and a bite of one cell let a name cross a neighbour whole. Signed now, as the
  coast's: a bite lets a letter in by its depth, never across (`nameFit.boundOf`).
- **The line is cut where it enters a neighbour or a name already written**, the longest stretch kept
  (`nameConstruction.nameLineOf`): Byzantium is written west of Rum, Rum gets its own name.
- **A compact realm is written on its arc too, its axis and its spine's lean held to 45°** (`COMPACT_SLANT`, Claude's
  choice, to judge on the map): the horizontal through its middle ran short — cut by Novgorod's lakes, by the narrow row
  through England's centre — and the long names were set small to fit it.
- **The thickness is read over the middle of the land the line crosses**, not the middle of the line (16:02, Denmark
  *« tout petit »*): Denmark's line runs from Jutland over Funen and the Belts to Zealand, its middle read the islands,
  3 cells thick, for a land 11 to 16. Over the whole line instead, Denmark grew but seven others shrank (the Fatimids
  19.8 → 14.9); over the land's middle, Denmark alone moved more than a tenth.
- **The bite is three cells** (one at first): with the bite bounded, one cell left Aquitaine, Valencia and Strathclyde
  unnamed; three leave only Gwynedd among the vassals.

**Measured on all of 1100** (`files/spikes/name-fixture/year.ts`, every level, before → after):

| country | before | after |
| --- | --- | --- |
| Holy Roman Empire | 9.7, straight across | 14.1, 46° |
| Novgorod | 7.3, straight across | 16, 45° |
| England | 4.2, straight across | 5.8, 45° |
| Byzantium | 16.3, over Rum | 12.4, west of Rum |
| Rum | not named | 12.8 |
| Cumans | 19.9 | 14.3 — the big size crossed its neighbours |
| Kievan Rus | 10.5 | 4.1 — same |
| Denmark | 1.9 | 5.4 |
| names written | 320 | 332: six countries gain a name, Gwynedd loses it among the vassals |

## The names that find no room — 29/10, evening

The console listed twelve countries named at no level (ATLAS-310). Placed alone, with no other name, they fall in three
groups: **too long** for their line (Mzab, Scrobbesbyrig — a short name entered saves them, the dev's); **too small**
even for a short name, all coastal (Naples, Amalfi, Ragusa, Genoa, Dublin, Roussillon — the **offset label**, on the
sea, to come); **crowded**: they fit alone, but larger neighbours' names, placed first, take their room (Merseburg,
Hereford, Alpuente, Aragon and Navarre).

The order of placement was measured first, on all 335 names of 1100 (`files/spikes/name-fixture/year.ts`):

| variant | names | gained | lost | shrunk by more than 15 % |
| --- | --- | --- | --- | --- |
| today, largest first | 335 | — | — | — |
| smallest first | 343 | 6 | Deheubarth, Zachlumia | 26 — Brittany 8 → 3.2 |
| under 60 / 120 / 250 cells first | 339 / 339 / 343 | 3 / 4 / 6 | 1 / 2 / 2 | 8 / 15 / 19 |
| **the line over the land left free**, largest first | **341** | **Gwynedd, Merseburg, State of the Church** | **none** | **none** |
| smallest first, line over free land | 347 | 6 | none | 23 — Brittany 8 → 3.3 |
| smallest first, no bite | 326 | 4 | 8 — Toulouse, Venice, Rum… | 71 |

**Kept: the line over the land the names already written leave free** (the dev's *« décaler le nom […] plutôt que le
rétrécir sur place »*), **tried beside the line over the whole land, the name taking the one it is written largest on**
(`nameConstruction.nameLinesOf`). The free line alone made the Strathclyde lose its name in the dev's atlas — real
letter widths, which the probe does not have — and shrank 15 names by 5 to 10 % on the probe; both lines together:
350 names instead of 344 (with the dev's short names of the evening), Scrobbesbyrig, Merseburg and the State of the
Church gained, none lost, none shrunk by 5 %. Reordering only changes who loses the room; the bite is needed. Left for the offset label: the six coastal countries, then the three
crowded inland ones, with a leader line.

**The offset label, on the sea — built the same evening** (ATLAS-315, `nameOffset`): a realm named in none of its
pieces gets its short name straight on the open ground nearest it, its middle within two letter heights of its land, at
2.5 cells at most (4 at first — *« réduis la taille de ces textes »*; the panel's `offsetSize`), placed after every
other name so it takes no one's room. The dev's console after it: Alpuente and Hereford only. Measured: Naples,
Amalfi, Ragusa, Genoa, Dublin, the Roussillon, Gwynedd and the Obotrites named, no other name moved, the placement
3 → 4.7 s under Node. Left for the leader line: Hereford, Alpuente, Aragon and Navarre, Cilician Armenia,
Blois-Champagne — no open ground that near.

