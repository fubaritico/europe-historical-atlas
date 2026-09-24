# Cartographer — groundwork: what the machine eats today, and what a contribution tool must produce

> Written 2026-09-22 at the dev's request: *"il faut savoir quoi fabriquer"*.
> **Companion to [roadmap chapter 06](06-contribution-tooling.md), not a replacement.** Chapter 06
> designs the tools (Studio, Cartographer), the sourcing, the tracing-over-a-watermark decision and the
> topology requirement. This document does the thing chapter 06 never did: **read the existing pipeline
> end to end and state, from the code, what the only real input is.**
>
> Everything below with a `file:line` reference was read on 2026-09-22 against `master` at `8487136`.

---

## 1. The pipeline as it stands, step by step

### ① The file — the only input that exists

`public/borders/europe-<year>.json`, one per century (100 → 2000) plus 1914. Shape `RegionPayload`
(`src/data/regionSource.ts:56`):

```jsonc
{
  "source": "OpenHistoricalMap (CC0) — https://www.openhistoricalmap.org",
  "year": 1700,
  "bbox": { "west": -45, "south": 11.178…, "east": 78.75, "north": 76.840… },
  "tolerance": 0.01,
  "regions": [
    { "name": "Ottoman Empire", "subjectTo": null, "partOf": null,
      "rings": [ [ [23.316, 37.8453], … ], … ] }
  ]
}
```

Measured on the 1700 payload: **83 regions**, OHM/CC0. The Ottoman Empire alone carries **91 rings**, the
first holding 3 290 points. Every other year is `historical-basemaps`, GPL-3.0, unpublishable.

Note already visible in the data: **two separate entries are both named `Spain`.** See gap ① below.

### ② Read and validate

`createFetchRegionSource` (`regionSource.ts:110`) → `parseRegionPayload` (`:132`). Hand-written readers,
every coordinate pair checked individually — the recorded reason being that a string where a longitude
belongs becomes `NaN` on projection and rasterises as **a country silently missing from the map**.

### ③ Reproject

`projectRegions` (`regionSource.ts:83`). lon/lat → normalized `(u, v)` through Mercator
(`longitudeToHorizontal` / `latitudeToVertical`) against the payload's own `bbox`. Rings under 4 vertices
are dropped. Output: `RegionSet { year, regions: Region[] }`.

**Outer rings and holes stay mixed in one flat list** — the even-odd fill separates them later, so neither
the format nor the rasteriser ever needs to know which is which.

### ④ Into the worker — rasterise

`rasteriseRegions` (`src/data/regionRaster.ts:143`). Grid = DEM × `rasterScale` (default 4) =
**5 120 × 4 656 = 23.8 M cells**, an `Int16Array`, `-1` where unclaimed. Even-odd scanline fill, edges
bucketed by row (`bucketEdgesByRow`).

**Later indices overwrite earlier ones on overlap** — deliberate, so enclaves draw on top of the power
surrounding them.

> **This is where layered sovereignty dies: one cell, one integer.**

### ⑤ Grow the claims to the coast

`expandRegionsOverLand` (`regionRaster.ts:254`). Breadth-first, 4-neighbour, **over land only**, for
`snapToCoast × scale` steps. Closes the gap between schematic historical polygons and our modern
shoreline. The most expensive phase — it walks the whole land surface.

### ⑥ Colours

- `buildAdjacency` (`:315`) reads who touches whom **off the raster**, never off the geometry.
- `pinnedRegionColor` (`src/data/regionPalette.ts:55`) applies editorial rules — **9 regexes matched
  against the polity's name**.
- `chooseColorSlots` (`:341`) assigns the rest greedily, most-connected first, so no two neighbours share
  a tint.

Output: `tints[]`, indexed as `regions` was.

### ⑦ Borders — derived, never authored

`extractRegionBorders` (`src/data/regionBorders.ts:411`). Every cell edge whose two sides hold different
polities → keyed on a **doubled integer lattice** (corners coincide exactly, no epsilon) → chained into
polylines, stopping at tripoints (degree ≠ 2) → Chaikin corner-cutting.

Two outputs:

- `between[]` — grouped **by pair of region indices**;
- `frontier[]` — polity against unclaimed *land* (requires `isLand`; against sea it stays silent, because
  the shoreline is already drawn from a better source).

### ⑧ Back from the worker

`PoliticalResult { tints, borders }` (`src/pipeline/mapCompute.ts:76`). **The grid never comes back** —
45 MB a year at the 4× raster. A future picking query must be a message, not a copy.

### ⑨ Two consumers, one source

| | fills | linework |
|---|---|---|
| path | the raster stays *installed* in the compute → `AreaTint { at(u,v) → RgbColor \| null }` (`inlineCompute.ts:195`) | `rebuildBorders` (`src/mapLayerBuilders.ts:217`) |
| becomes | pixels baked into the texture: parchment × hypsometry × **tint** × hillshade × grain → `DataTexture` on the relief | 3D lines draped over the relief (`composedLineLayer`) |
| pattern | — | `patternForPair` (`mapLayerBuilders.ts:50`) resolves the index pair → **two names** → `borderPatternFor` → `solid \| dashed \| double` |

The seam the compositor sees is deliberately blind, and its own comment says so: *"a colour claimed at a
coordinate, and nothing about history."*

---

## 2. Input, derived, editorial

**Input — the only thing a contribution tool must produce:** dated rings in lon/lat, per polity. That is
step ①. Everything from ④ onward is mechanical.

**Derived — must never be authored:**

- borders (they are the boundary of the fills — chapter 06's "three concepts, not two");
- per-region colours (computed from adjacency);
- holes as a distinct concept (even-odd handles them).

**Editorial — real decisions, currently hardcoded as regexes in `src/`:**

- `REGION_COLOR_RULES` (`data/regionPalette.ts`) — 9 name patterns → colour;
- `BORDER_STYLE_RULES` (`data/borderStyles.ts`) — 4 name-pair patterns → `dashed`.

Those two tables **are** what the dev calls *"leur code couleur"*. They are editorial content living in
compiled code, keyed on display strings.

---

## 3. The four gaps in the current format

### ⚠️ Gap ① — there is no identity, only strings

A polity **is** its name. Everything downstream keys on that string:

- the colour rules are regexes because *"the dataset renames a polity from one century to the next"* —
  `Kingdom of France` in 1000, `France` in 1500;
- `REGION_COLOR_RULES` has a load-bearing **order**, because `United Kingdom of Great Britain and Ireland`
  contains "Ireland";
- `pattern: /byzan|eastern roman/i` exists because one state has two names across centuries, and it must
  deliberately avoid matching `Holy Roman Empire`;
- `borderPatternFor` needs an `a === b` guard, because `Poland-Lithuania` satisfies **both halves of its
  own rule**, which would have put a dashed line between two fragments of one polity;
- and the 1700 payload carries **two entries both named `Spain`**.

Every one of those is the same defect. **The colour code cannot be contributed while the key is a display
name.**

### ⚠️ Gap ② — one polity per cell

`RegionRaster.cells` is an `Int16Array`. Vassalage, homage, condominium, the Plantagenets holding land of
two crowns: not representable. Already recorded in chapter 06 (Alsace-Lorraine section, point 2) and in
`known-issues.md`.

`subjectTo` exists in the payload but is only a **name string** used to recolour — and
`colorBySuzerain` does not actually merge vassals unless the suzerain is pinned, because
`assignRegionColors` colours by index against adjacency and never reads a name.

**Nuance that matters before choosing a century — see §6.** Most of the feudal problem is expressible
*through the registry hierarchy* without touching the `Int16Array`.

### ⚠️ Gap ③ — no time, only snapshots

One file per round year. A polity has no start and no end, and nothing states that the France of 1500 is
the France of 1600. A decade-stepped slideshow over five centuries is **~50 hand-authored states** under
this model. Recorded as chapter 06's open question 7, and as memory `polity-temporal-model`.

### ⚠️ Gap ④ — "how names are displayed" does not exist at all

**No country label is rendered anywhere.** `scene/mapTitle` and `scene/frameLabels` show the technique
(SVG → texture) but for the sheet's own title and the degree gradations, not for polities.

So this is not a tunable to expose — it is **a layer to create, needing data nobody produces**: an anchor
point, an orientation, an appearance threshold. Chapter 06 mentions label anchors in one line of the
Cartographer's export (pole of inaccessibility, not centroid); it does not record that the rendering half
is missing entirely.

---

## 4. The fork: A or B

### A — the tool emits today's `RegionPayload`

Rings in lon/lat, `name` / `subjectTo` / `partOf` as strings. Works the day it is written, zero adapter.

**Cost:** carries all four gaps forward, and the dev's step 3 (*"définir le format de tout ça"*) is
deferred rather than answered. The colour code stays as regexes in `src/`.

### B — a two-tier format: a registry, and dated geometry referencing it

Recommended. **The structural argument, not an aesthetic one: the two regex tables exist *only* because
there is no ID.** Introduce a stable identifier and both tables disappear, and the colour code becomes
contributable content — which is literally the dev's step 1.

---

## 5. B in detail

### Tier 1 — the registry (independent of any year)

```ts
interface Polity {
  id: PolityId                    // stable, opaque, never a display name
  names: { from: number; to: number | null; name: string }[]
  subjectTo: { from: number; to: number | null; polity: PolityId }[]
  partOf: PolityId | null
  color: string | null            // editorial pin; null = let the palette decide
  existsFrom: number
  existsTo: number | null
  wikidataId: string | null
}
```

**What this kills:** `REGION_COLOR_RULES` entirely. A pinned colour becomes a field on the polity instead
of a regex racing eight others in a load-bearing order.

**What it costs less than it looks:** the OHM ingest already carries `wikidata` on **94 % of 2 059
relations** (chapter 06, measured 2026-09-16), so `id` can be the Q-id and the registry can be
**generated** by the existing `files/spikes/fetch-ohm` rather than typed.

### Tier 2 — dated territory

```ts
interface TerritorySnapshot {
  year: number
  bbox: GeoBounds
  source: string
  licence: string                 // provenance per payload — chapter 06 §"Provenance per feature"
  claims: { polity: PolityId; rings: [number, number][][] }[]
}
```

The only change against today's payload: three name strings collapse into one `polity` reference.

### Tier 3 — relations (editorial, keyed on ids)

```ts
interface BorderStyle {
  between: readonly [PolityId, PolityId]
  pattern: 'solid' | 'dashed' | 'double'
  from?: number                   // a personal union has dates
  to?: number
}
```

**What this kills:** `BORDER_STYLE_RULES`. Castile|Aragon becomes two ids; the `Poland-Lithuania`
self-match is impossible by construction, and the `a === b` guard goes with it. It also makes `double`
authorable — today it is implemented, tested, and produced by no rule.

### Tier 4 — label anchors (new; nothing exists)

```ts
interface LabelAnchor {
  polity: PolityId
  year: number
  u: number; v: number            // pole of inaccessibility by default, movable by hand
  angle?: number                  // labels on old maps follow the territory's axis
  minZoom?: number                // when it appears
  weight?: 'empire' | 'kingdom' | 'minor'
}
```

Computable as a default, **editorial as a final value** — which is why it belongs to the contribution tool
and not to the renderer.

### The adapter — why B is cheap

```
TerritorySnapshot + Registry ──adapter──▶ RegionPayload ──▶ steps ②…⑨ unchanged
```

The adapter resolves each claim's `polity` to the name valid at that year, and its suzerain likewise.
**Not one line of the rasteriser, the compute, the compositor or the line layer changes.**

Then, as a second and separable step, `Region` grows an **optional** `id` field which
`pinnedRegionColor` and `patternForPair` prefer when present. Optional rather than required, so the
migration happens payload by payload instead of as one cut-over.

### Migration cost — low, and the timing is the reason

- **1700** is OHM/CC0 and regenerable by a spike that already exists.
- **The other 20 payloads are GPL-3.0 and are already slated to leave the shipping path** (chapter 06,
  "Recommended path", point 4).

So the stock of data to migrate is mostly **data already condemned**. The format is cheapest to change
now, and gets more expensive with every authored century.

---

## 6. What B does **not** solve — and an important correction

B does not touch gap ②. That remains `Int16Array`, one owner per cell. Three ways out, and they are not
equal:

1. **Express it in the registry hierarchy only.** A cell has one *direct* holder; the suzerain is read
   through `Polity.subjectTo`. This is what historical atlases and strategy games do, and chapter 06
   already chose it. **Cost: zero on the grid.**
2. A second parallel `Int16Array` of suzerain per cell. +45 MB a year; doubles the derivation.
3. A list of claims per cell. Real overlapping-claims model; expensive in memory and in every consumer.

**The correction, against what was said in conversation before the code was read:** layered sovereignty is
*not* a hard wall for feudal France. Under (1), the royal domain is one polity, Plantagenet Normandy is
another with `subjectTo: france`, and the map is coherent. What (1) genuinely cannot express is a **true
condominium** — two suzerains with no hierarchy between them — which is rare.

Two riders on (1), both already recorded:

- `colorBySuzerain` must be **fixed** to group by suzerain id *before* slot assignment; today it only
  swaps which name is offered to the pinning rules, so two vassals of an unpinned crown still come out in
  different colours. Ids make the real fix possible.
- at 1.9 km cells a two-kilometre enclave is one step from vanishing, and `expandRegionsOverLand` can
  close over one — worth a guard when Alsace-Lorraine is built (chapter 06's acceptance case).

---

## 6 bis. Border relations — decided 2026-09-22

The dev's correction: **a vassal inside its suzerain must be drawn with its own kind of line**, and
**vassalage and personal union must not share one.** Decided, not proposed.

### What already exists

Half of it is built. `composedLineLayer` renders dashes and doubles, `patternStrokes` (`:337`) gives any
non-solid pattern a single dark pass — *"its meaning is in its shape, and a light inlay would break that
shape up"* — and `patternForPair` (`mapLayerBuilders.ts:50`) already receives **the pair of polities**.

So this is not construction. It is **changing where that decision reads from**:

```
today : index pair → two name strings → BORDER_STYLE_RULES (regex) → dashed
after : id pair    → registry         → A.subjectTo == B           → dotted
```

**Geographic inclusion needs no test.** The rule is per pair, so a Burgundy owing homage to the king of
France gets a dotted line against France and a plain one against the Empire, in the same trace. A border
is a relation, and this is that principle applied to its drawing.

### The one real cost, measured in the code

`ComposedStroke.dashed` is a **boolean**, not a cadence; `dashSize`/`gapSize` are passed **globally** to
the layer (`mapLayerBuilders.ts:230`). **Two dash cadences cannot coexist today.** Three ways out:

| | approach | cost | limit |
|---|---|---|---|
| a | vassal = dashed, union = `double` | none — `double` exists and is produced by no rule today | misuses a sign: a double solid line means *contested* in atlases |
| b | two dashed passes at different widths | near none — `width` is already per pass | weak distinction at small scale |
| **c** | **cadence per pass** — `dashed: boolean` → `dash: { size, gap } \| null` | contained: each pass already owns its material, and `LineMaterial` carries `dashSize`/`gapSize` per material | — |

**Chosen direction: (c)**, because at least four hands are needed (sovereign, vassal, union, contested)
and probably a fifth if the cascade weakens by degree.

### The structural gain — separate the relation from the hand

`BorderPattern` currently conflates the two: `BORDER_STYLE_RULES` goes straight from two name regexes to a
drawing style. The registry splits them:

```
RELATION (derived)                 HAND (editorial, ~4 lines)
──────────────────                 ──────────────────────────
sovereign   A.subjectTo ∌ B    ──┐
vassal      A.subjectTo = B    ──┼──▶  solid │ dotted │ dashed │ double
union       A.union = B        ──┤
contested   declared           ──┘
```

The relation is **computed** — no regexes, no load-bearing rule order, no `a === b` guard. The table that
remains only translates, and **it is the "code couleur" the dev wants to contribute**.

Proposed assignment, to confirm: **vassalage = `dotted`** (the atlas convention for dependency),
**personal union = `dashed`** (already in place), **contested = `double`**.

**Side benefits, both already recorded as issues:** three lines leave `BORDER_STYLE_RULES`
(Austria/Hungary, Poland/Lithuania, Sweden/Norway are relations, not name pairs), and `double` finally
gets a producing rule.

### Two riders

- **Cascade.** If A owes B and B owes C, is A|C dotted? `subjectTo` is **direct** today. In 11th–15th
  century France the rear-vassal is the common case, so this must be decided — possibly with the hand
  weakening by degree.
- **Interaction with `colorBySuzerain`.** With it **off**, the vassal keeps its own colour and the dotted
  line reads against a contrast of fills. With it **on**, vassal and suzerain share a colour and **the
  line becomes the only remaining information** — which is the wanted effect for an "empires" view, but
  means the pattern must stay legible over two identical fills. No timid opacity.

---

## 6 ter. The tool from the user's seat — the dev's figuration, 2026-09-22

> Answers to the dev's own questions. Chapter 06 already has a walkthrough; this records what the code
> says is possible, and where the two differ.

**Vocabulary note.** Earlier in this session the word *amer* (a seamark: a steeple, a lighthouse, a
headland used to fix one's position) was used for what the field calls a **point de calage** / **point
d'appui** — *ground control point* (GCP) in QGIS and `gdalwarp`. The standard term is the one to use.

### A partial plate is the normal case, not a problem

Georeferencing never declares *"this image is Europe"*; it declares *"this pixel is at this lon/lat"*. A
plate of France alone registers on its own control points and covers its own extent. **Plates stack**,
each with its extent, provenance, licence and residual error.

Two real consequences: the plate must **contain recognisable control points** (an inland German plate with
no coast, no major river and no identifiable city is hard to register — that is the binding limit, not
size); and plates at **different scales** that overlap will disagree by kilometres, which is why
provenance must be **per border stretch**, not per file.

**What is traced**: only the *interpretive* stretches. Along the Rhine, the Meuse or the coast nothing is
traced — the line **snaps** to geometry we already own. The plate only earns its keep inland.

### A point's lon/lat comes from the registration, never from the click

```
screen px → plate pixel → [TPS fitted on the control points] → lon/lat
          → [Mercator, geo/mercator] → (u,v) → cell
```

The point is **born in lon/lat**; no image coordinate is ever stored. Two riders: **before the control
points exist a click has no coordinate at all** (hence register first, draw second — done once per plate
and saved beside it); and **the point's accuracy is the registration's accuracy**, ~3–5 km for a
well-registered 1:10M plate against **1.9 km cells**. A traced point is therefore *coarser than the grid*,
while a snapped one is ~1 km (Natural Earth). **That is the measured argument for snapping wherever
possible and tracing only as a last resort.**

### Identity is typed, territory is drawn

- **Identity** — dated names, existence interval, colour, Q-id, and **dated `subjectTo`** — is relational
  text. It belongs to a form, not to the canvas.
- **Territory** — pick a polity from a list, then draw. A loaded brush.

**Vassalage is never drawn.** It is a dated field on the polity, because homage changes without the
territory moving. The render consequence follows for free: `colorBySuzerain` merges the colours and the
internal borders vanish on their own, being derived from the fills.

### The year is the wrong unit of entry

Today the app does `Math.round(year / 100) * 100` (`mapPipeline.ts:204`) because there is one file per
century. **A dropdown would carve that limit into the tool.**

- **Snapshots**: free field + a list of existing snapshots, and above all chapter 06's **seed from year
  T−1, paint only the delta** — the only thing that makes 21 centuries tractable.
- **Intervals** (OHM's model, and the dev's own idea since 2026-09-14): no year is entered at all.
  `from`/`to` are set on a geometry and the year becomes a **reading slider**.

**Recommendation: intervals for writing, a slider for reading.** The decade-stepped country slideshow is
otherwise ~50 hand-authored states.

### Reading a payload back — the atlas's own code, in 2D

Verified 2026-09-22: **`data/`, `geo/`, `utils/` and `pipeline/` import `three` nowhere.** `packages/core`
already exists in fact; chapter 06's step 3 is extraction, not construction.

So the editor renders with the *same* functions: rasterise → `ImageData` through the palette (the fills),
derived borders → `Path2D` (the linework). **No second renderer, no second source of truth** — what is
validated in the tool is what ships in 3D.

Three displays the atlas does not have and a contributor needs: **unclaimed land highlighted**, **a diff
against the seed**, and **the covered-land percentage live** — chapter 06's own metric (by surface, never
by polity count), which doubles as the progress gauge.

### Interface

```
┌──────────────────────────────────────────────────────────┬──────────────┐
│ [register] [trace] [paint]            ← modes            │  POLITIES    │
├──────────────────────────────────────────────────────────┤  filter…     │
│  ⊹  ~  ≈  ⌇   ✥  ◍  ▩  ⌫  ⚲          ← operations       │  ▸ France  ■ │
├──────────────────────────────────────────────────────────┤  ▸ Burgundy  │
│                                                          │  ▸ Empire    │
│                    2D CANVAS                             │  + new       │
│              Mercator, the atlas's bbox                  ├──────────────┤
│                                                          │  FORM        │
│                                                          │  dated names │
│                                                          │  exists ../..│
│                                                          │  suzerain ▾  │
│                                                          │  colour   ■  │
│                                                          │  wikidata Q… │
├──────────────────────────────────────────────────────────┼──────────────┤
│ ◀ 1480 ──●────┬────┬──── 1520 ▶   ✦ snapshots            │  LAYERS      │
├──────────────────────────────────────────────────────────┤  ◉ watermark │
│ 4°12′E 48°51′N · cell 3204,1877 · France                 │  ◉ land/sea  │
│ registration residual 2.4 km · unclaimed land 11.3 %     │  ◉ coast     │
└──────────────────────────────────────────────────────────┤  ◉ rivers    │
                                                           │  ◉ graticule │
                                                           │  ◉ borders   │
                                                           │  ○ diff      │
                                                           └──────────────┘
```

Every layer carries an eye **and** an opacity slider — the watermark above all, since the whole gesture is
reading it through our relief.

### Operations and cursors

**Register** *(once per plate)* — ① place a control point (click plate → click map), ② move/remove one.
Cursors: fine cross + loupe; hand + cross.

**Trace** *(the core)* — ③ free point (where the border is *seen*), ④ snap to river (two clicks, the
sub-path inserts itself), ⑤ snap to coast, ⑥ **reuse the neighbour's border**, ⑦ move a vertex.
Cursors: cross; cross + drop; cross + wave; line-eyedropper; arrow + node.

**⑥ is the operation everything else depends on.** You do not redraw the shared border: you click the
neighbour's and it becomes yours too. One object, two owners — so a gap is not *avoided*, it is
**impossible**, and the Empire drawn as a block today subdivides later without its outer boundary moving.

**Paint** *(retouching)* — ⑧ brush, ⑨ fill (bounded by coast and existing owners), ⑩ eraser (back to
unclaimed), ⑪ eyedropper (load the polity under the cursor).

**Transverse** — pan (space + hand), zoom (wheel), undo/redo.

Technical rider: a CSS cursor is capped around 32×32. **A brush cursor showing its true size must be drawn
into the canvas with the system cursor hidden** — what every image editor does.

### Where this diverges from chapter 06

Chapter 06 calls painting *"the decisive property"* (clipped by the land mask, so every maritime border is
the coastline for free) **and** requires shared topology, which is a property of tracing.

**Position taken here: tracing is primary, painting is retouching.** Operation ⑤ already delivers for free
what painting was wanted for, while nothing in painting delivers topology — and topology is what makes a
century's work reusable rather than disposable. **Noted as a divergence, not settled.**

## 6 bis. Border relations — decided 2026-09-22

The dev's correction: **a vassal inside its suzerain must be drawn with its own kind of line**, and
**vassalage and personal union must not share one.** Decided, not proposed.

### What already exists

Half of it is built. `composedLineLayer` renders dashes and doubles, `patternStrokes` (`:337`) gives any
non-solid pattern a single dark pass — *"its meaning is in its shape, and a light inlay would break that
shape up"* — and `patternForPair` (`mapLayerBuilders.ts:50`) already receives **the pair of polities**.

So this is not construction. It is **changing where that decision reads from**:

```
today : index pair → two name strings → BORDER_STYLE_RULES (regex) → dashed
after : id pair    → registry         → A.subjectTo == B           → dotted
```

**Geographic inclusion needs no test.** The rule is per pair, so a Burgundy owing homage to the king of
France gets a dotted line against France and a plain one against the Empire, in the same trace. A border
is a relation, and this is that principle applied to its drawing.

### The one real cost, measured in the code

`ComposedStroke.dashed` is a **boolean**, not a cadence; `dashSize`/`gapSize` are passed **globally** to
the layer (`mapLayerBuilders.ts:230`). **Two dash cadences cannot coexist today.** Three ways out:

| | approach | cost | limit |
|---|---|---|---|
| a | vassal = dashed, union = `double` | none — `double` exists and is produced by no rule today | misuses a sign: a double solid line means *contested* in atlases |
| b | two dashed passes at different widths | near none — `width` is already per pass | weak distinction at small scale |
| **c** | **cadence per pass** — `dashed: boolean` → `dash: { size, gap } \| null` | contained: each pass already owns its material, and `LineMaterial` carries `dashSize`/`gapSize` per material | — |

**Decided 2026-09-22 — (c), validated by the dev.** At least four hands are needed (sovereign, vassal,
union, contested), and probably a fifth if the cascade weakens by degree; (a) and (b) both buy one
distinction and block the next.

### The structural gain — separate the relation from the hand

`BorderPattern` currently conflates the two: `BORDER_STYLE_RULES` goes straight from two name regexes to a
drawing style. The registry splits them:

```
RELATION (derived)                 HAND (editorial, ~4 lines)
──────────────────                 ──────────────────────────
sovereign   A.subjectTo ∌ B    ──┐
vassal      A.subjectTo = B    ──┼──▶  solid │ dotted │ dashed │ double
union       A.union = B        ──┤
contested   declared           ──┘
```

The relation is **computed** — no regexes, no load-bearing rule order, no `a === b` guard. The table that
remains only translates, and **it is the "code couleur" the dev wants to contribute**.

Proposed assignment, to confirm: **vassalage = `dotted`** (the atlas convention for dependency),
**personal union = `dashed`** (already in place), **contested = `double`**.

**Side benefits, both already recorded as issues:** three lines leave `BORDER_STYLE_RULES`
(Austria/Hungary, Poland/Lithuania, Sweden/Norway are relations, not name pairs), and `double` finally
gets a producing rule.

### Two riders

- **Cascade.** If A owes B and B owes C, is A|C dotted? `subjectTo` is **direct** today. In 11th–15th
  century France the rear-vassal is the common case, so this must be decided — possibly with the hand
  weakening by degree.
- **Interaction with `colorBySuzerain`.** With it **off**, the vassal keeps its own colour and the dotted
  line reads against a contrast of fills. With it **on**, vassal and suzerain share a colour and **the
  line becomes the only remaining information** — which is the wanted effect for an "empires" view, but
  means the pattern must stay legible over two identical fills. No timid opacity.

---

## 6 ter. The tool from the user's seat — the dev's figuration, 2026-09-22

> Answers to the dev's own questions. Chapter 06 already has a walkthrough; this records what the code
> says is possible, and where the two differ.

**Vocabulary note.** Earlier in this session the word *amer* (a seamark: a steeple, a lighthouse, a
headland used to fix one's position) was used for what the field calls a **point de calage** / **point
d'appui** — *ground control point* (GCP) in QGIS and `gdalwarp`. The standard term is the one to use.

### A partial plate is the normal case, not a problem

Georeferencing never declares *"this image is Europe"*; it declares *"this pixel is at this lon/lat"*. A
plate of France alone registers on its own control points and covers its own extent. **Plates stack**,
each with its extent, provenance, licence and residual error.

Two real consequences: the plate must **contain recognisable control points** (an inland German plate with
no coast, no major river and no identifiable city is hard to register — that is the binding limit, not
size); and plates at **different scales** that overlap will disagree by kilometres, which is why
provenance must be **per border stretch**, not per file.

**What is traced**: only the *interpretive* stretches. Along the Rhine, the Meuse or the coast nothing is
traced — the line **snaps** to geometry we already own. The plate only earns its keep inland.

### A point's lon/lat comes from the registration, never from the click

```
screen px → plate pixel → [TPS fitted on the control points] → lon/lat
          → [Mercator, geo/mercator] → (u,v) → cell
```

The point is **born in lon/lat**; no image coordinate is ever stored. Two riders: **before the control
points exist a click has no coordinate at all** (hence register first, draw second — done once per plate
and saved beside it); and **the point's accuracy is the registration's accuracy**, ~3–5 km for a
well-registered 1:10M plate against **1.9 km cells**. A traced point is therefore *coarser than the grid*,
while a snapped one is ~1 km (Natural Earth). **That is the measured argument for snapping wherever
possible and tracing only as a last resort.**

### Identity is typed, territory is drawn

- **Identity** — dated names, existence interval, colour, Q-id, and **dated `subjectTo`** — is relational
  text. It belongs to a form, not to the canvas.
- **Territory** — pick a polity from a list, then draw. A loaded brush.

**Vassalage is never drawn.** It is a dated field on the polity, because homage changes without the
territory moving. The render consequence follows for free: `colorBySuzerain` merges the colours and the
internal borders vanish on their own, being derived from the fills.

### The year is the wrong unit of entry

Today the app does `Math.round(year / 100) * 100` (`mapPipeline.ts:204`) because there is one file per
century. **A dropdown would carve that limit into the tool.**

- **Snapshots**: free field + a list of existing snapshots, and above all chapter 06's **seed from year
  T−1, paint only the delta** — the only thing that makes 21 centuries tractable.
- **Intervals** (OHM's model, and the dev's own idea since 2026-09-14): no year is entered at all.
  `from`/`to` are set on a geometry and the year becomes a **reading slider**.

**Recommendation: intervals for writing, a slider for reading.** The decade-stepped country slideshow is
otherwise ~50 hand-authored states.

### Reading a payload back — the atlas's own code, in 2D

Verified 2026-09-22: **`data/`, `geo/`, `utils/` and `pipeline/` import `three` nowhere.** `packages/core`
already exists in fact; chapter 06's step 3 is extraction, not construction.

So the editor renders with the *same* functions: rasterise → `ImageData` through the palette (the fills),
derived borders → `Path2D` (the linework). **No second renderer, no second source of truth** — what is
validated in the tool is what ships in 3D.

Three displays the atlas does not have and a contributor needs: **unclaimed land highlighted**, **a diff
against the seed**, and **the covered-land percentage live** — chapter 06's own metric (by surface, never
by polity count), which doubles as the progress gauge.

### Interface

```
┌──────────────────────────────────────────────────────────┬──────────────┐
│ [register] [trace] [paint]            ← modes            │  POLITIES    │
├──────────────────────────────────────────────────────────┤  filter…     │
│  ⊹  ~  ≈  ⌇   ✥  ◍  ▩  ⌫  ⚲          ← operations       │  ▸ France  ■ │
├──────────────────────────────────────────────────────────┤  ▸ Burgundy  │
│                                                          │  ▸ Empire    │
│                    2D CANVAS                             │  + new       │
│              Mercator, the atlas's bbox                  ├──────────────┤
│                                                          │  FORM        │
│                                                          │  dated names │
│                                                          │  exists ../..│
│                                                          │  suzerain ▾  │
│                                                          │  colour   ■  │
│                                                          │  wikidata Q… │
├──────────────────────────────────────────────────────────┼──────────────┤
│ ◀ 1480 ──●────┬────┬──── 1520 ▶   ✦ snapshots            │  LAYERS      │
├──────────────────────────────────────────────────────────┤  ◉ watermark │
│ 4°12′E 48°51′N · cell 3204,1877 · France                 │  ◉ land/sea  │
│ registration residual 2.4 km · unclaimed land 11.3 %     │  ◉ coast     │
└──────────────────────────────────────────────────────────┤  ◉ rivers    │
                                                           │  ◉ graticule │
                                                           │  ◉ borders   │
                                                           │  ○ diff      │
                                                           └──────────────┘
```

Every layer carries an eye **and** an opacity slider — the watermark above all, since the whole gesture is
reading it through our relief.

### Operations and cursors

**Register** *(once per plate)* — ① place a control point (click plate → click map), ② move/remove one.
Cursors: fine cross + loupe; hand + cross.

**Trace** *(the core)* — ③ free point (where the border is *seen*), ④ snap to river (two clicks, the
sub-path inserts itself), ⑤ snap to coast, ⑥ **reuse the neighbour's border**, ⑦ move a vertex.
Cursors: cross; cross + drop; cross + wave; line-eyedropper; arrow + node.

**⑥ is the operation everything else depends on.** You do not redraw the shared border: you click the
neighbour's and it becomes yours too. One object, two owners — so a gap is not *avoided*, it is
**impossible**, and the Empire drawn as a block today subdivides later without its outer boundary moving.

**Paint** *(retouching)* — ⑧ brush, ⑨ fill (bounded by coast and existing owners), ⑩ eraser (back to
unclaimed), ⑪ eyedropper (load the polity under the cursor).

**Transverse** — pan (space + hand), zoom (wheel), undo/redo.

Technical rider: a CSS cursor is capped around 32×32. **A brush cursor showing its true size must be drawn
into the canvas with the system cursor hidden** — what every image editor does.

### Where this diverges from chapter 06

Chapter 06 calls painting *"the decisive property"* (clipped by the land mask, so every maritime border is
the coastline for free) **and** requires shared topology, which is a property of tracing.

**Position taken here: tracing is primary, painting is retouching.** Operation ⑤ already delivers for free
what painting was wanted for, while nothing in painting delivers topology — and topology is what makes a
century's work reusable rather than disposable. **Noted as a divergence, not settled.**

## 6 quater. Rank — and a correction to our own tag survey, 2026-09-22

**Decided: B, aligned on OHM's own model, from now on.** The dev's words: *"je suis pour un format OHM
dès maintenant"*, and a region must carry **its rank** (empire, kingdom, duchy…), **whom it depends on**,
**its name** and **its colour**.

### OHM already carries the rank — our survey missed it

`files/spikes/fetch-ohm/README.md` concludes OHM gives no rank, on the grounds that `admin_level` is
constant. **That is true but irrelevant: `admin_level=2` is our own query filter.** Measured on
`out/relations.json` (2 059 relations) on 2026-09-22, two tags were never looked at:

**`border_type` — 963 relations (46.8 %) — this is the rank.**
`kingdom` 423 · `empire` 205 · `nation` 60 · `duchy` 56 · `republic` 32 · `grand_duchy` 24 · `colony` 22 ·
`theocracy` 21 · `khanate` 16 · `union` 11

**`place` — 1 081 relations (52.5 %) — this is the dependency status, a different axis.**
`country` 956 · `colony` 44 · `protectorate` 21 · `kingdom` 15 · **`personal_union` 7** ·
**`condominium` 6** · `mandated territory` · `occupation_zone`

Two consequences: OHM **already separates rank from status**, which is the split this document argued for
independently; and it names `personal_union` (the relation §6 bis separates from vassalage) and
`condominium` (the case §6 called unrepresentable in an `Int16Array` — rare as claimed, six occurrences,
but real and named).

**What is still missing is only the _target_.** `place=protectorate` says *that* it is a protectorate, not
*whose*. The hierarchy stays ours — but `wikidata` on 93.7 % means it can be **derived by query** rather
than typed.

### Rank and dependency are orthogonal — the dev's own century proves it

The king of England is **duke of Aquitaine**, and as such **vassal of the king of France**. A king can be
a vassal. One rank plus one dependency on a single "England" entity breaks.

**Resolution, at no cost: one polity per title.** `Kingdom of England` and `Duchy of Aquitaine` are two
polities, two ranks, two dependencies, two territories — the same mechanism that already models the
Castile + Aragon personal union as two entities.

### What rank is for

1. **Semantic zoom** — kingdoms at small scale, duchies on approach. This is the real answer to the Holy
   Roman Empire: chapter 06 said "draw it as a block, return for its interior later"; with rank, **all of
   it can be drawn and the display level chosen**, instead of dodging the fragmentation.
2. **Label typography** — the dev's question ④. The cartographic convention is real: empires in spaced
   capitals, duchies in small italics. **Rank is the field that drives it.**
3. **Not the border hand.** §6 bis decided the hand comes from the *relation*. Rank may modulate width,
   never the pattern — otherwise a decision taken ten minutes earlier is reopened.

### Colour — nothing to build

`pinnedRegionColor` + `assignRegionColors` already do exactly this: explicit colour when there is one,
adjacency-safe palette otherwise. B only moves the colour from a regex to a form field.

**One trap:** if *every* polity gets an explicit colour, the adjacency anti-collision stops doing anything
and two neighbours can come out identical. Keep the automatic path as the default; pin only what matters.

### Measured bonus

**`name:fr` on 1 670 relations (81 %).** The atlas is in French and the French names are already in the
data — `fetch-ohm.mjs:305` currently reads only `name:en ?? name`.

## 6 quinquies. 1100 measured, and tracing replaced by reporting — 2026-09-22

**Dev's decisions:** the first contributed map is **1100**; the tool must **read an existing JSON, edit
it, and create one**; editing is **point-level** (add a point, remove a point); and the reference map is
**not traced** — *"je reporterai sur mon outil ce que j'y vois et ce que j'y comprends"*.

### What OHM actually holds at 1100 — measured 2026-09-22

`node fetch-ohm.mjs --year 1100` → **51 polities assembled of 52 relations (98.1 %), zero unclosed
chains** — as clean as 1700. 16 579 vertices kept of 306 298, 291 KB.

Coverage by surface, measured with a purpose-written sampler (`$CLAUDE_JOB_DIR/tmp/coverage.py`,
1-in-8 sampling against `public/masks/europe-land`):

| year | DEM frame | Europe proper | polities |
|---|---|---|---|
| **1100** | 24.6 % | **45.2 %** | 51 |
| 1500 | 39.0 % | 54.9 % | 57 |
| 1700 | 60.4 % | 89.3 % | 83 |

*Caveat on the numbers*: these run 3–5 points below chapter 06's figures on the same files (different
sampling). **Comparisons within this table are valid**; against chapter 06's they are not.

**So 1100 is half a map, not "most of the work done".** Roughly 55 % of Europe is still to draw.

### The fact that decides the first session: **France is absent**

`Kingdom of France` exists as an OHM relation at 1100 — with its name, `border_type=kingdom`,
`place=country` — and **produced no ring at all**. It is the single relation of the 52 that assembled
nothing: a *label-only* relation, the failure mode chapter 06 already documented at 1500.

**For the century and the country at the heart of this project, OHM supplies the identity and none of the
geography.**

### Coverage is wildly uneven, which is worse than being uniformly thin

Present and finely mapped: the four Sardinian judicates, the Welsh and Irish kingdoms, the Campanian
duchies (Amalfi, Gaeta, Naples, Sorrento), the Crusader states (Jerusalem, Antioch, Edessa), Byzantium,
the Holy Roman Empire, England, Scotland, Norway, Sweden, Poland, Hungary, Croatia, León, Aragon.

Absent: **France**, Castile, Kievan Rus', Denmark, Bohemia, northern Italy, al-Andalus. This is chapter
06's "episodic coverage" — contributors mapped what they cared about.

### Point-level editing is practicable — measured

Median **108 vertices per polity**; 36 of 51 under 300. Only five exceed 1 000 (Byzantium 2 258, Seljuks
1 943, Abbasids 1 802, Norway 1 185, Fatimids 1 115) and **three of those five are out of frame**. England
is 398, Poland 310, the Empire 894. Adding and removing points by hand is a real gesture at this size.

### Reporting by eye replaces tracing — and it inverts chapter 06

Chapter 06 says of the georeferenced watermark: *"**This is what the Cartographer is.**"* The dev flagged
the `fetch-atlas` spike **ultra important** on 2026-09-17. **That is now off the critical path.**

**What it removes**: ground control points, thin-plate-spline warping, the `fetch-atlas` spike, the
`register` mode, the watermark layer. A large part of the tool.

**What it unlocks, and this is the bigger half**: the **Duby atlas** and **Euratlas** become usable. Both
are in copyright, both are forbidden as tracing surfaces, and both are explicitly permitted as *fact*
references — memory [[duby-atlas-is-a-reference-not-a-tracing-source]], and chapter 06's own
*"facts are free"*. **Reporting what one reads and understands is fact extraction, not derivation of an
expression.** The dev has chosen precisely the mode of use his best sources allow.

**The dev's justification holds, and it is measured**: a georeferenced 1:10M plate lands at ~3–5 km while
our cells are 1.9 km. The watermark is *coarser than the grid* — it does not buy what it costs.

**What it costs, and it must be built for**: with no superposition, position has to come from somewhere
else.

1. **Snapping to rivers and coast stops being an optimisation and becomes the positioning system.**
2. **Visible landmarks are now required**: named rivers, the coastline, a dense graticule — and
   **cities, which this project has none of**. Natural Earth `ne_10m_populated_places` is public domain
   and is the obvious source. Note this is a *data-entry* need, distinct from the cities-as-content
   chantier the dev put second in his sequence.
3. **Systematic latitude error**: the eye corrects a conic-to-Mercator difference badly, and worse toward
   the north. A graticule and coastal landmarks are the only defence.

**Consequence for §6 ter**: the `register` mode disappears, the `watermark` layer becomes a `landmarks`
layer, and the divergence recorded there — tracing primary rather than painting — **is settled by the
dev's own words**: "ajouter un point, retirer un point" is vector editing, not a brush.

## 6 sexies. The backdrop and the viewport — 2026-09-22

**Dev's decision:** the default backdrop is **the app's own baked terrain texture**, as a bitmap, with
what is drawn or loaded superposed on it — *"pour avoir un repère fort"*. A different image may be loaded
in its place. The viewport zooms and pans **like a PDF**, backdrop and points moving together, so points
can be placed precisely while zoomed in.

### Why the baked texture is the right backdrop, and not merely a convenient one

It is **the only backdrop that is georeferenced by construction**. `composeTerrainRgba` produces it from
the DEM and it covers exactly the DEM's bbox, so `pixel ↔ (u,v) ↔ lon/lat` is exact — **no control
points, no warp, zero residual**. The problem §6 quinquies just removed does not arise for this one.

Second benefit: **it is literally the image the result will be rendered on.** No gap between the
workshop and the shop window.

### Three traps

1. **The baked texture already contains the political tint.** `bakeTerrainPixels` paints the `AreaTint`
   *into* the pixels, so used as-is the backdrop would already be coloured by what is being drawn.
   Use the bare bake — `clearPolitical()` then `bakeTerrain()` — and draw the fills **over** it as a
   toggleable overlay.
2. **The backdrop goes blurry before the useful precision.** At supersample 1 the texture is 1 280 px
   wide over 123.75° of longitude: **7.6 km/px at 45°N**, against **1.9 km cells**. It fails four times
   short. Re-baking at 4× means a 5 120 × 4 656 `ImageData` — **95 MB** (workable; the political raster
   already peaks near 136 MB) — but the better answer is the one §6 quinquies already reached: **the
   coastline and rivers are polylines and stay sharp at any zoom.** Bitmap for framing, vectors for
   precision.
3. **Stroke widths and handle sizes must be in screen pixels**, i.e. divided by the scale
   (`lineWidth / scale`). Points are stored in world coordinates — already settled — but without this
   corollary a vertex handle becomes a 40 km block at high zoom and hides what it is meant to target.

### The viewport

One transform (`ctx.setTransform`) applied to everything — backdrop, vectors, points — so they are
solidary because they share a frame, not because anything is synchronised. Drag changes the offset,
wheel changes the scale about the cursor.

### A loaded image is placed by hand, not georeferenced

Since the dev reports by eye, a substitute backdrop needs no kilometre-accurate registration: **move and
resize until the coasts roughly land**. An eyeball placement, not a TPS — the same reasoning that
removed georeferencing in the first place.

## 7. Decisions still open

1. ~~**A or B**~~ — **settled 2026-09-22: B, aligned on OHM.** Still open beneath it: whether the registry
   lives in Payload from the start or as a flat JSON file the Cartographer reads (chapter 06 question 4).
2. ~~**The century**~~ — **settled 2026-09-22: 1100**, superseding chapter 06's 1500. Measured in
   §6 quinquies: OHM gives ~45 % of Europe there, and **no geometry at all for France**.
3. **Shared topology or independent polygons snapping to existing vertices** — chapter 06's
   "honest trade-off", to be settled at the start of the POC and not during it.
4. **The label layer** is unbuilt on both ends: no renderer, no data. It is part of the dev's step 1 and
   has no home in any chapter yet.
5. Interval-based polities vs dated snapshots (gap ③), deferred since 2026-09-14. §6 ter recommends
   **intervals for writing, a slider for reading**; not yet ruled on.
6. **Does the vassalage hand cascade?** `subjectTo` is direct today; rear-vassals are the common case in
   the century the dev has named (§6 bis, riders).
7. **Which hand for which relation** — `dotted` / `dashed` / `double` proposed in §6 bis, unconfirmed.
8. ~~**Tracing primary or painting primary**~~ — **settled 2026-09-22 by the dev's own terms**: "ajouter
   un point, retirer un point" is vector editing. Painting is retouching, if it is built at all.
9. **Backdrop resolution**: re-bake the terrain texture at 4× (95 MB `ImageData`, sharp down to the cell)
   or accept a blurry backdrop at high zoom and place vertices by snapping to coast and rivers. The second
   is free and pushes toward the gesture the tool wants anyway. §6 sexies, trap 2.

## 8. Settled during this session

- **2026-09-22 — a vassal gets its own hand, distinct from a personal union.** Dev's decision.
- **2026-09-22 — cadence per pass (option c)** rather than reusing `double` or varying the width. Dev's
  decision; it is the only one of the three that leaves room for the fourth and fifth hands.
- **2026-09-22 — format B, aligned on OHM's own model.** A region carries its **rank**, **whom it depends
  on**, its **name** and its **colour**. See §6 quater — OHM already supplies rank (`border_type`) and
  status (`place`); only the dependency's *target* is ours to hold.
- **2026-09-22 — the tool must read an existing JSON, edit it, and create one.** Round trip, not export.
- **2026-09-22 — the first contributed map is 1100**, and editing is **point-level**. Measured: OHM
  assembles 51 polities there at 98.1 %, covering ~45 % of Europe, median 108 vertices each — and
  **France has no geometry at all**. §6 quinquies.
- **2026-09-22 — the reference map is reported by eye, never traced.** Kills georeferencing, the
  `fetch-atlas` spike and the watermark; **unlocks Duby and Euratlas as fact references**. §6 quinquies.
- **2026-09-22 — the default backdrop is the app's own baked terrain texture** (bare, political tint
  cleared), replaceable by a hand-placed image; the viewport zooms and pans as one frame. §6 sexies.

## 8 bis. Scenarios

Written 2026-09-22 at the dev's request, in [`scenarii/`](scenarii/): the exhaustive gesture-level walk
through opening an OHM payload, creating the Kingdom of France at 1100, improving an imported border, and
the round trip. **The scenarios come first and the interface is derived from them.**

Their deliverable is [`scenarii/s99-holes.md`](scenarii/s99-holes.md) — twenty decisions nobody has taken,
found by trying to describe a gesture. Four of them block the shape of the tool.

## 9. Next — the build plan

This document answers *what to make*. The dev's next step is *"un plan de fabrication"*, which has to
start from the decisions in §7 — above all **A or B**, since every file the tool writes depends on it.
