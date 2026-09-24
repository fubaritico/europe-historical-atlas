# Spikes & experiments — catalog

> Exploratory code lives **here** (in `files/`), not on the assistant's scratchpad — so it's **kept,
> reviewable, reusable, and reworkable**. Each spike is a small self-contained experiment that de-risks
> one question or demonstrates one technique. When a spike graduates into the real app, it moves into
> `src/` (or `tools/`) and its entry here is marked _graduated_.

## Convention

- One folder per spike: `files/spikes/<name>/`.
- Each spike has its own `README.md` (what it probes, how to run it, what we concluded) + the code.
- Prefer standalone, dependency-light scripts (Node ESM). No coupling to the app.
- Runnable from the repo root; outputs go under the spike folder (or `files/resources/…`).
- Keep it readable — the point is to **learn from and rework the code**, not just get a result.

## Catalog

| Spike | Question it probes | Status |
|-------|--------------------|--------|
| [`fetch-dem`](fetch-dem/) | Can we source a **georeferenced heightmap** programmatically (Terrarium tiles, no key), and does it look better than `europeelevation.png`? | **done** ✅ (adopt it; gamma curve needed) |
| [`fetch-ohm`](fetch-ohm/) | Can **OpenHistoricalMap** (CC0) replace the GPL-3.0 border source — do OSM-style boundary relations assemble into rings, and is coverage sufficient? | **done** ✅ (assembly 98.8 %, no unclosed rings; coverage good from ~1700, unusable at 1500) |

| [`terrain-bitmap`](terrain-bitmap/) | Can the atlas's **painted terrain texture** be baked outside the browser, so the Cartographer's interface can be designed over the real backdrop? | **done** ✅ (2560×2328 in 1.8 s, project defaults, no new dependency) |

_(Add a row per new spike. Mark `done` / `graduated` / `dropped` as they evolve.)_
