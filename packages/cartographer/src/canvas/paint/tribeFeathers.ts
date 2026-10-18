import {
  CLAIM_CUT_REACH_KM,
  featherShiftKm,
  tribeOpacityAt,
} from '@europe-historical-atlas/core/editor/tribeFeather'
import { tribeIds } from '@europe-historical-atlas/core/editor/tribes'
import {
  latitudeToMercatorY,
  longitudeToHorizontal,
} from '@europe-historical-atlas/core/geo/mercator'
import {
  boxesOverlap,
  paddedBox,
  signedDistanceField,
  unionDistanceField,
} from '@europe-historical-atlas/core/geo/signedDistance'
import { hexToRgb } from '@europe-historical-atlas/core/utils/color'

import { claimsInPaintOrder } from './scene'

import type { Rect } from '../../geometry/marquee'
import type { BackdropFrame } from '../../viewport/projection'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { TribeFeather } from '@europe-historical-atlas/core/editor/tribeFeather'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import type {
  GridBox,
  GridPoint,
  SignedDistance,
} from '@europe-historical-atlas/core/geo/signedDistance'

/**
 * Each tribe's colour as an image, full at the heart of its ground and vanishing toward its limit — the
 * Cartographer's half of ATLAS-258, the same look as the atlas (`core/editor/tribeFeather`).
 *
 * **One pixel of the image per backdrop pixel**, which is one DEM cell — the density the atlas's relief has
 * one vertex per. Each pixel's opacity is `tribeOpacityAt` at its centre: the ramp of the signed distance to
 * the tribe's outline (`core/geo/signedDistance`), cut beyond it over any other polity's ground and over the
 * sea (the dev, 2026-10-18: *« si ça déborde, c'est pas bon »*) — the very rule the atlas's shader reads, so
 * the two applications fade a tribe alike. The painter composites the image like a fill (`overlay` at the
 * fills' layer opacity), and the canvas scales it smoothly to the view.
 *
 * **Pure** — rings in, pixels out: making an image out of the pixels needs a canvas, which is the cache's
 * injected collaborator (`canvas/tribeFeatherCache`), and painting it is the painter's.
 */

/** One tribe's fade, ready to become an image. */
export interface TribeFeatherRaster {
  /** Where it lies, in whole backdrop pixels. */
  box: Rect
  /** `box.width × box.height` RGBA pixels: the tribe's colour, the opacity as alpha. */
  pixels: Uint8ClampedArray
}

/** What a tribe's fade is measured against, beside the document. */
export interface FeatherGround {
  /** The backdrop's coordinate system. */
  frame: BackdropFrame
  /** Inset or outset, and the width — `TRIBE_FEATHER` in the application. */
  feather: TribeFeather
  /** Which ground is dry — an outset spill never lies on the sea. */
  land: Pick<LandMask, 'isLand'>
}

/**
 * The narrowest reach the distance is asked for, in km: a fade of zero width is a hard edge, which needs
 * only the sign — but the distance needs a positive reach to bucket its edges.
 */
const MIN_REACH_KM = 1

/**
 * Where an anchor falls on the backdrop's grid, remembered by anchor index and position — so reading a new
 * version of the document projects only the anchors that moved (measured 2026-10-18 on 1100's 56 616
 * anchors: projecting them all was ~8 ms a version, most of what an edit cost the tribes in outset).
 */
export interface GridProjection {
  /**
   * An anchor on the grid.
   * @param index - its index in the document's table
   * @param anchor - its position, longitude first, or `undefined` for an index with no anchor
   * @returns its grid point — the same object as last time when it has not moved — or `undefined`
   */
  pointOf: (index: number, anchor: readonly [number, number] | undefined) => GridPoint | undefined
}

/**
 * Open a projection over one frame — the arithmetic of `longitudeToHorizontal` and `latitudeToVertical`,
 * the frame's own Mercator edges taken once rather than at every point.
 * @param frame - the backdrop's coordinate system
 * @returns the projection, empty
 */
export function createGridProjection(frame: BackdropFrame): GridProjection {
  const { bounds } = frame
  const northY = latitudeToMercatorY(bounds.north)
  const span = latitudeToMercatorY(bounds.south) - northY
  const known: ({ lon: number; lat: number; point: GridPoint } | undefined)[] = []
  return {
    pointOf(index, anchor) {
      if (anchor === undefined) return undefined
      const [lon, lat] = anchor
      const last = known[index]
      if (last !== undefined && Object.is(last.lon, lon) && Object.is(last.lat, lat))
        return last.point
      const point = {
        u: longitudeToHorizontal(lon, bounds),
        v: span === 0 ? 0 : (latitudeToMercatorY(lat) - northY) / span,
      }
      known[index] = { lon, lat, point }
      return point
    },
  }
}

/**
 * A claim's rings in the backdrop's normalized coordinates.
 * @param rings - the rings, as anchor indices
 * @param anchors - the document's anchors, longitude first
 * @param projection - where an anchor falls on the grid
 * @returns the rings, each point `u` west→east and `v` north→south over the backdrop
 */
function ringsOnGrid(
  rings: readonly (readonly number[])[],
  anchors: YearDocument['anchors'],
  projection: GridProjection
): GridPoint[][] {
  return rings.map((ring) => {
    const points: GridPoint[] = []
    for (const index of ring) {
      const point = projection.pointOf(index, anchors[index])
      // An index with no anchor no operation produces (see `projectedRings`); it is not a point to fade from.
      if (point !== undefined) points.push(point)
    }
    return points
  })
}

/** A tribe's claim on the backdrop's grid. */
interface GridClaim {
  /** Whose claim it is. */
  polity: string
  /** Its rings, on the backdrop's grid. */
  rings: GridPoint[][]
}

/**
 * The box a tribe's colour can touch, in whole backdrop pixels, and the same box on the grid.
 * @param rings - its rings, on the backdrop's grid
 * @param ground - the frame and the fade
 * @returns the pixels and the grid box; `null` for rings with no point or a box with no pixel; a box that is
 *   not a number (an anchor that is not one) comes back as it is, for the caller to refuse
 */
function featherBox(
  rings: readonly (readonly GridPoint[])[],
  ground: Pick<FeatherGround, 'frame' | 'feather'>
): { box: Rect; grown: GridBox } | null {
  const { frame, feather } = ground
  const { width: W, height: H } = frame.size
  const grown = paddedBox(rings, frame.bounds, featherShiftKm(feather.mode, feather.widthKm))
  if (grown === null) return null
  // One pixel more on each side, so the outline's own pixels are inside the image.
  const x0 = Math.max(0, Math.floor(grown.u0 * W) - 1)
  const y0 = Math.max(0, Math.floor(grown.v0 * H) - 1)
  const x1 = Math.min(W, Math.ceil(grown.u1 * W) + 1)
  const y1 = Math.min(H, Math.ceil(grown.v1 * H) + 1)
  if (x1 <= x0 || y1 <= y0) return null
  return { box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, grown }
}

/**
 * Say that a tribe's fade is not a number, once per raster — it is not drawn rather than drawn transparent
 * (QUAL-006, the dev's call of 2026-10-18): a NaN alpha would become 0, a tribe silently absent.
 * @param polity - the tribe, its id and name
 * @param polity.id - its id
 * @param polity.name - its name
 */
function sayNotANumber(polity: { id: string; name: string }): void {
  console.error(
    `[Cartographer] The fade of the tribe "${polity.name}" (${polity.id}) is not a number — the tribe is not drawn.`
  )
}

/**
 * One tribe's fade over the box its colour can touch.
 *
 * **The other polities' distance and the land are measured only where they decide** (QUAL-003,
 * `tribeOpacityAt`): beyond the outline, within an outset spill. In inset neither is ever measured, and the
 * neighbours' field is not even built.
 * @param polity - the tribe, named in a refusal
 * @param polity.id - its id
 * @param polity.name - its name
 * @param rings - its rings, on the backdrop's grid
 * @param near - the other polities' rings near its box, whose ground its spill is cut over
 * @param colour - its `#rrggbb`
 * @param ground - the frame, the fade and the land
 * @returns the raster, or `null` for rings with no point, a box with no pixel, or a fade that is not a number
 */
function featherRaster(
  polity: { id: string; name: string },
  rings: readonly (readonly GridPoint[])[],
  near: readonly (readonly (readonly GridPoint[])[])[],
  colour: string,
  ground: FeatherGround
): TribeFeatherRaster | null {
  const { frame, feather, land } = ground
  const { width: W, height: H } = frame.size
  const placed = featherBox(rings, ground)
  if (placed === null) return null
  const { box, grown } = placed
  if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) {
    sayNotANumber(polity)
    return null
  }
  const distance = signedDistanceField(rings, frame.bounds, Math.max(MIN_REACH_KM, feather.widthKm))
  let claimedAt: SignedDistance | null = null
  const { r, g, b } = hexToRgb(colour)
  const pixels = new Uint8ClampedArray(box.width * box.height * 4)
  for (let row = 0; row < box.height; row++) {
    const v = (box.y + row + 0.5) / H
    for (let col = 0; col < box.width; col++) {
      const u = (box.x + col + 0.5) / W
      const opacity = tribeOpacityAt(distance(u, v), feather, () => {
        claimedAt ??= unionDistanceField(near, frame.bounds, CLAIM_CUT_REACH_KM, grown)
        return { claimedKm: claimedAt(u, v), land: land.isLand(u, v) }
      })
      if (Number.isNaN(opacity)) {
        sayNotANumber(polity)
        return null
      }
      const at = 4 * (row * box.width + col)
      pixels[at] = r
      pixels[at + 1] = g
      pixels[at + 2] = b
      pixels[at + 3] = Math.round(opacity * 255)
    }
  }
  return { box, pixels }
}

/**
 * What a tribe's raster reads, beside the frame, the fade and the land the cache holds for its life — so a
 * raster is made again only when one of these moved (ARCH-002 / QUAL-002).
 */
export interface FeatherSignature {
  /** The tribe's colour. */
  colour: string
  /**
   * Its rings' points on the grid, each ring led by its length; then, **only when the fade reaches past the
   * outline** (outset), the rings of every other polity near its box, the same way — in inset nothing beyond
   * the tribe's own outline is ever read, so a neighbour's edit leaves it alone.
   */
  numbers: Float64Array
}

/**
 * Whether two signatures would make the same raster. `Object.is`, so a NaN point equals itself and a broken
 * tribe is refused once, not again at every version.
 * @param a - one signature
 * @param b - the other
 * @returns `true` when nothing the raster reads differs
 */
export function sameSignature(a: FeatherSignature, b: FeatherSignature): boolean {
  if (a.colour !== b.colour || a.numbers.length !== b.numbers.length) return false
  for (let i = 0; i < a.numbers.length; i++)
    if (!Object.is(a.numbers[i], b.numbers[i])) return false
  return true
}

/**
 * Sets of rings flattened, each set led by its ring count and each ring by its length.
 * @param sets - the sets of rings
 * @returns the numbers
 */
function flattenRings(sets: readonly (readonly (readonly GridPoint[])[])[]): Float64Array {
  let length = 0
  for (const rings of sets) {
    length += 1
    for (const ring of rings) length += 1 + 2 * ring.length
  }
  const out = new Float64Array(length)
  let at = 0
  for (const rings of sets) {
    out[at++] = rings.length
    for (const ring of rings) {
      out[at++] = ring.length
      for (const { u, v } of ring) {
        out[at++] = u
        out[at++] = v
      }
    }
  }
  return out
}

/** One tribe's fade, before it is measured: what it reads, and how to measure it. */
export interface TribeFeatherPlan {
  /** The tribe's id. */
  polity: string
  /** What its raster reads — compared with the last one's before measuring again. */
  signature: FeatherSignature
  /**
   * Measure it.
   * @returns the raster, or `null` when there is nothing to draw or its fade is not a number (said once)
   */
  raster: () => TribeFeatherRaster | null
}

/**
 * Every tribe's fade, in painting order — one plan per claim of a tribe, nothing measured yet.
 *
 * A claim whose polity has no colour is skipped, as `projectedFills` skips it: `polityColours` colours every
 * polity of the registry, so it names a polity the registry lacks, which `documentFaults` reports once.
 * @param document - the document to read
 * @param colours - each polity's colour, by id
 * @param ground - the backdrop's frame, the fade and the land mask
 * @param projection - where an anchor falls on the grid, over the same frame — kept by the caller across
 *   versions so an unmoved anchor is not projected again
 * @returns the plans, back to front
 */
export function tribeFeatherPlans(
  document: YearDocument,
  colours: ReadonlyMap<string, string>,
  ground: FeatherGround,
  projection: GridProjection
): TribeFeatherPlan[] {
  const tribes = tribeIds(document.polities)
  const tribesById = new Map(
    document.polities.filter((polity) => tribes.has(polity.id)).map((polity) => [polity.id, polity])
  )
  const reachesBeyond = featherShiftKm(ground.feather.mode, ground.feather.widthKm) > 0
  const ordered = claimsInPaintOrder(document)
  // The neighbours are projected only when a fade can reach them: in inset, only the tribes are.
  const onGrid: GridClaim[] = ordered.flatMap((claim) =>
    reachesBeyond || tribes.has(claim.polity)
      ? [{ polity: claim.polity, rings: ringsOnGrid(claim.rings, document.anchors, projection) }]
      : []
  )
  const cutBoxes = reachesBeyond
    ? onGrid.map((claim) => paddedBox(claim.rings, ground.frame.bounds, CLAIM_CUT_REACH_KM))
    : []
  const out: TribeFeatherPlan[] = []
  for (const claim of onGrid) {
    const colour = colours.get(claim.polity)
    const tribe = tribesById.get(claim.polity)
    if (colour === undefined || tribe === undefined) continue
    const grown = reachesBeyond ? featherBox(claim.rings, ground)?.grown : undefined
    // The same choice `unionDistanceField` makes over the same box, made here so the signature holds exactly
    // the rings the raster will read.
    const near =
      grown === undefined
        ? []
        : onGrid
            .filter((other, index) => {
              const box = cutBoxes[index]
              return other.polity !== claim.polity && box != null && boxesOverlap(box, grown)
            })
            .map((other) => other.rings)
    const polity = { id: tribe.id, name: tribe.name }
    out.push({
      polity: claim.polity,
      signature: { colour, numbers: flattenRings([claim.rings, ...near]) },
      raster: () => featherRaster(polity, claim.rings, near, colour, ground),
    })
  }
  return out
}

/**
 * Every tribe's fade, measured, in painting order — {@link tribeFeatherPlans}, each measured.
 * @param document - the document to read
 * @param colours - each polity's colour, by id
 * @param ground - the backdrop's frame, the fade and the land mask
 * @returns the rasters, back to front; a tribe with nothing to draw has none
 */
export function tribeFeatherRasters(
  document: YearDocument,
  colours: ReadonlyMap<string, string>,
  ground: FeatherGround
): TribeFeatherRaster[] {
  const projection = createGridProjection(ground.frame)
  return tribeFeatherPlans(document, colours, ground, projection).flatMap((plan) => {
    const raster = plan.raster()
    return raster === null ? [] : [raster]
  })
}
