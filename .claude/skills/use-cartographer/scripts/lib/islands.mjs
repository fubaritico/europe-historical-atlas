import { insideRing, kmBetween, kmToSegment, toKm } from './geo.mjs'
import { holdersAt, ringPoints } from './yearMap.mjs'

/**
 * The islands of a map, against the coast the Pen follows — the measure of the cleaning (the dev, 2026-11-08: *"je
 * colore toutes les îles, même celles qui n'ont que 4 points"*). Pure: the coast loops come from `coast.mjs`, the map
 * from `yearMap.mjs`.
 *
 * For each island: the polity it goes to, and whether the map already draws it on the coast, draws it otherwise (a
 * Cliopatria ring to erase first), or not at all. The gesture is the same whatever the size: aim the polity, click the
 * coast, click the coast, close.
 */

/**
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {import('./yearMap.mjs').YearMap} YearMap
 * @typedef {import('./coast.mjs').CoastLoop} CoastLoop
 */

/** An island no polity covers goes to the nearest polity within this distance (`resolve.py`'s own rule, 2026-11-02). */
export const NEAREST_KM = 30

/** Below this share of an island's ground, its one holder does not take the whole of it by itself. */
export const MIN_SHARE = 0.9

/** An anchor this close to the coast loop lies on it — the Pen snaps exactly, so anything above is another line. */
export const ON_COAST_KM = 0.05

/**
 * The signed area of a ring on a local plane: positive counter-clockwise (north up, east right).
 * @param {readonly LonLat[]} ring - the points, the closing segment implied
 * @returns {number} the area in km², signed
 */
export function signedAreaKm(ring) {
  const ref = ring.reduce((sum, p) => sum + p[1], 0) / ring.length
  let twice = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = toKm(ring[i], ref)
    const [xj, yj] = toKm(ring[j], ref)
    twice += xj * yi - xi * yj
  }
  return twice / 2
}

/**
 * Points inside a ring, to ask who holds the ground: a grid over its box, kept where the ring holds it; the vertices'
 * mean when the ring is too small for the grid to land in it.
 * @param {readonly LonLat[]} ring - the island's coast
 * @param {number} [steps] - grid lines per side
 * @returns {LonLat[]} at least one point
 */
export function samplesInside(ring, steps = 7) {
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const [west, east, south, north] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  /** @type {LonLat[]} */
  const inside = []
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const p = /** @type {LonLat} */ ([
        west + ((east - west) * i) / steps,
        south + ((north - south) * j) / steps,
      ])
      if (insideRing(p, ring)) inside.push(p)
    }
  }
  if (inside.length > 0) return inside
  return [[xs.reduce((a, b) => a + b, 0) / xs.length, ys.reduce((a, b) => a + b, 0) / ys.length]]
}

/**
 * The distance from a point to a closed polyline.
 * @param {LonLat} p - the point
 * @param {readonly LonLat[]} ring - the polyline, closed
 * @returns {number} km
 */
export function kmToRing(p, ring) {
  let best = Infinity
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    best = Math.min(best, kmToSegment(p, ring[j], ring[i]))
  }
  return best
}

/**
 * The polity an island goes to: the one holding most of its ground, else the nearest within {@link NEAREST_KM}.
 * @param {YearMap} map - the map
 * @param {readonly LonLat[]} ring - the island's coast
 * @returns {{ polity: string | null, how: 'covers' | 'nearest' | 'none', km: number, holders: string[], share: number }}
 *   the owner, how it was found, the distance when it was the nearest (0 when it covers), every polity holding part of
 *   it (several: a shared island — Great Britain — whose coasts are retraced polity by polity, not drawn as one island),
 *   and the share of its ground the owner holds (0 when the nearest)
 */
export function islandOwner(map, ring) {
  /** @type {Map<string, number>} */
  const votes = new Map()
  for (const p of samplesInside(ring)) {
    for (const polity of holdersAt(map, p)) votes.set(polity, (votes.get(polity) ?? 0) + 1)
  }
  const samples = samplesInside(ring).length
  const ranked = [...votes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const holders = ranked.map(([polity]) => polity)
  const best = ranked[0]
  if (best !== undefined) return { polity: best[0], how: 'covers', km: 0, holders, share: best[1] / samples }
  const centre = samplesInside(ring)[0]
  let nearest = { polity: /** @type {string | null} */ (null), km: Infinity }
  for (const claim of map.claims) {
    for (const r of claim.rings) {
      for (const anchor of ringPoints(map, r)) {
        const km = kmBetween(centre, anchor)
        if (km < nearest.km) nearest = { polity: claim.polity, km }
      }
    }
  }
  if (nearest.polity !== null && nearest.km <= NEAREST_KM)
    return { ...nearest, how: 'nearest', holders: [], share: 0 }
  return { polity: null, how: 'none', km: nearest.km, holders: [], share: 0 }
}

/**
 * How far around an island its old coarse ring may reach: Cliopatria's Cyprus lies 10 km off its shore and more, so a
 * fixed 5 km left it unseen (2026-11-08) — a quarter of the island's extent, 5 km at least.
 * @param {readonly LonLat[]} ring - the island's coast
 * @returns {number} the margin, in degrees
 */
export function islandMargin(ring) {
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  return Math.max(0.05, 0.25 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)))
}

/**
 * The polity a lake is carved out of: the one holding all its water and every point of its shore. A lake a border
 * crosses has two, and waits for erasing a segment (CARTO-397); a closed sea nobody holds (the Black Sea) has none;
 * a lake already carved is nobody's water.
 * @param {YearMap} map - the map
 * @param {readonly LonLat[]} shore - the lake's shore loop
 * @returns {string | null} the polity, or `null`
 */
export function lakeHolder(map, shore) {
  /** @type {Set<string>} */
  const holders = new Set()
  for (const p of samplesInside(shore)) for (const h of holdersAt(map, p)) holders.add(h)
  if (holders.size !== 1) return null
  const [polity] = holders
  const step = Math.max(1, Math.floor(shore.length / 40))
  for (let i = 0; i < shore.length; i += step) {
    const held = holdersAt(map, shore[i])
    if (held.length !== 1 || held[0] !== polity) return null
  }
  return polity
}

/**
 * How the map draws an island today.
 * - `done`: a ring of the owner lies wholly on the coast loop — drawn as the Pen would;
 * - `shared`: several polities hold it — its coasts are retraced polity by polity, not drawn as one island;
 * - `partial`: one polity holds part of it, the rest is nobody's (Ireland) — whether it takes the whole is the dev's
 *   call, so it is listed, never drawn;
 * - `redo`: rings sit on the island, not on its coast — erase them, then draw;
 * - `within`: the owner holds it through a ring reaching beyond it, over the sea (Sicily with Calabria) — the
 *   island is drawn, then the polity's coast retraced off the sea;
 * - `missing`: nothing drawn on it, the owner is the nearest polity.
 * @param {YearMap} map - the map
 * @param {readonly LonLat[]} ring - the island's coast
 * @param {{ polity: string | null, how: string, holders: readonly string[], share: number }} owner - from
 *   {@link islandOwner}
 * @returns {{ state: 'done' | 'shared' | 'partial' | 'redo' | 'within' | 'missing',
 *   rings: { polity: string, ring: number }[] }} the state, and the rings lying wholly on the island (the ones to erase
 *   when `redo`)
 */
export function islandState(map, ring, { polity: owner, how, holders, share }) {
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const margin = islandMargin(ring)
  const box = [Math.min(...xs) - margin, Math.max(...xs) + margin, Math.min(...ys) - margin, Math.max(...ys) + margin]
  const inBox = (/** @type {LonLat} */ p) => p[0] >= box[0] && p[0] <= box[1] && p[1] >= box[2] && p[1] <= box[3]
  const islandArea = Math.abs(signedAreaKm(ring))
  /** @type {{ polity: string, ring: number }[]} */
  const onIsland = []
  let done = false
  for (const claim of map.claims) {
    claim.rings.forEach((r, index) => {
      const points = ringPoints(map, r)
      if (!points.every(inBox)) return
      // The island's own coarse ring, not a mainland one reaching it: no more than four times its size.
      if (points.length >= 3 && Math.abs(signedAreaKm(points)) > 4 * islandArea + 50) return
      // A ring is the island's only if it sits on it: a neighbouring islet's ring falls in the box too (seven
      // islands read as `redo` after the first series, 2026-11-08).
      if (!samplesInside(points).some((p) => insideRing(p, ring) || kmToRing(p, ring) <= ON_COAST_KM)) return
      const onCoast = points.every((p) => kmToRing(p, ring) <= ON_COAST_KM)
      if (onCoast && claim.polity === owner) done = true
      else onIsland.push({ polity: claim.polity, ring: index })
    })
  }
  if (done) return { state: 'done', rings: onIsland }
  if (holders.length > 1) return { state: 'shared', rings: onIsland }
  if (how === 'covers' && share < MIN_SHARE) return { state: 'partial', rings: onIsland }
  if (onIsland.length > 0) return { state: 'redo', rings: onIsland }
  return { state: how === 'covers' ? 'within' : 'missing', rings: onIsland }
}
