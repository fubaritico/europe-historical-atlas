# The gestures — what works in the Cartographer, and its traps

Read before the first click of a session, and again when a gesture does not behave as written. The dated record of
every session is [`journal.md`](journal.md) (local, never committed).

## Opening, aiming, seeing

- **Open a map**: `http://localhost:<port>/?map=<map>`. **Wait for the backdrop** (~10 s, only in the tab in front): a
  click or a wheel notch sent before is lost. Screenshot first, act after.
- **Show the cities**: in {Cities}, tick « Show all the cities of <year> » and « Show as points » — before any retouch
  (the dev, 2026-11-08: *"display those cities!"*). A ring round a point is its holder's colour.
- **Aim a polity** in {Polities}: type in its filter, click the row. **With the white arrow in hand, a click on empty
  ground un-aims it** — take tools from the rail (left), never by clicking the map to focus it.
- **Read the bar by script**, not by screenshot: `document.querySelector('.shell__status').textContent` (what a click
  will do, and the position) and `.shell__result` (what the last gesture did).
- **Calibrate**: hover two far-apart points, read the bar, then `scripts/screen.mjs` gives every target's pixel.
  Re-calibrate after every pan or zoom. The file's anchors, projected, are better targets than the eye.
- **Stay zoomed while drawing** (the dev, 2026-11-08): a pixel well under a kilometre (~0.6 km at 1891 %, ~0.25 km at
  4853 %); zoom out only to find your way. The wheel **drifts**: zoom, screenshot, re-calibrate.
- **Pan with the arrow keys** (one press ≈ 46 px), the canvas focused with the hand tool (‹space› or the rail).

## The Pen's roles — read the bar before every click

The Pen is free, follows a coast, follows a river, or sits on a neighbour's anchor, and **the role switches under the
pointer** (the dev: *"juggle with the role changes"*). Hover, wait a second, read the bar, then click — never batch a
click after a hover unread.

- **Two consecutive clicks on the same water or the same ring follow it** between them, the shorter way. Water wins
  over an anchor at the click.
- **A lake on a river's course turns it into « Following the coastline »** (the reservoirs of the Tagus, 2026-11-08):
  put one point on each lake's shore, or a free point between lakes; two clicks on one shore follow it.
- **A river cut in the data stops the follow without a word**: two names for one river (Tajo / Tejo), a gap of 150 m at a
  dam (Valdecañas). The result zone says « inserted N vertices from the X » after a follow — **no such line means a
  straight segment**. Click the last point before the cut and the first after it.
- **To leave a coast or a river, click beside it**; to keep a free stretch off a river it crosses, cross it between two
  clicks. Where two witnesses sit on either bank 1 km from a river, every point between them snaps: zoom further.
- **A run's start anchor on a coast is not a coast click**: click the coast once more just beside it.
- **‹Backspace›** takes back the last point; **‹Escape›** abandons the run; **‹⌘Z›** undoes a whole gesture.
- **Never cancel a gesture that did part of the job** (the dev, 2026-11-09: *"what is done is time gained, it can be
  iterated"*): finish it, then correct it with the next gesture.

## Retracing a border ‹R›

- Aim the polity, ‹R›, click one of its anchors, lay the run, hover another of its anchors: the bar says « replaces N
  anchors · X follows » (the neighbour takes the new run) or « X keeps its points » (a gap or an overlap appears).
  **Check N against the plan before the last click.**
- **A run that would take a neighbour's coast is refused** (« passes again through an anchor X keeps »): retrace the
  neighbour first — its border moves, yours keeps its points, a grey gap appears — then retrace yours **replaying the same
  clicks** on its new anchors. Measured on the Tagus and at Alzira, 2026-11-08.

## Where a land border meets the coast — the junction point (the dev's method, shown on Sardinia, 2026-11-08)

> *"Le but, c'est de créer un point qui soit décalé par rapport à la côte … ça te laisse aller où tu veux sur la côte
> rejoindre le point qui est dans les terres pour fermer ton tracé. Ensuite, la frontière du voisin, tu ramènes un de ses
> points et tu l'aimantes vers le point qui est sur la côte."* — *"il n'y a pas d'autre moyen"*.

1. **A point inland on the land border**, a few kilometres back from the shore: it is shared by both polities (inserted
   into their common border).
2. **The first polity's coast** is retraced from that point: to the shore, along it as far as needed, and back to its
   inland point at the other end. The old junction (Cliopatria's, often offshore) leaves with the run.
3. **The neighbour** is then joined on the shore: one of its border points welded onto the first polity's coast point —
   or, retraced from the same inland point, its first coast click lands on that coast point and the snap shares it.

**Make room first** (the dev, 2026-11-09): the inland point goes at **each end** of the predicted run, and the existing
path between them may be simplified before — fewer points near the shore leave room for the snap to land where meant.

Without the inland point the run cannot meet the old junction: it sits off the coast, and the retrace either refuses or
swallows the wrong side. The pilot (`scripts/pilot.js`) does it this way, and checks every retrace in the document.

## A messy path — simplify, or erase and draw again (the dev, 2026-11-09)

- **Points too close together**: delete them — two points a few hundred metres apart on a coast add nothing but traps
  for the snap.
- **A path too complex for the correction asked**: simplify it first (delete points), then correct.
- **A messy path — a coast, an island**: **never redraw over it**. Erase it and draw it again; that is often the
  simplest way.
- **An island to redraw: delete it, then draw it again** — never a retrace (the dev, 2026-11-09: *"ten times faster"*).
  The pilot does it in one call, `redo`: the old ring erased, the coast loop drawn with the Pen.

## A lake a border crosses (the dev's gesture, 2026-11-09)

1. **A point on the border at each side of the lake**, where the border meets the shore — inserted with the Pen.
2. **Delete the segment of path the two polities share** between those two points — the border over the water goes
   (the white arrow on the edge, CARTO-397).
3. **Outline the lake from one of the two points**: the Pen snaps on the lake's shore and follows it round, up to the
   shore point nearest the second one.
4. The two shore points this creates are snapped — they hold the second side when the other polity's part of the lake
   is outlined the same way.

The pilot's `crossLake` (2026-11-08) erases the border's edges over the water and closes each side along its shore; it
does not insert the two points on the shore first. Reported to the dev, lake by lake, before any series.

## Moving, deleting, giving

- **The snap merges points that are too close** (the dev, 2026-11-08): a click on an existing point reuses it — drawing
  never makes two points in one place. **A weld is a gesture of its own** (`s03`): aim the polity holding the anchor
  **but not the other one**, white arrow, drag it onto the neighbour's anchor — « welded onto X's anchor ». With the
  polity that holds both aimed, nothing welds: the release is a plain move (tried 2026-11-08, 95 m left apart).
- **Close a third polity's blade** (the dev's correction at Besalú, 2026-11-08): after a retrace or a carve, look for the
  thin strip a polity keeps between two of its own rings — `shape.mjs --against` lists them as « sliver » — and weld the
  neighbour's anchor onto yours, as above. **The import can**: 1100 had
  three segments between two anchors at one position (Cliopatria near Cuenca, the Natural Earth coast near Bruges),
  and they blind the spike measure there; `shape.mjs` names them.
- **Insert, then move — never in one drag**: the Pen inserts (« Inserting a point into X »), the white arrow drags.
- **Moving a shared anchor moves it for every polity holding it** — a three-polity junction dragged removes a sliver
  between them at once (Milagro, 2026-11-08).
- **Deleting an anchor** removes it from every ring; **deleting all of a ring's points** deletes that ring and leaves the
  points to the neighbours sharing them.
- **Giving a territory to another polity — the collateral polity first** (the dev's method, shown at Camarasa and
  Barcelona–Tortosa, 2026-11-08: *"le pays qui va subir une modification collatérale … il faut d'abord modifier ce pays,
  et après modifier le pays que tu avais l'intention de modifier"*). **Every gesture touches one polity**, so the tool
  has nothing to guess and nothing to refuse:
  1. **The polity that loses**, aimed: free the place — a retrace that pulls its border back, or, for a pocket inside
     it, the Pen round the zone and closed: the ring drawn a second time is a hole (grey, nobody's).
  2. **The polity that gains**, aimed: fill it **on the same points** — a retrace replaying the loser's new anchors, or
     the Pen clicking the hole's anchors in turn and closing.
  Never the other order: a retrace of the gainer that runs over the loser's border or coast is what failed for an
  hour on 2026-11-08 (Barcelona into Tortosa). « Reassign… » of `s03` is not built.
- **A new polity**: `[+]` at the foot of {Polities}; name, rank, status, dates, Wikidata id (it proposes the dates);
  « OK » hands over the Pen — ‹Escape› to put it down. **An existing one**: double-click its row.
- **After typing a Wikidata id — never « OK » before** (forgotten four times on 2026-11-08): « Replace » or « Agrees » on
  the name, then **« Use » on both dates**, unless our sources contradict one (then type ours — Cerdanya ends 1118, joined
  to Barcelona, not Wikidata's 1403 — and say so in the sources file). `scripts/registry.mjs` lists every polity with an id
  and no dates: run it at the end of every zone. A form left with empty dates may also take Wikidata's on « OK » by itself
  (Barcelona did): read the file after.
- **Type in the filter only after clicking it**: a filter not focused sends the letters to the map, where P, A, R and the
  space are tools.
- **An enclave** (walked 2026-11-08: El Castellar, Almenar, Pilzán; the dev's order at Camarasa): the host first — aim
  it, Pen, lay the outline round the city (a hexagon of the radius `enclaves.mjs` gives) and close: the ring drawn a
  second time is a hole. Then aim the holder, Pen, click the hole's anchors in turn and close. Only a vassal is carved by
  itself (`core/editor/carve.ts`); no tool carves a sovereign in one gesture.
- **A disputed zone**: the same outline, without carving the host — the overlap is the hatching.
- **A new outline on neighbours' anchors**: Pen, click their anchors in turn (two clicks on one ring follow it), close on
  the first (« Closing the outline of X »).

## Gotchas

- **A hidden tab does not draw** — every hover waits.
- **The screenshot's frame can change size** (1456 × 831, then 1400 × 840, on 2026-11-08) and the clicks follow the last
  screenshot's frame: after any screenshot of another size, re-calibrate on two hovers. Twice that day the view also
  changed zoom with no wheel sent — screenshot before the next batch of clicks.
- **River names are the dataset's**: `Schelde`, `Maas`, `Sane` (the Saône), `Tajo` then `Tejo`.
- **A coast click that inserts nothing is a straight line** across the cape it skipped: bisect the stretch.
- **Key text**: `Backspace`, `Delete`, `Escape`; ‹⌘› is `cmd`.
- **An option value starting with a minus** is written `--box=-10,35,1,44` (Node's argument parser).
