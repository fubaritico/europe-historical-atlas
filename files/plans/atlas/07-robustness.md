# 07 — Robustness: source validation & error handling

> Chapter of the [roadmap](../roadmap.md). Raised by the dev on 2026-09-16, after a review flagged the
> political payload being cast rather than validated: *"le projet commence à prendre de l'ampleur, il va
> falloir qu'on commence à gérer les cas d'erreur."*

## Raison d'être

The map now loads **four external asset families** — DEM, land mask, rivers, borders — plus an SVG
compass, and the contribution tooling (chapter [06](../cartographer/06-contribution-tooling.md)) will let arbitrary files
be imported. Every one of them is a place the app can be handed something it did not expect. Right now it
answers by drawing nothing and writing to a console the user never opens.

## State of play — audited 2026-09-16

**What already works: transport.** All four loaders check the HTTP status and throw a message naming the
path and the code (`heightmap.ts:87`, `landMask.ts:139`, `regionSource.ts:103`, `riverSource.ts:78`).

**What is missing: shape.** All four then cast blindly —
`(await res.json()) as HeightmapMeta` / `as LandMaskMeta` / `as RegionPayload` / `as RiverPayload`
(`heightmap.ts:88`, `landMask.ts:140`, `regionSource.ts:104`, `riverSource.ts:79`). A file that parses as
JSON but holds the wrong fields flows straight into the rasteriser and the mesh builder. The **one
precedent to generalise** is `landMask.ts:149`, which checks the byte length against the declared
`width × height` and throws when they disagree.

**What is missing: a way to tell the user.** Every failure ends in `console.error` and nothing else
(`main.ts:430, 493, 513, 526`). Only the land mask documents a degraded mode (falls back to the 0 m
contour). A failed relief load leaves a blank canvas with no explanation at all.

## What to build

1. **A validation seam in the port, not in the fetch.** Each payload gets a
   `parse(value: unknown): Result<T>` that the *port contract* owns, so the fetch implementation, the
   mock and any generated source all go through the same gate. A cast is not a check.
2. **A failure taxonomy**, because the four kinds deserve four answers:
   - *transport* — HTTP status, network, CORS. Already handled.
   - *schema* — parses as JSON, wrong shape. Report the field and the path.
   - *consistency* — the payload disagrees with itself (`landMask.ts:149` is this case: declared size vs
     actual bytes).
   - *semantic* — internally valid but wrong for us: a bbox that does not match the DEM's frame, a year
     outside the dataset. The class that will bite hardest once files are imported by hand.
3. **A degraded-mode policy, declared per layer.** Which layers are essential and which are decor is a
   product decision, not an accident of which `catch` someone wrote. Relief missing → there is no map.
   Rivers, borders, compass missing → the map still reads; say so and carry on.
4. **A user-facing error surface.** This is the project's **first genuine piece of HTML UI**, so it lands
   naturally alongside the M2 overlay milestone (roadmap 03) — and it must be accessible from the start
   (`role="alert"` for a blocking failure, `role="status"` for a degraded one), rather than joining the
   a11y backlog the canvas is already in.
5. **Validation is the main UX of the contribution tools**, not a safety net. Importing a file the
   Cartographer cannot read must say *which* file, *what* was expected and *where* it broke — "source
   invalide" alone is what the dev is asking to avoid.

## Showing that work is happening — and why it is not free

Raised by the dev on 2026-09-16, on seeing that a change of year costs ~215 ms at the political raster's
2× scale: *"on pourra toujours mettre un overlay avec une petite barre de chargement… tant qu'on montre
quelque chose."* He is right that the budget is generous once something is on screen — and the same
surface is the one chapter 07 already needs for errors, so it should be built once for both.

**The constraint that decides how it is built**: the work is a *synchronous* computation on the main
thread — rasterise, expand over land, derive borders, re-bake the texture. **A browser cannot paint a
spinner during it.** Setting a flag and then blocking means the overlay appears only after the work has
finished, which is worse than no overlay at all. So this is not a UI task with a rendering afterthought;
it is a scheduling task with a UI afterthought. Three ways out, in increasing order of cost:

1. **Yield between phases** — the pipeline already has four natural seams, and each is tens of
   milliseconds. Awaiting a frame between them lets the overlay paint and gives a real four-step
   progress, not a fake one. Cheapest, and enough at 2×.
2. **Chunk the expansion** — it dominates the cost (111 ms of the 215 ms at 2×, 454 ms of 825 ms at 4×)
   because it walks every land cell, and it is already a breadth-first loop over a frontier list, so it
   splits across frames almost for free.
3. **A worker** — the honest answer if the grid ever goes to 4×, but it means shipping the mask and the
   payload across a boundary, and the texture bake writes into a `DataTexture` the renderer owns.

**Consequence for the political raster**: with a working progress affordance, 4× (825 ms, 1.9 km cells)
stops being out of the question. Without one, 2× is the ceiling — see `known-issues.md` for the measured
table.

## Trade-off to settle: hand-written guards or a schema library

- **Hand-written type guards** — zero dependency, nothing added to a bundle already over 500 KB because
  of three.js, and these payloads are simple (arrays of numbers, a bbox, a few strings). Costs
  boilerplate, and the guard can drift from the type it guards.
- **A schema library** — the schema becomes the single source of truth and the TS type is derived from
  it, so drift is impossible. Costs a dependency and bundle weight, and it would also serve the Studio's
  content model, which is where schemas get genuinely complicated.

**Recommendation**: hand-written guards behind one shared helper for the four asset payloads now;
revisit when the Studio content model arrives, since that is the case that actually justifies a library.

## Open questions

1. Is a missing **relief** fatal (blocking message, nothing rendered) or should the app show an empty
   parchment frame with a status line?
2. Does validation run in production, or only in dev? (Cost is negligible at these sizes — the argument
   for always-on is that a corrupt asset in production is exactly when you want the message.)
3. Does the error surface reuse whatever component the M2 overlay introduces, or ship before it?

---

## Built 2026-09-17 — and what it left behind

Both halves shipped (`dab6f7c`, `d539a94`). The three open questions above are answered:

1. **A missing relief is blocking.** The chapter's own degraded-mode policy already said it — relief
   missing means there is no map — so the splash stays up and the message lands on it.
2. **Validation runs always**, on the chapter's own argument: production is when a corrupt asset most
   deserves a message, and the cost is negligible at these sizes.
3. **The error surface shipped before the M2 overlay** (`src/ui/notice.ts`), because there was nothing to
   wait for: the M2 overlay does not exist and a blank canvas was shipping meanwhile.

What is in place: `data/assetError.ts` (the taxonomy + hand-written readers), a parser per payload, the
`boundsMatch` semantic check, `assetMessages.ts` (the declared degraded-mode policy and the wording), and
`ui/notice.ts` (`role="alert"` blocking / `role="status"` degraded).

### Still to do: retry

**The gap**: a blocking failure shows a message and no way out. Reloading the page works; nothing says so.

**The insight to keep** — the taxonomy already says which failures are worth retrying:

| failure | retry? | why |
|---|---|---|
| `transport` | **yes** | a 404 or a dropped connection may not repeat; the same request can succeed |
| `schema` | no | the same bytes will fail the same way |
| `consistency` | no | ditto |
| `semantic` | no | the file is valid and wrong; retrying cannot change that |

So the work splits in two, and **the smaller half is the more valuable**:

1. **Automatic retry with backoff, on `transport` only.** No UI at all, and it covers the common real
   case. Bounded attempts, then give up and report as today.
2. **A retry action on the notice.** `notice.show()` takes an action — a label and a callback — and the
   *composition root* supplies the element. This is the seam, and it is the point: `ui/notice.ts` must
   never learn what a button looks like.

### Consuming the design system — established 2026-09-17

The dev's white-label design system lives in the **sibling repository `../fubaritico-ds`** (pnpm
workspaces + Lerna + Nx, Storybook). Buttons and a progress bar are meant to come from it.

**The finding that matters: the button already exists, and this app does not need a component.**

- `packages/variants` exports `buttonVariants` — a `cva()` producing **BEM class strings**
  (`ui-button`, `ui-button--secondary`, `--outline`, `--ghost`, `--sm`, `--lg`). Its own docstring:
  *"Pure string output (framework-agnostic): consumed by the React reference and the Stencil / Angular /
  Vue packages alike, none of which it couples to a framework."* One dependency:
  `class-variance-authority`.
- `packages/styles` exports a built `dist/styles.css` that carries those rules. Verified present.

So a vanilla `<button class="ui-button ui-button--secondary">` consumes the DS today, with no React and
no Stencil — which is exactly what a TS + three.js app needs, and the reason the framework-agnostic split
was worth making in the first place.

**The obstacle is plumbing, not design.** Both packages are `0.0.0` and unpublished, in a separate repo.
A `file:../fubaritico-ds/packages/styles` dependency works on one machine and breaks everywhere else, so
the real options are: publish to npm or a private registry; or decide the two repos become one workspace.
Note this repo's standing rule (`rules/troubleshooting.md`): **stay single-package until a real seam needs
otherwise** — a shared design system across two products is a candidate, but only once it is stable.

**Order of operations when this is picked up**: build the action seam first (it is independent of the DS
and makes the swap a one-line change in `main.ts`), then the automatic retry, and only then the DS
integration — whose cost lands mostly on the DS's own release pipeline, not here.
