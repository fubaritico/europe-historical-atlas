/**
 * A year's fills cut on the relief's grid, **each vassal's vertices carrying their signed distance to its own outline**
 * — what the atlas's fill shader turns into the vassals' band (ATLAS-398, `data/vassalBand`).
 *
 * **Measured once per vertex, here, not per frame** — as a tribe's distance is (`tribePatches`): the band's width is a
 * uniform, so dragging it rewrites one float. **Only the vassals are measured**: a sovereign wears no band, and its
 * vertices carry nothing. **Against the region's own rings** — one claim, one region — so a vassal's band runs along
 * every edge of its ground: against its suzerain, against a foreign realm and along the sea, as Illustrator's inner
 * offset runs along the whole path.
 *
 * **Between two vertices the distance is interpolated** by the GPU, so the band's inner edge follows the true one to
 * within the straightness of a relief cell — the accuracy a tribe's band already has.
 */

import { VASSAL_BAND_REACH_KM, bandedVassalIds } from '../data/vassalBand'
import { signedDistanceField } from '../geo/signedDistance'

import { fillTriangles } from './fillTriangles'
import { indexFill } from './indexFill'

import type { FillGrid } from './fillTriangles'
import type { IndexedFill } from './indexFill'
import type { UvPoint } from '../data/coastlineSource'
import type { YearPolity } from '../data/yearFormat'
import type { GeoBounds } from '../geo/mercator'

/** A polity's outline as the fills are cut from it — its rings in `(u, v)`, outer and holes alike. */
export interface FillRegion {
  /** The rings. */
  readonly rings: readonly (readonly UvPoint[])[]
  /** Whether it wears the vassals' band (`data/vassalBand`), its vertices then measured; absent, it does not. */
  readonly banded?: boolean
}

/** What the vassals' band is measured with (ATLAS-398): the frame the rings were projected against, and the reach. */
export interface FillBand {
  /** The frame — the year's, which is the DEM's. */
  readonly bounds: GeoBounds
  /** How deep the distance is computed, km — `VASSAL_BAND_REACH_KM`, handed in. */
  readonly reachKm: number
}

/** What a year's fills are cut from: its regions, each saying whether it wears the band, and how the vassals are measured. */
export interface VassalBandCut {
  /** One region to cut per region of the year, in the same order. */
  readonly regions: FillRegion[]
  /** The year's frame and the reach of the vassals' distance ({@link VASSAL_BAND_REACH_KM}). */
  readonly band: FillBand
}

/**
 * A year's regions as the fills are cut from them: each one's rings, and whether its polity wears the band — read off
 * the registry (`isBandedVassal`), as the settling reads each region's depth, so the cut and the layer agree.
 * @param regions - the year's regions, each with the id of its polity
 * @param polities - the year's registry
 * @returns one region to cut per region, in the same order
 */
function bandedFillRegions(
  regions: readonly {
    readonly rings: FillRegion['rings']
    readonly polityId?: string | undefined
  }[],
  polities: readonly Pick<YearPolity, 'id' | 'suzerain' | 'rank'>[]
): FillRegion[] {
  const banded = bandedVassalIds(polities)
  return regions.map(({ rings, polityId }) =>
    polityId !== undefined && banded.has(polityId) ? { rings, banded: true } : { rings }
  )
}

/**
 * What to cut a year's fills from, the vassals banded — the one place the atlas's two cuts (the page's, the worker's)
 * take their regions and their band from, so the two never differ.
 * @param regions - the year's regions, each with the id of its polity, in the order the fills are laid
 * @param polities - the year's registry
 * @param bounds - the year's frame, which is the relief's
 * @returns the regions to cut and the band to measure them with
 */
export function vassalBandCut(
  regions: readonly {
    readonly rings: FillRegion['rings']
    readonly polityId?: string | undefined
  }[],
  polities: readonly Pick<YearPolity, 'id' | 'suzerain' | 'rank'>[],
  bounds: GeoBounds
): VassalBandCut {
  return {
    regions: bandedFillRegions(regions, polities),
    band: { bounds, reachKm: VASSAL_BAND_REACH_KM },
  }
}

/**
 * Each banded region's vertices measured against its own outline.
 * @param fills - each region's fill, in the regions' order (`indexFill`)
 * @param regions - the regions, their rings and whether they wear the band
 * @param band - the frame the rings were projected against, and how deep the distance is computed
 * @returns the fills, a banded one with its `bandKm`; the others as they came
 * @throws when the fills and the regions do not pair up — one fill per region is the cut's contract, so a defect
 */
export function measureVassalBands(
  fills: readonly IndexedFill[],
  regions: readonly FillRegion[],
  band: FillBand
): IndexedFill[] {
  if (fills.length !== regions.length)
    throw new Error(
      `vassal bands: ${String(fills.length)} fills for ${String(regions.length)} regions`
    )
  return fills.map((fill, index) => {
    const region = regions[index]
    if (region?.banded !== true) return fill
    const distance = signedDistanceField(region.rings, band.bounds, band.reachKm)
    const count = Math.floor(fill.vertices.length / 2)
    const bandKm = new Float32Array(count)
    for (let vertex = 0; vertex < count; vertex++) {
      // Indices the loop keeps in range (`noUncheckedIndexedAccess`): the `NaN` never stands in for anything.
      bandKm[vertex] = distance(
        fill.vertices[2 * vertex] ?? Number.NaN,
        fill.vertices[2 * vertex + 1] ?? Number.NaN
      )
    }
    return { ...fill, bandKm }
  })
}

/**
 * Cut a year's fills on the relief's grid, their vertices shared, and — given a band — the vassals measured: the one
 * cut both the worker and the page run (`inlineCompute`, the atlas's `mapFillLayer`).
 * @param regions - the polities' outlines, in the order the fills are laid, each saying whether it wears the band
 * @param grid - the relief's subdivision
 * @param band - the frame and the reach the vassals are measured with; `null` measures none
 * @returns each region's fill, a banded one with its distances when a band is given
 */
export function cutYearFills(
  regions: readonly FillRegion[],
  grid: FillGrid,
  band: FillBand | null
): IndexedFill[] {
  const fills = fillTriangles(regions, grid).map((fill) => indexFill(fill))
  return band === null ? fills : measureVassalBands(fills, regions, band)
}
