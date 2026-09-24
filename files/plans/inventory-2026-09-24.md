# Inventory — everything that is planned, and what it is actually worth

> Written 2026-09-24, before re-prioritising. The point is not to list work: it is to say **what is
> already true, what is stale, and what nobody has decided**. Sources: `roadmap/01`–`07`,
> `scenarii/`, `cartographer-*.md`, `.claude/next.md`, and the code.

## A. Where things stand — facts, not impressions

|                    |                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `master`           | `8487136`, **1108 tests**, gate green                                                      |
| last `src/` change | **2026-09-18**. Six days, two of them full days of design                                  |
| uncommitted        | 4 `.claude/*.md` documents, plus today's `chrome.css` / `chrome.js` / three screens        |
| `files/` weight    | `resources/` **170 MB** · `spikes/` **95 MB** · `plans/` 380 KB · `claude-archive/` 964 KB |
| work logged        | chantier open since 22/09 — 3 spans, **10 h 12**                                           |

## B. The backlog, by track

### Track 0 — Repo hygiene · _agreed as the next step, 2026-09-23_

| #   | item                                                                              | state                       |
| --- | --------------------------------------------------------------------------------- | --------------------------- |
| 0.1 | commit the pending `.claude` documents and today's design work                    | not done                    |
| 0.2 | monorepo `core` / `atlas` / `cartographer` (pnpm workspaces, no Turbo)            | not done                    |
| 0.3 | invert the `files/` ignore rule so plans and spikes ship                          | not done                    |
| 0.4 | move `cartographer-design/` out of `resources/` (the folder that must never ship) | not done                    |
| 0.5 | split `files/plans/` into `atlas/` and `cartographer/`                            | asked for 22/09, never done |
| 0.6 | root README + `plans/README.md` with reading levels (2 min · 20 min · everything) | not done                    |

**Not negotiable inside this track**: `files/resources/` (170 MB, proprietary Euratlas) and
`files/spikes/*/out/` (the 21 GPL-3.0 `world_*.geojson`) stay ignored.

### Track T — The Cartographer · _the agreed priority after the tidy-up_

| #   | item                                                                                                                     | state                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| T.0 | **`registry.json` does not exist.** The 51 identities sit in `fetch-ohm`'s cached `relations.json`; a spike must emit it | not started                                                                     |
| T.1 | the format as types + readers, behind `data/assetError.ts`, + adapter to today's `RegionPayload`                         | not started                                                                     |
| T.2 | the geometry model — anchors stored once, rings as index lists                                                           | not started                                                                     |
| T.3 | the history manager — snapshot per gesture, ~265 KB a step                                                               | not started                                                                     |
| T.4 | the 2D canvas — hit-test, marquee, rubber band                                                                           | not started                                                                     |
| T.5 | the chrome                                                                                                               | **designed and working today**: `chrome.css`, `chrome.js`, screens 01 · 03 · 04 |

**Three holes remain (H-03, H-05b, H-08)** and all three are decided _by coding_, not before.

### Track A — The atlas · _paused since 2026-09-18_

| item                                   | state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M1.4 picking**                       | **The raycast exists and works; what is missing is the question asked of it.** `mapInteraction.ts:93` picks the terrain, hands the hit to `onSelect` — which nothing listens to — and flies the camera to `hit.point`. So the click answers **where**, in world metres. It does not answer **what**: `regionAt(u, v)` does not exist, so nothing can say which polity held that ground in year T. That is the atlas's founding gesture, and it is not built. **Why it is not a rename**: the answer lives in the political raster, an `Int16Array` computed in the worker and deliberately never shipped back (45 MB a year at 4×). The recorded design is to send a **query**, not the grid — and to return a **list**, since a vassal and its suzerain are both true at one point. |
| M2 — HTML overlay, event panel, labels | not started; carries the whole a11y backlog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| M3 — one complete century              | the north star, untouched                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| open defects                           | vertex colours written sRGB into a linear attribute · `buildTitle` untested (QUAL-021) · no keyboard way _into_ focus mode (A11Y-301) · the board cut at the wrong edge (`edgeDepth` forced to 0) · the frame's three rules have no matter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Track P — Places and events (Payload) · _chapter 06, Tool A_

**Naming, corrected 2026-09-24: "Studio" was this document's invention, never the dev's.** What the dev
named is **Payload**, the headless Next CMS. The tool is referred to by what it holds — places and
events — until it is given a name on purpose.

**Contribution is not one tool but several surfaces**, in the dev's own framing: _places_, _events_, and
often a combination of the two. A place carries a position, an icon, and — for a city — a 3D model. An
event carries a position, a date, a text, its consequences and its actors.

What changed on 22/09 is narrower than this inventory first said: **only the identities moved**, into
`registry.json`, edited from the Cartographer. Places and events are untouched and remain required —
they are what makes the atlas an atlas rather than a relief map, and cities are already the accuracy
criterion for the borders themselves.

**Sequencing, not survival**: this surface serves M2, so it comes after the Cartographer — but it is not
absorbed, not deferred indefinitely, and not a leftover.

## C. What is stale, and must not be read as current

- **Chapter 06 still argues for the georeferenced watermark** — _"c'est ça, le Cartographe"_. That was
  **reversed on 2026-09-22**: the watermark is dead, replaced by reporting by eye, which is what makes
  Duby and Euratlas usable again as references.
- **The `fetch-atlas` POC** (chapter 06) was flagged ultra-important on 17/09 and taken **off the
  critical path** by that same reversal.
- **Chapter 06 picks 1500 as the century**; the 22/09 measurements make **1100 the first contributed
  map**. Two different answers to one question, in two documents.
- **`terrainOptions.ts`'s comment on `politicalMode`** contradicts its own value.

## D. What I would re-prioritise, and why

1. **Keep the tidy-up first, but shrink it.** 0.1 → 0.6 is one session only if the monorepo move (0.2)
   is _not_ attempted the same day: it touches every ESLint boundary glob, `vite`, `vitest`, `tsconfig`
   and 1108 tests. **Do 0.1, 0.3, 0.4, 0.5, 0.6 first** — zero risk, and they are the portfolio — then
   0.2 on its own.
2. **Two packages, not three.** `cartographer` has no file yet; an empty package in a portfolio repo is
   a placeholder a reader sees. The workspace glob covers it in advance.
3. **Put T.0 before the tidy-up, not after.** Emitting `registry.json` is a spike against a cache that
   already exists. It is short, it is the input every later step needs, and it is the one item whose
   difficulty is genuinely unknown.
4. **Correct chapter 06 on the places-and-events tool** rather than deferring it: drop the invented name
   "Studio", say that only the identities moved to `registry.json`, and record that contribution has
   **three surfaces** — territory (Cartographer), identity (registry), places and events (Payload).
5. **`regionAt` is the atlas's real debt.** It is not a Cartographer task, it does not block one, and it
   is the difference between a beautiful map and an atlas. It should be named as such rather than sitting
   inside "M1.4, half done".

## E. The forks that are the dev's, not mine

- **Payload, or the same file-based format as the registry?** Settled in principle on 2026-09-24: the
  places-and-events surface is **required**, not optional. What is open is only its shape — a Next CMS,
  against a project that is otherwise a static bundle with no server, or JSON files edited by a third
  editor sharing the Cartographer's chrome. The second costs nothing to host and reuses `chrome.css`;
  the first gives a real editing UI for texts, media and relations without writing one.
- **Does `regionAt` come before the Cartographer**, or does the atlas stay frozen until the tooling
  ships? The 18/09 decision said tooling first; it was taken before the format existed.
- **Chapter 06: rewrite or annotate?** Rewriting is honest and loses the record of the reversal;
  annotating keeps the trail, which is the portfolio argument.
- **Which century is contributed first — 1100 or 1500?** Two documents disagree today.
