# Europe — Historical Atlas

An interactive **3D historical atlas of Europe**: the relief of the continent drawn as an old printed sheet,
navigated like a grand-strategy map, with one political map per period. Clicking a region is meant to tell
you what happened there — the event, its consequences, its actors — **and how well we know it**.

**Live**: https://europe-historical-atlas.netlify.app — the year **1100**, drawn by hand in this
repository's own editor.

**Stack**: TypeScript (strict) · three.js (the atlas) · React 19 + Zustand (the editor's chrome) · Vite ·
Vitest · pnpm workspaces + Turbo · a design system of the author's own (`fubaritico-ds`).

---

## Read this in 2 minutes, 20 minutes, or all of it

| you have       | read                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **2 minutes**  | this page down to _The architecture_                                                                                   |
| **20 minutes** | [the management of uncertainty](files/plans/evidence-system.md), then [the plans' index](files/plans/README.md)        |
| **everything** | 55 plans, ~11 400 lines under [`files/plans/`](files/plans/) — decisions, reversals and rejected alternatives included |

The shared vocabulary is [`files/plans/glossaire.md`](files/plans/glossaire.md) (in French: it is the
working language of the project). Every term a document relies on is defined there, once.

---

## The idea

### A historical map asserts more than anyone knows

Every historical atlas draws Europe in 1400 with crisp lines and one colour per power. Each is one
historian's reading: two atlases of the same year disagree, and the sources under them disagree more.
Vassalage in 1400 is not even a tree — Flanders holds lands of the King of France _and_ of the Emperor; the
King of England holds Guyenne of the King of France. Measured on 2026-10-19, Wikidata knows 136 dated or
undated suzerain → vassal links between European states in 1400; France gets nine vassals, half of them
wrong.

So the question this project is built around is not _how to draw the borders_. It is **how to show what is
known, and how well it is known** — and how to let several people contribute to that without anyone having
to read everything by hand.

### The management of uncertainty

That is the project's foundation, laid out in [`files/plans/evidence-system.md`](files/plans/evidence-system.md):

- every statement the map makes is a **claim** — _Champagne depends on the Kingdom of France in 1100_;
- each claim carries **evidence**: what each **source** says of it, and exactly where;
- the tool computes a **concordance** from that evidence — how far the sources agree, weighed by their
  reliability. It is never called _truth_: three sources copying one mistake agree;
- the **contributor arbitrates**, signs the choice, and the claims not chosen are kept;
- the map shows **two marks for the two questions a reader asks**: **blur** where the _limit_ is uncertain,
  **hatching** where the _belonging_ is. Why it is uncertain — a vague thing, a divided history, or our own
  ignorance — is read on click.

A polity, in this model, is three things rather than one: a **territory**, the territory it **depends on**,
and the **bond** — who holds it, and of whom. That is how the feudal world was actually built, and it is
what lets the exceptions every source throws at us become ordinary values of the model instead of special
cases beside it.

**This is the current initiative** — designed, decided, not yet built. What exists today is below.

### Three applications and a resource

|                       | what it is                                                              | renders with               | state                  |
| --------------------- | ----------------------------------------------------------------------- | -------------------------- | ---------------------- |
| **atlas**             | the published map — what a reader sees, the _shell_ of the system       | three.js on a WebGL canvas | online, year 1100      |
| **Cartographer**      | the territory editor: anchors, rings, borders, vassals, history         | a 2D canvas, React chrome  | used daily, not online |
| **contribution tool** | places and events: texts, consequences, actors, sources                 | Payload (headless CMS)     | planned                |
| **`core`**            | the formats, their readers, the geometry, the maths, the document model | — pure TypeScript          | shared by all          |

**What the Cartographer shows is what the atlas publishes**: the terrain, the coast, the borders, the paint
order, the colours and the tribes' vanishing edge come from one implementation in `core`, read by both. The
[parity table](.claude/rules/architecture.md) lists what is shared and what each application draws its own way.

### A few decisions that shape everything

- **Borders are derived, never drawn.** A border is the edge between two fills. Two geometries for the same
  line guarantee gaps; one guarantees none.
- **A ring is a list of anchor indices.** Neighbours share the anchors of their common border, so moving one
  point moves both outlines. Saving and reopening keeps that sharing — the test that guards it was verified
  against the naive implementation someone would really write.
- **One registry per year, nothing across years.** The atlas is a viewer: the reader makes the link between
  two dates. Nothing models a polity's continuity, and repeating a fact in two year files is free.
- **A vassal is its suzerain's neighbour, never drawn on top of it.** From afar it wears its suzerain's
  colour; zooming in, its own colour and its border fade in, level of homage by level of homage.
- **A tribe has no border.** Its colour is full at the heart of its territory and vanishes towards its limit
  — the same signed-distance ramp in both applications, evaluated per fragment in the atlas' shader.
- **The relief is displaced on the CPU**, so picking hits the real terrain rather than a flat plane.

---

## The architecture

```
packages/
├── core/               pure TypeScript — no three.js, no DOM, no React, no store (enforced)
│   └── src/  utils/ geo/   leaves
│             data/          the domain and its ports: formats, readers, heightmap, land mask, rivers
│             pipeline/      the CPU work, worker-safe: rasterising, borders, compositing
│             editor/        the Cartographer's document model: anchors, rings, edits, history
├── atlas/              the 3D map — vanilla three.js, no framework near the render loop
├── cartographer/       the editor — a 2D canvas owned imperatively, React + Zustand around it
└── eslint-plugin-eha/  this repository's own lint rules
files/plans/            the thinking — plans, scenarios, formats, screens, glossary
files/spikes/           small runnable programs that each answered one question
```

- **Layer boundaries are ESLint rules**, written as one table in the root config: `core` may not import
  three.js, React or a store; within it, `utils/` and `geo/` import nothing, `pipeline/` never reads the
  editor. The compute worker therefore ships at ~13 kB with no renderer in it.
- **Dependency injection at every real seam**: the heightmap source, the camera store, the controls, the
  renderer, the year source are ports with a mock behind each — every unit runs alone in a test.
- **Per-frame state never goes through React.** Camera, zoom, hover and drags stay imperative; the document
  lives in a plain store and the chrome renders on commit. That one rule, not the choice of framework, is
  what keeps both applications fast.
- **The repository's own lint plugin** holds what reviews kept finding by hand: no import cycle (types
  included), one hook per file, a folder per component with private `hooks/` and `internal/`.
- **Error handling is a decision, not a detail**: every fallback is discussed before it is written, and no
  refusal is silent — a declined gesture logs a warning, an impossible state an error.

## The method

The order the work is done in matters as much as the code.

1. **Behaviour first.** Eighteen Gherkin scenario files describe the editor gesture by gesture; their
   ledger of holes — questions nobody could answer yet — is closed before the code is written.
2. **Then the screens**, then the code — each step verified and committed alone.
3. **Measure instead of assuming.** A figure is measured before it is relied on, and the measure is written
   down beside the decision it supports.
4. **Write the reversals down.** An overturned decision is annotated, not rewritten.

**The gate**: `pnpm type-check && pnpm lint && pnpm test`, then a multi-agent review (security,
architecture, quality, accessibility) whose findings are verified before they are reported. **4 207 tests**
across the four packages; a CI that runs lint, type-check, test and format, builds, passes SonarCloud's quality gate, then deploys.

**Said honestly: the atlas was not built this way at first.** It grew feature by feature, and
[`.claude/known-issues.md`](.claude/known-issues.md) is the bill — each defect, its cause, what it cost, and
the ones left open on purpose. The Cartographer is where the method is applied from the start.

## Running it

```bash
pnpm install
pnpm dev                # the atlas — Vite + HMR, the camera survives a reload
pnpm dev:cartographer   # the Cartographer
pnpm build              # every application
```

**Installing needs a GitHub token**: the design system is published on GitHub Packages, which asks for one
even to read a public package. Put a classic token with the single scope `read:packages` in your
`~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=<your token>
```

Node 22 (`.nvmrc`), pnpm 10.

## Where the data comes from

| layer                               | source                                                                        | licence                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| relief                              | AWS Terrarium tiles                                                           | public domain                                                              |
| coastline, land mask, rivers, lakes | Natural Earth 10m                                                             | public domain                                                              |
| the year 1100                       | drawn by hand in the Cartographer, historical atlases consulted as references | its provenance and licence are being made explicit, per source, on the map |

The only complete free set of century-by-century borders that exists is **GPL-3.0 with no separate data
licence**, which a strict reading says would put the whole distributed work under the GPL. It is therefore
**not in this repository** — a reference to look at, never an asset to ship. That constraint is why the
Cartographer exists: the political layer is drawn here, and its sources are cited.

## Status

- **Built**: the physical atlas; the Cartographer, used to draw 1100 (142 polities, their vassals, their
  tribes); the year published online with its borders, vassals by level of homage and vanishing tribes.
- **Next**: the management of uncertainty — the historical date type, the concepts in `core`, the source
  register, the first connector (_a territory, a date → the territories that depend on it_), arbitration
  in the Cartographer, then the atlas showing each vassal as well as it is known.
- **Then**: places and events, contributed through the same machinery — an event is one more dated claim
  with its evidence.

## Licence

**Source-available, not open source.** The repository is public so that it can be read; no commercial use
of any part of it is permitted to anyone but its author.

- **The software** (`packages/`, `scripts/`, the root configuration) is under the
  [PolyForm Strict License 1.0.0](https://polyformproject.org/licenses/strict/1.0.0): read it and run it for
  a noncommercial purpose; no distribution, no changes or derived works, no commercial use.
- **The design corpus** (`files/`, `.claude/`) and **the drawn years** (`packages/atlas/public/years/`) are
  not licensed: all rights reserved.

The full terms are in [`LICENSE`](LICENSE). Any other use needs a written licence from the author.
