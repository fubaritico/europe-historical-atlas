import { kmBetween, kmToSegment, toKm } from './geo.mjs'
import { holdersAt, ringPoints } from './yearMap.mjs'

/**
 * A polity's coasts against the coast the Pen follows — the measure of the cleaning's second step (the dev,
 * 2026-11-08: the coasts before the islands). Pure.
 *
 * A **free run** is a stretch of a polity's ring no other polity draws: between two anchors it shares with its
 * neighbours (where a land border meets the sea), it faces the sea or nobody's ground. Matched to the coast — both ends
 * near the same coast contour, the stretch running along it — it is a **coast run** to retrace: aim the polity, ‹R›,
 * its first anchor, the coast, its last anchor. A free run that runs along no coast (a border with nobody's land) is
 * left: it is not a coast.
 */

/**
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {import('./yearMap.mjs').YearMap} YearMap
 */

/** A free run's end must be this close to the coast to be retraced onto it. */
export const END_KM = 15

/** A point this close to the coast path lies on it — the Pen snaps exactly. */
export const ON_COAST_KM = 0.05

/** A free run's points must lie this close to the coast path, on average, for the path to be its coast. */
export const ALONG_KM = 25

/**
 * The polities drawing each edge, keyed by its two anchors in order.
 * @param {YearMap} map - the map
 * @returns {Map<string, Set<string>>} edge → polities
 */
export function edgeHolders(map) {
  /** @type {Map<string, Set<string>>} */
  const holders = new Map()
  for (const claim of map.claims) {
    for (const ring of claim.rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        const key = a < b ? `${a}-${b}` : `${b}-${a}`
        const set = holders.get(key) ?? new Set()
        set.add(claim.polity)
        holders.set(key, set)
      }
    }
  }
  return holders
}

/**
 * The free runs of a polity: maximal stretches of its rings whose every edge no other polity draws, between two
 * anchors that are not free on both sides. A ring wholly free (an island, a polity alone) has none: its coast is an
 * island's gesture, not a retrace.
 * @param {YearMap} map - the map
 * @param {string} polity - the polity
 * @param {Map<string, Set<string>>} holders - from {@link edgeHolders}
 * @returns {{ ring: number, anchors: number[] }[]} each run's anchors, first and last shared
 */
export function freeRuns(map, polity, holders) {
  /** @type {{ ring: number, anchors: number[] }[]} */
  const runs = []
  const claim = map.claims.find((c) => c.polity === polity)
  if (claim === undefined) return runs
  claim.rings.forEach((ring, index) => {
    const n = ring.length
    const free = ring.map((a, i) => {
      const b = ring[(i + 1) % n]
      const set = holders.get(a < b ? `${a}-${b}` : `${b}-${a}`)
      return set !== undefined && set.size === 1
    })
    if (free.every(Boolean) || !free.some(Boolean)) return
    // Start right after a shared edge, so no run wraps across the ring's first anchor.
    const start = free.findIndex((f, i) => !f && free[(i + 1) % n])
    for (let k = 1; k <= n; k++) {
      const i = (start + k) % n
      if (!free[i] || free[(i - 1 + n) % n]) continue
      const anchors = [ring[i]]
      let j = i
      while (free[j]) {
        j = (j + 1) % n
        anchors.push(ring[j])
      }
      runs.push({ ring: index, anchors })
    }
  })
  return runs
}

/**
 * The nearest coast point to a position, over every contour.
 * @param {LonLat} p - the position
 * @param {readonly { points: LonLat[] }[]} contours - the coast
 * @returns {{ contour: number, index: number, km: number }} where it is, and how far
 */
export function nearestCoast(p, contours) {
  let best = { contour: -1, index: -1, km: Infinity }
  contours.forEach((contour, c) => {
    contour.points.forEach((q, i) => {
      if (Math.abs(q[0] - p[0]) > 0.5 || Math.abs(q[1] - p[1]) > 0.3) return
      const km = kmBetween(p, q)
      if (km < best.km) best = { contour: c, index: i, km }
    })
  })
  return best
}

/**
 * The stretch of a contour between two of its points, one way round.
 * @param {readonly LonLat[]} points - the contour's points
 * @param {boolean} closed - whether it loops
 * @param {number} from - the first index
 * @param {number} to - the last index
 * @param {1 | -1} step - forward or backward
 * @returns {LonLat[] | null} the points from `from` to `to`, or `null` when an open contour has no such way
 */
export function coastPath(points, closed, from, to, step) {
  const n = points.length
  if (!closed && (to - from) * step < 0) return null
  /** @type {LonLat[]} */
  const path = [points[from]]
  for (let i = from; i !== to; ) {
    i = (i + step + n) % n
    path.push(points[i])
    if (path.length > n) return null
  }
  return path
}

/**
 * The mean distance from a set of points to a polyline.
 * @param {readonly LonLat[]} from - the points
 * @param {readonly LonLat[]} line - the polyline
 * @returns {number} km
 */
export function meanKmTo(from, line) {
  let sum = 0
  for (const p of from) {
    let best = Infinity
    for (let i = 1; i < line.length; i++) best = Math.min(best, kmToSegment(p, line[i - 1], line[i]))
    if (line.length === 1) best = kmBetween(p, line[0])
    sum += best
  }
  return sum / Math.max(from.length, 1)
}

/**
 * A free run matched to the coast: the stretch of coast between its two ends, the way round that runs along it.
 * @param {readonly LonLat[]} run - the run's points, first and last its shared anchors
 * @param {readonly { points: LonLat[], closed: boolean }[]} contours - the coast
 * @returns {{ path: LonLat[], km: number } | { refused: string }} the coast path, and how far the run lies from it
 */
export function matchRun(run, contours) {
  // The coast near both ends at once: an end can lie nearer an islet than the mainland it runs along (Norway's
  // skerries, Portugal's Berlengas), so the nearest coast of each end, taken apart, can be two coasts.
  /** @type {{ contour: number, index: number, km: number } | null} */
  let first = null
  /** @type {{ contour: number, index: number, km: number } | null} */
  let last = null
  contours.forEach((contour, c) => {
    const a = nearestCoast(run[0], [contour])
    const b = nearestCoast(run[run.length - 1], [contour])
    if (a.km > END_KM || b.km > END_KM) return
    if (first === null || last === null || a.km + b.km < first.km + last.km) {
      first = { ...a, contour: c }
      last = { ...b, contour: c }
    }
  })
  if (first === null || last === null) return { refused: 'no coast near both its ends' }
  if (first.index === last.index) return { refused: 'its ends meet the coast at one point' }
  const contour = contours[first.contour]
  /** @type {{ path: LonLat[], km: number } | null} */
  let best = null
  for (const step of /** @type {const} */ ([1, -1])) {
    const path = coastPath(contour.points, contour.closed, first.index, last.index, step)
    if (path === null) continue
    // Both ways: the run near the path, and the path near the run — the long way round a closed sea passes near every
    // point of the run too (the Black Sea for Halych, 478 775 km², 2026-11-08), only the second term sees it.
    const km = Math.max(meanKmTo(run, path), meanKmTo(path, run))
    if (best === null || km < best.km) best = { path, km }
  }
  if (best === null) return { refused: 'no way along the coast' }
  if (best.km > ALONG_KM) return { refused: `it runs ${best.km.toFixed(0)} km from the coast` }
  return best
}

/**
 * Every coast run of a map, ready to retrace.
 * @param {YearMap} map - the map
 * @param {readonly { points: LonLat[], closed: boolean }[]} contours - the coast
 * @returns {{ runs: { polity: string, from: number, to: number, interior: number, interiorAt: LonLat[],
 *   path: LonLat[], km: number }[],
 *   refused: { polity: string, from: number, to: number, why: string }[] }} the runs to retrace, and the free runs
 *   left with the reason
 */
export function coastRuns(map, contours) {
  const holders = edgeHolders(map)
  const runs = []
  const refused = []
  for (const claim of map.claims) {
    for (const run of freeRuns(map, claim.polity, holders)) {
      for (const anchors of nearCoast(map, run.anchors, contours)) {
        const points = ringPoints(map, anchors)
        const from = anchors[0]
        const to = anchors[anchors.length - 1]
        const match = matchRun(points, contours)
        if ('refused' in match) refused.push({ polity: claim.polity, from, to, why: match.refused })
        // Already on the coast — retraced before, or drawn on it: its ends are the land borders, off the shore.
        else if (points.slice(1, -1).every((p) => meanKmTo([p], match.path) <= ON_COAST_KM)) continue
        else
          runs.push({
            polity: claim.polity,
            from,
            to,
            interior: anchors.length - 2,
            // Where the run's own anchors are, so the pilot can check they left the polity after the retrace.
            interiorAt: points.slice(1, -1),
            ...match,
          })
      }
    }
  }
  return { runs, refused }
}

/** How far back from the shore the junction point sits (the dev's method, 2026-11-08: *"un point décalé"*). */
export const INLAND_KM = 3

/** How far along the border, from the run's end, the junction point is looked for. */
export const INLAND_REACH_KM = 40

/** A retrace changes at most this many km² per km of the old stretch: a coarse coast is wrong by tens of km, not more. */
export const AREA_PER_KM = 40

/** Above this share of its coast path held by another polity, a run would take a neighbour's ground: refused. */
export const OTHERS_MAX = 0.3

/**
 * The junction point of a run's end: walking the polity's ring away from the run, the first place on land at least
 * {@link INLAND_KM} from the shore — an anchor when one is there, else a point to insert on the edge it lies on.
 * @param {YearMap} map - the map
 * @param {readonly number[]} ring - the polity's ring
 * @param {number} at - the end's position in the ring
 * @param {1 | -1} away - the way along the ring that leaves the run
 * @param {readonly { points: LonLat[] }[]} contours - the coast
 * @param {(p: LonLat) => boolean} isLand - the mask
 * @param {number} [inlandKm] - how far from the shore it must be; {@link INLAND_KM} unless a land cut by water asks less
 * @returns {{ point: LonLat, anchor: number | null, edge: [number, number] | null, passed: number[] } | null} the
 *   junction, the anchor it is (or the edge to insert it on, from the run's side), and the anchors between it and the
 *   run's end, which leave with the run; `null` when none is found within reach
 */
export function junctionPoint(map, ring, at, away, contours, isLand, inlandKm = INLAND_KM) {
  const n = ring.length
  const inland = (/** @type {LonLat} */ p) => isLand(p) && nearestCoast(p, contours).km >= inlandKm
  /** @type {number[]} */
  const passed = []
  let walked = 0
  let i = at
  while (walked <= INLAND_REACH_KM && passed.length < n - 2) {
    const a = ring[i]
    const next = (i + away + n) % n
    const b = ring[next]
    const pa = map.anchors[a]
    const pb = map.anchors[b]
    if (i !== at && inland(pa)) return { point: pa, anchor: a, edge: null, passed }
    const km = kmBetween(pa, pb)
    for (let s = 0.5; s < km; s += 0.5) {
      const t = s / km
      const p = /** @type {LonLat} */ ([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t])
      if (inland(p)) return { point: p, anchor: null, edge: [a, b], passed }
    }
    if (i !== at) passed.push(a)
    walked += km
    i = next
  }
  return null
}

/**
 * The signed area between a polity's old stretch and its new coast, in km² — what the retrace should change.
 * @param {readonly LonLat[]} old - the old stretch, from junction to junction
 * @param {readonly LonLat[]} path - the coast between them
 * @returns {number} the area, unsigned
 */
export function areaBetween(old, path) {
  const ring = [...old, ...[...path].reverse()]
  if (ring.length < 3) return 0
  const ref = ring.reduce((s, p) => s + p[1], 0) / ring.length
  let twice = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = toKm(ring[i], ref)
    const [xj, yj] = toKm(ring[j], ref)
    twice += xj * yi - xi * yj
  }
  return Math.abs(twice / 2)
}

/**
 * Every coast run planned the dev's way: a junction point inland at each end, the coast between, the old anchors that
 * leave, and the area the polity should gain or lose — refused when the coast runs through another polity.
 * @param {YearMap} map - the map
 * @param {readonly { points: LonLat[], closed: boolean }[]} contours - the coast
 * @param {(p: LonLat) => boolean} isLand - the mask
 * @returns {{ runs: object[], refused: { polity: string, at: LonLat, why: string }[] }} the plans, and the runs left
 */
export function junctionRuns(map, contours, isLand) {
  const holders = edgeHolders(map)
  const runs = []
  const refused = []
  for (const claim of map.claims) {
    for (const run of freeRuns(map, claim.polity, holders)) {
      const ring = claim.rings[run.ring]
      for (const anchors of nearCoast(map, run.anchors, contours)) {
        const points = ringPoints(map, anchors)
        const at = map.anchors[anchors[0]]
        if (points.slice(1, -1).every((p) => nearestCoast(p, contours).km <= ON_COAST_KM)) continue
        const startAt = ring.indexOf(anchors[0])
        const endAt = ring.indexOf(anchors[anchors.length - 1])
        // A land cut by water (Zeeland, 2026-11-08) has no point 3 km from every shore within reach: a kilometre then.
        const start =
          junctionPoint(map, ring, startAt, -1, contours, isLand) ??
          junctionPoint(map, ring, startAt, -1, contours, isLand, 1)
        const end =
          junctionPoint(map, ring, endAt, 1, contours, isLand) ??
          junctionPoint(map, ring, endAt, 1, contours, isLand, 1)
        if (start === null || end === null) {
          refused.push({ polity: claim.polity, at, why: 'no junction point inland within reach' })
          continue
        }
        const leaving = [...[...start.passed].reverse(), ...anchors, ...end.passed]
        const old = [start.point, ...leaving.map((a) => map.anchors[a]), end.point]
        const match = matchRun(old, contours)
        if ('refused' in match) {
          refused.push({ polity: claim.polity, at, why: match.refused })
          continue
        }
        const others = match.path.filter((p) => holdersAt(map, p).some((h) => h !== claim.polity)).length
        if (others > OTHERS_MAX * match.path.length) {
          refused.push({ polity: claim.polity, at, why: `its coast runs through another polity (${others}/${match.path.length})` })
          continue
        }
        const expectedKm2 = areaBetween(old, match.path)
        const lengthKm = old.slice(1).reduce((s, p, k) => s + kmBetween(old[k], p), 0)
        if (expectedKm2 > AREA_PER_KM * Math.max(lengthKm, 1)) {
          refused.push({ polity: claim.polity, at, why: `it would change ${expectedKm2.toFixed(0)} km² for ${lengthKm.toFixed(0)} km` })
          continue
        }
        runs.push({
          polity: claim.polity,
          startAt: start.point,
          startEdge: start.edge === null ? null : start.edge.map((a) => map.anchors[a]),
          endAt: end.point,
          endEdge: end.edge === null ? null : end.edge.map((a) => map.anchors[a]),
          interiorAt: leaving.map((a) => map.anchors[a]),
          interior: leaving.length,
          path: match.path,
          km: match.km,
          expectedKm2,
        })
      }
    }
  }
  return { runs, refused }
}

/**
 * The lobes to cut: an island a polity holds through a ring that also holds the mainland (Sicily with Calabria, the
 * Aegean islands with Greece and Anatolia) is freed by retracing the mainland's coast across the lobe the ring makes
 * round it — the dev's gesture, 2026-11-08: *"tu enlèves la Sicile, tu fermes l'Italie, tu redessines la Sicile"*. The
 * lobe is the ring's anchors nearer the island than any other land; its two neighbours on the ring are the retrace's
 * ends, the mainland's coast between them the new run. Then the island, free, is drawn as any other.
 * @param {YearMap} map - the map
 * @param {readonly { id: number, points: LonLat[], closed: boolean, land: boolean }[]} contours - the coast, every contour
 * @param {readonly { id: number, owner: string, points: LonLat[] }[]} islands - the islands `within` a mainland ring
 * @returns {{ plans: object[], refused: { island: number, why: string }[] }} the retraces, one per lobe, and the
 *   islands left
 */
export function lobeCuts(map, contours, islands) {
  const plans = new Map()
  const refused = []
  for (const island of islands) {
    const claim = map.claims.find((c) => c.polity === island.owner)
    const inside = samplesInsideRing(island.points)
    const ring = claim?.rings.find((r) => insideOf(inside, ringPoints(map, r)))
    if (ring === undefined) {
      refused.push({ island: island.id, why: 'no ring of its polity holds it' })
      continue
    }
    const others = contours.filter((c) => c.id !== island.id && c.land)
    const near = ring.map((a) => {
      const p = map.anchors[a]
      return meanKmTo([p], [...island.points, island.points[0]]) < nearestCoast(p, others).km
    })
    const n = ring.length
    if (near.every(Boolean) || !near.some(Boolean)) {
      refused.push({ island: island.id, why: near.every(Boolean) ? 'its ring is the island alone' : 'no anchor of the ring near it' })
      continue
    }
    // The longest circular stretch of anchors nearer the island.
    let best = { from: -1, length: 0 }
    for (let i = 0; i < n; i++) {
      if (!near[i] || near[(i - 1 + n) % n]) continue
      let length = 0
      while (near[(i + length) % n] && length < n) length += 1
      if (length > best.length) best = { from: i, length }
    }
    const a = ring[(best.from - 1 + n) % n]
    const b = ring[(best.from + best.length) % n]
    const lobe = Array.from({ length: best.length }, (_, k) => ring[(best.from + k) % n])
    const key = `${island.owner}:${a}:${b}`
    if (plans.has(key)) continue
    const pa = map.anchors[a]
    const pb = map.anchors[b]
    // The mainland's coast near both ends, the shorter way.
    let path = null
    for (const contour of others) {
      const ea = nearestCoast(pa, [contour])
      const eb = nearestCoast(pb, [contour])
      if (ea.km > END_KM * 2 || eb.km > END_KM * 2 || ea.index === eb.index) continue
      for (const step of /** @type {const} */ ([1, -1])) {
        const way = coastPath(contour.points, contour.closed, ea.index, eb.index, step)
        if (way !== null && (path === null || way.length < path.length)) path = way
      }
    }
    if (path === null) {
      refused.push({ island: island.id, why: 'no mainland coast near both ends of its lobe' })
      continue
    }
    // A coast out of all proportion to the lobe is the long way round a sea (Novgorod's, 10 749 points, 2026-11-08).
    if (path.length > 20 * (lobe.length + 2) + 200) {
      refused.push({ island: island.id, why: `the mainland coast between its ends runs ${path.length} points` })
      continue
    }
    // A mainland coast another polity holds is not this polity's to close on (the Vikings on Alba's Kintyre, 2026-11-08).
    const held = path.filter((p) => holdersAt(map, p).some((h) => h !== island.owner)).length
    if (held > OTHERS_MAX * path.length) {
      refused.push({ island: island.id, why: `the mainland coast is another polity's (${held}/${path.length})` })
      continue
    }
    const old = [pa, ...lobe.map((x) => map.anchors[x]), pb]
    plans.set(key, {
      polity: island.owner,
      startAt: pa,
      startEdge: null,
      endAt: pb,
      endEdge: null,
      interiorAt: lobe.map((x) => map.anchors[x]),
      interior: lobe.length,
      path,
      km: 0,
      expectedKm2: areaBetween(old, path),
      island: island.id,
    })
  }
  return { plans: [...plans.values()], refused }
}

/**
 * Points inside a ring, for testing which ring holds it (a grid, the vertices' mean when too small).
 * @param {readonly LonLat[]} ring - the ring
 * @returns {LonLat[]} the points
 */
function samplesInsideRing(ring) {
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const mean = /** @type {LonLat} */ ([xs.reduce((s, x) => s + x, 0) / xs.length, ys.reduce((s, y) => s + y, 0) / ys.length])
  return [mean]
}

/**
 * Whether most of some points lie inside a ring, even-odd.
 * @param {readonly LonLat[]} points - the points
 * @param {readonly LonLat[]} ring - the ring
 * @returns {boolean} inside
 */
function insideOf(points, ring) {
  let inside = 0
  for (const p of points) {
    let within = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) within = !within
    }
    if (within) inside += 1
  }
  return inside * 2 > points.length
}

/**
 * The parts of a free run that lie along a coast: its maximal stretches of anchors within {@link END_KM} of one. A free
 * run can leave a border with nobody's ground inland (the steppe, a desert), follow the sea, and go inland again; only
 * the part along the sea is a coast, retraced between two of the polity's own anchors.
 * @param {YearMap} map - the map
 * @param {readonly number[]} anchors - the run's anchors, in order
 * @param {readonly { points: LonLat[] }[]} contours - the coast
 * @returns {number[][]} the stretches, two anchors at least each
 */
export function nearCoast(map, anchors, contours) {
  /** @type {number[][]} */
  const stretches = []
  /** @type {number[]} */
  let current = []
  for (const anchor of anchors) {
    if (nearestCoast(map.anchors[anchor], contours).km <= END_KM) current.push(anchor)
    else {
      if (current.length >= 2) stretches.push(current)
      current = []
    }
  }
  if (current.length >= 2) stretches.push(current)
  return stretches
}

/** An edge is over the sea when this share of its samples, one a kilometre, is water. */
export const SEA_SHARE = 0.9

/** And at least this long: a short edge over water is a coast's own wiggle, not a crossing. */
export const SEA_EDGE_KM = 10

/**
 * Whether an edge crosses the sea: long, and nearly all water by the mask.
 * @param {LonLat} a - one end
 * @param {LonLat} b - the other
 * @param {(p: LonLat) => boolean} isLand - the mask
 * @returns {boolean} over the sea
 */
export function crossesSea(a, b, isLand) {
  const km = kmBetween(a, b)
  if (km < SEA_EDGE_KM) return false
  const samples = Math.ceil(km)
  let water = 0
  for (let s = 1; s < samples; s++) {
    const t = s / samples
    if (!isLand([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) water += 1
  }
  return water >= SEA_SHARE * (samples - 1)
}

/**
 * The sea cuts of a map — the dev's gesture for a polity whose ring spans a sea (the Aegean between Greece and
 * Anatolia, a strait): erase the edges that cross the sea, which cuts the ring into pieces, then close each piece with
 * the Pen along its own coast, on the side the polity held. Only edges no other polity draws are erased, so no
 * neighbour is ever opened. Each piece's coast is the way round its contour that runs mostly inside the old ring.
 * @param {YearMap} map - the map
 * @param {readonly { points: LonLat[], closed: boolean }[]} contours - the coast, every contour
 * @param {(p: LonLat) => boolean} isLand - the mask
 * @returns {{ plans: object[], refused: { polity: string, why: string }[] }} one plan per ring cut, and the rings left
 */
export function seaCuts(map, contours, isLand) {
  const holders = edgeHolders(map)
  const plans = []
  const refused = []
  for (const claim of map.claims) {
    claim.rings.forEach((ring, r) => {
      if (claim.open?.includes(r)) return
      const n = ring.length
      const sea = ring.map((a, i) => {
        const b = ring[(i + 1) % n]
        const set = holders.get(a < b ? `${a}-${b}` : `${b}-${a}`)
        return set?.size === 1 && crossesSea(map.anchors[a], map.anchors[b], isLand)
      })
      if (!sea.some(Boolean)) return
      if (sea.every(Boolean)) return
      const oldRing = ringPoints(map, ring)
      // The pieces: maximal runs of anchors joined by edges that stay.
      const start = sea.findIndex((s, i) => s && !sea[(i + 1) % n])
      /** @type {number[][]} */
      const pieces = []
      let piece = []
      for (let k = 1; k <= n; k++) {
        const i = (start + k) % n
        piece.push(ring[i])
        if (sea[i]) {
          pieces.push(piece)
          piece = []
        }
      }
      /** @type {{ endAt: LonLat, startAt: LonLat, path: LonLat[] }[]} */
      const closings = []
      let why = null
      for (const p of pieces.filter((each) => each.length >= 2)) {
        const first = map.anchors[p[0]]
        const last = map.anchors[p[p.length - 1]]
        let best = null
        for (const contour of contours) {
          const ea = nearestCoast(last, [contour])
          const eb = nearestCoast(first, [contour])
          if (ea.km > END_KM * 2 || eb.km > END_KM * 2) continue
          for (const step of /** @type {const} */ ([1, -1])) {
            const way = coastPath(contour.points, contour.closed, ea.index, eb.index, step)
            if (way === null || way.length > 4000) continue
            const inside = way.filter((q) => insideRingEO(q, oldRing)).length / way.length
            if (best === null || inside > best.inside) best = { path: way, inside }
          }
        }
        if (best === null || best.inside < 0.7) {
          why = `a piece has no coast inside its old ring (${best === null ? 'none near' : best.inside.toFixed(2)})`
          break
        }
        closings.push({ endAt: last, startAt: first, path: best.path })
      }
      if (why !== null) refused.push({ polity: claim.polity, why })
      else {
        const edges = ring.flatMap((a, i) => (sea[i] ? [[map.anchors[a], map.anchors[ring[(i + 1) % n]]]] : []))
        plans.push({ polity: claim.polity, edges, closings })
      }
    })
  }
  return { plans, refused }
}

/**
 * Whether a point lies inside a ring, even-odd.
 * @param {LonLat} p - the point
 * @param {readonly LonLat[]} ring - the ring
 * @returns {boolean} inside
 */
function insideRingEO(p, ring) {
  let within = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) within = !within
  }
  return within
}
