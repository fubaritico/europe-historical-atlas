/**
 * Turning an authored year into the payload the atlas already consumes, so it does not change by a line.
 *
 * Lossy and one-way by design: the export is for rendering, the folder is the truth
 * (`files/plans/cartographer/scenarii/s04-save-and-reopen.md`). Shared anchors become duplicated
 * coordinates in each polity's rings, which is correct for a consumer that modifies nothing.
 *
 * **Three conversions here are not obvious, and each would have failed quietly:**
 *
 * 1. **The bounding box is the caller's, never the file's.** `RegionPayload.bbox` is what `projectRegions`
 *    projects lon/lat against, so it has to be the *render* frame — the DEM's. A year's `editorialZone` is
 *    deliberately a different box (`format.md`), and using it would slide every border off the terrain it
 *    belongs to. Hence a parameter.
 * 2. **Rings are closed on the way out.** Ours are index lists with closure implied; `projectRegions` drops
 *    any ring under four points, GeoJSON-style, where the first vertex is repeated last. A triangle — three
 *    indices, legal in our format — would vanish with nothing said.
 * 3. **Claims are emitted in {@link paintOrder}.** `rasteriseRegions` resolves an overlap by "later index
 *    wins", so emitting back to front is what makes a vassal paint over its lord (H-05a) and a group the
 *    author brought forward paint over the one behind it, vassals included (`s16`) — without touching
 *    the rasteriser. The Cartographer paints by the same function, so the two show one map.
 */

import { paintOrder } from './paintOrder'

import type { RegionPayload } from './regionSource'
import type { AuthoredYear, YearPolity } from './yearFormat'
import type { GeoBounds } from '../geo/mercator'

/**
 * Resolve one ring of indices into closed lon/lat coordinates.
 *
 * Closed on the way out: `projectRegions` drops any ring under four points, GeoJSON-style with the first
 * vertex repeated last, so a triangle — three indices, legal in our format — would vanish with nothing said.
 * @param ring - the anchor indices, in order
 * @param anchors - the year's anchor table
 * @returns the closed ring, or `null` when it cannot enclose an area
 */
function resolveRing(
  ring: readonly number[],
  anchors: readonly [number, number][]
): [number, number][] | null {
  const points: [number, number][] = []
  for (const index of ring) {
    const anchor = anchors[index]
    if (anchor === undefined) continue // refused upstream by the range check
    points.push([anchor[0], anchor[1]])
  }
  const first = points[0]
  if (first === undefined || points.length < 3) return null
  points.push([first[0], first[1]])
  return points
}

/**
 * Adapt one claim into a region, flattening the identity the registry holds.
 * @param claim - what the polity holds
 * @param polity - its registry entry
 * @param byId - every polity of the year, for the suzerain's name
 * @param anchors - the year's anchor table
 * @returns the region, or `null` when no ring survived
 */
function toRegion(
  claim: AuthoredYear['polities']['claims'][number],
  polity: YearPolity,
  byId: ReadonlyMap<string, YearPolity>,
  anchors: readonly [number, number][]
): RegionPayload['regions'][number] | null {
  const rings: [number, number][][] = []
  for (const ring of claim.rings) {
    const resolved = resolveRing(ring, anchors)
    if (resolved !== null) rings.push(resolved)
  }
  if (rings.length === 0) return null
  const suzerain = polity.suzerain === null ? undefined : byId.get(polity.suzerain)
  return {
    name: polity.name,
    // The suzerain's *name*, not its id: the atlas groups and pins on display names, and this is the
    // "name written flat" the format promises. A suzerain the registry lacks was refused upstream.
    subjectTo: suzerain?.name ?? null,
    // OHM carries no equivalent of historical-basemaps' PARTOF, and the format declares none. Saying
    // `null` is the honest answer; inventing a grouping here would be a second source of truth.
    partOf: null,
    rings,
  }
}

/**
 * Adapt one authored year to a {@link RegionPayload}.
 * @param year - the year, already cross-checked by `assembleAuthoredYear`
 * @param bbox - the **render** frame to project against, which is the DEM's and not the editorial zone
 * @returns the payload, ready for `projectRegions`
 */
export function toRegionPayload(year: AuthoredYear, bbox: GeoBounds): RegionPayload {
  const byId = new Map(year.registry.polities.map((polity) => [polity.id, polity]))
  // Back to front. A loop of homage cannot reach here: `assembleAuthoredYear` refuses it on load, and
  // refuses a claim naming no polity — so every claim has a rank, and `?? -1` only satisfies the type.
  const rank = new Map(paintOrder(year.registry.polities).order.map((id, index) => [id, index]))
  const ordered = year.polities.claims
    .map((claim) => ({ claim, polity: byId.get(claim.polity) }))
    .sort((a, b) => (rank.get(a.claim.polity) ?? -1) - (rank.get(b.claim.polity) ?? -1))

  const regions: RegionPayload['regions'] = []
  for (const { claim, polity } of ordered) {
    if (polity === undefined) continue // refused upstream; never named as an unknown power
    const region = toRegion(claim, polity, byId, year.polities.anchors)
    if (region !== null) regions.push(region)
  }

  return {
    source: `Cartographer — authored year ${String(year.year)}`,
    year: year.year,
    bbox,
    // Nothing was simplified on the way out: the anchors are what the author placed.
    tolerance: 0,
    regions,
  }
}
