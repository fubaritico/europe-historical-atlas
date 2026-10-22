# 06 — Contribution tooling: owning the content

> Chapter of the [roadmap](../roadmap.md). Designed 2026-09-16 with the dev.
> **This chapter evolves chapter [04](../atlas/04-atlas-data.md), it does not replace it.** Read that one first.

> ## ⚠ Four things below were reversed after this chapter was written
>
> Annotated rather than rewritten, on purpose: **the trail of a reversal is worth more than a clean
> document**. What follows still holds except on these four points.
>
> | what this chapter says                                                          | what was decided since                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
> | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
> | the georeferenced **watermark** under the canvas — _"c'est ça, le Cartographe"_ | **Dead, 2026-09-22.** Replaced by **reporting by eye**: the contributor reads a reference and reports the fact. It is what makes Duby and Euratlas usable again — reporting a fact is not copying a plate. And it was measured: a 1:10M plate, georeferenced, lands at 3–5 km when our own cells are 1.9 km. **The watermark is coarser than the grid.** The default backdrop is the atlas's own baked texture — georeferenced by construction, zero registration error. |
> | the **`fetch-atlas` POC**, flagged ultra-important 2026-09-17                   | **Off the critical path**, by the same reversal.                                                                                                                                                                                                                                                                                                                                                                                                                         |
> | the century chosen is **1500**                                                  | **1100**, measured 2026-09-22: OHM assembles 51 of 52 polities at 98.1 %, median **108 vertices**, and the **Kingdom of France has no geometry at all** — identity only. For the century and the country at the heart of the project, OHM gives the name and nothing of the ground.                                                                                                                                                                                      |
> | **Tool A is called "Studio"**                                                   | **That name was this document's invention, never the dev's.** What the dev named is **Payload**. The tool is referred to by what it holds — places and events — until it is named on purpose.                                                                                                                                                                                                                                                                            |
>
> **And one thing narrowed rather than reversed**: Tool A was planned for identity _and_ events. Since
> the format decision of 2026-09-22, **identity lives in `registry.json`**, edited from the Cartographer.
> Places and events are untouched and still required. Contribution therefore has **three surfaces**, not
> two: territory · identity · places and events. See [`../plan.md`](../plan.md).

## Raison d'être — from consumer to owner

Today the atlas is a **read-only consumer** of someone else's history: it downloads a century of borders,
projects it, paints it. Every limit of that dataset becomes a limit of the atlas — its granularity, its
naming, its polities, its licence. Chapter 04 was right for that stage.

What changes is the ambition: **be able to own our own content**, while still _starting_ from what we can
download. Not "draw Europe from a blank page" — **download, read, edit, and from then on the result is
ours**. Three consequences:

1. Anything we can load, we must be able to **re-open and edit**, and the tool must round-trip its own
   output losslessly. An editor that only exports is a sketchpad.
2. The editorial decisions — which polities exist, at what granularity, under what names — stop being
   inherited and become ours.
3. **Licensing becomes a property of the dataset, not of the tool.** The tooling is source-agnostic; what
   we may redistribute depends on what we chose to import. See the open question at the end.

## What this changes vs chapter 04 (the nuance)

Chapter 04 already planned a **derived rasterised ID-map** (EU4 `provinces.bmp` style) generated from the
vector source for O(1) picking and GPU highlight. That stays. The evolution is narrow but decisive:

| Chapter 04                                                    | This chapter                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Vector GeoJSON = source of truth, raster = derived, throwaway | Vector GeoJSON = **interchange** format (import _and_ export); the raster becomes the **working, editable, owned** format |
| ID-map regenerated from the vectors                           | The grid is authored **on top of** what the import produced, and is itself archived                                       |
| Borders = polygon outlines                                    | Borders = **derived from the grid**, never authored (see below)                                                           |

Everything keyed by **lon/lat WGS84** at rest, as chapter 04 mandates. The grid is the one exception and
it carries its own `bbox` + size in its header — like `europe-dem-z5.json` and `europe-land.json` already
do — so a change of extent costs a resample, not a loss.

## Three concepts, not two

The current border bug (`known-issues.md`) is the proof that splitting territory and border into two
authored objects does not hold: fills come from the raster, borders come from the rings
(`main.ts:342-353`), and `expandRegionsOverLand` guarantees the two never coincide where it grew a claim.

- **Identity** — who exists: name, aliases, hierarchy (`subjectTo` / `partOf`), colour, existence
  interval. Independent of geography _and_ of any single year.
- **Territory** — which cells belong to whom at year T. The painting.
- **Border** — **derived**, never authored. A border is not an object, it is the relation "these two
  territories touch". Deriving it makes it gapless by construction and makes it follow the fills exactly.

There is therefore **no border editor**. There is a registry and a brush.

**Payoff**: the "empires" view is free — colour by `partOf`/`subjectTo` instead of by polity on the same
grid, and the derived borders keep only those separating two empires; internal ones vanish on their own.
**Caveat measured later in this chapter**: free _given the hierarchy_, and OpenHistoricalMap does not
supply one (0.7 % fill rate). The hierarchy is ours to hold in the registry (`registry.json` since 2026-09-22) — derivable from the
Wikidata ids OHM does carry.

**Known limits, accepted**: (a) annotating a border ("the Rhine frontier", disputed, fortified) is an
_attribute attached to a derived segment_, keyed by the pair of polities it separates — not an editable
geometry; (b) a grid cannot express overlapping claims (condominium, contested zone). Vassalage is
expressed through the identity hierarchy instead, as historical atlases and strategy games do. True
contested zones would need a second claims layer — deliberately deferred.

## Tool A — places & events (Payload)

> ⚠ **Renamed 2026-09-24.** "Studio" was this document's invention, never the dev's — only *Payload*
> was. And **identity left this tool**: it lives in `registry.json`, edited from the Cartographer. What
> stays here is places and events, which are still required.

**Raison d'être**: everything textual and relational. A CMS is the right tool for it, and it is the part
the dev wants to sit down and _type_ into.

**It holds the polity registry too** — a polity's identity (name, aliases, hierarchy, colour, existence
interval, Wikidata id) is relational text content. Putting it in Payload means no custom CRUD app to
build; the Cartographer reads the registry from it.

**Ingredients**

- Payload + a relational DB. Collections:
  - `Polity` — name, aliases[], `subjectTo` (rel), `partOf` (rel), colour, `existsFrom`/`existsTo`,
    `wikidataId`.
  - `EventType` — the taxonomy (battle, treaty, invention, foundation, siege…), so two events at the same
    place can be told apart.
  - `Event` — title, `type` (rel), **date interval** (not an instant: a battle lasts days, a war decades),
    `location` (point, lon/lat WGS84), rich-text description, `actors[]`, `consequences`,
    `relatedPolities[]`, `wikidataId`, `sources[]`.
  - `Actor`, `Source`.
- **Wikidata Q-ids as first-class fields, not links buried in rich text.** A Q-id is queryable, gives the
  Wikipedia link in any language, plus coordinates and dates, and is CC0. It also opens **seeding by
  SPARQL** (e.g. all European battles with coordinates and dates), turning authoring into curation
  instead of data entry.
- **Export step**: a build task dumps the collections to static JSON. The atlas consumes it through a
  `ContentSource` port (`fetchJsonContent` in prod, `payloadRestContent` in dev, `mockContent` in tests).
  **Payload never leaks into the atlas's `src/` and never runs at runtime** — the published app stays a
  static build with no server and no database.

**To verify before committing** (not assumed): Payload's current major and whether it requires a Next.js
host; available DB adapters (Postgres / SQLite for local-only authoring); confirmation that there is no
polygon field type — which is _why_ geometry lives in Tool B. **Checked 2026-10-22 — CONTRIB-218: `../contribution/payload-check.md`** (3.92.0, Next required, SQLite stores a point, no polygon field, the admin customisable throughout).

## Tool B — **Cartographer** (2D canvas): territory

**Raison d'être**: the one thing a CMS cannot do. Paint who owns what, at a given date, against exactly
the same basemap the atlas renders.

**The decisive property**: painting is clipped by `data/landMask`, so **every maritime border is exactly
the coastline, for free, always** — on a map of Europe that is most of the border linework. Vector
editing would mean re-tracing the coast for every coastal polity, and it would never quite match.

**Ingredients**

- Vite + TS, **2D canvas, no three.js** — a flat Mercator editing surface needs no 3D.
- Shared from `@europe-historical-atlas/core`: `geo/mercator`, the land-mask and DEM loaders, `coastlineSource`,
  the region raster operations.
- **Backdrop layers** (toggleable): land/sea from the mask, the coastline, a faint DEM hillshade, a
  graticule, and an optional **reference overlay** — an imported dataset shown underneath while painting.
- **Tools**: brush (size), flood fill bounded by the coast and by existing owners, eraser, polygon fill
  (draw an outline, fill its interior — speed without topology), eyedropper, undo/redo.
- **Snapshot management**: open year T, **seed from year T−1** and paint only the delta (this is what makes
  twenty-one centuries tractable), plus a diff view against the seed.
- **Import**: any GeoJSON/`RegionPayload` → rasterised into the grid, then editable. This is the "download,
  read, edit" path.
- **Export**: the grid (archived), plus derived artefacts — borders by marching-squares contouring
  (the coastline code already does this) smoothed with Chaikin, and label anchors by **pole of
  inaccessibility**, not centroid (a centroid of a crescent-shaped state falls outside it).
- **Resolution**: 2× the DEM (2560×2328 ≈ 6 M cells, ~12 MB as `Uint16`) gives ~3.8 km cells at 45°N;
  4× (~1.9 km) if micro-states demand it. Rendered through `ImageData` + a palette, repainting dirty
  rectangles only.
- **Registry binding**: choose a polity from the registry (`registry.json`), then paint. The palette index → polity id
  mapping is a sidecar, so recolouring never touches the grid.

## Formats & the round trip

```
download (GeoJSON lon/lat)  →  rasterise  →  [ TerritoryGrid: indexed cells + header{bbox,w,h} + sidecar{index → polityId} ]
                                                  ↑ edit, re-open, edit again (lossless)
                                                  ↓ derive
                                   borders (contour + Chaikin) · label anchors · picking ID-map
                                                  ↓ export
                                        GeoJSON lon/lat  (archival, projection-independent)
```

Lon/lat remains the archival and interchange format. The grid is the working format, and it is
self-describing so it survives a change of extent.

## Monorepo — the trigger has arrived

`rules/troubleshooting.md` recorded the rule: stay single-package, go **pnpm workspaces + Turbo** (not
Lerna/Nx) "only when a real seam needs it — the first candidate is a pure-TS `@europe-historical-atlas/core`
reusable/testable without three.js". Three apps sharing projection and data logic **is** that seam.

```
apps/atlas          # the three.js viewer — the only thing published, static build
apps/studio         # Payload: identity + events — authoring only
apps/cartographer   # canvas territory painter — authoring only
packages/core       # pure TS, zero three.js: geo/mercator, data ports & types,
                    # raster ops (rasterise/expand/contour), utils/math, utils/hash
```

The migration is mechanical (the ESLint layer boundaries already enforce the direction of dependencies)
but it is **not free**: tooling config, husky, Vitest projects and the CI gate all move. Do it when the
second app actually exists, not before.

## Consequence for M1.4 picking

The dev's contribution scenarios ("remove an event, add an event, make two events of different natures
coincide at the same place") change what a click returns. The target is **not a polygon**: it is a
**spatial query** returning a _list_ of events within a screen-space radius, filtered by the current date
and distinguishable by `EventType`. Cheap to design in now, expensive to retrofit.

## Proposed order of work

1. ~~Spike: OHM ingest~~ — **DONE 2026-09-16**, [`files/spikes/fetch-ohm`](../../spikes/fetch-ohm/).
   Assembly 98.8 % at 1700, zero unclosed rings; coverage good from ~1700, unusable at 1500.
2. **PoC, one year only**: open → paint → save → re-open identical → the 3D atlas renders it. Prove the
   round trip before investing in tooling for twenty-one centuries. Pick **1700** — the ingest is proven
   there, so the PoC tests the _editor_, not the source.
3. Extract `packages/core` + move to pnpm workspaces (triggered by the PoC needing the shared code).
4. Stand up Payload for places and events (schema first — the schema is the real work and is tool-independent).
5. Derived borders replace the ring-based ones in the atlas → closes the interrupted-borders issue.

## Data sourcing — researched 2026-09-16 (primary sources, measured)

### The licence problem, restated precisely

`historical-basemaps` is confirmed **GPL-3.0** — not from the README (which states no licence at all) but
from GitHub's own licence detection on the repository: `spdx_id: GPL-3.0`.

What GPLv3 actually says, verbatim, matters here:

- §0 — _"The Program" refers to any copyrightable work licensed under this License._ The GPL therefore
  does contemplate non-software works; "it's only data" is **not** an escape.
- §0 — to _"modify"_ a work means _"to copy from or adapt all or part of the work in a fashion requiring
  copyright permission, other than the making of an exact copy."_ **Importing those rings and editing them
  is squarely a modification** → the resulting dataset is a covered work.
- §5 — _"A compilation of a covered work with other separate and independent works, which are not by
  their nature extensions of the covered work, and which are not combined with it such as to form a larger
  program, in or on a volume of a storage or distribution medium, is called an 'aggregate'… Inclusion of a
  covered work in an aggregate does not cause this License to apply to the other parts of the aggregate."_

**The margin of manoeuvre this opens**: the _code_ and the _dataset_ can carry different licences. An
application that merely reads data files is a strong candidate for "aggregate" — our engine is not an
extension of the borders. So a workable split is **permissive licence on the code, GPL-3.0 on the derived
dataset directory**. The weakness of that reading: §5 requires the works to be _separate and independent_,
and an atlas whose whole purpose is that dataset gives an opponent something to argue. Risk, not
certainty — **and none of this is legal advice.**

**Two aggravating facts about `historical-basemaps` specifically**: its README states no reuse terms and
documents a murky provenance (sources _"sometimes only available through the wayback machine"_, anonymous
"ThinkQuest Team C006628" contributors), and it tells users to _"verify the maps by comparison to other
sources before using in academic work"_. Its own chain of title is weak, which makes it both a shaky thing
to depend on **and** a shaky thing to be threatened by. Relying on it is a governance smell either way.

### Inventory of alternatives (licence verified at the source)

| Source                 | Licence                                                                                                 | Temporal coverage           | Verdict                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| **OpenHistoricalMap**  | **CC0** (adopted 2022-08-03; the API response itself carries _"made available under CC0"_)              | Antiquity → present, uneven | **The find.** Permissive, editable, has an API, and contributions flow back |
| **Natural Earth**      | Public domain — _"No permission is needed to use Natural Earth. Crediting the authors is unnecessary."_ | Modern only                 | Already used (land mask, rivers). The clean seeding base                    |
| `historical-basemaps`  | GPL-3.0                                                                                                 | 100 → 2000, 21 snapshots    | Current source; the problem                                                 |
| **CShapes 2.0**        | CC BY-**NC**-SA 4.0                                                                                     | 1886–2019 only              | Rejected: NC + share-alike, and no medieval coverage                        |
| **geoBoundaries**      | CC-BY 4.0                                                                                               | Contemporary                | Attribution only, but no history                                            |
| US State Dept **LSIB** | US public domain                                                                                        | Contemporary                | Coastline known to be shifted by up to ~1 km                                |
| **Euratlas**           | Proprietary (Simple License)                                                                            | 21 centuries                | Already rejected (memory `euratlas-data-and-licensing`)                     |

### Measured: is OpenHistoricalMap good enough?

Nobody publishes this number, so it was measured directly against the OHM Overpass endpoint on
**2026-09-16**, then **built end to end** in the spike [`files/spikes/fetch-ohm`](../../spikes/fetch-ohm/),
which emits the exact payload shape the app already consumes.

**Ring assembly — the engineering risk — is a non-problem.** OHM follows the OSM model, so a boundary is a
_relation of ways_ to be chained into closed rings. Measured: **98.8 % of relations assembled at 1700,
95.1 % at 1500, and zero unclosed chains** at either date. The failures are not broken geometry but
_label-only relations_ (a single node with role `label`). Two caveats: `out geom` does not expand
sub-relation members (18 skipped at 1700), and a `license=*` tag usually _restates_ the CC0 default
(`license=CC0-1.0`) rather than restricting — a first version of the spike dropped every tagged feature
and silently lost Spain.

**Coverage — measured twice, because the first metric was subjective.** Counting "polities alive at year
Y" is not coverage (it counts label-only placeholders and, over our very wide frame, Indian sultanates).
A second attempt counted whether a hand-written list of _"major powers"_ was present — but that list was
**an editorial judgement of ours, not a property of the data**, and a polity having neighbours says
nothing about whether it matters. Both are withdrawn.

**The objective metric: how much of the frame's land the polygons actually cover.** Measured by
rasterising each payload against `public/masks/europe-land` (Natural Earth, public domain) on the DEM
grid:

| Year | Source                | Polities | DEM frame | Europe proper |
| ---- | --------------------- | -------- | --------- | ------------- |
| 1500 | historical-basemaps   | 85       | 97.0 %    | 96.8 %        |
| 1500 | **OpenHistoricalMap** | 57       | 41.5 %    | **61.8 %**    |
| 1700 | historical-basemaps   | 93       | 97.8 %    | 96.8 %        |
| 1700 | **OpenHistoricalMap** | 83       | 64.7 %    | **93.8 %**    |
| 1800 | **OpenHistoricalMap** | 76       | 77.7 %    | **95.3 %**    |
| 1900 | **OpenHistoricalMap** | 68       | 89.3 %    | **100 %**     |
| 2000 | **OpenHistoricalMap** | 106      | 100 %     | **100 %**     |

(`historical-basemaps` plateaus at ~97 % everywhere — it is built as a complete partition. "Europe proper"
is lon −25…45, lat 34…72; the DEM frame reaches E78.75 and S11.18, i.e. India and the Sahel, which are
out-of-frame decor rather than subject matter.)

**Read it this way**: in Europe proper OHM is **equivalent from 1700** (93.8 % vs 96.8 %) and **better from
1900** (100 %). At 1500 it leaves **38 % of Europe blank** — unusable. The wide-frame periphery stays
thinner throughout, which is acceptable for decor.

**Root cause of the earlier gaps**: OHM models a polity as a `type=chronology` relation grouping _many_
dated `type=boundary` relations, one per border change. "Kingdom of France" exists as ~10 of them —
987→1050, 1050→1212, then nothing until 1648→1659, 1769→1781… **Coverage is episodic**: contributors
mapped the intervals they cared about, and 1500 sits in a hole.

**What OHM does _not_ give us, and it costs something**: there is **no hierarchy in the data**. Measured
over the 2059 relations, `part_of:empire` appears on **15** of them and `part_of` on **2** — 0.7 %. Where
`historical-basemaps` carries `SUBJECTO`/`PARTOF`, OHM carries nothing usable, so **the free "empires
view" promised above does not come with the data** — the identity hierarchy has to live in the
registry. Mitigation: **`wikidata` is present on 1930 of 2059 relations (94 %)**, so the hierarchy can be
_derived_ by querying Wikidata (e.g. "part of" relations) rather than typed by hand. Also present:
`start_event` / `end_event` on ~1500 relations — OHM already names the event that creates and ends each
polity, which feeds the event model directly.

Incidental but important: this is **direct evidence for the deferred interval-based temporal model** — the
largest open historical GIS in existence uses exactly the model recorded in memory
`polity-temporal-model`.

**Conclusion: OHM is adoptable from ~1700, not from 1500.** The earlier "parity from 1500" claim was built
on the bad metric and is withdrawn.

### Recommended path

1. **Adopt OpenHistoricalMap (CC0) as the import source from ~1700 onward.** Proven end to end by the
   spike, with no licence to manage and a route to contribute corrections back upstream.
2. **Natural Earth (public domain)** stays the seeding base for coastline, land and the modern frame.
3. **100 → ~1600 is authored, not imported.** This is the real cost of the decision and it must not be
   understated: it is roughly two thirds of the century range, and it makes the Cartographer a
   prerequisite rather than a refinement. Options to weigh before committing: author only the centuries
   the atlas actually ships first (the north star is **one** complete century), or contribute the results
   back to OHM so the effort compounds instead of staying private.
4. **Drop `historical-basemaps`** from the shipping path. It stays a gitignored private reference for
   _checking_ our own work — reading a map to verify a fact is not redistribution — never a source we
   import from or trace over.

The GPL question is therefore **narrowed, not dissolved**: it disappears for 1700+, and for the earlier
centuries it is replaced by an authoring workload.

## Open questions

1. **How far back do we actually ship?** OHM covers ~1700→2000; everything earlier is authoring work.
   Decide the centuries the atlas commits to before sizing the Cartographer — and whether our results go
   back to OHM (effort compounds, and the licence stays CC0) or stay private.
2. **OHM sub-relations** — `out geom` skips relation-members (18 at 1700). Does any polity lose parts?
   Needs a recursive fetch to rule out.
3. Grid resolution: 2× or 4× the DEM?
4. Does the Cartographer write to Payload's API directly, or only read the registry and write files?
5. Payload DB: Postgres, or SQLite for a purely local authoring setup?
6. Sea ownership — territorial waters and naval empires: paint them, or keep territory strictly terrestrial?
7. Temporal model: dated snapshots for now; interval-based polities recorded and deferred — the dev has an
   idea from 2026-09-14 to revisit (memory `polity-temporal-model`). **The OHM measurement is evidence in
   its favour**: the largest open historical GIS uses exactly that model.

---

## Tracing over a watermark — decided 2026-09-17, **reversed 2026-09-22**

> ⚠ **This whole section is superseded.** The watermark is dead; the Cartographer reports by eye. Kept
> because the measurements in it are sound and the reasoning is what led to the reversal.

**This is what the Cartographer is.** A georeferenced public-domain atlas scan sits _under_ the canvas as
a watermark; you draw over it; what comes out is geometry we own. Everything below is the sourcing and the
reasoning that gets there.

### The rule that constrains it, restated because it is easy to lose

Euratlas is **not** the thing to trace, and that was already settled on 2026-09-13 after reading the
licence: its Simple License forbids disseminating the vectors at all (clause 6) and forbids reconstituting
a historical atlas of Europe (clause 9 — the project's exact subject). The memory's own words:
**"Never copy their geometry."**

The point that makes this non-negotiable rather than a formality: **redrawing by hand does not change
where the expression came from.** A trace made over a protected map is a derivative of that map — which is
why OpenStreetMap forbids tracing Google Maps even though contributors hold the pen. Tracing Euratlas
would swap the GPL problem, which at least has a compliance path, for one that has none.

What stays permitted, and is genuinely broad: **facts are free.** Reading Euratlas to learn _what_
existed, when, and under what name is allowed and was always the plan — de minimis, re-keyed onto our own
geometry.

### Where the precision actually comes from

The insight that resolves "but Euratlas is the precise one":

1. **Physical geography — and we already own it, at high resolution.** Most of the apparent precision of a
   historical border map is the Rhine, the Meuse, the Pyrenees, the Danube, the coast. We hold Natural
   Earth 10m (public domain), 591 river centrelines simplified to 500 m, a land mask at 1.9 km, and the
   DEM for ridgelines.
2. **Political interpretation** — where the line ran when it followed nothing physical. That is
   scholarship, it is _far less information than it looks_, and it is facts.

So a hand-drawn border that **snaps** to features we already own is as precise as Euratlas's along most of
its length, because along that length the two follow the same river. The scan is only needed for the
interpretive stretches.

**Calibration**: a 1911 atlas printed near 1:10,000,000, carefully georeferenced and traced, gives roughly
**3–5 km** of positional accuracy. Our political cells are **1.9 km**. The scan is therefore of the same
order as what we render — **it is not the limiting factor**.

### Sources to trace — public domain, in order of practical usefulness

- **Wikimedia Commons** — _start here_, because **every file carries an explicit licence tag**, so the
  judgement is not ours to make. Holds Droysen's _Allgemeiner Historischer Handatlas_ (1886) and
  Spruner-Menke's _Handatlas_ (1880), plate by plate, marked public domain.
- **Perry-Castañeda Library Map Collection, UT Austin** — Shepherd's _Historical Atlas_ (1911 and later
  editions), public domain, century-by-century political maps of Europe. The most directly on-subject.
- **Gallica (BnF)** — historical cartography in bulk, public-domain status stated on the record.
- **David Rumsey Map Collection** — the finest collection, with a real caveat: works before 1929 are
  public domain, but **Rumsey applies his own terms to his scans** (often CC-BY-NC-SA). Prefer Commons
  and PCL, where the question does not arise.

_To verify once before relying on any of them: the public-domain status of the specific edition, and the
terms attached to the specific scan — these are two different things._

### OpenHistoricalMap is the case where tracing does not apply

For **1700 and later**, OHM is not a scan to trace: it is **vector geometry, already precise, in CC0**,
drawn on real OSM features so it snaps to actual coastlines and rivers. It can be loaded and edited
directly. Measured coverage: **93.8 % of Europe by surface at 1700**, 61.8 % at 1500 — by area, never by
counting polities. It is also a wiki, so contributing the missing polities upstream and pulling them back
is the cleanest form of "owning our source": co-authorship of a public-domain dataset.

### What the tool therefore needs

1. **A georeferenced raster underlay** — load a scan, place it against the DEM's frame, set its opacity.
   This is the watermark, and it is the feature the whole tool is built around.
2. **Snapping to geography we already own** — river centrelines, the coastline, ridgelines from the DEM.
   This is what makes hand-drawing _fast and precise at once_: "from this confluence to that mouth, along
   the Meuse" is one gesture, not two thousand points.
3. **Shared topology between neighbours** — a border drawn once serves both polities. **Store topology,
   not independent polygons**, or the tool will reproduce at authoring time the exact gap problem that
   `extractRegionBorders` was built to abolish at render time: a border is a relation, not an object, and
   that is as true of drawing one as of rendering one.
4. **Provenance per feature** — which source, which licence, which scan. This is the same table as
   "what may we publish", and separating the two is how the GPL problem was missed the first time.

### Projection: the scans do NOT match our frame, and georeferencing is what makes that irrelevant

Asked directly on 2026-09-17 — _"tout ça, ça a la même projection pour que ça coïncide sur notre mesh ?"_
**No, and it never will.** A German atlas of 1886 is typically on a Bonne or a conic projection; a
Shepherd plate varies from map to map. Our mesh is Web Mercator (the DEM comes from Terrarium tiles).
Nothing coincides spontaneously.

**Georeferencing is the step that makes it not matter**, and it is a step, not a property:

1. Place **ground control points** on the scan — recognisable features whose real coordinates are known:
   a river mouth, a cape, a lake corner, a city.
2. Fit a transformation from scan pixels → longitude/latitude from those points.
3. Reproject lon/lat into our Web Mercator frame.

**The original projection does not need to be known.** With enough well-spread points and a **thin-plate
spline** — rubber-sheeting — the scan is deformed until it lands on our frame, which also absorbs warped
paper and a skewed scan. Fifteen to thirty points on a Europe plate gives a few kilometres. This is
exactly what `gdalwarp -tps` and QGIS's Georeferencer do.

**So the POC has a precise deliverable**: a plate already warped into our bbox
(W−45 / S11.18 / E78.75 / N76.84, Web Mercator), ready to sit under the canvas.

### How snapping works, concretely

The tool turns _"the border follows the Rhine from here to there"_ into geometry like this:

1. We already hold **591 river centrelines in normalized `(u, v)`** — i.e. already in the mesh's own frame
   (`data/riverSource.ts`, Natural Earth 10m, public domain, simplified to 500 m).
2. The user clicks near the Rhine → the tool finds the nearest vertex on the nearest polyline.
3. A second click, further north → the same.
4. The tool takes **the sub-path of that polyline between the two vertices** and inserts it into the
   border being drawn.

Two clicks, three hundred exact points. The coastline works the same way — its contour is already
extracted by marching squares (`createMaskCoastlineSource`).

**Ridgelines are the hard case** and should not be in a first version: a ridge is a drainage divide, which
means flow accumulation over the DEM — a real algorithm, not a lookup.

**Topology, again**: when polity A's border uses a Rhine sub-path, polity B must reference _the same_
sub-path, not a copy of it. Otherwise the two disagree by a rounding and the gap comes back at authoring
time.

### Accuracy, corrected

An earlier note in this session said snapping gives "the line to the metre of Natural Earth's data".
**That was wrong.** Natural Earth **10m means 1:10,000,000** — the same scale as the old atlas. Its own
positional accuracy is of the order of a kilometre, not a metre.

The conclusion holds — ~1 km is still finer than our 1.9 km political cells, so it remains not the
limiting factor — but the promise was overstated and the corrected figure is the one to plan against.

### ▶ POC to build: `files/spikes/fetch-atlas` — **off the critical path since 2026-09-22**

Flagged by the dev as **ultra important**, and it is the thing that turns this chapter from discussion
into a file on disk. Deliverable, in order:

1. Fetch one public-domain plate — Europe at a century OHM covers badly, so the tracing is immediately
   useful. Wikimedia Commons first, for its per-file licence tag.
2. Record its provenance and licence beside it, as the DEM and river spikes already do.
3. Place ground control points and warp it with a thin-plate spline into **our bbox and projection**.
4. Emit the warped raster plus a small JSON sidecar (bbox, source, licence, GCPs used, residual error).
5. Display it under the canvas at adjustable opacity — the watermark.

Only then is it worth building the drawing half: snapping, topology, export.

### The Cartographer from the user's seat — walkthrough agreed 2026-09-17

Written at the dev's request, because he is the one who will use it: _"c'est toi qui vas faire l'outil,
et c'est moi qui vais interagir avec"_.

**Step 1 — register the plate, once per map.** Split view: the atlas scan on one side, our map on the
other. Click a recognisable point on the scan (the mouth of the Tagus, the tip of Brittany, the heel of
Italy), then the same point on our map, which carries the real coastline. That is one control point.
Place fifteen to thirty, **well spread** — clustered points make the warp diverge at the edges. After each
one the tool recomputes and shows the **residual error** per point, in kilometres, so a bad pick is
visible and can be moved or dropped. When it is good the scan is warped and sits under the map, aligned.
Saved with the plate; never done twice.

**Step 2 — draw a polity.** Set the watermark's opacity so the old borders read through our relief.
Create the polity (name, dates). Then trace, alternating three gestures along one outline:

- **free click** — place a point where the border is _seen_ on the scan. The gesture for the interpretive
  stretches: the interior of the Empire, the eastern marches, anything following no physical feature.
  This is the only place the scan genuinely earns its keep.
- **snap to river** — click near the Rhine, click again further north; the whole sub-path between the two
  is inserted. Two clicks, three hundred exact points. This is where the speed comes from.
- **snap to coast** — the same gesture against the shoreline contour.

The result is a sequence of **stretches**, not a sequence of points.

**Step 3 — the neighbour, and this is the step that decides everything.** You do _not_ redraw the shared
border: you click the existing line and it becomes the neighbour's edge too. One line, two owners. What
follows from it:

- a gap is not _absent_, it is **impossible** — it is the same object;
- fixing a border fixes both polities at once;
- **you can subdivide later without redrawing anything.** The Empire as one block today, its
  principalities in six months: interior lines are added and its outer boundary does not move.

That last consequence is what makes the work on a century reusable instead of disposable.

**Step 4 — what comes out.** A file in our format: shared border stretches, polities referencing them,
and **provenance on each stretch** — which source, which licence, which plate. It loads exactly as a year
loads today; the renderer does not change by a line, since it already rasterises rings and derives borders
from the raster.

### Detail level is an axis independent of the century — the Empire settles it

Raised by the dev, correcting an earlier over-simplification in this session: framing 1500's fragmentation
as _convenient_ ("it exercises the tool") ignored the volume. **The Holy Roman Empire at 1500 is several
hundred entities** — principalities, bishoprics, free cities, counties. That is months, not a POC.

The resolution: **draw 1500 at sovereign-state level** — thirty to forty entities in Europe, the Empire as
a single block — and return for its interior later. Euratlas's own hierarchy
(`2nd_level_divisions → 1st_level → sovereign_states → supranational_entities`) **exists because of the
Empire**, and our model already holds a flattened version of it (`subjectTo`, `partOf`, with
`colorBySuzerain` to fold vassals into one colour).

**And it turns the topology question from a preference into a requirement**: with shared topology, the
Empire can be a block now and be subdivided later without touching its outer boundary. With independent
polygons, subdividing means redrawing — every principality carrying its own copy of the outer stretch it
touches, with the disagreements that guarantees.

### The honest trade-off to settle when the POC starts

Topological editing is the expensive part — it is what makes real GIS tools complex. There is a pragmatic
v1: **independent polygons that snap to existing vertices**, so drawing near a placed point lands exactly
on it. Gapless results without the full machinery.

Its cost, which must be known before choosing it: **fixing a border means fixing both polities**, and
subdividing the Empire later becomes a redraw. Decide this at the start of the POC, not during it.

### Century chosen: 1500 — **superseded: 1100**

**Not the 18th** — OHM already covers 1700 at 93.8 % by surface, so tracing it would redraw by hand what
we hold in CC0. The worst possible use of the tool.

**1500**: OHM covers 61.8 %, so there is genuinely ~38 % to produce; the app **already opens on it**, with
the defaults noting it was chosen as "a Europe recognisable enough to judge the rendering against" — so
correctness is judgeable on sight. At sovereign-state level, per the section above.

### What exists, and what has to be built

**Exists**: river centrelines in mesh coordinates, the coastline contour by marching squares, the
rasteriser, the border derivation, the worker, the progress panel.

**To build**: georeferencing the scan and showing it as a watermark; snapping; the topology model and its
editing; the export.

### The acceptance case: Alsace-Lorraine under Louis XIV

Raised by the dev 2026-09-17, right after the Empire: _"il n'y a pas que le Saint-Empire qui est
représentatif de frontières complexes, il y a aussi tout le bordel que Louis XIV a fait."_

**This case has already killed an idea in this project.** `known-issues.md` records that softening the
colour boundary was rejected because it "dissolves any territory narrower than the softening, which on a
fragmented year — **the Lorraine mosaic under Louis XIV** — is exactly what must survive." It is the
codebase's existing reference counter-example, and it should be promoted from an anecdote to an
**acceptance test**: if the tool and the renderer hold Alsace-Lorraine around 1680, they hold the rest.

**What it adds that the Empire does not: discontinuity, not merely fragmentation.** The French
Trois-Évêchés (Metz, Toul, Verdun) sitting inside Lorraine since 1552; the Alsatian Décapole and
Strasbourg remaining imperial until 1681 while the rest of Alsace was French; then the Réunions
(1679–1684) producing a legalistic patchwork on the eastern frontier. Enclaves and exclaves, not just
small neighbours.

Three consequences, recorded as they stand:

1. **Holes and exclaves already work.** `Region.rings` is a flat list of every ring, outer and hole alike,
   filled even-odd, so neither the source format nor the rasteriser needs to know which is which.
2. **Shared sovereignty does not, and cannot.** `RegionRaster.cells` is an `Int16Array` — **one polity per
   cell**. A bishopric that is simultaneously imperial and under French protection is not representable.
   This is a hard limit of the model, already set, and better written down than rediscovered.
3. **At 1.9 km cells a two-kilometre enclave is one step from vanishing**, and `expandRegionsOverLand`
   grows neighbours over unclaimed land, so it could close over one. Worth a guard when the case is built.

**And it strengthens the topology requirement once more**: an enclave's boundary is _entirely_ shared with
the polity surrounding it. Independent polygons mean two copies of the same ring, and two copies of one
line disagree by a rounding — which is the failure this whole chapter keeps arriving back at.
