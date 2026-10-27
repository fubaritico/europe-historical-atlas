/**
 * What the tribe layer draws for each tribe: the ground its colour can touch, cut into triangles lying on
 * the relief, and each vertex's signed distance to the tribe's outline (ATLAS-258).
 *
 * **The ground is the tribe's box grown by the reach** (`TRIBE_FEATHER_REACH_KM`): an outset fade spills up
 * to the width past the outline, and the width can be dragged up to the reach without a rebuild. The box is
 * cut by `fillTriangles`, the fills' own cutting, so every triangle lies in one plane of the relief and is
 * laid on it as a fill is.
 *
 * **The distance is computed once per vertex, here, not per frame**: the ramp that turns it into an opacity
 * runs in the shader, so switching inset and outset, or dragging the width, rewrites a uniform only.
 *
 * **Beside it, what cuts an outset spill** (`tribeOpacity`, the dev's *« si ça déborde, c'est pas bon »*):
 * each vertex's signed distance to every other polity's ground, and whether it is land. A distance rather
 * than an in-or-out flag, so the shader cuts where the interpolated distance crosses zero — on the
 * neighbour's outline — instead of fading over a cell of the neighbour's ground.
 *
 * Kept apart from the layer because it takes data and returns data: the layer only uploads it.
 */

import { CLAIM_CUT_REACH_KM } from '@europe-historical-atlas/core/editor/tribeFeather'
import {
  paddedBox,
  signedDistanceField,
  unionDistanceField,
} from '@europe-historical-atlas/core/geo/signedDistance'
import { fillTriangles } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import { hexToRgb } from '@europe-historical-atlas/core/utils/color'

import type { TribeArea } from '../../../mapSources'
import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'
import type { FillGrid } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import type { RgbColor } from '@europe-historical-atlas/core/utils/color'

/** One tribe, ready to upload. */
export interface TribePatch {
  /** Its colour. */
  tint: RgbColor
  /** The triangles covering its grown box, flat `u, v`, three vertices each — `fillTriangles`' output. */
  triangles: Float32Array
  /** Each vertex's signed distance to its outline, in km, negative inside — one per vertex. */
  distances: Float32Array
  /** Each vertex's signed distance to every other polity's ground, km, negative inside it — one per vertex. */
  claimed: Float32Array
  /** Each vertex's land: `1` dry, `0` wet — one per vertex. */
  land: Float32Array
}

/** Everyone's ground, for the cut: each region's polity and rings. */
export interface ClaimedGround {
  /** The polity's id, or `undefined` for a region that names none. */
  polityId?: string | undefined
  /** Its rings, in grid coordinates. */
  rings: readonly (readonly UvPoint[])[]
}

/** What the patches are measured against. */
export interface TribeGround {
  /** Every region of the year — the tribe's own are left out of its cut by id. */
  claims: readonly ClaimedGround[]
  /** Which ground is dry — the land mask, or its documented fallback. */
  land: Pick<LandMask, 'isLand'>
  /** The frame the rings were projected against — the year's, which is the DEM's. */
  bounds: GeoBounds
  /** The relief's subdivision. */
  grid: FillGrid
  /** How far past the outline the patch extends, and the outline's distance is computed to. */
  reachKm: number
}

/**
 * Every tribe's patch.
 * @param tribes - each tribe's rings and colour, in grid coordinates
 * @param ground - everyone's ground, the land, the frame, the grid and the reach
 * @returns one patch per tribe with any ground; a tribe with no ring point has none
 */
export function tribePatches(tribes: readonly TribeArea[], ground: TribeGround): TribePatch[] {
  const { claims, land, bounds, grid, reachKm } = ground
  return tribes.flatMap(({ polity, colour, rings }) => {
    // The tribe's box, grown by the reach; a tribe with no ring point has none.
    const box = paddedBox(rings, bounds, reachKm)
    if (box === null) return []
    // Cut the box into triangles lying on the relief, as the fills are.
    const ring = [
      { u: box.u0, v: box.v0 },
      { u: box.u1, v: box.v0 },
      { u: box.u1, v: box.v1 },
      { u: box.u0, v: box.v1 },
    ]
    const triangles = fillTriangles([{ rings: [ring] }], grid)[0]
    // `fillTriangles` hands back one list per region given: a missing one is a defect, said, not drawn empty.
    if (triangles === undefined) throw new Error('[atlas] the tribe box was cut into nothing')
    // The distance fields: to the tribe's own outline, and to every other polity's ground.
    const distance = signedDistanceField(rings, bounds, reachKm)
    const others = claims.filter((claim) => claim.polityId !== polity).map((claim) => claim.rings)
    const claimedAt = unionDistanceField(others, bounds, CLAIM_CUT_REACH_KM, box)
    // Sample both fields, and the land, at every vertex.
    const count = Math.floor(triangles.length / 2)
    const distances = new Float32Array(count)
    const claimed = new Float32Array(count)
    const dry = new Float32Array(count)
    for (let vertex = 0; vertex < count; vertex++) {
      const u = triangles[2 * vertex] ?? 0
      const v = triangles[2 * vertex + 1] ?? 0
      distances[vertex] = distance(u, v)
      claimed[vertex] = claimedAt(u, v)
      dry[vertex] = land.isLand(u, v) ? 1 : 0
    }
    return [{ tint: hexToRgb(colour), triangles, distances, claimed, land: dry }]
  })
}

/**
 * What the tribe patches were measured from (`mapTribeLayer`) — compared field by field before measuring again. Everything
 * `tribePatches` reads is in it: the tribes, every region whose ground cuts a spill, the frame, the grid and
 * the land (ARCH-003 / QUAL-007).
 *
 * **The land by what it is made of, not by the mask object**: with the land mask failed, `maskOrFallback`
 * derives a new threshold mask at every call, so its identity never repeats — the land is the mask asset
 * when there is one, else the elevation and the sea level it is thresholded at.
 */
export interface TribeCutKey {
  /** The tribes' rings and colours, by identity — replaced, never mutated, when a year is settled. */
  tribes: object
  /** Every region of the year, by identity. */
  claims: object
  /** The frame the rings were projected against, by value. */
  bounds: GeoBounds
  /** The relief's subdivision. */
  segX: number
  /** The relief's subdivision. */
  segY: number
  /** The land mask asset, or `null` when it failed. */
  landMask: object | null
  /** The elevation the fallback is thresholded over, or `null` before it loads. */
  heightmap: object | null
  /** The fallback's threshold — read only when there is no mask. */
  seaLevel: number
}
