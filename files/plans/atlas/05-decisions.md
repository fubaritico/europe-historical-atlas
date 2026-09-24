# 05 — Decisions & open questions

> Chapter of the [roadmap](../roadmap.md). The running log of what's locked and what's still open.

## Resolved

- **No React** — UI overlays in **plain native TS** over the canvas. → **plain three.js**.
- **No Blender** — the relief is generated **at runtime** from a grayscale PNG heightmap (CPU
  displacement of a subdivided plane). Fully parametric (resolution, vertical exaggeration, scale via
  lil-gui), swappable source, hot-reloadable. The generated mesh is the raycast target. Blender stays a
  _later, optional_ path only if sculpting / LOD / decimation is ever needed. The old `.blend`/`.obj`
  and previous 3D project are lost — irrelevant, we restart.
- **Navigation limits** = clamp ground target to map bbox + clamp zoom `[min,max]` (not fog).
- **M1 texture** = derived from the heightmap (hypsometric × hillshade), to decouple from sourcing.
- **M1 "clickable polygon" = a point on the relief** (fly-to); regions are a later `RegionResolver` layer.
- **Fly-to** follows an eased arc, ending locked at ~45° pitch (close-up).
- **Visual direction = vintage school-atlas / parchment** (muted brown nation colors, drawn coastlines,
  prominent + meaningful relief). See [04-atlas-data](04-atlas-data.md).
- **Sea = stylized flat opaque** + coastal liseré + compass rose; not clickable at first.
- **Georeferenced DEM — DONE & ADOPTED** ✅ via the `files/spikes/fetch-dem` spike (Terrarium tiles, Web
  Mercator, no key). **Bbox widened on 2026-09-13 to W−45 / S11.178 / E78.75 / N76.841** (1280×1164, the
  Total-War "hors-champ" frame) — this entry previously still quoted the original narrower box.
  Beats `europeelevation.png` (georeferenced) once a
  **gamma tone curve (~0.45)** lifts the plains. `europeelevation.png` demoted to reference. App reads raw
  elevation (gamma/exaggeration live-tunable). Web Mercator distortion acceptable for now; equirectangular
  reproject is a later option.
- **Political layer**: nation/state level first (data exists), region system agnostic to admin level;
  borders drawn as **lines + fills**.
- **Labels** = projected HTML/CSS DOM overlays (data-driven, declutter by zoom, parchment style), not baked.
- **Data model** = vector GeoJSON (source) + derived rasterized **ID-map** (EU4 `provinces.bmp` style) for
  O(1) picking + GPU highlight; everything keyed by lon/lat.
- **Definition of done** = a vertically complete, polished slice for **ONE century**.
- **Heightmap chosen (M1 look)**: `files/resources/blender/europeelevation.png` (2208×1971, 8-bit,
  grayscale-in-RGB). Best dynamic range, full Europe extent, **sea = pure black** (→ free water/coastline
  mask). All available sources are 8-bit (no 16-bit DEM) → mitigate banding with a light blur + generous
  subdivision + vertical exaggeration. Fallback: `tangrams…/europe-2048x2048.png` (square, Web Mercator,
  darker plains). Chosen image projection/extent unknown (from an `.eps`) — fine for M1 look only.
  Note: `files/` is gitignored — copy the PNG into the app (`public/heightmaps/`) at bootstrap.

## Resolved — 2026-09-16 (contribution tooling, chapter [06](../cartographer/06-contribution-tooling.md))

- **Own the content, don't replace the model.** The vector/lon-lat decision above **stands** as the
  interchange format. What is added: the rasterised ID-map becomes the **editable working format** —
  download, read, edit, own — instead of a throwaway derivative. An evolution of the 04 model, not a
  reversal of it.
- **Three concepts, not two**: *identity* (who exists — registry), *territory* (who owns which cell at
  year T — the painting), *border* (**derived, never authored**). Consequence: **there is no border
  editor**. This is also the structural fix for the interrupted-borders issue — fills and borders stop
  being two sources of truth for the same object.
- **Two authoring apps**: **Studio** (Payload — polity registry *and* events; a registry is relational
  text, so no custom CRUD app to build) and **Cartographer** (2D canvas — territory painting, the one
  thing a CMS cannot do). Payload is an **authoring-time** tool: the published atlas stays a static build
  with no server and no DB, fed by exported JSON behind a `ContentSource` port.
- **Wikidata Q-ids as first-class fields**, not links inside rich text — queryable, multilingual, CC0,
  and they open SPARQL seeding so authoring becomes curation instead of data entry.
- **Events carry a date interval, not an instant**, and a first-class `EventType`; a click returns a
  **list** from a spatial query, not a single polygon hit (M1.4 design constraint).
- **Monorepo: the trigger has arrived.** Three apps sharing projection + data logic is the seam
  `rules/troubleshooting.md` was waiting for → pnpm workspaces + Turbo, `packages/core` (pure TS, no
  three.js). Do it when the second app actually exists, not before.
- **Temporal model = dated snapshots** for now; interval-based polities **recorded and deferred** at the
  dev's request (memory `polity-temporal-model`) — he has an idea from 2026-09-14 to revisit.
- **Accepted limits of a grid**: no overlapping claims (condominium / contested zones — vassalage is
  expressed through the identity hierarchy instead); border annotations attach to a *derived* segment
  keyed by the pair of polities it separates; resolution is bounded (~3.8 km at 2× the DEM).

## Pending (before / during Milestone 1)

1. **Asset location**: `public/heightmaps/` (served as-is by Vite) vs `src/assets/` (bundled)?
2. **DEM sourcing params**: Europe bbox (lon/lat bounds) + tile zoom (resolution vs weight)?
   Web Mercator now vs reproject to equirectangular later.
3. **Lighting**: directional "sun" (adjustable azimuth) + ambient for hillshade; shadows or not.
4. **Camera yaw**: free-with-default vs fully locked (tentative: free cruising, locked when zoomed out).
5. **Fog**: aesthetic use / edge-hiding, or skip? (independent of navigation limits)

> Items 1–2 are settled in practice (`public/heightmaps/`, bbox + zoom 5 above); left in place until
> someone confirms and strikes them.

## Pending — contribution tooling (chapter [06](../cartographer/06-contribution-tooling.md))

1. **Licence — NARROWED 2026-09-16, not dissolved.** See chapter 06 and spike `files/spikes/fetch-ohm`.
   **OpenHistoricalMap is CC0** (since 2022-08-03; its Overpass responses carry the dedication) and the
   ingest is proven end to end: ring assembly **98.8 % at 1700, 100 % at 1800/1900/2000, zero unclosed
   rings**. But coverage is **episodic**, because OHM stores one dated boundary relation per border change.
   Measured objectively as **share of the frame's land actually covered** (rasterised against the Natural
   Earth land mask), in Europe proper: **1500 = 61.8 %**, 1700 = 93.8 %, 1800 = 95.3 %, 1900 = 100 %,
   2000 = 100 %, against ~96.8 % for `historical-basemaps` at every date.
   **Two earlier metrics are withdrawn**: counting relations "alive at year Y" (counts label-only
   placeholders and non-European entities in our wide frame — it produced a bogus "parity from 1500"),
   and counting hand-picked *"major powers"* (an editorial judgement of ours, not a property of the data).
   **OHM also carries no identity hierarchy** — `part_of:empire` on 15 relations out of 2059 — so the
   "colour by empire" view is not free with it; but `wikidata` on 94 % offers a route to derive one.
   → Adopt OHM **from ~1700**; `historical-basemaps` leaves the shipping path and stays a gitignored
   private reference for checking facts. **100 → ~1600 becomes authoring work** — the real cost, and the
   thing to size before committing the atlas to a century range.
2. **Grid resolution**: 2× the DEM (~3.8 km, ~12 MB `Uint16`) or 4× (~1.9 km)?
3. **Cartographer ↔ Studio**: write to Payload's API directly, or read the registry and write files only?
4. **Payload stack**: current major and whether it needs a Next.js host; DB adapter (Postgres vs SQLite
   for local-only authoring); confirmation that no polygon field type exists. **To verify, not assumed.**
5. **Sea ownership**: territorial waters / naval empires painted, or territory kept strictly terrestrial?
