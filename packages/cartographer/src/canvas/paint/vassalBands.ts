import {
  VASSAL_BAND_REACH_KM,
  VASSAL_BAND_WIDTH_KM,
  bandedVassalIds,
  vassalBandOpacity,
} from '@europe-historical-atlas/core/data/vassalBand'
import { paddedBox, signedDistanceField } from '@europe-historical-atlas/core/geo/signedDistance'
import { hexToRgb } from '@europe-historical-atlas/core/utils/color'

import { claimsInPaintOrder } from './scene'
import { flattenRings, pixelBoxOf, ringsOnGrid } from './tribeFeathers'

import type { FeatherSignature, GridProjection, TribeFeatherRaster } from './tribeFeathers'
import type { BackdropFrame } from '../../viewport/projection'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type { GridPoint } from '@europe-historical-atlas/core/geo/signedDistance'

/**
 * Each vassal's band as an image — the Cartographer's half of ATLAS-398, the same look as the atlas
 * (`core/data/vassalBand`): half the vassal's colour from its outline to `VASSAL_BAND_WIDTH_KM` inside it, its full
 * colour deeper, as Illustrator's inner offset path.
 *
 * **The image is the vassal's fill, its edge left to the vector**: the painter draws it clipped by the vassal's own
 * outline (`paintFills`), so the fill's edge stays as exact as every other fill's; only the band's inner edge comes from
 * the image, one pixel per backdrop pixel, as a tribe's band does. Each pixel's share is `vassalBandOpacity` of the
 * signed distance at its centre (`core/geo/signedDistance`), the very rule and distance the atlas's shader reads — so
 * the two applications draw the band alike, in kilometres on the ground, at every latitude.
 *
 * **Every vassal is banded, at every zoom**: the Cartographer shows every polity in its own colour with every border,
 * so the band the atlas reveals by zoom is always revealed here.
 *
 * **Pure** — rings in, pixels out: the canvas that makes an image of them is the cache's collaborator
 * (`canvas/vassalBandCache`).
 */

/** One vassal's band, before it is measured: which claim, what it reads, and how to measure it. */
export interface VassalBandPlan {
  /** The vassal's id. */
  polity: string
  /** The claim the band fills — the document's own object, which the scene matches its fill by. */
  claim: YearDocument['claims'][number]
  /** What its raster reads: its colour and its rings on the grid. */
  signature: FeatherSignature
  /**
   * Measure it.
   * @returns the raster, or `null` for rings with no point, a box with no pixel, or a distance that is not a number
   *   (said once)
   */
  raster: () => TribeFeatherRaster | null
}

/**
 * Say that a vassal's band is not a number, once per raster — the vassal is then filled whole, never drawn with an
 * alpha of nought (a NaN read as `0` would erase its fill silently).
 * @param polity - the vassal, its id and name
 * @param polity.id - its id
 * @param polity.name - its name
 */
function sayNotANumber(polity: { id: string; name: string }): void {
  console.error(
    `[Cartographer] The band of the vassal "${polity.name}" (${polity.id}) is not a number — it is filled whole.`
  )
}

/**
 * One vassal's band over its box, in whole backdrop pixels, one more on each side so the outline's own pixels are in.
 * @param polity - the vassal, named in a refusal
 * @param polity.id - its id
 * @param polity.name - its name
 * @param rings - its rings, on the backdrop's grid
 * @param colour - its `#rrggbb`
 * @param frame - the backdrop's coordinate system
 * @returns the raster, or `null` for rings with no point, a box with no pixel, or a band that is not a number
 */
export function vassalBandRaster(
  polity: { id: string; name: string },
  rings: readonly (readonly GridPoint[])[],
  colour: string,
  frame: BackdropFrame
): TribeFeatherRaster | null {
  const { width: W, height: H } = frame.size
  // The rings' own box: a band stays inside the outline, so nothing past it is measured.
  const grid = paddedBox(rings, frame.bounds, 0)
  if (grid === null) return null
  if (![grid.u0, grid.v0, grid.u1, grid.v1].every(Number.isFinite)) {
    sayNotANumber(polity)
    return null
  }
  const box = pixelBoxOf(grid, frame)
  if (box === null) return null
  const distance = signedDistanceField(rings, frame.bounds, VASSAL_BAND_REACH_KM)
  const { r, g, b } = hexToRgb(colour)
  const pixels = new Uint8ClampedArray(box.width * box.height * 4)
  for (let row = 0; row < box.height; row++) {
    const v = (box.y + row + 0.5) / H
    for (let col = 0; col < box.width; col++) {
      const share = vassalBandOpacity(distance((box.x + col + 0.5) / W, v), VASSAL_BAND_WIDTH_KM)
      if (Number.isNaN(share)) {
        sayNotANumber(polity)
        return null
      }
      const at = 4 * (row * box.width + col)
      pixels[at] = r
      pixels[at + 1] = g
      pixels[at + 2] = b
      pixels[at + 3] = Math.round(share * 255)
    }
  }
  return { box, pixels }
}

/**
 * Every vassal's band, in painting order — one plan per claim of a polity wearing it (`isBandedVassal`: a suzerain set,
 * not a tribe), nothing measured yet. A claim whose polity has no colour is skipped, as its fill is (`projectedFills`).
 * @param document - the document to read
 * @param colours - each polity's colour, by id
 * @param frame - the backdrop's coordinate system
 * @param projection - where an anchor falls on the grid, kept across versions by the caller
 * @returns the plans, back to front
 */
export function vassalBandPlans(
  document: YearDocument,
  colours: ReadonlyMap<string, string>,
  frame: BackdropFrame,
  projection: GridProjection
): VassalBandPlan[] {
  const banded = bandedVassalIds(document.polities)
  const byId = new Map(document.polities.map((polity) => [polity.id, polity]))
  const out: VassalBandPlan[] = []
  for (const claim of claimsInPaintOrder(document)) {
    const colour = colours.get(claim.polity)
    const vassal = byId.get(claim.polity)
    if (!banded.has(claim.polity) || colour === undefined || vassal === undefined) continue
    const rings = ringsOnGrid(claim.rings, document.anchors, projection)
    const named = { id: vassal.id, name: vassal.name }
    out.push({
      polity: claim.polity,
      claim,
      // A vassal's band has one look; its mode only keeps the signature the tribes' cache shares.
      signature: { colour, mode: 'vassal-band', numbers: flattenRings([rings]) },
      raster: () => vassalBandRaster(named, rings, colour, frame),
    })
  }
  return out
}
