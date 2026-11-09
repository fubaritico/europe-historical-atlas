import { insideRing, kmBetween } from './geo.mjs'
import { samplesInside } from './islands.mjs'
import { holdersAt, ringPoints } from './yearMap.mjs'

/**
 * A lake a border crosses, opened on both shores — the dev's gesture, 2026-11-08, made possible by erasing an edge
 * (CARTO-397): *"c'est spécialement pour les lacs"*. The edges of the border that lie over the lake's water are erased,
 * which opens both polities' outlines; each polity then takes its open outline up with the Pen by one end, follows the
 * shore on its own side, and closes it on the other end. Pure: the lake loops come from `coast.mjs`.
 */

/**
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {import('./yearMap.mjs').YearMap} YearMap
 */

/**
 * The edges of a polity's rings lying over a lake: their midpoint inside the shore loop.
 * @param {YearMap} map - the map
 * @param {string} polity - whose rings
 * @param {readonly LonLat[]} shore - the lake's shore loop
 * @returns {{ ring: number, at: number }[]} each edge, by ring and position of its first anchor
 */
export function edgesOverLake(map, polity, shore) {
  const claim = map.claims.find((c) => c.polity === polity)
  /** @type {{ ring: number, at: number }[]} */
  const edges = []
  claim?.rings.forEach((ring, r) => {
    const open = claim.open?.includes(r) ?? false
    const n = ring.length
    for (let at = 0; at < (open ? n - 1 : n); at++) {
      const a = map.anchors[ring[at]]
      const b = map.anchors[ring[(at + 1) % n]]
      if (insideRing([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], shore)) edges.push({ ring: r, at })
    }
  })
  return edges
}

/**
 * The stretch of a polity's ring over a lake, as anchor positions: from the last anchor before the water to the first
 * after it — one chain of consecutive edges, or `null` when the polity's edges over the lake are not one chain.
 * @param {YearMap} map - the map
 * @param {string} polity - whose ring
 * @param {readonly LonLat[]} shore - the lake's shore loop
 * @returns {{ ring: number, anchors: number[] } | null} the chain's anchors, its two ends first and last
 */
export function chainOverLake(map, polity, shore) {
  const edges = edgesOverLake(map, polity, shore)
  if (edges.length === 0) return null
  const ring = edges[0].ring
  if (edges.some((e) => e.ring !== ring)) return null
  const claim = map.claims.find((c) => c.polity === polity)
  const anchors = claim?.rings[ring] ?? []
  const n = anchors.length
  const over = new Set(edges.map((e) => e.at))
  // The chain starts at an edge whose previous edge is not over the lake.
  const starts = [...over].filter((at) => !over.has((at - 1 + n) % n))
  if (starts.length !== 1) return null
  const chain = [anchors[starts[0]]]
  for (let at = starts[0]; over.has(at); at = (at + 1) % n) chain.push(anchors[(at + 1) % n])
  return { ring, anchors: chain }
}

/**
 * The lake shore between two points, the way that lies on a polity's side — the way whose middle the polity held before
 * the lake was opened.
 * @param {YearMap} map - the map before the gesture
 * @param {string} polity - whose side
 * @param {readonly LonLat[]} shore - the lake's shore loop
 * @param {LonLat} from - one end of the polity's open outline
 * @param {LonLat} to - the other end
 * @returns {LonLat[] | null} the shore points from near `from` to near `to`, or `null` when neither way is the polity's
 */
export function shoreOnSide(map, polity, shore, from, to) {
  const nearest = (/** @type {LonLat} */ p) => {
    let best = 0
    shore.forEach((q, i) => {
      if (kmBetween(p, q) < kmBetween(p, shore[best])) best = i
    })
    return best
  }
  const a = nearest(from)
  const b = nearest(to)
  const n = shore.length
  for (const step of [1, -1]) {
    /** @type {LonLat[]} */
    const path = [shore[a]]
    for (let i = a; i !== b; ) {
      i = (i + step + n) % n
      path.push(shore[i])
    }
    const middle = path[Math.floor(path.length / 2)]
    // A shore point lies on the line; a step inland decides who holds it — toward the lake's own middle, reversed.
    const centre = samplesInside(shore)[0]
    const inland = /** @type {LonLat} */ ([middle[0] + (middle[0] - centre[0]) * 0.05, middle[1] + (middle[1] - centre[1]) * 0.05])
    if (holdersAt(map, inland).includes(polity)) return path
  }
  return null
}

/**
 * Every lake two polities share, planned: the edges to erase, and each polity's ends and shore.
 * @param {YearMap} map - the map
 * @param {readonly { id: number, points: LonLat[] }[]} lakes - the water loops
 * @returns {{ plans: object[], left: { lake: number, why: string }[] }} the plans, and the lakes left with why
 */
export function lakeCrossings(map, lakes) {
  const plans = []
  const left = []
  for (const lake of lakes) {
    const holders = new Set()
    for (const p of samplesInside(lake.points, 9)) for (const h of holdersAt(map, p)) holders.add(h)
    if (holders.size !== 2) continue
    /** @type {{ polity: string, ends: [LonLat, LonLat], edges: [LonLat, LonLat][], shore: LonLat[] }[]} */
    const sides = []
    let why = null
    for (const polity of holders) {
      const chain = chainOverLake(map, polity, lake.points)
      if (chain === null) {
        why = `${polity}: its border over the lake is not one stretch`
        break
      }
      const points = ringPoints(map, chain.anchors)
      const ends = /** @type {[LonLat, LonLat]} */ ([points[0], points[points.length - 1]])
      const shore = shoreOnSide(map, polity, lake.points, ends[0], ends[1])
      if (shore === null) {
        why = `${polity}: no shore on its side`
        break
      }
      const edges = points.slice(1).map((p, k) => /** @type {[LonLat, LonLat]} */ ([points[k], p]))
      sides.push({ polity, ends, edges, shore })
    }
    if (why !== null) left.push({ lake: lake.id, why })
    else plans.push({ lake: lake.id, sides })
  }
  return { plans, left }
}
