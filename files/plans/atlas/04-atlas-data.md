# 04 — Atlas: texture, political layer, labels & data model

> Chapter of the [roadmap](../roadmap.md). Everything that turns the relief into a historical atlas.

## Visual direction (LOCKED) — vintage school-atlas / parchment

- **Old paper / "vieille carte scolaire" mood**: aged-paper texture, **muted, desaturated nation colors**
  blended into the paper (never vivid), **coastlines drawn as strokes**.
- **Relief is prominent AND meaningful** — not decoration: terrain drives history (Vienna 1683 as the
  gate to Europe; Hannibal & the Alps). The 3D relief must read clearly so strategic geography is legible.
- Nation fills = `muted_color × hillshade` over the parchment base.
- **Palette**: **browns / dark-brown, vintage** — tanned-parchment base, dark-brown ink for strokes/labels,
  brown wood for signposts, desaturated-brown nation fills modulated by relief.

## Texture & political layer strategy

There is **no photo texture** to source — the map is **generated in layers**, all aligned by construction:

- **M1 base (from the heightmap, no external asset)**: hypsometric tint (elevation → color ramp; blue
  where black = sea) **× hillshade** (from the mesh normals + a "sun"). Live-tweakable via lil-gui.
- **M2+ political layer (data-driven)**: historical borders as **GeoJSON**, colored per century.
  Colors modulated by relief: `political_color × hillshade` (fills feel "inhabited" by the terrain).
  - **Nation/state level first** (open data exists, e.g. _historical-basemaps_ GeoJSON per year).
    Fine EU4-style provinces across all centuries are NOT available as open data (Euratlas is
    commercial) → design the region system **agnostic to admin level** (polygons + a `level` attribute)
    so finer granularity plugs in later where data allows.
  - **Borders must be DRAWN as lines** (strokes), not only filled areas. In 3D the line must drape the
    relief: (a) baked into the texture (drapes for free, pixelates when zoomed), (b) real 3D draped
    lines sampled onto terrain height (crisper up close, z-fighting to manage), or (c) hybrid. Decide at M2.
- **Coastline**: derived automatically from the heightmap (black = sea → land/sea mask), no manual tracing.

## Labels & text (nations, capitals, seas)

**NOT baked into the texture** (text on a tilted 3D surface distorts and becomes unreadable). Instead:
**HTML/CSS overlay labels projected from 3D→screen** (`Vector3.project()`), data-driven and screen-space
(always upright/crisp regardless of camera tilt/zoom).

- **Data-driven**: names from the same GeoJSON as the fills (`NAME`/`ADMIN`); capitals/cities from Natural
  Earth "populated places" (with a rank for declutter).
- **Declutter by zoom**: nations when far, capitals/regions when close.
- **Parchment styling**: serif font, faded-ink color, matches the vintage direction. Labels are clickable
  (a label can be a nation's click target → event).
- **Consistent** with the "native-TS overlays, no React" decision. Optional hybrid: a few timeless **sea
  names** baked into the texture (spaced italic caps, old-map look); everything else DOM.
- **Caveat**: historically-accurate capitals per century (they move) are not a turnkey dataset — modern
  easy, historical partial/curated. Design the label system **agnostic to its data source** (injected).

## Sea (LOCKED)

- **Stylized flat opaque sea** (family 2), NOT photoreal water — matches the parchment mood, cheap.
- **Light coastal liseré / shading** at the land/sea edge.
- **Decorative rhumb lines / compass rose** (ties into the screen-border chrome).
- **Not clickable at first**; **maritime regions become clickable later** (M2+ naval events — Actium,
  Lepanto…). Flat opaque, no bathymetry.

## Projection / georeferencing (the enabler)

To overlay GeoJSON (lon/lat) on the relief, the heightmap needs a **known projection + extent**.
`europeelevation.png` has an unknown CRS (from an `.eps`) → fine for the M1 look, but political data
won't align. DEM = a raster where each pixel is a real elevation in metres, already geo-tagged.

**DECISION: source a georeferenced DEM NOW** (don't rebuild the foundation later). Chosen method —
programmatic, no API key: **Terrarium terrain tiles** (AWS Open Data,
`elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, elevation RGB-encoded as
`(R*256 + G + B/256) - 32768`), fetched per Europe bbox at a chosen zoom, decoded and stitched into a
georeferenced heightmap. Native CRS = **Web Mercator** (known + exact bbox). Trade-off to revisit:
Web Mercator stretches high latitudes (Scandinavia) — later option is to reproject to **equirectangular**
(`lon→x`, `lat→y` linear) for trivial GeoJSON overlay. First pass: keep Web Mercator (fastest, no reproj).
Then **compare its relief render to `europeelevation.png`** and pick ("on verra selon le rendu").
Built as a cataloged spike: [`files/spikes/fetch-dem`](../../spikes/README.md).

## Data model — per century (vector source + derived ID-map)

> **Evolved on 2026-09-16 — see chapter [06](../cartographer/06-contribution-tooling.md).** Everything below still holds
> as the *interchange* model: lon/lat stays the archival format, and the rasterised ID-map is still the
> picking/highlight mechanism. What changed is that the raster stops being a throwaway derivative and
> becomes the **editable, owned working format** — we import vectors, rasterise, then paint on top and
> re-export. The corollary: **borders are derived from the grid, never authored**, which is also the
> structural fix for the interrupted-borders issue.

Everything is keyed by **lon/lat** (one coordinate system, projected to world X/Z). This is why the
georeferenced foundation matters: regions, events, labels, 3D markers all share the frame.

- **Source of truth = vector polygons (GeoJSON per century)**: gives borders (polygon outlines), fills,
  and label anchors (centroids) for free; editable/versionable.
- **Derived = a rasterized "ID-map"** (a 2D matrix / image where each pixel = region id), generated once
  per century from the GeoJSON → **O(1) picking** (sample id at hit UV) + **GPU highlight** (shader
  recolors the pixels whose id = hovered/selected). This is exactly EU4's `provinces.bmp` technique, but
  generated from the vector data, not hand-drawn.

Sketch:

```
Century { id, dateLabel, regions: Region[], events: Event[] }
Region  { id, name(fr), color, geometry: GeoJSON polygon (lon/lat),
          capital?: { name, lonlat }, labelAnchor: lonlat }
Event   { id, type, title, description, actors[], consequences[],
          location: lonlat, date, relatedRegionIds[] }   // location → a 3D signpost/text
```

**3D markers/signposts**: `lonlat → world X,Z → sample terrain height → place object at (X, h+offset, Z)`.
Options: a small **wooden signpost mesh** (fits the vintage look), **SDF 3D text** (troika-three-text), or
a projected **DOM label** (most readable). Data-driven: the event list → auto-placed markers.

---

## Raised 2026-09-17 — colours per era, and a provider per era

Two directions given after the 4× raster landed. Neither is started; both need a decision before code.

### Colour codes, era by era — "inspired by Europa Universalis"

**Where we are**: `data/regionPalette.ts` pins eight powers by name pattern (England red, France blue,
Iberia gold, Portugal green, HRE orange, Ottomans green, Byzantium violet, Ireland green) and colours
everything else automatically from an editable palette, respecting adjacency so no two neighbours collide.

**The fork to settle first**, because the two readings lead to different work:

- **More pinned colours, one per power, stable across all centuries.** This is what EU4 actually does —
  a country has *its* colour, always, and recognising Castile at a glance is the whole point. It is also
  a straight extension of what exists: rules added to `REGION_COLOR_RULES`.
- **A different palette per era.** The same polity would then change colour between centuries, which
  costs the recognition the first reading is built on. It buys period flavour — a 12th-century sheet
  that does not look like an 18th-century one.

The two can coexist (pinned identities + an era-tinted background palette), but only if decided on
purpose. Note the existing constraint: `assignRegionColors` knows nothing about the border strokes, so it
can pick a fill sitting between the cream core and the brown casing — see A11Y-101 in `known-issues.md`.
Any palette work should close that at the same time, with a guard test.

### A provider per era, chosen deliberately

**Where we are**: one source, addressed by year — `createFetchRegionSource((year) => /borders/europe-${year}.json)`.
The reality is already mixed and undocumented: **1700 holds an OpenHistoricalMap payload**, every other
year holds `historical-basemaps`, with the original 1700 backed up at
`files/spikes/fetch-ohm/out/europe-1700.hb-backup.json`.

**Why this is not only a data question**: `historical-basemaps` is **GPL-3.0** and cannot be shipped;
OpenHistoricalMap is **CC0** and can. So a table of "which provider for which year" is also the table of
**what this project is allowed to publish** — the two questions are the same question, and answering them
separately is how the GPL problem was missed the first time.

What it needs:

- an explicit, versioned mapping — year (or interval) → provider → licence → local path,
- provenance visible in the app, since CC-BY-style sources require attribution,
- coverage stated per provider: OHM is 93.8 % of Europe by surface at 1700 and 61.8 % at 1500, measured
  by **area, never by counting polities**.

This precedes the contribution tooling of chapter 06 rather than waiting for it: hand-authored years will
need somewhere to declare their own provenance, and that is the same table.
