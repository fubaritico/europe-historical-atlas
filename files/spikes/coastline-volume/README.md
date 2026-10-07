# coastline-volume — how many points must a pan redraw?

## The question

Step 4d-2(a) draws the coastline and the rivers as vectors on the Cartographer's canvas. That canvas is
repainted on **every `pointermove` of a pan**, so the size of those layers is not a detail — it decides
whether they can be drawn plainly or need culling, decimation, or a different approach entirely.

`s02-create-france-1100.md` carries the instruction in its own words: **"Measure before building."**

## How to run

```sh
node --experimental-strip-types files/spikes/coastline-volume/measure.ts
```

It reaches into `coastlineSource.ts` and `coastlineChain.ts` rather than `createMaskCoastlineSource`,
for a mechanical reason worth knowing: both modules have **type-only** imports, so Node's type stripping
loads them as they are, while `landMask.ts` imports `./assetError` without an extension and Node ESM
refuses that. The mask is therefore unpacked here, reproducing exactly what `createMaskCoastlineSource`
does — bilinear coverage, shore at 0.5.

## What it found

Traced over the shipped land mask (5120×4656, four times the DEM):

| trace width | segments | trace | chained | points | longest | sub-paths |
| --- | --- | --- | --- | --- | --- | --- |
| 1280 (the DEM's own) | 40 712 | 131 ms | 1 453 contours | 40 729 | 11 373 | **28× fewer** |
| **2560 (what the atlas uses)** | **95 212** | 539 ms | **2 029 contours** (2 008 closed) | 95 233 | 25 629 | **47× fewer** |
| 5120 (the whole mask) | 215 812 | 2 063 ms | 2 512 contours | 215 836 | 58 682 | **86× fewer** |

Rivers, for comparison: **591 polylines, 29 207 points**, already chained by the dataset.

## What we concluded

**The segments have to be chained, and not primarily for speed.** Marching squares emits an unordered
cloud, and `s02`'s headline gesture — *"the whole coastline sub-path between the two is inserted"* — has
no meaning in a cloud: there is no "between". Chaining is the prerequisite for the gesture, and the
repaint cost falls out of it for free.

**The gain is double.** Sub-paths drop 47× (a 2D canvas pays per `moveTo`), and the point count halves,
a junction no longer being counted once per incident segment.

**2560 stays the tracing resolution**, matching the atlas so the two applications agree on the shape of
the coast — and the atlas's own reason still holds: marching 23 million cells costs far more than the
fidelity is worth at the zoom levels this is drawn at.

**The endpoints coincide exactly, so chaining needs no epsilon.** Two neighbouring cells compute their
shared edge from the same two corner values through the same expression, so the join is bit-identical.
An epsilon would be actively harmful: it would weld two shores that merely pass close by across a strait.

## Status

**graduated** — `chainSegments` lives in `packages/core/src/data/coastlineChain.ts`. This spike is kept
because its numbers are the argument for that module existing, and because re-measuring after a change to
the mask or the tracing resolution is one command.
