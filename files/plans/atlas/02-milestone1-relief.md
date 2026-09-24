# 02 — Milestone 1: the navigable Europe map

> Chapter of the [roadmap](../roadmap.md). The M1 relief + navigation + picking, plus performance.

## 1.1 — Relief from the elevation bitmap (WIREFRAME first)

- Load the B&W heightmap, heavily subdivided `PlaneGeometry` (grid of polygons).
- **CPU-side displacement** (read pixels → per-vertex `z`, recompute normals) rather than a GPU
  `displacementMap` — **reason: raycasting must hit the real relief** (GPU displacement is invisible to
  the CPU raycaster).
- **Render in wireframe** (`material.wireframe = true`) first to validate the geometry/relief before any
  texture. Tune `displacementScale`, grid resolution (perf vs detail).

## 1.2 — Map texture (elevation ↔ texture registration)

- **Challenge**: a texture only "coincides" with the relief if it shares the **same projection, extent
  and aspect ratio** as the heightmap. See [04-atlas-data](04-atlas-data.md) for the full texture strategy.
- **M1 approach (pragmatic)**: derive the texture **from the heightmap** (hypsometric tints × hillshade)
  → alignment is free by construction; validates the pipeline without depending on sourcing.
- Apply as `material.map`, UV alignment on the plane.

## 1.3 — Arrow-key camera navigation

- Camera moved with arrow keys (map-style pan) — see [03-camera-ux](03-camera-ux.md) for the full model.

## 1.4 — Clickable polygons + fly-to

- Raycasting on click → intersection. Camera **orients toward** the point and **moves closer** (eased arc).

## Picking architecture (geometry vs semantics)

three.js raycasting returns the hit **triangle (faceIndex) + exact point** for free. But a triangle has
no meaning on its own. Two decoupled, pluggable layers:

- **`PickingService`** — on click returns `{ point, faceIndex }` (geometry layer, from M1).
- **`RegionResolver`** (injected, M2+) — maps `point → regionId` for a given date (temporal political
  layer). M1 works without it. → For **M1, "clickable polygon" = a point on the relief** (fly-to);
  regions come with the historical layer (see [04-atlas-data](04-atlas-data.md)).

## Performance & LOD (deferred — measure first)

LOD is **independent** of the Blender-vs-runtime choice: a baked OBJ has a **fixed** resolution and would
still need a runtime LOD mechanism. Runtime generation is actually better — from the **same source image**
we can build the terrain at **any resolution** (and thus a full LOD pyramid) with no re-export.

Options, by complexity:

1. **`THREE.LOD`** (simple, built-in) — generate 3–4 decreasing-resolution terrains, three.js swaps by
   camera distance. Global (one distance bucket for the whole map); fine when viewed from afar.
2. **Tiled quadtree (CDLOD / geometry clipmaps)** — split into tiles, each tile picks its resolution by
   distance (far = coarse, near = fine). The "proper" terrain LOD; more code; needed only for close
   fly-in on a large map.

**Decision for M1**: the grand-strategy camera is **bounded** (limited zoom, no ground-level free-fly),
so the distance range is controlled → a **single ~512²–1024² mesh likely suffices**. Per the project perf
rule ("delegate a heavy op only when necessary"), **do NOT build LOD in M1** — measure with `Stats`
first, add `THREE.LOD` if it stutters near the ground, tiled quadtree only if truly required.

⚠️ **Picking under LOD**: raycasting hits CPU geometry. If we ever tile/LOD aggressively, keep a **coarse
collision proxy** so clicks still hit the relief when the detailed tile isn't loaded.
