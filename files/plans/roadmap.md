# Roadmap — 3D Europe Map (index)

> Interactive **historical atlas of Europe in 3D** (one map per century, click → event).
> Stack: **TypeScript + three.js + Vite**. This file is a slim index — detail lives in the chapters.

## Chapters

| # | File | Contents |
|---|------|----------|
| 01 | [atlas/01-foundations.md](atlas/01-foundations.md) | Repo state + Phase 0 (bootstrap, camera persistence, KB, cleanup) |
| 02 | [atlas/02-milestone1-relief.md](atlas/02-milestone1-relief.md) | Milestone 1: relief, texture, nav, picking, performance/LOD |
| 03 | [atlas/03-camera-ux.md](atlas/03-camera-ux.md) | Viewport, on-screen UI overlays, grand-strategy camera model |
| 04 | [atlas/04-atlas-data.md](atlas/04-atlas-data.md) | Visual direction, texture/political layers, labels, sea, georeferencing, data model |
| 05 | [atlas/05-decisions.md](atlas/05-decisions.md) | Decisions log (resolved) + open questions |
| 06 | [cartographer/06-contribution-tooling.md](cartographer/06-contribution-tooling.md) | Owning the content: Studio (Payload) + Cartographer, monorepo, formats |
| 07 | [atlas/07-robustness.md](atlas/07-robustness.md) | Source validation, failure taxonomy, degraded modes, user-facing errors |

Spikes/experiments (kept, reviewable code): [`files/spikes/`](../spikes/README.md).

## Milestones overview

- **M1 — 3D navigable map**: relief from heightmap, texture, arrow-key camera navigation, clickable
  polygons + camera fly-to. (detail: chapters 01–03)
- **M2 — Interactive historical map**: click shows **event information** (battle, political decision,
  invention…, its **consequences** and **actors**). **20 historical maps, one per century (1st → 21st)**.
- **M3 — Single-century prototype**: logical click wiring — bind a click → geographic region at a point
  in time (see the data model in chapter 04).
- **M4 — Multi-century / decade extension**: history "accelerates" (fast-moving borders in the
  15th–18th c.) → possibly decade-level granularity, not just century.
- **Track T — Contribution tooling** (parallel, enabler for M2/M3, not a successor to M4): the atlas
  stops being a read-only consumer of someone else's dataset. Two authoring apps — **Studio** (Payload:
  identity + events) and **Cartographer** (canvas: territory) — feeding the atlas through static exports.
  This is what makes the "complete century" north star ours rather than inherited. (detail: chapter 06)

## Definition of done — one complete century (north star)

The app is built to be **finished**, not a pile of demos. The first real deliverable is a **vertically
complete, polished slice for ONE century**: relief + parchment sea + colored nations + drawn borders +
**labels** (nations & capitals) + click→event panel + camera — beautiful and complete. This maps to M3;
M1/M2 are the layers that build up to it.

## Architecture note (two layers)

The **heightmap = physical relief** (roughly stable over time). **Historical borders** change per
century/decade → a separate layer. The "click → region at time T" binding relies on a **temporal regions
layer** versioned by date and laid over the relief, NOT on the raw heightmap polygons. That layer is
authored as a territory grid and archived as lon/lat vectors — see chapter
[06](cartographer/06-contribution-tooling.md).

## Order of work

1. `.claude/` cleanup — DONE.
2. **DEM spike** — `files/spikes/fetch-dem` — DONE ✅ (adopt Terrarium DEM, gamma ~0.45).
3. Phase 0.1 — bootstrap Vite + three.js (+ Stats/lil-gui).
4. Phase 0.2 — camera hot-reload persistence (critical); same seam serves Escape-to-return.
5. Milestone 1 — wireframe relief (from the Terrarium DEM) → parchment texture → grand-strategy camera + click/Escape.
