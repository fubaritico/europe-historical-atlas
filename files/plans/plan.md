# Plan of record — europe-historical-atlas

> Written 2026-09-24 from [`inventory-2026-09-24.md`](inventory-2026-09-24.md) and the decisions taken
> the same day. **This file supersedes the ordering in `.claude/next.md`.** Facts behind it are in the
> inventory; this one says only what to do, in what order, and how we know a step is finished.

## The end state we are aiming at

A private monorepo named **`europe-historical-atlas`**, holding the atlas and the tools that author its
content, with **a public Netlify URL fit to put on a CV**. Private because the concept has no equivalent
we know of and the design corpus is the valuable part; public where it counts — the running application.

## Decisions taken 2026-09-24

> **Who decided what is part of the record.** A conclusion I reached on my own is not a decision the dev
> made, and filing the two under one heading is how an assumption becomes law without anyone agreeing to
> it. It happened here on 2026-09-24 — I invented "Payload is never deployed", wrote it into this table
> as unreopenable, and the dev had never said it. **Dev** rows are settled. **Inferred** rows are mine:
> arguments, open to being overturned by a sentence.

| by       |                                                           |                                                                                                                                                                                                       |
| -------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **dev**  | **Name**                                                  | `europe-historical-atlas`. `package.json` already carries it; the splash already reads `EUROPE / HISTORICΛL ΛTLΛS`.                                                                                   |
| **dev**  | **`regionAt` waits for the Cartographer**                 | And the reason is stronger than the preference: today's political data is `historical-basemaps`, GPL-3.0 and git-ignored, so the atlas's central gesture would be built on data we can never publish. |
| **dev**  | **The contribution tool ships in the repo; going online is suspended** | Its code is committed, never git-ignored, and it uses the common design system. **Online is postponed, not refused**: online means accounts, login and a security layer we are not building now, and the tool has to be bulletproof first — we are still testing it. Until then it runs locally and the atlas reads its output over a relative URL. |
| **dev**  | **Contribution has three surfaces**                       | territory (Cartographer) · identity (`registry.json`) · places and events (Payload). None absorbs another.                                                                                            |
| inferred | **Volume is a partitioning question, not a database one** | An event ≈ 1 KB. Ten thousand ≈ 10 MB, split by century ≈ 500 KB each — less than the rivers file already shipped. Revisit if one century passes ~2 MB, or if search must cross all centuries.        |
| inferred | **Ship without the political layer first**                | Everything finished today is ours or public domain. Waiting for contributed data would cost months of having no link. Tacitly accepted when P1 was approved, never argued on its own.                 |
| **dev**  | **The design system is `fubaritico-ds`, as an external dependency** | Used by all three apps. Adopted only once **the Cartographer is finished and comfortable to use** and **the system is complete** (~10 components still missing). Until then `chrome.css` stays inside the cartographer — no `packages/ui`, since extracting a package we know will be deleted is building the wrong thing carefully. |
| **dev**  | **Content ships as static JSON** | Not the SQLite file: a browser cannot query it over a relative URL. Limits measured, and the index/body split that lifts them, in P7. |

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

### 1.7b Continuous integration — **done 2026-09-24**, runs on the first push

Ported from `fubaritico-ds` and adapted rather than copied. `ci.yml` orchestrates `validate` (lint,
type-check and test as three parallel jobs), `build`, then `sonarqube`, and closes on a `quality-gate`
job. Three adaptations worth knowing:

- **his action versions were one major behind** on three of four — checked against the registry rather
  than copied: `checkout@v7`, `setup-node@v7`, `action-setup@v6`, `upload-artifact@v7`, `sonar scan@v8`;
- **no pre-build step.** His `validate` needs a task runner to build dependencies first because
  cross-package types come from `dist/*.d.ts`. Ours reads `core` as TypeScript source, so the three jobs
  start cold and in parallel with nothing to wait on;
- **one lcov instead of one per package**, because a single vitest run covers both.

The build job also **asserts the worker chunk carries no three.js**. A bundle boundary is invisible in a
diff, and it is the one property here that could be lost in silence.

**Sonar self-skips while `SONAR_TOKEN` is absent**, so the first push is green before the SonarCloud
project exists. Two things only the dev can do: create the project (confirming `projectKey` and
`organization`), and add the secret. Then `sonar-init.yml`, once, by hand.

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

1. ~~a CI exists~~ — **amended 2026-09-24, the same day the CI landed.** That wording was mine and it
   was too coarse. In CI the dominant cost is `pnpm install` in each job, which Turbo does not touch at
   all; our whole gate is 12 s against an install that is longer. The real trigger is **enough packages
   that skipping the unaffected ones is worth something** — at two, a change in `core` invalidates
   everything downstream anyway;
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

**Its code ships; the tool itself stays local for now** — the dev's call, 2026-09-24.

*Not the constraint removed at the top of this file.* That one was **mine**, permanent, and argued from
hosting convenience. This one is the dev's, **staged**, argued from security and maturity, and it names
what would lift it: *"si c'est en ligne, il faut pouvoir se loguer, il faut que ce soit sécurisé"*, and
*"il faut un outil de contribution éprouvé, bulletproof"*. Putting a public write endpoint on the
internet before the editor is trustworthy buys risk and no reader.

So: the package is committed like any other, runs on the dev's machine, keeps its database in a file,
and the atlas reads what it produces over a **relative URL**.

**When it does go online** — and it is meant to — the shape is known: Payload is a Next application, so
it needs a server runtime and a reachable database. A SQLite *file* does not survive a serverless
filesystem, so that day means network SQLite (libSQL / Turso, spoken by the same
`@payloadcms/db-sqlite` adapter) or Postgres, plus the auth layer. What it buys is contribution from the
web by more than one person, which is what handing out access was about.

Cities first: they are already the accuracy criterion for the borders themselves, so they earn their
place twice.

### Static JSON — chosen 2026-09-24, and where it actually breaks

**A browser cannot query a SQLite file over a relative URL**, so the two shapes were: exported JSON, or
shipping the `.db` and querying it with `sqlite-wasm`. **The dev chose JSON.** It is what every other
asset in this project already is, and it costs nothing new to build.

**Measured on this machine, on `europe-rivers.json` — the largest JSON the atlas loads today:**

| | |
|---|---|
| raw | 0.83 MB |
| gzip | 0.20 MB — **76 % smaller** |
| brotli | 0.12 MB — **86 % smaller** (Netlify serves brotli) |
| `JSON.parse` | 4.6 ms → **182 MB/s** |
| heap once parsed | **×2.7** the text size |

**So the extrapolation, per century, loading the file whole.** An event with its text, actors and
consequences is ~1–2 KB of JSON:

| per century | raw | gzip | parse | heap | verdict |
|---|---|---|---|---|---|
| ~1 000 events | 1.5 MB | 0.36 MB | 8 ms | 4 MB | free |
| ~5 000 events | 7 MB | 1.7 MB | 38 ms | 19 MB | fine |
| ~20 000 events | 30 MB | 7 MB | 165 ms | 80 MB | a visible hitch on every change of year |
| ~50 000 events | 75 MB | 18 MB | 410 ms | 200 MB | no |

**The limit is not JSON and it is not the network** — brotli makes the transfer a non-issue. The limit
is **loading a whole file to read one record**, and it bites at roughly **10 000 events per century**.

**The fix that removes the worry, and it should be designed into the export from the first day:**
**split each century in two.** An *index* — id, date, lon/lat, title, ~120 bytes an event — and the
*bodies*, fetched one at a time when the reader clicks. The index carries everything the map needs to
draw a pin:

| index of | raw | gzip | parse |
|---|---|---|---|
| 5 000 events | 0.6 MB | 0.15 MB | 3 ms |
| 50 000 events | 6 MB | 1.4 MB | 33 ms |

With that split, **50 000 events a century still costs 33 ms**, and a body is 2 KB fetched on demand.
The ceiling moves from thousands to tens of thousands without any new machinery.

**What stays impossible with static files, and is the honest wall**: searching *across* all centuries at
once. That needs either a prebuilt index shipped as its own file, or a server. Same threshold as the
volume row at the top — it has not moved.

**If it ever does hitch**: parse in the worker. The political pipeline already lives there, so the
pattern and the port exist.

