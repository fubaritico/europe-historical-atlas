# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md`.
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite).

## Where we are

`master` at `8487136`, **1108 tests**, gate green. **No `src/` file has been touched since 2026-09-18** —
the 22nd was two full sessions of design, 7 h 12 across two spans. See `completed.md`, entries
**2026-09-22** and **2026-09-22 (soir)**.

**The design phase is over. The next session writes code.**

| document                                   | what it is                                                          |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `files/plans/cartographer/format.md`       | **the working format, field by field** — the last lock, now written |
| `files/plans/cartographer/ui-inventory.md` | panels, dialogues, buttons, cursors, zoom — the design brief        |
| `files/plans/cartographer/scenarii/`       | 13 Gherkin files, gesture by gesture. `s99-holes.md` is the ledger  |
| `files/plans/cartographer/design/`         | 5 screens + 10 cursors, live HTML. Its README says what to keep     |
| `files/plans/glossaire.md`                 | the shared vocabulary. **Every new term goes in, immediately**      |

## ▶ NEXT SESSION — tidy the repo into a monorepo, BEFORE any Cartographer code

**The dev's call, 2026-09-23**: _"ce qu'il faut, c'est avoir quelque chose de publiable dans le Git qui
soit crédible sous la forme d'un monorepo rangé. Ça, c'est la prochaine étape avant de coder quoi que ce
soit pour la contribution."_

The repo goes public as a portfolio, and it now holds two applications plus shared code. **The seam
`rules/troubleshooting.md` said to wait for has arrived** — it named a pure-TS `@europe-map/core` as the
first candidate, and that is exactly what `data/`, `pipeline/`, `geo/` and `utils/` already are. The split
is not guesswork: the boundaries are enforced by ESLint today and covered by 1108 tests.

**Three packages, and no more:**

| package        | holds                                                                            | three.js       |
| -------------- | -------------------------------------------------------------------------------- | -------------- |
| `core`         | `data/`, `pipeline/`, `geo/`, `utils/` — the format, the readers, the compositor | **no**         |
| `atlas`        | `scene/`, `camera/`, `controls/`, `ui/`, the bootstrap                           | yes            |
| `cartographer` | the editor — not written yet                                                     | no (2D canvas) |

**Two decisions taken with it, both to avoid paying for nothing:**

- **No design-system package yet.** It would have one consumer, which `rules/modular-architecture.md`
  calls abstraction for its own sake. The tokens from Claude Design live in the cartographer until the
  atlas needs them; extracting them later is mechanical. _(The white-label `fubaritico-ds` renders BEM
  class strings and ships CSS, so it is usable from vanilla TS — but its blocker is publication, and what
  we would share here is tokens, not components.)_
- **pnpm workspaces alone, no Turbo.** At three packages it accelerates nothing and adds a config to
  explain. Add it when a build is measurably slow.

### `files/` stops being gitignored — same session, same job

Tidying the code without tidying `files/` would publish a monorepo with no design material in it, and the
design material **is** the portfolio piece. Four steps, in order:

1. **Invert the ignore rule** rather than delete anything:

   ```gitignore
   files/*
   !files/plans/
   !files/spikes/
   files/spikes/*/out/
   ```

   What stays ignored, deliberately: **`files/resources/`** (163 MB, proprietary Euratlas — confirmed by
   the dev 2026-09-23 as staying out), `files/spikes/*/out/` (the 21 raw GPL-3.0 `world_*.geojson`),
   `files/session-log.jsonl` (local activity log), `files/claude-archive/` (964 KB of dead design-system
   skills).

2. ~~**Move the design folder out of `resources/`**~~ — **done 2026-09-24**:
   `files/resources/cartographer-design/` → `files/plans/cartographer/design/`. It is _our_ work, 7 MB,
   and the strongest thread of the portfolio; it was sitting in the one folder that must never ship.

3. **Split `files/plans/`**, which still mixes two projects — asked for on 2026-09-22 and never done:

   ```
   files/plans/
   ├── README.md          reading levels: 2 min · 20 min · everything
   ├── glossaire.md
   ├── atlas/             roadmap chapters 01–05 and 07, focus-mode.md
   └── cartographer/      groundwork, format, ui-inventory, chapter 06, scenarii/, design/
   ```

4. **Write the two READMEs** — a root one and `files/plans/README.md`, offering reading levels: **2
   minutes** (what the project is, one screenshot), **20 minutes** (the groundwork's decisions),
   **everything**. Nobody reads a 900-line document cold. The root README leads with the _method_, not a
   feature list — see the framing at the bottom of this file.

**Check before pushing**: `git count-objects -vH` and a `git status` that shows no 6 MB PNG arriving by
accident. The terrain bitmap exists in two places (spike output and design assets) and one of them is
inside an ignored folder today — after step 2 it will not be.

## ▶ THEN — start the Cartographer, in this order

**First, a data task that is not a hole**: `registry.json` does not exist. The identities of the 51
polities at 1100 — names, ranks, Q-ids, `name:fr` on 81 % of them — sit in the `fetch-ohm` spike's cached
`relations.json`. A spike has to emit the registry before the editor can open anything.

Then, dependency-driven rather than by preference:

1. **The format, as types and readers** — `registry.json` + `<year>.json` from
   `cartographer/format.md`, with hand-written readers behind `data/assetError.ts` (same taxonomy:
   `transport | schema | consistency | semantic`), and the adapter down to today's `RegionPayload` so the
   atlas does not change by a line. Pure, testable with literals, no canvas.
2. **The geometry model** — anchors stored once, rings as lists of indices, _duplicate the list never the
   anchors_. The test that must be written by breaking it on purpose: a round trip through save/load
   **keeps the sharing**. Restored naïvely, two rings that referenced one anchor each get their own copy,
   the screen looks identical, and the sliver appears three gestures later.
3. **The history manager** — snapshot per step, ~265 KB each, one gesture = one step. The trap is the same
   one: a snapshot must restore _the sharing_, not just the coordinates. Document state only — never the
   active tool, the zoom or the pan.
4. **The canvas** — 2D, not WebGL. Decided 2026-09-22: `globalCompositeOperation = 'overlay'` gives the
   bake's own blend mode natively, plus easy handles, easy text, and no `linewidth` ceiling.
   Hit-testing, marquee, rubber band: all pure arithmetic, testable with literals.

**The chrome comes last and is already designed.** Port the dark variant's values, not its markup.

## Still open on the screens — small, and not blocking

- **The dark variant is the reference**, confirmed by the dev 2026-09-23: _"on garde la version Dark que
  tu as corrigée."_ Build from its values, not from the light original.
- Screens **02, 03, 04 are still light and fixed-size**. Either re-run Claude Design with the dark palette
  from `01 Editor at rest DARK.dc.html`, or apply the same fifteen substitutions by hand (the `sed` is in
  that folder's README).
- The polity list holds **28 entries while the counter says 51**. The list under real load is the thing
  worth judging.

## The three holes left, and they are decided by coding, not before

- **H-03** — how many vertex handles, and from what zoom? 894 for the Empire, 2 258 for Byzantium.
- **H-05b** — two _peers_ claiming the same ground. A vassal inside its suzerain is settled (H-05a); two
  equals over Lorraine is a fact nobody can guess, so it must be reported and offered.
- **H-08** — the raster costs ~825 ms, so the fill lags the vector outline while drawing. Two
  representations on screen at once, and it has to be designed rather than discovered. _Worth
  considering: the editor may not need the raster at all — only the atlas does._

## Decided 2026-09-22 — do not reopen

- **Two tools only**: the Pen ‹P› and the white arrow ‹A›, plus ‹space› to pan. No Bézier, no Selection
  tool, no transform box.
- **A path is a list of references to anchors. Duplicate the list, never the anchors.**
- **Every drawn year is independent**; deriving one is `[Save as…]`, which asks for the year.
- **The registry is shared**, with dated names and stable ids (the Wikidata `Q…` where there is one).
- **Containment decides** hole versus exclave. A hole is given an owner when it closes — or declared empty
  on purpose.
- **A vassal inside its suzerain is not an overlap.** The more specific polity paints; the vassal hand
  falls out of the registry. `subjectTo` says the law, not the power.
- **A border's hand is data, its geometry never is.** Explicit beats derived.
- **Every rule is a default, never a law.** Only two constraints are real: shared anchors, and no GPL.
- **Cities are the accuracy criterion** — a city on the wrong side is the error that matters, not 20 km of
  line. Hence witness cities, and showing who holds each city while drawing.
- **The editing stroke is not the map's border**: thin, crisp, selection blue, no casing.
- **The selection blue is a reserved ink**, never served to a polity.

## Left for the dev to settle

- **H-23** — does the vassal hand weaken by degree? In feudal France the rear-vassal is the rule.
- **H-26's other half** — a hole _discovered_ later, surrounded by two or more polities.
- The Norse Greenland colony, outside the editorial zone to the _west_. A subject question, not a zone one.
- Coordinate precision in the file: 6 decimals is 10 cm against a 1.9 km cell.

## Measurements worth reloading

- **OHM at 1100**: 51/52 assembled, 98.1 %, **45.2 % of Europe**, median **108 vertices** per polity.
  **France has no geometry at all** — identity only.
- **Two `×4` exist and are unrelated**: `rasterScale` 4 is the political grid (1.9 km cells);
  `supersample` **2** is the texture. Changing one does not touch the other.
- The baked texture is 7.6 km/px at supersample 1, 2.7 at 4 — and **4 is the useful ceiling**, because the
  land mask is baked at 4× the DEM.
- **Rivers**: Scheldt = `Schelde`, Meuse = `Maas`, **Saône absent**. Names are in the local language.
- Coverage is measured **by surface**, never by counting polities.

## ▶ THE POINT OF PUBLISHING — the framing to lead with

The mechanics are in the monorepo section above; this is what the README has to say.

**The method is the portfolio piece**, more than any single file: behaviour first — 13 Gherkin scenario
files, 26 holes found by trying to describe a gesture, ten of them closed in one evening — then the
screens, then the code. Few portfolios show measured figures, decisions with their rejected alternatives,
and mistakes corrected in writing.

Said honestly, because the contrast is worth stating rather than hiding: **the atlas itself was not built
that way.** The Cartographer is where the method is applied from the start.

The dev's own words, 2026-09-22: _"Tu as vu tout le travail de décorticage sur la mécanique de l'outil de
contribution. Ça montre comment on travaille : d'abord on regarde le comportement, après la forme des
écrans, puis ensuite le code."_

**Language, decided 2026-09-22**: anything not already in English may be rewritten in it, on one
condition — plain international English, readable by a non-native engineer on first pass. `completed.md`,
`next.md` and `known-issues.md` are the French ones, and they are **low priority**: the dev calls them
tracking, not the argument.

## How to answer, in this project

- **Every problem ships with a remedy and a stated severity.** Never a list of risks without decisions.
- **Any new term goes into `glossaire.md`** in the same breath.
- Docs/config in **English**, chat in **French**. Announce every command (cause / reason / action).
  `rm -rf` needs explicit permission every time.
