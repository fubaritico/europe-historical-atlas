# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). Full plan: `files/plans/roadmap.md` (chapters).
> This repo is **europe-map** (3D historical atlas, TS + three.js + Vite) — NOT the old fubaritico-ds DS.

## Where we are

`master` at `233adcb`, **1005 tests**, full gate green, tree clean. See `completed.md`, entry
**2026-09-17 → 18**.

The map now reads as a printed sheet: vellum, a graduated border on all four sides, the degrees written
in the margin in French, and `HISTORICΛL ΛTLΛS` at the bottom in the loading screen's own lettering.
Readability budgets are enforced on all source with no exemptions, and `main.ts` is a 56-line
composition root.

## ▶ FIRST THING NEXT SESSION — the fly-to is not right

**The dev's words, ending the session: "on revient directement sur le fly to, ça va pas."** No detail
was given beyond that, so **ask what is wrong before changing anything** — duration, easing, the zoom it
lands on, or the fact that it flies at all.

What exists (`22cf088`): double-click raycasts the relief and calls `controls.flyTo(x, z)`; single click
selects and does nothing visible yet. The flight eases in and out (`easeInOut` in `utils/math`), any
input interrupts it (`interrupt(state)`), and a zero duration arrives instantly. The knobs are
`flyDurationMs` 700 and `flyZoomIn` 0.35, both in `devParams/camera`.

Candidates worth having ready, none of them chosen:

- **It lands too close or not close enough** — `flyZoomIn` is a fixed target, so every flight ends at
  the same zoom whatever it started from.
- **It is too slow or too fast for the distance** — the duration is constant, so a flight across the
  Atlantic and a flight across Belgium take the same 700 ms.
- **It is not readable as a movement** — the camera pans and zooms at once; an arc, or zooming out
  before zooming in, is the usual answer and is not implemented.
- **Double-click is the wrong trigger** — the dev already said of the click that "plus ça va, plus je
  trouve que cette histoire de clic c'est de la merde", and suggested a rollover instead.

## Then, still open on the decor

1. **Vertex colours are in the wrong colour space** (`known-issues`, first entry). It silently eats
   every darkening on the frame and the cut edge, so **anything tuned by eye on those two modules was
   tuned against the bug**. Fixing it means retuning them in the same pass; that is the work, not a
   follow-up.
2. **The thickness is cut at the map's edge instead of the sheet's**, which is why `edgeDepth` is at 0
   and the board is gone. The dev's drawing showed the *paper* having a thickness. Moving the board's
   outline to the sheet's boundary is contained in `createMapEdge`.
3. **The frame's three rules have no matter in them** — raised, not decided.

## ▶ THE METHOD — one century, built like a structural bay

**The dev's framing, and it governs the order of everything below**: rather than tooling the whole atlas
and then filling it, **take one century and carry it all the way up** — cities, colours, and the act of
contributing it. A *travée*: one complete bay of the building, foundation to roof, then repeated along
its length.

What that buys, in the dev's words: *"ça nous permettra de dérouler pour les événements"*. The century
that is finished is what **tells us what contribution actually requires** — which is the opposite of
chapter 06's original assumption that the tools come first. Tools designed against a real, completed
century will fit; tools designed in the abstract will not.

It also names what is genuinely ahead and unbuilt: **clicking, landing on a place, showing an event's
details, and deciding how any of that is presented.** None of it exists.

## ▶ NEXT — user experience

**Asked for explicitly**: advance the user experience before touching colours or sources.

The obvious first piece is **M1.4 picking** — click a region, see something — because it is the
interaction the whole project exists for, and nothing downstream (events, details, presentation) can be
designed until a click means something. Two constraints already established, both load-bearing:

- **A click returns a *list*, from a spatial query — never a single polygon hit.** Several events of
  different kinds share a place, and a design that assumes one hit cannot be widened later.
- **Ask the compute, do not repatriate the grid.** The port should grow a `regionAt(u, v)`; a click is
  one query and a query is a message. At the 4× raster, holding the grid here would cost 45 MB for the
  session against a millisecond per round trip.

**Confirm the scope at session start** — "user experience" was given as a direction, not a spec, and the
HTML overlay (roadmap 03) is the other half of it.

## Then, in this order

1. **Colours, once the century is chosen** — and the fork to settle first is recorded in roadmap 04:
   more pinned colours stable across the centuries (what EU4 does, and what makes a power recognisable),
   or a palette per era (period flavour, at the cost of that recognition). A11Y-101 should close in the
   same pass.
2. **Cities** — graphic elements, and nothing exists for them yet.
3. **Contribution tooling** (roadmap 06) — the **Cartographer**, and it is now specified end to end:
   a georeferenced public-domain atlas plate as a **watermark** under the canvas, traced over, snapping to
   the rivers and coastline we already own. **Century chosen: 1500, at sovereign-state level** (the Holy
   Roman Empire as one block — its several hundred principalities are months, not a POC). Not the 18th:
   OHM already covers 1700 at 93.8 %. First deliverable is the spike `files/spikes/fetch-atlas`, flagged
   **ultra important** by the dev. One decision to take on day one: full shared topology, or the pragmatic
   v1 of independent polygons snapping to existing vertices — the second is cheaper and makes subdividing
   the Empire later a redraw. **Acceptance case: Alsace-Lorraine around 1680** — enclaves and exclaves,
   not merely small neighbours, and already this codebase's reference counter-example (it is why
   colour-softening was rejected). Note the hard limit it exposes: `RegionRaster.cells` holds **one polity
   per cell**, so shared sovereignty is not representable.
4. **Sources / provider per era** — deferred by the dev, but **still blocking for publication**:
   `historical-basemaps` is GPL-3.0 and cannot ship, OHM is CC0 and can, and today 1700 quietly holds an
   OHM payload while every other year holds GPL. The provider table *is* the "what may we publish" table.
5. **Sea decor** — explicitly last. Note it may force the interval temporal model (a drakkar is right
   from ~700 to ~1100; a polity today is a dated snapshot).

## Waiting on something else

- **Retry after a blocking failure** — no way out but a page reload, and nothing says so. Recorded in
  roadmap 07 with the insight that matters: the taxonomy already says only `transport` is worth retrying.
  Build the **action seam** first (independent of the DS), then the automatic retry.
- **The design system** (`../fubaritico-ds`) — `packages/variants` emits BEM class strings and
  `packages/styles` ships the CSS, so it is consumable from vanilla TS with no React. The obstacle is
  publication: both are `0.0.0` in a separate repo.

## Small things never picked up

- **The brown/cream stroke on two screenshots**, from 2026-09-16 — never explained.
- **The coastal band** (Iceland, Scandinavia, the Caspian) — one click settles it: drop the `coastline`
  layer opacity to 0 and see whether the band goes with it.
- **`double` borders are implemented, tested, and produced by no rule.** All four entries in
  `data/borderStyles` ask for `dashed`.
- **Vector coastline** (`ne_10m_coastline` through the rivers pipeline) — the last open render complaint.
- **The compass SVG is validated by nothing** — the fifth asset, missed by chapter 07's own audit.

## Key facts to reload

- **A border is not an object, it is a relation** — derive it from the fills; never author it separately.
- **The staircase is a *resolution* problem.** Now at 4× (1.9 km cells, ~136 MB peak, ~825 ms in the
  worker). A finer grid also **reveals gaps a coarser one hid**: polities that touched at 2× may not at
  4×, and the remedy is `snapToCoast`, not a retreat on resolution.
- **The bake is not political** — it has five callers. Two ports, one implementation.
- **A worker boundary is a bundle boundary**: pure logic under a `three`-importing header ships three
  twice. Hence `pipeline/`, whose ESLint rule refuses it.
- **Only the newest call may write back**, checked after *every* await before *every* side effect — not
  just the state write (`utils/latestOnly`).
- **`bootstrap()` is this codebase's modularity sink** (ARCH-012).
- **Assets**: `public/heightmaps/`, `public/masks/`, `public/rivers/` committed; `public/borders/*.json`
  git-ignored (GPL). **1700 holds the OHM payload**, original backed up at
  `files/spikes/fetch-ohm/out/europe-1700.hb-backup.json`.
- **`let`-const-ify gotcha**: the eslint `--fix` hook runs after each edit; add a `let` and its first
  reassignment together. Bit twice this session.

## Conventions (this project)

Docs/config in **English**, chat in **French**. Plans split into chapters (`files/plans/roadmap/`). Spikes
cataloged in `files/spikes/`. Commit subjects lowercase (commitlint). **Announce every command**
(cause / reason / action). **`rm -rf` needs explicit permission every time.**
