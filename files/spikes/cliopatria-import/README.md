# cliopatria-import — Cliopatria's polities as a Cartographer snapshot

**The question** (the dev, 2026-11-02, after seeing YearMaps, which runs on Cliopatria): *"we must be able to import
Cliopatria, and retouch it — otherwise it is not worth it."* Can its borders of a year open in the Cartographer, be
looked at over the atlas's backdrop, and be retouched?

**Cliopatria** — Seshat Global History Databank, https://github.com/Seshat-Global-History-Databank/cliopatria —
1,600+ polities, 3400 BCE → 2024, one GeoJSON, a Wikidata id per row, **CC BY 4.0** (`LICENSE.md`). Fetched into
`opensrc/` with `npx opensrc@0.6 --modify false Seshat-Global-History-Databank/cliopatria`.

## Run

```bash
unzip opensrc/repos/github.com/Seshat-Global-History-Databank/cliopatria/cliopatria.geojson.zip -d <somewhere>
packages/core/node_modules/.bin/tsx files/spikes/cliopatria-import/convert.ts <somewhere>/cliopatria_polities_only_v021.geojson 1100
```

It writes a snapshot into `packages/cartographer/.autosave/snapshots/` (git-ignored); in the Cartographer, « Open
snapshot » lists it. **Do not save after opening it**: ‹ctrl+s› would write Cliopatria over `years/1100/`. The
Cartographer keeps the page as a snapshot before opening one, so the dev's own state is never lost.

## What it does

- polity rows alive at the year, inside `years/index.json`'s box; grouping rows « (Kingdom of France) » and RELATION rows
  are not drawn — a group « (X) » holding a polity « X » makes X the suzerain of its other members;
- points equal to 1e-6° become one anchor, so a border Cliopatria's neighbours share is shared;
- outer rings only (holes dropped); coasts are Cliopatria's, coarse.

## First run, 1100 (2026-11-02)

| measured | value |
| --- | --- |
| polities | 106 (147 rows alive in 1100, groups and relations left out) |
| with a suzerain | 10 — the Kingdom of France's vassals |
| with a Wikidata id | 106 |
| anchors | 5,707, of which 1,803 shared by two polities or more |
| schema and `assembleAuthoredYear` | pass |

Against the dev's own 1100 (144 polities, 58,481 anchors): Cliopatria is **coarser** (Flanders in 15 points), has the Holy
Roman Empire as **one block** (no Bohemia, no marches), no Ireland, no Baltic peoples, no Caucasus lordships — but
details the Catalan counties, the Sardinian giudicati, the Rus' principalities, France's great vassals.

## What it would take to be the start of each century

- the borders not shared in Cliopatria rebuilt as shared (snapping near points, not only equal ones);
- the coasts replaced by the land mask's;
- a run per century, each a snapshot or a year folder of its own.

**The dev's look, 2026-11-02, in the Cartographer**: *"on the map there's just the coasts to redo — it's almost as precise as
what we had done; except that the only vassals are France's, there are no vassals for the other countries."*

## The « rubbish » the dev saw — measured on the snapshot, 2026-11-02

| what | measured | cause | remedy in the importer |
| --- | --- | --- | --- |
| **tracings in double** | Kievan Rus' is one large polygon **under** its principalities: Smolensk 100 % inside it, Chernigov 97 %, Peremyshl 95 %, Volhynia 89 %, Pereyaslavl 87 %, Kiev 81 % | Cliopatria draws the realm *and* its parts as polities alive the same year | a polity mostly covering others becomes their **suzerain**, its own outline dropped where they lie |
| **neighbours overlapping** | Anjou inside Maine 76 %, Duklja inside Serbia 68 %, Champagne inside Blois 57 %, Alpuente inside Albarracín 58 % | two tracings of one border, never reconciled | snap near points (not only equal ones), then cut the overlap to one side |
| **crumbs** | 37 rings under 50 km² in 22 polities — Kievan Rus' 5, the Kipchaks 4, Venice 3, Poland 3 | slivers left by the tracings, some real islets | drop the slivers; keep a ring that is land in the land mask |
| **out of the map's subject** | Kashmir, the Tibetans, the Chaulukya, Takrur, the Najahids | the atlas's box reaches 78.75°E and 11°N | a tighter box for the import |

**The cause of the stacking, found by the dev on YearMaps (2026-11-02)**: each row is one drawing valid for a period —
49 of the 139 valid in 1100 for more than a century (Kievan Rus' once for 1040-1235) — so a year picks up several epochs
stacked. **His rule, purely from the dates**: where two drawings overlap, the one whose period starts later wins.
`resolve.py` (shapely) applies it before `convert.ts`: 162 cuts, no polity vanished, **no pair left overlapping by more
than 2 % of the smaller** (measured on the snapshot `1100.2026-11-02T02-38-25Z`); a newer drawing ≥ 80 % inside an older
one names it suzerain — 21 vassals in all.

```bash
<venv>/bin/python files/spikes/cliopatria-import/resolve.py <cliopatria.geojson> <resolved.geojson> 1100
packages/core/node_modules/.bin/tsx files/spikes/cliopatria-import/convert.ts <resolved.geojson> 1100
```

**The coasts, 2026-11-02**: `resolve.py` with Natural Earth's 10m land and lakes (`files/spikes/fetch-land/out/`) cuts
every polity by the land minus the lakes, so coasts and islands are Natural Earth's; an island no polity covers goes to
the nearest polity within 30 km, farther it is left unclaimed and listed (1100: 1,389 such islands, 649 given, 740 left —
the Canaries, the Bissagos, far islets). Result: **57,229 anchors for 1100, 58,856 for 1200** — the dev's own 1100 had
58,481, so the speed test runs on maps as fine as his. Written to `years/1100/` and `years/1200/` (the dev's previous 1100
kept in `years/1100.dev-2026-11-01/`); both pass `assembleAuthoredYear`. **The dev cleans the coasts only** — the borders
are left to the cities' algorithm, if the speed test holds.

**Dropped the same afternoon** (the dev, 2026-11-02, 15:25: *"you cannot correct tracings with 50,000 points — it is
unplayable; I must draw the coasts myself"*): retouching Natural Earth's coasts in the Cartographer was ten times harder
than drawing over Cliopatria's coarse ones. `years/1100/` and `years/1200/` were re-exported **without the land and lakes
arguments** — `resolve.py` with the year only, then `convert.ts` — Cliopatria's own coasts: **5,489 anchors for 1100, 5,568
for 1200**. The Natural Earth versions are kept in `years/1100.cliopatria-natural-earth-2026-11-02/` and
`years/1200.cliopatria-natural-earth-2026-11-02/`. The coast step stays in `resolve.py`, used by nobody.

**Every dependency Cliopatria states**, every year: [`dependencies.md`](dependencies.md) — 344 in all, 216 between 500 and
1500. For 1100 only France's are there; the Holy Roman Empire's start in 1202 (Bohemia), 1260 (Bavaria, Brandenburg).

**Status**: first run judged by the dev — worth going on. Next: the coasts snapped to the land mask; the vassals of the
other countries.
