/**
 * A year's fills cut on the relief's grid, **each filled polity's vertices carrying their signed distance to its own
 * outline** — what the atlas's fill shader turns into the bands (ATLAS-398, `data/vassalBand`) — **and to its realm's**,
 * its sovereign and every vassal under it together, for the band the realm wears from afar (the dev's trial of 2026-11-09).
 *
 * **Measured once per vertex, here, not per frame** — as a tribe's distance is (`tribePatches`). **Every filled polity is
 * measured** since the trial: the sovereigns wear a band too (`banded` means measured); a tribe is not filled, and is
 * not. **Against the region's own rings** — one claim, one region — so a vassal's band runs along
 * every edge of its ground: against its suzerain, against a foreign realm and along the sea, as Illustrator's inner
 * offset runs along the whole path.
 *
 * **Between two vertices the distance is interpolated** by the GPU, so the band's inner edge follows the true one to
 * within the straightness of a relief cell — the accuracy a tribe's band already has.
 */

import polygonClipping from 'polygon-clipping'

import { tribeIds } from '../data/tribes'
import { BAND_REACH_KM } from '../data/vassalBand'
import { signedDistanceField } from '../geo/signedDistance'

import { applyBakedBands } from './bakedBands'
import { fillTriangles } from './fillTriangles'
import { indexFill } from './indexFill'

import type { BakedBands } from './bakedBands'
import type { FillGrid } from './fillTriangles'
import type { IndexedFill } from './indexFill'
import type { UvPoint } from '../data/coastlineSource'
import type { YearPolity } from '../data/yearFormat'
import type { GeoBounds } from '../geo/mercator'
import type { Polygon } from 'polygon-clipping'

/** A polity's outline as the fills are cut from it — its rings in `(u, v)`, outer and holes alike. */
export interface FillRegion {
  /** The rings. */
  readonly rings: readonly (readonly UvPoint[])[]
  /** Whether it wears the vassals' band (`data/vassalBand`), its vertices then measured; absent, it does not. */
  readonly banded?: boolean
  /**
   * The realm it belongs to — the sovereign at the top of its homage — when it wears a band: the realms of several regions
   * are measured against their outline together, for the band a realm wears from afar (the dev, 2026-11-09).
   */
  readonly realm?: string
}

/** What the vassals' band is measured with (ATLAS-398): the frame the rings were projected against, and the reach. */
export interface FillBand {
  /** The frame — the year's, which is the DEM's. */
  readonly bounds: GeoBounds
  /** How deep the distance is computed, km — `BAND_REACH_KM`, handed in. */
  readonly reachKm: number
}

/** What a year's fills are cut from: its regions, each saying whether it wears the band, and how the vassals are measured. */
export interface VassalBandCut {
  /** One region to cut per region of the year, in the same order. */
  readonly regions: FillRegion[]
  /** The year's frame and the reach of the distance (`BAND_REACH_KM`). */
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
  // Every polity filled is measured since the sovereigns wear a band too (the dev's trial, 2026-11-09): the vassals and
  // the sovereigns, never a tribe, which is not filled.
  const tribes = tribeIds(polities)
  const realmOf = realms(polities)
  return regions.map(({ rings, polityId }) => {
    const realm = polityId === undefined ? undefined : realmOf.get(polityId)
    return realm !== undefined && polityId !== undefined && !tribes.has(polityId)
      ? { rings, banded: true, realm }
      : { rings }
  })
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
    band: { bounds, reachKm: BAND_REACH_KM },
  }
}

/**
 * Each polity's realm: the sovereign at the top of its chain of homage, itself for a sovereign. A loop of homage — refused
 * on reading — ends the walk where it closes.
 * @param polities - the year's registry
 * @returns the realm of every polity, by id
 */
function realms(polities: readonly Pick<YearPolity, 'id' | 'suzerain'>[]): Map<string, string> {
  const suzerainOf = new Map(polities.map(({ id, suzerain }) => [id, suzerain]))
  const out = new Map<string, string>()
  for (const { id } of polities) {
    let top = id
    const seen = new Set([id])
    for (
      let next = suzerainOf.get(top) ?? null;
      next !== null && suzerainOf.has(next) && !seen.has(next);
      next = suzerainOf.get(top) ?? null
    ) {
      seen.add(next)
      top = next
    }
    out.set(id, top)
  }
  return out
}

/**
 * The outline of several regions together, in `(u, v)`: each region's rings even-odd, the regions united — so the
 * limits a sovereign shares with its vassals vanish, and the realm's frontier remains.
 * @param members - the realm's regions
 * @returns the rings of their union, outer and holes alike
 */
function unionRings(members: readonly FillRegion[]): UvPoint[][] {
  const shapes = members.flatMap(({ rings }) => {
    const polygons: Polygon[] = rings
      .filter((ring) => ring.length >= 3)
      .map((ring) => [ring.map(({ u, v }): [number, number] => [u, v])])
    const [first, ...rest] = polygons
    return first === undefined ? [] : [polygonClipping.xor(first, ...rest)]
  })
  const [first, ...rest] = shapes
  if (first === undefined) return []
  return polygonClipping
    .union(first, ...rest)
    .flatMap((polygon) => polygon.map((ring) => ring.map(([u, v]) => ({ u, v }))))
}

/**
 * Measure every vertex of a fill against a distance.
 * @param fill - the fill
 * @param distance - the signed distance
 * @returns one distance per vertex, km
 */
function measured(fill: IndexedFill, distance: (u: number, v: number) => number): Float32Array {
  const count = Math.floor(fill.vertices.length / 2)
  const km = new Float32Array(count)
  for (let vertex = 0; vertex < count; vertex++) {
    // Indices the loop keeps in range (`noUncheckedIndexedAccess`): the `NaN` never stands in for anything.
    km[vertex] = distance(
      fill.vertices[2 * vertex] ?? Number.NaN,
      fill.vertices[2 * vertex + 1] ?? Number.NaN
    )
  }
  return km
}

/**
 * Each banded region's vertices measured against its own outline.
 * @param fills - each region's fill, in the regions' order (`indexFill`)
 * @param regions - the regions, their rings and whether they wear the band
 * @param band - the frame the rings were projected against, and how deep the distance is computed
 * @param only - the regions to measure, by index — those whose baked distances did not match (ATLAS-407); all the banded
 *   ones when absent
 * @returns the fills, a banded one with its `bandKm`; the others as they came
 * @throws when the fills and the regions do not pair up — one fill per region is the cut's contract, so a defect
 */
export function measureVassalBands(
  fills: readonly IndexedFill[],
  regions: readonly FillRegion[],
  band: FillBand,
  only?: ReadonlySet<number>
): IndexedFill[] {
  if (fills.length !== regions.length)
    throw new Error(
      `vassal bands: ${String(fills.length)} fills for ${String(regions.length)} regions`
    )
  const wanted = (index: number): boolean => only === undefined || only.has(index)
  // A realm of several regions measured against its outline together, once — only a realm a wanted region belongs to.
  const asked = new Set(regions.filter((_, index) => wanted(index)).map(({ realm }) => realm))
  const members = new Map<string, FillRegion[]>()
  for (const region of regions) {
    if (region.banded !== true || region.realm === undefined || !asked.has(region.realm)) continue
    const list = members.get(region.realm)
    if (list === undefined) members.set(region.realm, [region])
    else list.push(region)
  }
  const realmDistance = new Map(
    [...members]
      .filter(([, list]) => list.length > 1)
      .map(([realm, list]) => [
        realm,
        signedDistanceField(unionRings(list), band.bounds, band.reachKm),
      ])
  )
  return fills.map((fill, index) => {
    const region = regions[index]
    if (region?.banded !== true || !wanted(index)) return fill
    const bandKm = measured(fill, signedDistanceField(region.rings, band.bounds, band.reachKm))
    const realm = region.realm === undefined ? undefined : realmDistance.get(region.realm)
    return realm === undefined
      ? { ...fill, bandKm }
      : { ...fill, bandKm, realmKm: measured(fill, realm) }
  })
}

/**
 * Cut a year's fills on the relief's grid, their vertices shared, and — given a band — the vassals measured: the one
 * cut both the worker and the page run (`inlineCompute`, the atlas's `mapFillLayer`).
 * @param regions - the polities' outlines, in the order the fills are laid, each saying whether it wears the band
 * @param grid - the relief's subdivision
 * @param band - the frame and the reach the vassals are measured with; `null` measures none
 * @param baked - the distances the build measured (ATLAS-407), laid instead of measuring — a polity whose cut differs
 *   from the build's measured here, it alone; `null` on the dev server, which has no build and measures
 * @returns each region's fill, a banded one with its distances when a band is given
 * @throws what {@link applyBakedBands} throws — distances written for another cut, a defect
 */
export function cutYearFills(
  regions: readonly FillRegion[],
  grid: FillGrid,
  band: FillBand | null,
  baked: BakedBands | null = null
): IndexedFill[] {
  const fills = fillTriangles(regions, grid).map((fill) => indexFill(fill))
  if (band === null) return fills
  if (baked === null) return measureVassalBands(fills, regions, band)
  const laid = applyBakedBands(fills, regions, grid, baked)
  if (laid.unmatched.length === 0) return laid.fills
  // Node and the browser round the projection apart in its last digit, which can move a vertex of the cut: those
  // polities are measured here, exactly, the rest laid from the build (CORE-412 would make this needless).
  console.warn(
    `[atlas] bands: ${String(laid.unmatched.length)} of ${String(regions.filter((region) => region.banded === true).length)} polities measured here — their cut differs from the build's by a rounding`
  )
  return measureVassalBands(laid.fills, regions, band, new Set(laid.unmatched))
}
