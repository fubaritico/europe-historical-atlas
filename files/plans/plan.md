# Plan of record — europe-historical-atlas

> Written 2026-09-24 from [`inventory-2026-09-24.md`](inventory-2026-09-24.md) and the decisions taken
> the same day. **This file supersedes the ordering in `.claude/next.md`.** Facts behind it are in the
> inventory; this one says only what to do, in what order, and how we know a step is finished.

## The end state we are aiming at

A private monorepo named **`europe-historical-atlas`**, holding the atlas and the tools that author its
content, with **a public Netlify URL fit to put on a CV**. Private because the concept has no equivalent
we know of and the design corpus is the valuable part; public where it counts — the running application.

## Decisions taken 2026-09-24, not to be reopened

|                                                           |                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**                                                  | `europe-historical-atlas`. `package.json` already carries it; the splash already reads `EUROPE / HISTORICΛL ΛTLΛS`. Only the local folder and the future remote differ, and neither is visible to a reader.                                                       |
| **`regionAt` waits**                                      | Not a preference — today's political data is `historical-basemaps`, GPL-3.0 and git-ignored. Building the atlas's central gesture on data we can never publish would be building it twice.                                                                        |
| **Payload is an authoring tool, never deployed**          | It runs locally, writes to its own SQLite file (`@payloadcms/db-sqlite`, Drizzle + libSQL), and the atlas reads **static exports**. That removes the "it needs a server" objection entirely.                                                                      |
| **Volume is a partitioning question, not a database one** | An event ≈ 1 KB. Ten thousand ≈ 10 MB, split by century ≈ 500 KB each — less than the rivers file already shipped. Revisit only if one century passes ~2 MB, or if search must cross all centuries; the answer then is SQLite-over-HTTP in WASM, still no server. |
| **Contribution has three surfaces**                       | territory (Cartographer) · identity (`registry.json`) · places and events (Payload). None absorbs another.                                                                                                                                                        |
| **Ship without the political layer first**                | Everything finished today is ours or public domain. Waiting for contributed data would cost months of having no link.                                                                                                                                             |

---

## P0 — Protect the corpus · _before anything becomes visible_

Once the application is on a public URL, the **idea** is visible even though the documents are not.
Depositing first costs €15 and settles the date.

1. **e-Soleau at the INPI**, file mode, on `files/plans/` — the 13 scenarios, the groundwork, the format,
   the UI inventory, the screens. ~8 MB against a 50 MB ceiling, so no hash-mode discipline needed.
2. Record the deposit's date and reference in this file.

**Done when** the INPI receipt exists. _An idea is protectable by nothing; this dates the expression, and
confers no right. Not legal advice — confirm with the INPI._

## P1 — The CV link · _the highest value for the least risk_

### 1.1 Commit what is pending

The four `.claude/*.md` documents, plus today's `chrome.css`, `chrome.js`, `screen.js`, `mock-data.js`
and the three `.html` screens.

### 1.2 `files/` stops being ignored

```gitignore
files/*
!files/plans/
!files/spikes/
files/spikes/*/out/
```

Deliberately still ignored: `files/resources/` (**170 MB**, proprietary Euratlas), `files/spikes/*/out/`
(the 21 GPL-3.0 `world_*.geojson`), `files/session-log.jsonl`, `files/claude-archive/`.

### 1.3 Move the design work out of `resources/` — **done 2026-09-24**

`files/resources/cartographer-design/` → `files/plans/cartographer/design/`. It is **our** work, 7 MB,
and the strongest thread of the portfolio, and it was sitting in the one folder that must never ship.

### 1.4 Split `files/plans/`

```
files/plans/
├── README.md          reading levels: 2 min · 20 min · everything
├── plan.md            this file
├── glossaire.md
├── atlas/             roadmap 01–05 and 07, focus-mode.md, readability-budgets.md
└── cartographer/      groundwork, format, ui-inventory, roadmap 06, scenarii/, design/
```

### 1.5 Annotate what is stale rather than rewriting it

In roadmap 06: the georeferenced watermark is **dead** (reversed 22/09), `fetch-atlas` is **off** the
critical path, the century is **1100** and not 1500, and the invented name _"Studio"_ goes. Annotate —
the trail of a reversal is the portfolio argument.

### 1.6 The two READMEs

Root, and `files/plans/README.md`. The root one leads with the **method**, not a feature list: behaviour
first (13 scenario files, 26 holes found by describing gestures), then the screens, then the code. Said
honestly, including that the atlas itself was not built that way — the Cartographer is where the method
applies from the start.

### 1.7 Create the remote — **needs an explicit go**

`gh repo create europe-historical-atlas --private`, then push `master`. `gh` is authenticated as
`stefcot`. **Nothing outward-facing happens without the dev saying so.**

### 1.8 Deploy

`netlify.toml` (`build = "pnpm build"`, `publish = "dist"`) and `.nvmrc` pinning Node 22. Connecting the
repository to Netlify is OAuth: **the dev's hand, not automatable.**

### 1.9 Check before pushing

`git count-objects -vH`, and a `git status` showing no 6 MB PNG arriving by accident. The terrain bitmap
exists in two places and one of them stops being ignored at step 1.3.

**Done when** a public URL shows the relief, the coastline, the rivers, the graticule, the sheet, the
compass and the title — and **no political layer**, which is expected and stated in the README.

## P2 — The monorepo · _its own session, nothing else that day_

`core` (`data/`, `pipeline/`, `geo/`, `utils/` — no three.js) and `atlas` (`scene/`, `camera/`,
`controls/`, `ui/`, the bootstrap). **Two packages, not three**: `cartographer` has no file yet and an
empty package is a placeholder a reader sees. pnpm workspaces alone — no Turbo at this size.

Separate because it touches every ESLint boundary glob, `vite`, `vitest`, `tsconfig` and 1108 tests. The
safety net is those tests: the split is finished when they are all green and `pnpm build` still produces
a worker chunk with no three.js in it.

### No Turbo, no Lerna — settled 2026-09-24 with a threshold, not a feeling

**Lerna is a category mismatch.** Its job is versioning and publishing packages to npm. We publish
nothing; our packages are consumed only by our own application.

**Most of what Turbo is credited with, pnpm already does.** `pnpm -r --filter` runs tasks in topological
order and in parallel where they are independent. What Turbo adds is the **cache**: skip a task whose
inputs are unchanged, and share that cache across machines.

**Measured 2026-09-24**: `type-check` 1.4 s · `build` 1.7 s · `test` 9.0 s — the whole gate is ~12 s. At
two packages where `atlas` depends on `core`, touching `core` invalidates everything downstream, and
`core` is where most changes land. Expected saving today: **a few seconds, sometimes.**

**Add it when either of these is true, whichever comes first:**

1. **a CI exists** — that is where remote caching is unbeatable, and there is none today;
2. **the gate passes ~30 s** — not for the time itself, but because a slow gate is a gate people start
   bypassing with `--no-verify`, and that is the real cost.

**The risk to remember when we do add it**: `turbo.json` declares each task's `inputs`. Declare them
wrong — one file forgotten — and you get a **stale cache hit**: the gate goes green on code it never
tested. Silent, and worse than having no cache.

**What to do instead, right now and for free**: once the packages exist, have the pre-commit hook test
only the _affected_ packages using pnpm's changed-since filter. That captures most of the benefit with
no configuration file to keep in sync. (Verify the exact filter syntax when wiring it.)

## P3 — `registry.json` · _short, and everything downstream needs it_

The 51 identities at 1100 — names, ranks, Q-ids, `name:fr` on 81 % — sit in `fetch-ohm`'s cached
`relations.json`. A spike emits the registry. First because it is the one item whose difficulty is
genuinely unknown.

## P4 — The Cartographer

1. **Format as types and readers** — `registry.json` + `<year>.json`, hand-written readers behind
   `data/assetError.ts` (`transport | schema | consistency | semantic`), plus the adapter down to today's
   `RegionPayload` so the atlas does not change by a line. Pure, testable with literals.
2. **Geometry model** — anchors stored once, rings as index lists. The test to write by breaking it on
   purpose: a save/load round trip **keeps the sharing**. Restored naïvely the screen looks identical and
   the sliver appears three gestures later.
3. **History manager** — snapshot per gesture, ~265 KB a step. Same trap: a snapshot must restore the
   _sharing_. Document state only — never the active tool, the zoom or the pan.
4. **Canvas** — 2D, `globalCompositeOperation = 'overlay'`. Hit-testing, marquee, rubber band: pure
   arithmetic, testable with literals.
5. **Chrome** — port the values from `design/chrome.css`, not the markup. `initDocks` becomes
   `ui/panelDock.ts` with its five-level suite; its arithmetic (clamp, bounds, restore) is already pure.

Three holes stay open on purpose — **H-03** (how many handles, from what zoom), **H-05b** (two peers over
one ground), **H-08** (the raster lags the outline) — because they are decided by coding.

## P5 — The first contributed year, and the political layer ships

Draw 1100. Replace the GPL payload. **Then and only then** `public/borders/` can stop being ignored, and
the deployed atlas gains its fills and borders. This is the step that turns the project from a consumer
of someone else's dataset into its own source.

**Also the day the README gets its picture** — see the section on the deferred screenshot below. Not a
loose end: it is the first moment an image of this project shows history rather than terrain.

## P6 — `regionAt` and the country focus

A query on the compute port, not a copy of the grid: `regionAt(u, v)` returns **a list**, since a vassal
and its suzerain are both true at one point. Then the click answers _what_, and the country focus mode
has its input.

## P7 — Places and events

Payload locally, SQLite file, static exports committed. Cities first — they are already the accuracy
criterion for the borders themselves, so they earn their place twice.

---

## The README's screenshot — deferred on purpose, 2026-09-24

The root README opens with no image, and that is a decision rather than an omission. The dev's reason,
and it is the right one: **as the atlas stands, a screenshot says very little.** A relief with no
political layer reads as a pretty terrain render, which undersells a project whose subject is history.

**So the trigger is not "when someone has time" — it is P5.** The screenshot is worth taking the day a
year is drawn and its fills and borders are ours: that image shows the relief, the sheet, the drawn
coastline _and_ a political Europe that owes nothing to anyone. One picture then carries the whole
argument; one picture now carries a landscape.

Only the dev can take it — it is his screen, `pnpm dev`. Two shots are probably wanted: the atlas
itself, and the Cartographer mid-gesture, because the method is half the point.

## Carried, and not forgotten

Defects whose fix is due when their file is next opened: vertex colours written sRGB into a linear
attribute · `buildTitle` unreached by any test (QUAL-021) · no keyboard way **into** the focus mode
(A11Y-301) · the board cut at the map's edge instead of the sheet's (`edgeDepth` forced to 0) · the
frame's three rules have no matter in them · `terrainOptions.ts`'s comment contradicting its own value.

## Open, for the dev

- **Prior art** — research whether an interactive 3D historical atlas with dated borders and its own
  contribution tooling exists elsewhere. Offered, not yet run.
- **A trademark on the name** — only worth it if commercial use is intended. Otherwise €190 for nothing.
- **H-23** (does the vassal hand weaken by degree), **H-26's other half**, Norse Greenland, and the
  coordinate precision in the file.
