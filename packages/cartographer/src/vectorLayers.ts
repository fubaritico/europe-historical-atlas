import { boundsDisagreement } from '@europe-historical-atlas/core/data/assetError'
import { chainSegments } from '@europe-historical-atlas/core/data/coastlineChain'
import { createMaskCoastlineSource } from '@europe-historical-atlas/core/data/coastlineSource'
import { mendRivers } from '@europe-historical-atlas/core/data/riverChain'
import { RIVER_DISPLAY, isDrawnRiver } from '@europe-historical-atlas/core/data/riverDisplay'
import {
  DEFAULT_RIVER_EXTENSION,
  extendRiversToSea,
} from '@europe-historical-atlas/core/data/riverSource'
import { provenanceOf } from '@europe-historical-atlas/core/editor/provenance'

import { boundsOf } from './view/culling'

import type { Box } from './view/culling'
import type { BackdropFrame } from './view/projection'
import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { River, RiverSource } from '@europe-historical-atlas/core/data/riverSource'
import type { Provenance } from '@europe-historical-atlas/core/editor/documentEdits'

/**
 * The vector layers the author aims at: the coastline and the rivers.
 *
 * **Why they are vectors and not part of the baked backdrop.** `s00`'s Background says it outright —
 * *"the coastline and rivers are drawn as vectors, sharp at any zoom"*. The backdrop gives out at its own
 * resolution, and these two are what a frontier is reported against: `s02`'s eastern limit of the royal
 * domain at 1100 runs along the Scheldt, the Meuse, the Saône and the Rhône, so it is *mostly a snapping
 * job*. Something blurry cannot be snapped to.
 *
 * **They are projected once, into backdrop pixels, and never again.** This is the lesson of ARCH-101:
 * `4d-1` shipped with a comment promising a cache nobody had built, and every `pointermove` of a pan
 * reprojected the whole anchor table through a `log(tan())`. These layers are an order of magnitude
 * larger — 95 233 coastline points — and, unlike anchors, they **never change**. So the conversion runs
 * at load and the viewport is applied by the canvas's own transform at paint time.
 */

/** A run of points in backdrop pixels, ready to stroke. */
export interface Polyline {
  /** `[x, y]` pairs in the backdrop's own pixel grid. */
  points: readonly (readonly [number, number])[]
  /** Whether the run closes on itself — an island, a lake. */
  closed: boolean
  /**
   * The box it occupies, so the painter can skip it without looking at its points.
   *
   * Computed once here, when the layers load. Recomputing it per frame would cost exactly the
   * traversal that carrying it exists to avoid — which is most of the point: zoomed over France, the
   * Baltic and the Caspian are skipped on one comparison each instead of 25 629 `lineTo` calls.
   */
  bounds: Box
}

/** A river, with what the status bar needs to name it. */
export interface NamedPolyline extends Polyline {
  /** The river's name as the dataset holds it, or `null`. */
  name: string | null
  /** Natural Earth's `scalerank`, 1 (major) to 9 (minor). */
  rank: number
}

/** Everything drawn as vectors over the backdrop. */
export interface VectorLayers {
  /** The shoreline, chained into contours, longest first. */
  coast: readonly Polyline[]
  /** The river centrelines. */
  rivers: readonly NamedPolyline[]
  /**
   * What the coastline was traced from — recorded on every anchor the Pen snaps onto it. Read off the
   * mask's own declaration, never restated here.
   */
  coastProvenance: Provenance
  /**
   * What the rivers were drawn from — recorded on every anchor the Pen snaps onto one. Read off the
   * river payload's own declaration, never restated here.
   */
  riverProvenance: Provenance
}

/**
 * The grid the shoreline is traced at, in pixels across.
 *
 * **2 560, which is the atlas's own choice and is taken rather than re-decided** — so the two
 * applications agree on the shape of the coast, and an author reporting a frontier against it is
 * reporting against the map that will be published. The atlas's reason holds here too: the shipped mask
 * is 5 120 wide, and marching its 23 million cells costs 2 063 ms against 539 for half that, for
 * fidelity invisible at the zooms this is drawn at.
 *
 * Measured in `files/spikes/coastline-volume`: 95 212 segments, chained into 2 029 contours.
 */
export const COASTLINE_TRACE_WIDTH = 2560

/**
 * Normalized grid coordinates into backdrop pixels.
 *
 * Multiplied by the full size rather than by `size - 1`, which is what `lonLatToBackdrop` does: the
 * backdrop is a continuous domain from 0 to `width`, and `u = 0` is its west edge. Getting this wrong by
 * one convention would slide every coast half a cell — invisible at a glance and wrong everywhere.
 * @param points - the run in normalized coordinates
 * @param frame - the backdrop's coordinate system
 * @returns the same run in backdrop pixels
 */
export function toBackdropPixels(
  points: readonly UvPoint[],
  frame: BackdropFrame
): [number, number][] {
  return points.map((point) => [point.u * frame.size.width, point.v * frame.size.height])
}

/**
 * Trace the shoreline through the mask and chain it into contours.
 *
 * **It takes the mask it is given rather than loading one.** The backdrop's own load already holds it —
 * three megabytes that would otherwise be fetched and unpacked twice for the same picture.
 * @param mask - the land/water mask, already loaded
 * @param frame - the backdrop's coordinate system
 * @param traceWidth - the grid to march; defaults to {@link COASTLINE_TRACE_WIDTH}
 * @returns the contours, in backdrop pixels, longest first
 */
export function traceCoastline(
  mask: LandMask,
  frame: BackdropFrame,
  traceWidth: number = COASTLINE_TRACE_WIDTH
): Polyline[] {
  const segments = createMaskCoastlineSource(mask, traceWidth).load()
  return chainSegments(segments).map((contour) => {
    const points = toBackdropPixels(contour.points, frame)
    return { points, closed: contour.closed, bounds: boundsOf(points) }
  })
}

/**
 * The rivers, projected.
 * @param rivers - the centrelines as the reader parsed them
 * @param frame - the backdrop's coordinate system
 * @returns the same rivers in backdrop pixels
 */
export function projectRiverLines(rivers: readonly River[], frame: BackdropFrame): NamedPolyline[] {
  return rivers.map((river) => {
    const points = toBackdropPixels(river.points, frame)
    return {
      points,
      // A centreline is never a ring: it runs from source to mouth, or to the frame's edge.
      closed: false,
      bounds: boundsOf(points),
      name: river.name,
      rank: river.rank,
    }
  })
}

/**
 * The rivers as the Cartographer draws them **and snaps to** — the atlas's rivers, drawn the atlas's way.
 *
 * The dev's call, 2026-10-12: *"si ça affiche exactement la même chose que dans l'application […] et qu'on
 * a un fonctionnement cohérent, moi, ça me va."* Three steps, in this order:
 *   1. **the paths traced through lakes go** (`isDrawnRiver`, the atlas's own rule) — not drawn, so not
 *      snapped to: the Pen must only ever reach what the author sees;
 *   2. **the pieces are mended** (`H-35`): Natural Earth cuts a river into pieces and strews 2-point
 *      fragments, and the Pen follows one polyline at a time — 591 polylines → 398 on the shipped file;
 *   3. **the mouths are carried to the sea** (`extendRiversToSea`, the atlas's function on the same mask),
 *      so a river ends at the coast here as it does in the atlas, and a border running down an estuary can
 *      follow it to the shore. Mended first, so a mouth is found at the true end of a river and not at the
 *      end of one of its pieces.
 * @param rivers - the centrelines as the source projected them
 * @param mask - the land/water mask the backdrop was baked from
 * @returns the centrelines to draw and to snap to
 */
export function riversAsDrawn(rivers: readonly River[], mask: LandMask): River[] {
  const drawn = rivers.filter((river) => isDrawnRiver(river, RIVER_DISPLAY.includeLakeCenterlines))
  return extendRiversToSea(mendRivers(drawn).rivers, mask, DEFAULT_RIVER_EXTENSION)
}

/** What {@link loadVectorLayers} needs. */
export interface VectorLayersDeps {
  /** The mask the backdrop already loaded — the shoreline is traced through it. */
  mask: LandMask
  /** Where the river centrelines come from. */
  rivers: RiverSource
  /** The backdrop's coordinate system, from the DEM itself. */
  frame: BackdropFrame
  /** The grid to march the shoreline at; defaults to {@link COASTLINE_TRACE_WIDTH}. */
  traceWidth?: number
}

/**
 * Load and project both vector layers.
 *
 * **The tracing is synchronous and costs about 660 ms** at the default width — 539 ms to march the grid
 * and 124 to chain it, measured. That is a real freeze of the main thread, and it is accepted here
 * rather than hidden: it happens once, at startup, behind the waiting notice, and moving it into the
 * worker would mean widening the compute protocol for a job that runs one time. **If it ever needs to
 * move, the remedy is a method on `MapCompute`, not a `setTimeout`** — which would only scatter the same
 * freeze across frames.
 *
 * **A failing river load propagates**, like the backdrop's two assets: the dev's call of 2026-10-07 is
 * that the canvas area shows nothing and says so rather than drawing a map that is quietly incomplete.
 * A missing river is not cosmetic here — it is a stretch of frontier with nothing to snap to.
 *
 * **Rivers projected against another box are refused the same way**, and so is a source naming no
 * licence — both before the tracing: their `(u, v)`
 * are computed against the payload's box and multiplied here by the backdrop's, so the two must be one.
 * @param deps - the mask, the river source, and the frame
 * @returns both layers, in backdrop pixels
 * @throws AssetError when the river load fails, or when the rivers cover different ground
 */
export async function loadVectorLayers(deps: VectorLayersDeps): Promise<VectorLayers> {
  const loaded = await deps.rivers.load()
  const disagreement = boundsDisagreement(deps.frame.bounds, loaded.bbox, 'rivers', 'the rivers')
  if (disagreement !== null) throw disagreement
  // Every refusal before the tracing, so a payload turned away costs no 660 ms first.
  const coastProvenance = provenanceOf(deps.mask.meta.source)
  const riverProvenance = provenanceOf(loaded.source)
  return {
    coast: traceCoastline(deps.mask, deps.frame, deps.traceWidth),
    rivers: projectRiverLines(riversAsDrawn(loaded.rivers, deps.mask), deps.frame),
    coastProvenance,
    riverProvenance,
  }
}
