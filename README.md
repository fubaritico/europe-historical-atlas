# Europe — Historical Atlas

An interactive **3D historical atlas of Europe**: the relief of the continent drawn as an old printed sheet,
navigated like a grand-strategy map, with one political map per period. Clicking a region is meant to tell
you what happened there — the event, its consequences, its actors — **and how well we know it**.

## Live Demo

**<a href="https://europe-historical-atlas.netlify.app" target="_blank" rel="noopener noreferrer">https://europe-historical-atlas.netlify.app</a>**
— the atlas, the year **1100**: relief, coast, rivers, the polities of Europe with their vassals and their
tribes, all drawn by hand in this repository's own editor.

**The Cartographer** — the editor the map is drawn with — is not online yet; its link will stand here when
it is.

### Technologies

TypeScript (strict) · three.js · WebGL / GLSL · Web Workers · React 19 · Zustand · Canvas 2D · Vite · Vitest ·
Testing Library · Zod · pnpm workspaces · Turborepo · ESLint (with a plugin of the project's own) · Prettier ·
GitHub Actions · SonarCloud · Netlify · `fubaritico-ds` (the author's design system) · planned: Payload CMS

---

## Table of Contents

- [What this is](#what-this-is)
- [Why it exists](#why-it-exists)
- [1. The shell — the atlas](#1-the-shell--the-atlas)
- [2. The Cartographer — the chantier of the maps](#2-the-cartographer--the-chantier-of-the-maps)
- [3. Contributing — maps, then contents](#3-contributing--maps-then-contents)
- [4. Designing a historical map — certainty and uncertainty](#4-designing-a-historical-map--certainty-and-uncertainty)
- [5. Architecture](#5-architecture)
- [6. The method](#6-the-method)
- [7. Running it](#7-running-it)
- [8. Where the data comes from](#8-where-the-data-comes-from)
- [9. The plans — every document](#9-the-plans--every-document)
- [10. Status](#10-status)
- [11. Licence](#11-licence)

---

## What this is

An atlas is a book: a sequence of maps that each assert what a part of the world was at a date. This one is
a book that can be walked through in three dimensions, one period after another — and **written in the
open**: the maps are drawn with a tool built for them, the contents will be contributed through another,
and every decision taken on the way is written down in [`files/plans/`](files/plans/), which is the other
half of this repository.

It is made of **three applications and one resource**:

|                             | what it is                                                                       | renders with                | state                      |
| --------------------------- | -------------------------------------------------------------------------------- | --------------------------- | -------------------------- |
| **the atlas** — _the shell_ | what the reader sees: the published map                                          | three.js, WebGL             | **online**, year 1100      |
| **the Cartographer**        | the editor the maps are drawn in                                                 | a 2D canvas, a React chrome | used daily, not online yet |
| **the contribution tool**   | places and events: texts, consequences, actors, sources                          | Payload, a headless CMS     | **planned**                |
| **`core`**                  | the formats, their readers, the geometry, the maths, the editor's document model | pure TypeScript             | shared by all three        |

The shared vocabulary is the [glossary](files/plans/glossaire.md) (in French, the project's working
language): every term used below is defined there, once.

[⬆ Back to top](#table-of-contents)

---

## Why it exists

**A heavy reflection behind, for a simple and attractive result in front.** That is the intention of the
whole project.

**In front**, the reader gets a map that is pleasant to explore: the real relief of Europe, a navigation
borrowed from grand-strategy games (Total War, Europa Universalis) — pan, zoom from the continent down to a
province — and layers that read at a glance. It is meant for an informed public — the curious, students,
lovers of history — not for specialists only.

**Behind**, every line on that map is a decision: which source says it, how far the sources agree, who
chose and on what grounds (§4). Historical tools tend to pick one side: the rigour of a geographic
information system, austere to use, or the ease of a game map that asserts everything with the same
assurance. This one keeps the rigour **in the machine** and the simplicity **in the shell** — the reader is
never made to carry the reasoning, but never misled about what is certain either: what is doubtful looks
doubtful, and one click says why.

[⬆ Back to top](#table-of-contents)

---

## 1. The shell — the atlas

### Definition

**The shell** is the atlas seen from the system: what the reader _sees_, which _receives_ the contribution
and is part of it, built on what the reader does not see — the maps drawn in the Cartographer, the contents
of the contribution tool, and the machinery that decides how certain each of them is (§4). It is a
**viewer**: it shows a year and what is known of it; it never deduces continuity from one date to the next
— the reader makes that link.

### Its layers

Like any interactive map, the shell is a stack of layers, each one standing on the one below:

1. **the bare terrain** — the relief, painted;
2. **the coasts**;
3. **the rivers**;
4. **the contributed map** — the polities of a year, drawn in the Cartographer;
5. **the dates and the events** — battles, periods, intellectual and religious movements — contributed
   through the contribution tool (planned).

Clicking a polity or an event will lead on to **Wikipedia**, in the reader's language, with **Wikidata** as
the link that keeps names and dates consistent — planned; the Cartographer already reads Wikidata to check
a polity's dates and its lord.

**One year is one snapshot**: going from one year to another loads that year's map; nothing morphs the
borders in between. That is a decision, not a missing feature — an interpolated border would assert a
course that no source gives.

### How it was made

- **The relief comes from an elevation bitmap.** A digital elevation model of Europe is read pixel by
  pixel and **displaces a subdivided plane on the CPU**, not in a shader — so that a click hits the real
  terrain, which the raycaster could not see if the displacement lived on the GPU. Exaggeration is a scale,
  never a rebuild.
- **The terrain is painted, not photographed.** Elevation, a land mask that says _wet or dry_ (an elevation
  cannot: polders and the Caspian prove it), the shore and the hypsometric tints are composited into one
  texture — **in a Web Worker**, whose chunk ships with no renderer in it.
- **The physical layers are lines in 3D**: coastline, rivers, graticule — drawn as geometry rather than baked
  into the texture, which was too blurry. The sheet, its frame, the compass rose and the title make it read
  as an old printed map.
- **The political layer is the year drawn in the Cartographer**, read from its files: each polity's fill is
  cut from its outline into triangles laid on the relief and blended in a shader, so its edge is exact;
  **the borders are derived from the fills**, never drawn apart; a **vassal** wears its suzerain's colour
  from afar, its own colour and its border fading in as you zoom, level of homage by level of homage; a
  **tribe** has no border — its colour vanishes towards its limit.
- **Every scene module is pluggable**: renderer, camera, controls, relief, picking, each layer receives its
  collaborators and disposes of what it allocated. The camera survives a reload, so the view a developer
  works on never jumps.

### How it works

1. A **manifest** lists the published years; the atlas loads the relief, the land mask, the rivers and the
   chosen year.
2. Each file is **validated as it is read** (Zod schemas in `core`); a failed asset posts a notice that says
   what is missing and what the map does without it — never a silent fallback.
3. The **worker** computes the painted terrain and the polities' geometry; the main thread only uploads it.
4. The **render loop** draws; nothing is rebuilt per frame. A click asks _where_ (the picking), and the data
   layer answers _what_.

[⬆ Back to top](#table-of-contents)

---

## 2. The Cartographer — the chantier of the maps

The only complete free set of historical borders is under the GPL with no separate data licence, which
would put the whole atlas under the GPL. So the borders are **drawn here**, and the Cartographer is the tool
they are drawn with — the year 1100 online was drawn in it: 142 polities, their vassals, their tribes.

**How it is built**: a **2D canvas** owned imperatively (the backdrop is the same terrain the atlas paints,
baked by the same code, with no political tint), surrounded by a **React chrome** with a **Zustand** store —
panels, the tree of polities, forms, the history. Per-frame state never goes through React.

**What makes it a cartographer's tool rather than a drawing program**:

- **a polity is a list of anchor indices**, and neighbours share the anchors of their common border: move
  one point, both outlines follow, and saving keeps that sharing;
- **snapping to geography already owned** — the coast, the rivers — so _"along the Meuse to its mouth"_ is
  one gesture, not two thousand points;
- **vassals are carved out of their suzerain**, never drawn on top of it; stacking is by groups of homage,
  as layers are in Illustrator;
- **a history that is a line, not two stacks**, with markers that outlive a truncation, an automatic draft
  and snapshots: nothing drawn is lost.

**The chantier**, in five steps, each verified and committed alone: the types and readers of the year
files → the document model → the history → the canvas → the chrome. The first four are done; the chrome is
in use and still growing. Every gesture is first written as a scenario
([`scenarii/`](files/plans/cartographer/scenarii/s00-index.md)).

**Its link** will be added under [Live Demo](#live-demo) when it goes online.

[⬆ Back to top](#table-of-contents)

---

## 3. Contributing — maps, then contents

**The maps are contributed through the Cartographer.** A year is drawn, saved as its files (registry,
polities, borders, and its entry in the manifest), committed; the CI rebuilds and the atlas publishes it.
Writing a year online will come once the editor is.

**The contents are the next chantier**: the places — cities with their icons and 3D models — and the events
— a battle, a decision, an invention, its consequences, its actors. They will be written in a **contribution
tool built on Payload**, in English and French side by side, **exported to static JSON** that the atlas
reads like any other asset, and **shown in the maps the Cartographer produced**, inside the shell.

**Both kinds of contribution go through the same machinery** (§4): every place, every event, every border
is a **claim**, contributed with its **sources**, chosen by a contributor who signs the choice — so that
someone else can take up the work, see what was chosen, and why.

[⬆ Back to top](#table-of-contents)

---

## 4. Designing a historical map — certainty and uncertainty

### A historical map asserts more than anyone knows

Every historical atlas draws Europe in 1400 with crisp lines and one colour per power. Each is one
historian's reading: two atlases of the same year disagree, and the sources beneath them disagree more.
**Vassalage in 1400 is not even a tree** — Flanders holds lands of the King of France _and_ of the Emperor;
the King of England holds Guyenne of the King of France. Measured on 2026-10-19, Wikidata knows 136 suzerain
→ vassal links between European states in 1400, a quarter of them dated; France gets nine vassals, half of
them wrong.

So the question a historical map really asks is not _how to draw the borders_. It is **what to show, and how
to show how well it is known** — and how several people can build that without each reading everything.

### The choices a historical map makes

- **Which date.** One map per period, each a snapshot; nothing is interpolated between two.
- **Whose borders.** Ours, drawn and sourced — never a source we may not redistribute.
- **Which units.** A polity, in this design, is three things rather than one: a **territory** (the fief),
  the **territory it depends on**, and the **bond** — who holds it, and of whom. That is how the feudal world
  was built, and it is what keeps a case such as Champagne — grouped by one atlas under its ruling house —
  from becoming an exception.
- **What to show of the vassals.** The first answer drew sovereigns only; the design draws **each vassal as
  well as it is known**: crisp where its bond is attested, marked where it is not.
- **What a vague thing looks like.** A people with no fixed limit gets no border — its colour vanishes.

### The management of uncertainty

The ground of all of it, laid out in [**the management of uncertainty**](files/plans/evidence-system.md):

| concept                          | in short                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| **truth** (_véracité_)           | whether a claim matches what happened — the horizon; **never measured, never shown**       |
| **claim** (_affirmation_)        | one statement about the world at a date                                                    |
| **source**, **reliability**      | where it is read; how much that deserves trust — its kind, its independence                |
| **evidence** (_témoignage_)      | what one source says of one claim, and exactly where                                       |
| **attestation**, **concordance** | how many independent sources support it; how far they agree — **computed**, never typed in |
| **uncertainty**                  | in three causes: the thing was **vague**, history was **divided**, or **we do not know**   |
| **arbitration**                  | the contributor's choice, signed, justified; the claims not chosen are kept                |
| **traceability**                 | from anything shown, a path back to its sources                                            |

**On the map, a mark says _what_ is uncertain; the click says _why_** — two marks for the two questions a
reader asks: **blur** where the _limit_ is uncertain, **hatching** in the candidates' colours where the
_belonging_ is. **No exception stands outside the machine**: when a case does not fit, the model changes.

This design stands on the literature of map representation — Bertin's visual variables, MacEachren's work
on representing uncertainty, historical GIS (Angelov's majority maps, Berman's claimed versus exercised
jurisdiction), and the historians of the feudal bond, from Duby and Ganshof to Reynolds. The
[reading list](files/plans/evidence-system.md#7-reading-list--the-literature-of-map-representation) grades
each reference.

[⬆ Back to top](#table-of-contents)

---

## 5. Architecture

```
packages/
├── core/               pure TypeScript — no three.js, no DOM, no React, no store (enforced)
│   └── src/  utils/ geo/   leaves
│             data/          the domain and its ports: formats, readers, heightmap, land mask, rivers
│             pipeline/      the CPU work, worker-safe: rasterising, borders, compositing
│             editor/        the Cartographer's document model: anchors, rings, edits, history
├── atlas/              the shell — vanilla three.js, no framework near the render loop
├── cartographer/       the editor — a 2D canvas owned imperatively, React + Zustand around it
└── eslint-plugin-eha/  this repository's own lint rules
files/plans/            the design: plans, scenarios, formats, screens, glossary
files/spikes/           small runnable programs that each answered one question
```

- **What the Cartographer shows is what the atlas publishes**: terrain, coast, borders, paint order,
  colours and the tribes' edge come from one implementation in `core`, read by both. The
  [parity table](.claude/rules/architecture.md) lists what is shared and what each draws its own way.
- **Layer boundaries are ESLint rules**, written as one table: `core` may not import three.js, React or a
  store; inside it, `utils/` and `geo/` import nothing, `pipeline/` never reads the editor.
- **Dependency injection at every real seam** — heightmap source, camera store, controls, renderer, year
  source: each a port with a mock behind it, so every unit runs alone in a test.
- **The repository's own lint plugin** holds what reviews kept finding by hand: no import cycle (types
  included), one hook per file, a folder per component with private `hooks/` and `internal/`.
- **Error handling is a decision, not a detail**: every fallback is discussed before it is written, and no
  refusal is silent.

[⬆ Back to top](#table-of-contents)

---

## 6. The method

1. **Behaviour first.** Eighteen Gherkin scenario files describe the editor gesture by gesture; their ledger
   of holes is closed before the code is written.
2. **Then the screens, then the code** — each step verified and committed alone.
3. **Measure instead of assuming**, and write the measure beside the decision it supports.
4. **Write the reversals down**: an overturned decision is annotated, never rewritten.

**The gate**: `pnpm type-check && pnpm lint && pnpm test`, then a review in four dimensions (security,
architecture, quality, accessibility) whose findings are verified before they are reported. **4 207 tests**
across the four packages; a CI that runs lint, type-check, test and format, builds, passes SonarCloud's
quality gate, then deploys.

**AI as a means.** Building a 3D engine, an editor and their tooling alone would take years; AI coding
assistance brought it within a reasonable time. It is a means, held to the method above: every change
reviewed, tested and committed on its own. The design, the decisions and the reflection behind the map are
the author's.

**Said honestly: the atlas was not built this way at first.** It grew feature by feature, and
[`known-issues.md`](.claude/known-issues.md) is the bill — each defect, its cause, its cost, and the ones
left open on purpose. The Cartographer is where the method is applied from the start.

[⬆ Back to top](#table-of-contents)

---

## 7. Running it

```bash
pnpm install
pnpm dev                # the atlas — Vite + HMR, the camera survives a reload
pnpm dev:cartographer   # the Cartographer
pnpm build              # every application
```

**Installing needs a GitHub token**: the design system is published on GitHub Packages, which asks for one
even to read a public package. Put a classic token with the single scope `read:packages` in `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=<your token>
```

Node 22 (`.nvmrc`), pnpm 10.

[⬆ Back to top](#table-of-contents)

---

## 8. Where the data comes from

| layer                               | source                                                                        | licence                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| relief                              | AWS Terrain Tiles (Terrarium)                                                 | their own terms                                                            |
| coastline, land mask, rivers, lakes | Natural Earth 10m                                                             | public domain                                                              |
| the year 1100                       | drawn by hand in the Cartographer, historical atlases consulted as references | its provenance and licence are being made explicit, per source, on the map |

[⬆ Back to top](#table-of-contents)

---

## 9. The plans — every document

The design of the project, as it was decided — reversals and rejected alternatives included.

**Where to start**

- [The plans — index](files/plans/README.md)
- [Plan of record](files/plans/plan.md)
- [Roadmap](files/plans/roadmap.md)
- [Inventory — everything planned, and what it is worth](files/plans/inventory-2026-09-24.md)
- [Glossary](files/plans/glossaire.md)

**The management of uncertainty**

- [The principles of a contribution system and of a cartographic representation system](files/plans/evidence-system.md)

**The atlas — the shell**

- [01 — Foundations](files/plans/atlas/01-foundations.md)
- [02 — Milestone 1: the navigable Europe map](files/plans/atlas/02-milestone1-relief.md)
- [03 — Camera and on-screen UX](files/plans/atlas/03-camera-ux.md)
- [04 — Texture, political layer, labels and data model](files/plans/atlas/04-atlas-data.md)
- [05 — Decisions and open questions](files/plans/atlas/05-decisions.md)
- [07 — Robustness: source validation and error handling](files/plans/atlas/07-robustness.md)
- [Focus mode — the camera gets a state, not a knob](files/plans/atlas/focus-mode.md)
- [Readability budgets](files/plans/atlas/readability-budgets.md)
- [The coasts of an authored year](files/plans/atlas/2026-10-16-coasts/README.md) ·
  [exact fills from the outlines](files/plans/atlas/2026-10-16-coasts/exact-fills.md)
- [Vassals by zoom](files/plans/atlas/vassal-lod.md)
- [Tribes with a vanishing edge](files/plans/atlas/tribe-feather.md)

**The borders**

- [Our own borders — the plan](files/plans/borders/plan.md)

**The Cartographer and the contribution**

- [06 — Contribution tooling: owning the content](files/plans/cartographer/06-contribution-tooling.md)
- [Groundwork: what the machine eats, and what a contribution tool must produce](files/plans/cartographer/groundwork.md)
- [The working format](files/plans/cartographer/format.md)
- [Save and open a year](files/plans/cartographer/save-open-plan.md)
- [Stacking order by groups](files/plans/cartographer/stacking-order-plan.md)
- [Vassals add to their suzerain — the extent](files/plans/cartographer/vassal-carving-plan.md)
- [The action bar of the polities panel](files/plans/cartographer/polities-footer-plan.md)
- [The general test — a night drawn alone](files/plans/cartographer/general-test-night.md)
- [Component inventory](files/plans/cartographer/ui-inventory.md)
- [The screens](files/plans/cartographer/design/README.md) ·
  [the canvas cursors](files/plans/cartographer/design/CURSORS.md)
- [Wiring the design system](files/plans/cartographer/design-system-integration.md) ·
  [a request to it: a menu that says it is one](files/plans/cartographer/ds-request-menu-role.md)

**The Cartographer's scenarios**, gesture by gesture — [index](files/plans/cartographer/scenarii/s00-index.md)

- [01 Open and navigate](files/plans/cartographer/scenarii/s01-open-and-navigate.md) ·
  [02 Create France, 1100](files/plans/cartographer/scenarii/s02-create-france-1100.md) ·
  [03 Improve an imported border](files/plans/cartographer/scenarii/s03-edit-existing-border.md) ·
  [04 Save, reopen, render](files/plans/cartographer/scenarii/s04-save-and-reopen.md) ·
  [05 Derive a year](files/plans/cartographer/scenarii/s05-derive-a-year.md) ·
  [06 Replace a year we cannot publish](files/plans/cartographer/scenarii/s06-replace-a-gpl-year.md)
- [07 The registry](files/plans/cartographer/scenarii/s07-manage-the-registry.md) ·
  [08 Vassalage](files/plans/cartographer/scenarii/s08-vassalage.md) ·
  [09 Place the names](files/plans/cartographer/scenarii/s09-place-the-names.md) ·
  [10 Check before publishing](files/plans/cartographer/scenarii/s10-check-before-publishing.md) ·
  [11 Islands](files/plans/cartographer/scenarii/s11-islands.md) ·
  [12 Outside the subject](files/plans/cartographer/scenarii/s12-out-of-frame.md)
- [13 Overrides](files/plans/cartographer/scenarii/s13-overrides.md) ·
  [14 The history panel](files/plans/cartographer/scenarii/s14-history-panel.md) ·
  [15 Offline and online](files/plans/cartographer/scenarii/s15-offline-and-online.md) ·
  [16 Stacking order](files/plans/cartographer/scenarii/s16-stacking-order.md) ·
  [17 The tools wait for the zoom](files/plans/cartographer/scenarii/s17-tools-wait-for-the-zoom.md) ·
  [18 The draft and the snapshots](files/plans/cartographer/scenarii/s18-autosave.md)
- [99 — The holes the scenarios found](files/plans/cartographer/scenarii/s99-holes.md)

**The tooling and the project**

- [`eslint-plugin-eha` — the order of declarations](files/plans/eslint-plugin-eha/plan.md)
- [Feeding the Trello board](files/plans/trello/board-feeding.md)
- [e-Soleau — dating the design corpus](files/plans/e-soleau.md)

[⬆ Back to top](#table-of-contents)

---

## 10. Status

- **Built**: the shell, online with the year 1100; the Cartographer, in daily use.
- **Next**: the management of uncertainty — the historical date, the concepts in `core`, the source
  register, the first connector (_a territory, a date → the territories that depend on it_), arbitration
  in the Cartographer, then the shell showing each vassal as well as it is known.
- **Then**: the contribution of places and events, through the same machinery.

[⬆ Back to top](#table-of-contents)

---

## 11. Licence

**Source-available, not open source.** The repository is public so that it can be read; no commercial use
of any part of it is permitted to anyone but its author.

- **The software** (`packages/`, `scripts/`, the root configuration) is under the
  [PolyForm Strict License 1.0.0](https://polyformproject.org/licenses/strict/1.0.0): read it and run it for
  a noncommercial purpose; no distribution, no changes or derived works, no commercial use.
- **The design corpus** (`files/`, `.claude/`) and **the drawn years** (`packages/atlas/public/years/`) are
  not licensed: all rights reserved.

The full terms are in [`LICENSE`](LICENSE). Any other use needs a written licence from the author.
