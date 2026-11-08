---
name: use-cartographer
description: Draw or retouch a map in the Cartographer through Chrome — a polity, a border, a vassal, an island, a coast, an enclave — measuring first with the skill's scripts (who holds each witness city, rivers, spikes, enclaves), deciding by the table of upstream decisions, then drawing with the Pen, the retrace tool and the white arrow, and proving the result in the file. Use whenever asked to draw or change something on a map, in French or English, with or without the word Cartographe.
when_to_use: « dessine », « dessine ceci dans le Cartographe », « dessine-moi la Navarre », « retouche », « retouche la frontière », « retouche ceci dans le Cartographe », « corrige la carte », « déplace la frontière », « fais passer la frontière entre … et … », « trace », « ajoute un pays / un vassal / une île », « enclave », « zone disputée », « ferme le contour », « mets cette ville du bon côté », « applique tes recherches à la carte », draw, retouch, trace, move a border, fix the map. For copying a plate of a historical atlas, /draw-from-plate first, then this.
metadata:
  author: europe-map
  version: '2.0'
---

# Using the Cartographer, as an agent

The Cartographer (`packages/cartographer`) is the dev's 2D editor of the maps the atlas publishes. An agent uses it as
he does, **through Chrome** — never by writing `polities.json`, which would bypass the shared anchors. The outcome is a
map changed exactly where asked, **nothing else moved**, proved in the file.

**The loop: measure → decide → draw → measure again.** The measures are scripts, the decisions a table taken upstream,
the drawing a set of gestures. Velocity comes from the scripts (never re-write a measure by hand), precision from the
table (never re-decide what is decided).

| step | where |
| --- | --- |
| measure | `scripts/` below — run with `node`, Node 24 (`PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`) |
| decide | [`references/decide.md`](references/decide.md) — the table: border move, enclave, disputed zone, river, straight line, spikes |
| draw | [`references/gestures.md`](references/gestures.md) — the Pen's roles, retracing, moving, giving a territory |
| record | [`references/journal.md`](references/journal.md) — local, never committed; a dated section per session |

## Before anything

1. **One writer per map.** A map open in a tab saves itself two seconds after every gesture. Two tabs on one map
   overwrite each other: **draw in your own worktree, on your own server** (`pnpm -C <worktree>/packages/cartographer
   exec vite --port 5180 --strictPort`, after reading the page titles on the ports), or in the dev's server once he has
   closed his tab and said yes. Never reload or drive his tab; one tab of yours, closed at the end.
2. **Copy the map before touching it**: `cp -R years/<map> years/<map>.before-<who>-<date>` (git-ignored). It is the way
   back, and the `--against` of every measure.
3. **Drawing is facts, not tracings.** A plate in copyright is read, never traced (`/draw-from-plate`). Every historical
   choice made without a source is said to the dev.

## The measures — `scripts/`

Each prints plain lines; `--help` gives its usage. `--map` is a folder of `years/` (`1100`, `1100.before-claude-…`).

| script | answers |
| --- | --- |
| `sides.mjs --map 1100 [--box=w,s,e,n] [--against <copy>] [--all]` | which polity holds each CMS city, against its sourced holder (`ok`, `wrong`, `absent`, `unsourced`); with `--against`, what changed |
| `simulate.mjs --map 1100 --plan plan.json` | which cities a planned zone moves, and whether each lands right — **before the first click** |
| `enclaves.mjs --map 1100 [--box=…]` | for each city still wrong: its nearest opposing witness, enclave (and its radius) or disputed zone |
| `rivers.mjs --map 1100 --polity <id>` | the runs of a polity's borders near one river, sampled every 5 km |
| `shape.mjs --map 1100 [--polity <id>] [--against <copy>] [--stiff]` | the spikes (at the anchors added) and the straight cuts |
| `registry.mjs --map 1100` | every polity with a Wikidata id and no dates — the « Use » forgotten in its form |
| `screen.mjs --a "x,y,<bar text>" --b "x,y,<bar text>" -- lon,lat …` | the pixel of each target, from two hovers |

The CMS base is read **read-only**, from the main checkout when the worktree has none. The tests, from the checkout's
root: `node --test ".claude/skills/use-cartographer/scripts/lib/*.test.mjs"`. The commands only parse, call a measure
of `lib/` and print: a decision written in a command cannot be tested — put it in `lib/measures.mjs`. A measure that
disagrees with the screen is a defect of the measure: fix it with a test. No ESLint reads these `.mjs` (REPO-125's
gap); Prettier does when called with `--ignore-path /dev/null`.

## The order of work on a map (the dev, 2026-11-08)

1. **Clean** — an imported map first (`nettoyage`, in the glossary): coasts followed, lakes carved, borders softened,
   crenellations and doubled points removed. Redrawing, not drawing: nothing historical changes, so nothing to source —
   but every city is re-tested after it (`sides.mjs --against`), since a softened border can cross one.
2. **Retouch the borders by the sources** — the loop below, zone by zone; a zone is finished before the next.
3. **Add the polities** the sources attest and the map lacks — when the dev says they existed.

`shape.mjs` gathers what the cleaning needs (spikes, stiff cuts, doubled points); every new kind of fault met while
cleaning becomes a measure of `lib/measures.mjs` with its test — a crenellation detector is the next one to write.

## Plan, then draw

- `sides.mjs` with the cities shown on the map ({Cities}: « Show all the cities », « Show as points »).
- Read `decide.md`; write the plan of each zone as a polygon of anchor indices and free points; `simulate.mjs` it.
- Draw by `gestures.md`, reading the status bar before every click; after each gesture, the result zone.
- **Finish the zone**: `sides.mjs --against`, `shape.mjs --against`, `registry.mjs`; fix spikes and dates; list what is left with its decision
  row. Never propose the next map while the zone has wrong cities or stiff cuts left (the dev, 2026-11-08).

## After the session

- A dated section in `references/journal.md`; a gesture walked into its scenario (`files/plans/cartographer/scenarii/`),
  a surprise into `s99-holes.md`, a failing gesture into a ticket (`/trello`).
- A map retouched in a worktree comes back to `main` and is committed like code — publishing a year is not blocked
  (the dev, 2026-11-08); never commit its `*.before-*` or `*.autosave.*` copies (`known-issues/data.md`).
