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
| **dev**  | **The contribution tools run locally first, and go online after** | Their code is committed like any other, and they use the common design system. **Online is the next step, not a cancelled one** — the dev's wording, corrected here on 2026-09-24: *make it work, then think about having it online*. Going online brings accounts, login and a security layer, so the editor has to be proven first. Until then they run locally and the atlas reads their output over a relative URL. |
| **dev**  | **Contribution has three surfaces**                       | territory (Cartographer) · identity (`registry.json`) · places and events (Payload). None absorbs another.                                                                                            |
| inferred | **Volume is a partitioning question, not a database one** | An event ≈ 1 KB. Ten thousand ≈ 10 MB, split by century ≈ 500 KB each — less than the rivers file already shipped. Revisit if one century passes ~2 MB, or if search must cross all centuries.        |
| inferred | **Ship without the political layer first**                | Everything finished today is ours or public domain. Waiting for contributed data would cost months of having no link. Tacitly accepted when P1 was approved, never argued on its own.                 |
| **dev**  | **The design system is `fubaritico-ds`, as an external dependency** | Used by all three apps. Adopted only once **the Cartographer is finished and comfortable to use** and **the system is complete** (~10 components still missing). Until then `chrome.css` stays inside the cartographer — no `packages/ui`, since extracting a package we know will be deleted is building the wrong thing carefully. |
| **dev**  | **Content ships as static JSON** | Not the SQLite file: a browser cannot query it over a relative URL. Limits measured, and the index/body split that lifts them, in P7. |

---

## P0 — Protect the corpus · _before anything becomes visible_

Once the application is on a public URL, the **idea** is visible even though the documents are not.
Depositing first costs €15 and settles the date.

**DONE — deposited around 2026-09-25**, reported by the dev on 2026-09-27. The reference and the exact date
are his to paste in below when convenient; nothing else is pending, and **nobody should ask again.**

> reference: _(to fill in)_ · date: _(to fill in)_

A deposit is **sealed and immutable** — there is no such thing as updating one. Dating a later state means a
**new deposit**, €15, independent of this one. The dev's call, 2026-09-27: **one more when the whole thing is
finished**, and none in between.

1. ~~**e-Soleau at the INPI**, file mode, on `files/plans/`~~ — done. Procedure kept for the next deposit:
   [`e-soleau.md`](e-soleau.md).
2. ~~Record the deposit's date and reference here~~ — above.

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

### 1.8b Secrets must be declared on the repository, never on the organisation

**Measured 2026-09-24, and it is a paywall rather than a setting.** GitHub's own documentation:
*"Organization-level secrets and variables are not accessible by private repositories for GitHub
Free."* The `fubaritico` organisation is on Free and this repository is private, so an organisation
secret arrives **empty**.

The trap is what that does downstream: `SONAR_TOKEN` empty → the Sonar job self-skips → **the pipeline
stays green while analysing nothing**. The API is no help either — it lists the secret as shared with
the repository, because it reports the configured *policy*, not runtime availability.

What makes it survivable is the skip notice: the job says out loud that it skipped and why. A silent
skip would have looked exactly like a passing build. Any future guarded-by-a-secret job should print
the same kind of line.

**So: `SONAR_TOKEN`, `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` are repository secrets.** Repository
secrets work on every plan. Upgrading the organisation to Team would also fix it and would be paying a
subscription to avoid three copy-pastes.

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

## P3 — ~~`registry.json`~~ · **done 2026-09-27, and it changed the format**

The spike ran: `files/spikes/build-registry/build-registry.mjs`, over `fetch-ohm`'s cached
`relations.json`. **What it found is worth more than what it emitted.**

- Grouping 2 059 relations by Wikidata id **split the Kingdom of France into four**, because OHM gives each
  period its own Q-id. A Q-id identifies _a polity during a period_, not a polity.
- `s02` was wrong on the central case: the France alive at 1100 (relation 2810170, "Reaume de France",
  1050→1212) carries **no Q-id and no `name:fr`**. Its French name is `name` itself, in period spelling.
- The `admin_level=2` catalogue reaches back to the Cernavodă culture at −4000: **748 polities**, of which
  **52** are alive at 1100 (49 with a Q-id, 42 with `name:fr` — the recorded 81 % holds, 28 with a rank).

**Hence the dev's decision, the same day: one registry per year, nothing shared** — which deletes dated
names, dated relations and the whole grouping problem — while **keeping `existsFrom` / `existsTo`**, which
are facts in the year's own file and are what warn that a polity was carried into a year it did not live in.
`format.md` rewritten,
`s04`/`s05`/`s07`/`s99` and the glossary corrected.

## P4 — The Cartographer

> **This table is the plan of record for P4**, at the dev's request, 2026-09-27 — _"ça c'était clair"_. It is
> repeated in French at the top of `.claude/next.md`, so it is the first thing read at the start of every
> session until P4 is done. **The order is dictated by dependencies, not by preference.**

| #     | what it is                                                                                                                                                                                                  | what it delivers                                                                          | how we know it works                                                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **1** | The **types** of the three files + three hand-written **readers** in `packages/core/src/data/`, beside `heightmap.ts` and `landMask.ts`, behind `assetError.ts` (`transport \| schema \| consistency \| semantic`). Plus the **adapter** down to `RegionPayload` | **The atlas reads a hand-written year and renders it.** Not one line of `src/` changed    | write a `1100/` folder by hand, run `pnpm dev`, the map appears                                              |
| **2** | The **document model**: anchors once, rings as index lists, and the operations — place, move, delete, **duplicate a path**, close a ring. Plus the **border derivation** (count owners, inclusion for single-owner runs) | A document that can be exercised in tests, with no screen                                 | a save/load round trip **keeps the sharing**: move an anchor afterwards and both outlines follow             |
| **3** | The **history manager**: one snapshot per gesture                                                                                                                                                           | `ctrl+z`                                                                                  | same trap as 2 — a restore must restore the **sharing**, not the coordinates                                 |
| **4** | The **2D canvas**, cut in two: the **arithmetic** (hit-test, marquee, rubber band, screen↔world) which is pure, and the **drawing**, a shell with no logic                                                   | Something on screen                                                                       | the arithmetic is tested with literals — and that cut is what makes it testable at all                       |
| **5** | The **chrome**: `{Polities}` as a tree, the forms, `{Overrides}`, the three marks of a derived year                                                                                                          | The application                                                                           | values ported from `design/chrome.css`, never its markup; `initDocks` becomes `ui/panelDock.ts` with its suite |

**Steps 4 and 5 create `packages/cartographer/`** — a third package, as the dev's own taxonomy in
`architecture.md` has it: Payload is an app, the atlas is an app, `core` is a resource.

**How it is done**, and it is not negotiable per step: each step is verified and **committed on its own**, no
accumulation. `core` stays free of three.js and of the DOM — enforced by ESLint *and* by `tsc`
(`lib: WebWorker`) — so steps 1, 2 and 3 are **entirely pure**: no canvas, no fetch, no browser. Every guard
is tested **by breaking it on purpose**, which is what caught the post-drag `click` and the panel's 123
controls. Gate after every change: `pnpm type-check && pnpm lint && pnpm test`, then `/review`, then
`/commit`.

**Why step 1 first**: it is the smallest, it is pure, it ends with something visible, and it **defines the
types the other four use** — doing the geometry model first would mean inventing them twice.

**The reservation, stated**: the blocking vulnerability — deleting a polity must not delete anchors its
neighbours share ([s05](cartographer/scenarii/s05-derive-a-year.md)) — lives in **step 2**, and cannot be
tested before the document model exists. It waits one step. Deliberate, not forgotten.

### Step 1, broken down

1. `data/yearFormat.ts` — the types for `registry.json`, `polities.json`, `borders.json`.
2. `data/registrySource.ts` — the reader, with its five-level suite.
3. `data/politiesSource.ts` + `data/bordersSource.ts` — same shape.
4. One **cross-file consistency check**: `polities.json` naming an id `registry.json` lacks is a
   `consistency` failure, not a schema one.
5. `data/toRegionPayload.ts` — indices resolved to `[lon, lat]`, the name written flat, `subjectTo` from
   `suzerain`.

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

**Its code ships; the tool runs locally first and goes online after** — the dev's call, 2026-09-24.

*Not the constraint removed at the top of this file.* That one was **mine**, permanent, and argued from
hosting convenience. This one is the dev's, and it is a **sequence rather than a suspension** — "make it
work, then think about having it online". What the online step brings with it: *"si c'est en ligne, il faut pouvoir se loguer, il faut que ce soit sécurisé"*, and
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

---


### Sentry arrives with the online step, not before

Asked 2026-09-24. Its value is **errors happening where you cannot look** — not "this code matters".
While the contribution tools run on the dev's own machine with the console open, Sentry would report
what he can already see.

**It becomes worth it the day a contribution tool is online**, because then a silent failure costs
*someone else's* work: a lost gesture, a corrupted history stack, a half-written save. It belongs to the
same step as authentication and the security layer — they are one milestone, not three.

**Left open, deliberately**: the deployed atlas is public today, and a WebGL failure on a stranger's
machine is invisible to us — the bake is 2560 px wide where WebGL2 only guarantees 2048
(`known-issues.md`). Whether that alone justifies ~30 kB of SDK and a privacy notice is the dev's call,
and he has not made it.

## P8 — Languages · *two systems, and mixing them is the classic mistake*

Asked for 2026-09-24, the evening the deployed atlas said *"Les frontières historiques a échoué"* in a
language it had never been designed to leave.

| | what it is | where it lives |
|---|---|---|
| **interface strings** | notices, buttons, panel labels, the cartographer's chrome — about 24 today | **files in the repository**, written in **ICU MessageFormat**, versioned with the code that uses them |
| **content** | place names, event texts, polity names by century | **Payload**, which localises natively |

### Why the split is not a preference

**The argument that settles it is one we lived that same evening.** The interface strings include *the
message shown when an asset fails to load*. If those strings came from the network, the sentence
explaining that the network failed could not be displayed. The splash has the same property: it must
render before anything is fetched. **A string that describes a failure must not be able to fail.**

Two more, both concrete:

- **a string is versioned with the code that uses it.** Rename a key in a deployed build while the CMS
  still holds the old one and you get a blank label at runtime — a class of bug a repository file
  cannot produce;
- **the gate can check files, not a database.** Every key having every locale is a `tsc` error when the
  table is typed. Nothing can check that a remote row exists at build time.

### For the interface: typed tables, no library yet

A `Record<Locale, Record<Key, string>>` with a typed lookup is about thirty lines, and **a missing
translation becomes a compile error** rather than a runtime blank. At two dozen strings that is the
whole job.

**When a second language lands, revisit one thing**: the gender/number agreement table written by hand
in `assetMessages.ts` on 2026-09-24 is a manual version of what **ICU MessageFormat** does natively
(`{count, plural, …}`, `{gender, select, …}`). One language does not justify the dependency; two do, and
the hand-written table is the exact shape to port. Nothing is wasted either way.

**Dates, numbers and areas need no library at all**: `Intl.NumberFormat` and `Intl.DateTimeFormat` ship
in every browser and already know that French writes `31 200 km²` with a narrow no-break space.

### For the content: Payload's own localisation

Fields marked `localized` give one value per locale, which is what a CMS is for. It fits what the data
already carries — OHM supplies `name:fr` on 81 % of the polities at 1100, and Natural Earth's rivers come
in the local language (`Schelde`, `Maas`). Those are **content**: they belong with the events and the
places, not in a code table. The export follows the pattern already chosen — one static file per locale,
beside the year files.

### Adopt ICU MessageFormat from the start — decided 2026-09-24

The standard that handles placeholders, plurals and agreement is **ICU MessageFormat** (ICU =
*International Components for Unicode*); the JavaScript implementation is `intl-messageformat` (12.1.2).

```
{count, plural, one{# frontière} other{# frontières}}
{gender, select, feminine{chargée} other{chargé}}
```

**We adopt it even with one language**, reversing what was argued an hour earlier in this same session.
What moved the decision: the `ms/fs/mp/fp` agreement table written by hand in `assetMessages.ts` the same
evening is **a private dialect reimplementing a subset of ICU**. It grows with every asset kind and every
sentence, and no translator or translation tool can read it — Crowdin, Lokalise and POEditor all speak
ICU. Rewriting 24 strings now is an hour; rewriting two hundred in six months is not. The cost is ~10 kB
on a 185 kB bundle.

### Historical dates are not dates — and `Intl` is the wrong tool

Raised by the dev on 2026-09-24, against a claim of mine that was **wrong for this project**: *"dates
need no library, `Intl` does it"*. True for an ordinary application; false for a historical atlas.

**The fact, verified**: neither `Intl.DateTimeFormat` nor `Temporal` ships a **Julian** calendar. Every
calendar they offer is *proleptic Gregorian* — Gregorian rules projected indefinitely backwards. Europe
in 1100 was Julian. Measured divergences: the Ides of March, **15 March 44 BC** Julian, fall on **13
March** proleptic Gregorian; Washington's birth reads **11 February 1731** Julian and **22 February
1732** Gregorian. Formatting an eleventh-century day with `Intl` prints a wrong day.

**But the deeper point is that this project has almost no dates at all:**

| what we hold | what it really is |
|---|---|
| `1100.json`, one map per century | an **integer** |
| "battle of Hastings, 1066" | a year |
| "Hundred Years' War, 1337–1453" | an **interval** |
| "circa 1100" | an **approximate** year |
| "14 October 1066" | the only day-precise case — and it is **Julian** |

No `Date` type models that. It forces a day-level precision we do not have and imposes a calendar that is
not the right one.

**So: a domain type in `core`, not a library.**

```ts
type HistoricalDate = {
  year: number            // signed; note there is no year zero in historical dating
  month?: number
  day?: number
  calendar?: 'julian' | 'gregorian'   // only meaningful once a day is given
  precision: 'exact' | 'circa' | 'range'
  until?: number
}
```

Display is **text, not date formatting**: `1100`, `1337–1453`, `vers 1100`. `Intl.DateTimeFormat` never
runs. `Intl.NumberFormat` stays useful for areas and coordinates.

If a day-precise event ever needs Julian↔Gregorian conversion, it goes through the **Julian Day Number** —
about twenty lines of arithmetic, testable with literals. The Ides of March make the perfect test case.

### The rule to keep

**If a string can be needed while the network is down, it lives in the repository.** Everything else is
content.

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
