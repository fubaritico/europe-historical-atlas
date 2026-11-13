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
 * Kept apart from the layer because it takes data and returns data: the layer only uploads it. In core since
 * 2026-11-08 (ATLAS-333) so the compute's worker measures it: 559 ms of the main thread for 1100's four tribes.
 */

import { paddedBox, signedDistanceField, unionDistanceField } from '../geo/signedDistance'
import { hexToRgb } from '../utils/color'

import { fillTriangles } from './fillTriangles'

import type { FillGrid } from './fillTriangles'
import type { UvPoint } from '../data/coastlineSource'
import type { LandMask } from '../data/landMask'
import type { GeoBounds } from '../geo/mercator'
import type { RgbColor } from '../utils/color'

/** A tribe as the patches are measured from: its id, its colour and its rings. */
export interface TribeOutline {
  /** The tribe's id — so its spill is cut over every polity's ground but its own. */
  readonly polity: string
  /** The `#rrggbb` the tribe would have been filled in. */
  readonly colour: string
  /** Its rings, outer and holes alike, in grid coordinates. */
  readonly rings: readonly (readonly UvPoint[])[]
  /** Drawn by its rim rather than its heart — an outlined tribe (CARTO-439); absent for every other tribe. */
  readonly outlined?: true
}

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
  /** Whether the tribe is drawn by its rim — an outlined tribe (CARTO-439). */
  outlined: boolean
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
  /**
   * How far a neighbour's ground is measured past its outline, beyond which every point reads as free — the editor's
   * `CLAIM_CUT_REACH_KM`, handed in: the compute knows nothing of the editor.
   */
  claimReachKm: number
  /**
   * Whether the colour may spill past the outline — `outset` alone. Without it the patch is the tribe's own box and no
   * other polity's ground is measured: that measure cost 5 s for the Kimek-Kipchak on the dev's 1100 (2026-11-02).
   */
  spill: boolean
}

/**
 * Every tribe's patch.
 * @param tribes - each tribe's rings and colour, in grid coordinates
 * @param ground - everyone's ground, the land, the frame, the grid and the reach
 * @returns one patch per tribe with any ground; a tribe with no ring point has none
 */
export function tribePatches(tribes: readonly TribeOutline[], ground: TribeGround): TribePatch[] {
  const { claims, land, bounds, grid, reachKm, claimReachKm, spill } = ground
  return tribes.flatMap(({ polity, colour, rings, outlined }) => {
    // The tribe's box, grown by the reach; a tribe with no ring point has none.
    const box = paddedBox(rings, bounds, spill ? reachKm : 0)
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
    if (triangles === undefined)
      throw new Error('tribe patches: the tribe box was cut into nothing')
    // The distance fields: to the tribe's own outline, and to every other polity's ground.
    const distance = signedDistanceField(rings, bounds, reachKm)
    // Nobody's ground is in the way of a colour that stays inside: every point reads as free, never measured.
    const claimedAt = spill
      ? unionDistanceField(
          claims.filter((claim) => claim.polityId !== polity).map((claim) => claim.rings),
          bounds,
          claimReachKm,
          box
        )
      : (): number => claimReachKm
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
    return [
      {
        tint: hexToRgb(colour),
        triangles,
        distances,
        claimed,
        land: dry,
        outlined: outlined === true,
      },
    ]
  })
}
