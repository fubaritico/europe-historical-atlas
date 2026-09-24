# Europe — Historical Atlas

An interactive **3D historical atlas of Europe**: a relief of the continent drawn as an old printed
sheet, navigated like a grand-strategy map, with one political map per century. Clicking a region is
meant to tell you what happened there — the event, its consequences, its actors.

**Stack**: TypeScript (strict) · three.js · Vite · Vitest · pnpm. No framework, no UI library.

> **Live demo**: _link goes here once the first deploy lands._
> The deployed build shows the **physical atlas** — relief, coastline, rivers, graticule, sheet, compass
> rose and title. It carries **no political layer yet**, and that is deliberate: see
> [Where the data comes from](#where-the-data-comes-from-and-what-is-deliberately-absent).

---

## Read this in 2 minutes, 20 minutes, or all of it

| you have       | read                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| **2 minutes**  | this page down to _The method_                                                                           |
| **20 minutes** | [`files/plans/README.md`](files/plans/README.md), then the groundwork and the plan of record             |
| **everything** | ~6 100 lines of plans under [`files/plans/`](files/plans/), decisions and rejected alternatives included |

## The method is the point

The part of this repository worth a reviewer's time is not a file of code — it is **the order the work
was done in**.

1. **Behaviour first.** Twelve Gherkin scenario files describe the contribution tool gesture by gesture,
   at the level of the button. Writing them produced a ledger of **26 holes** — questions nobody could
   answer — ten of which were closed in a single evening. A hole found by describing a gesture costs a
   sentence; the same hole found while coding costs a rewrite.
2. **Then the screens.** Five screens and ten cursors, reworked by hand where the generated output was
   wrong, with the contrast ratios computed rather than eyeballed.
3. **Then the code.**

Two habits run through all of it, and they are visible in the documents:

- **Measure instead of assuming.** The political grid is 1.9 km per cell, and the cost of that choice is
  written down (825 ms, ~136 MB peak). OpenHistoricalMap assembles 51 of 52 polities at 1100 covering
  45.2 % of Europe — and the Kingdom of France comes back with an identity and **no geometry at all**.
  Every one of those numbers was measured before it was relied on.
- **Write the reversals down.** When a decision is overturned, the document is **annotated, not
  rewritten** — see the banner at the top of
  [chapter 06](files/plans/cartographer/06-contribution-tooling.md). A clean document that hides its own
  history teaches nobody anything.

**Said honestly: the atlas itself was not built this way.** It grew feature by feature, and
[`.claude/known-issues.md`](.claude/known-issues.md) is the bill for that — defects found, their root
cause, and what each one cost. The contribution tool is where the method is applied from the start.

## What is here

```
src/            the atlas — scene, camera, controls, data ports, the pure pipeline
public/         the physical assets: DEM, land mask, rivers
files/plans/    the thinking: roadmap, scenarios, formats, screens, glossary
files/spikes/   small runnable programs that answered one question each
```

Layer boundaries are enforced by ESLint rather than by convention: `pipeline/` may not import three.js,
so the worker chunk ships at 12.6 kB with no renderer in it. There are **1 100+ tests**, and the gate is
`pnpm type-check && pnpm lint && pnpm test`.

## Running it

```bash
pnpm install
pnpm dev        # Vite + HMR — the camera pose survives a reload
pnpm build      # production build into dist/
```

## Where the data comes from, and what is deliberately absent

| layer                               | source                    | licence       |
| ----------------------------------- | ------------------------- | ------------- |
| relief                              | AWS Terrarium tiles       | public domain |
| coastline, land mask, rivers, lakes | Natural Earth 10m         | public domain |
| political borders                   | _none in this repository_ | —             |

The only complete free set of century-by-century borders we found is **GPL-3.0 with no separate data
licence**, which a strict reading says would put the whole distributed work under the GPL. Those files
are therefore **git-ignored**: a spike to look at, never an asset to ship.

That constraint is the reason the contribution tool exists. The political layer arrives when the
geometry is **ours** — drawn, sourced, and free to redistribute — and not before.

## Status

The physical atlas is built and navigable. The contribution tool is designed in full — format, screens,
gestures — and its chrome already runs. The next milestone is drawing the year **1100** and publishing a
political layer that owes nothing to anyone.
