import { areaBetween, edgeHolders, junctionPoint, matchRun } from './coasts.mjs'
import { KM_PER_DEGREE, kmBetween, kmToSegment, sampleSegment } from './geo.mjs'
import { OFF_COAST_KM, ON_SHORE_KM, SHORE_REACH_KM, SHORT_OF_SHORE_KM } from './thresholds.mjs'

/**
 * The stretches of a polity's edge that run out over the sea, off the shore — whatever the gap (the dev,
 * 2026-11-09: the north of the Black Sea, the Aegean coast of Turkey, Holland, left by the coast pass without a word).
 *
 * The coast pass planned only a run whose ends lay within 15 km of the shore and which ran within 25 km of it; a sea
 * crossing only when over 10 km and 90 % water. Whatever fell between was dropped silently. This measure follows the
 * edges themselves, sampled every kilometre, against the shore's segments: an edge no other polity draws, with a sample
 * **on the water** farther than {@link OFF_COAST_KM} from the shore, is off. Consecutive ones make a stretch, to erase
 * and redraw on the mask. A sample on land is never counted: an edge short of the shore and a border with nobody's
 * ground look the same from the edge — that one is measured from the shore (`unclaimedShores`). Pure.
 */

/**
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {import('./yearMap.mjs').YearMap} YearMap
 */

/** The side of a cell of the segments' index, in degrees. */
const CELL = 1

/**
 * The most cells searched across in longitude, near the pole where a degree is short: past it, a segment within the reach
 * is not found. It bites above about 87° N for a reach of 100 km — never on this map, which stops at 77° N.
 */
const MAX_CELLS_ACROSS = 20

/**
 * A grid of segments, each filed in every cell its box covers — a long one is found from its middle too (review of
 * 2026-11-09: filed only by its two ends, a point near the middle of a segment over a degree long missed it) — and
 * searched as many cells round a point as a reach in kilometres needs at its latitude (one cell was 55 km in longitude
 * at 60° N, for a reach of 100).
 * @template T
 * @param {readonly { a: LonLat, b: LonLat, item: T }[]} segments - the segments, each with what it stands for
 * @returns {(p: LonLat, reachKm: number) => { km: number, item: T | null }} the nearest segment within the reach — its
 *   distance and item; `Infinity` and `null` when none is
 */
export function segmentGrid(segments) {
  /** @type {Map<string, { a: LonLat, b: LonLat, item: T }[]>} */
  const cells = new Map()
  for (const s of segments) {
    const [x0, x1] = [Math.floor(Math.min(s.a[0], s.b[0]) / CELL), Math.floor(Math.max(s.a[0], s.b[0]) / CELL)]
    const [y0, y1] = [Math.floor(Math.min(s.a[1], s.b[1]) / CELL), Math.floor(Math.max(s.a[1], s.b[1]) / CELL)]
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const key = `${x}:${y}`
        const list = cells.get(key) ?? []
        list.push(s)
        cells.set(key, list)
      }
    }
  }
  return (p, reachKm) => {
    const cx = Math.floor(p[0] / CELL)
    const cy = Math.floor(p[1] / CELL)
    const degLat = reachKm / KM_PER_DEGREE
    const degLon = degLat / Math.max(Math.cos((p[1] * Math.PI) / 180), 1e-6)
    const dy = Math.ceil(degLat / CELL)
    const dx = Math.min(MAX_CELLS_ACROSS, Math.ceil(degLon / CELL))
    /** @type {{ km: number, item: T | null }} */
    let best = { km: Infinity, item: null }
    const seen = new Set()
    for (let x = cx - dx; x <= cx + dx; x++) {
      for (let y = cy - dy; y <= cy + dy; y++) {
        for (const s of cells.get(`${x}:${y}`) ?? []) {
          if (seen.has(s)) continue
          seen.add(s)
          const km = kmToSegment(p, s.a, s.b)
          if (km < best.km && km <= reachKm) best = { km, item: s.item }
        }
      }
    }
    return best
  }
}

/**
 * The distance from a point to the shore, within {@link SHORE_REACH_KM}.
 * @param {readonly { points: readonly LonLat[], closed: boolean }[]} shores - the shore contours
 * @returns {(p: LonLat) => number} the distance to the nearest shore segment, in km; `Infinity` beyond the reach
 */
export function shoreDistance(shores) {
  /** @type {{ a: LonLat, b: LonLat, item: true }[]} */
  const segments = []
  for (const shore of shores) {
    const n = shore.points.length
    const last = shore.closed ? n : n - 1
    for (let i = 0; i < last; i++) segments.push({ a: shore.points[i], b: shore.points[(i + 1) % n], item: true })
  }
  const nearest = segmentGrid(segments)
  return (p) => nearest(p, SHORE_REACH_KM).km
}

/**
 * Every stretch of edges off the shore.
 * @param {YearMap} map - the map
 * @param {(p: LonLat) => number} distance - from {@link shoreDistance}
 * @param {(p: LonLat) => boolean} isLand - the mask the Pen follows
 * @param {Set<number[]>} [skip] - rings to leave out (from {@link ringsOnContours})
 * @returns {{ polity: string, claim: number, ring: number, from: number, to: number, edges: number, km: number,
 *   worstKm: number, at: LonLat, whole: boolean }[]} each stretch, by its claim's and ring's positions in the map, from its
 *   first anchor to its last, its length, its worst gap and where it is; `whole` when every edge of the ring is off — an
 *   island never drawn on its coast, for the ledger, not a retrace
 */
export function offCoastStretches(map, distance, isLand, skip = new Set()) {
  const holders = edgeHolders(map)
  const found = []
  map.claims.forEach((claim, claimAt) => {
    claim.rings.forEach((ring, index) => {
      if (skip.has(ring)) return
      const n = ring.length
      /** @type {({ worst: number, at: LonLat, km: number } | null)[]} */
      const off = ring.map((a, k) => {
        const b = ring[(k + 1) % n]
        if ((holders.get(a < b ? `${a}-${b}` : `${b}-${a}`)?.size ?? 0) !== 1) return null
        const [pa, pb] = [map.anchors[a], map.anchors[b]]
        let worst = 0
        /** @type {LonLat} */
        let at = pa
        for (const p of sampleSegment(pa, pb, 1)) {
          if (isLand(p)) continue
          const d = distance(p)
          if (d > worst && d <= SHORE_REACH_KM) {
            worst = d
            at = p
          }
        }
        return worst > OFF_COAST_KM ? { worst, at, km: kmBetween(pa, pb) } : null
      })
      const start = off.findIndex((o) => o === null)
      if (start < 0 && n > 0) {
        // Every edge off: the whole ring is one stretch (an island never drawn on its coast).
        let worst = { worst: 0, at: map.anchors[ring[0]] }
        let km = 0
        for (const o of /** @type {{ worst: number, at: LonLat, km: number }[]} */ (off)) {
          km += o.km
          if (o.worst > worst.worst) worst = o
        }
        found.push({ polity: claim.polity, claim: claimAt, ring: index, from: ring[0], to: ring[0], edges: n, km,
          worstKm: worst.worst, at: worst.at, whole: true })
        return
      }
      for (let k = start + 1; k <= start + n; ) {
        if (off[k % n] === null) {
          k++
          continue
        }
        const first = k
        let km = 0
        let worst = { worst: 0, at: map.anchors[ring[first % n]] }
        while (k < start + n + 1 && off[k % n] !== null) {
          const o = /** @type {{ worst: number, at: LonLat, km: number }} */ (off[k % n])
          km += o.km
          if (o.worst > worst.worst) worst = o
          k++
        }
        found.push({ polity: claim.polity, claim: claimAt, ring: index, from: ring[first % n], to: ring[k % n],
          edges: k - first, km, worstKm: worst.worst, at: worst.at, whole: false })
      }
    })
  })
  return found
}

/**
 * The nearest polity's edge to a point, within {@link SHORT_OF_SHORE_KM}.
 * @param {YearMap} map - the map
 * @returns {(p: LonLat) => { km: number, polity: string | null }} the nearest edge's distance and polity; `Infinity`
 *   and `null` beyond the reach
 */
export function edgeDistance(map) {
  /** @type {{ a: LonLat, b: LonLat, item: string }[]} */
  const segments = []
  for (const claim of map.claims) {
    for (const ring of claim.rings) {
      ring.forEach((anchor, k) => {
        segments.push({ a: map.anchors[anchor], b: map.anchors[ring[(k + 1) % ring.length]], item: claim.polity })
      })
    }
  }
  const nearest = segmentGrid(segments)
  return (p) => {
    const found = nearest(p, SHORT_OF_SHORE_KM)
    return { km: found.km, polity: found.item }
  }
}

/**
 * The point a kilometre inland of a shore point, square to the shore — never across a fjord or a strait, where a point
 * taken in a fixed direction lands on the other bank (round 2 of 1300, 2026-11-09: 199 retraces planned in Norway's
 * fjords, each changing nothing).
 * @param {readonly LonLat[]} pts - the shore's points
 * @param {number} k - the point's position
 * @param {boolean} closed - whether the shore loops
 * @param {(p: LonLat) => boolean} isLand - the mask
 * @returns {LonLat | undefined} the inland point; none when neither side a kilometre off is land
 */
export function inlandOf(pts, k, closed, isLand) {
  const n = pts.length
  const prev = pts[closed ? (k - 1 + n) % n : Math.max(0, k - 1)]
  const next = pts[closed ? (k + 1) % n : Math.min(n - 1, k + 1)]
  const p = pts[k]
  const cos = Math.cos((p[1] * Math.PI) / 180)
  // The tangent in kilometres, then its two normals, a kilometre long, back in degrees.
  const tx = (next[0] - prev[0]) * cos
  const ty = next[1] - prev[1]
  const len = Math.hypot(tx, ty)
  if (len === 0) return undefined
  const km = 1 / 111.32
  return /** @type {LonLat[]} */ ([
    [p[0] + ((-ty / len) * km) / cos, p[1] + (tx / len) * km],
    [p[0] + ((ty / len) * km) / cos, p[1] - (tx / len) * km],
  ]).find(isLand)
}

/**
 * The shores nobody holds while a polity stands just behind them — a coast drawn short of the sea (the Aegean coast of
 * Turkey in 1300: 35 of 56 shore samples nobody's). Each shore point is tested a kilometre inland; a run of points held by
 * nobody, the nearest polity's edge within {@link SHORT_OF_SHORE_KM}, is a stretch whose coast is to be pushed out to the
 * shore. Farther, the shore is truly empty (the Arctic, a desert's coast) and is left alone.
 * @param {YearMap} map - the map
 * @param {readonly { points: readonly LonLat[], closed: boolean }[]} shores - the sea's shores
 * @param {(p: LonLat) => boolean} isLand - the mask
 * @param {(p: LonLat) => string[]} holders - who holds a point (`holdersAt` bound to the map)
 * @returns {{ polity: string, from: LonLat, to: LonLat, points: number, km: number, worstKm: number,
 *   shore: LonLat[] }[]} each stretch, by the polity behind it, its two ends on the shore, its length, its widest gap and
 *   its shore points
 */
export function unclaimedShores(map, shores, isLand, holders) {
  const nearest = edgeDistance(map)
  const found = []
  for (const shore of shores) {
    const pts = shore.points
    /** @type {({ polity: string, gap: number } | null)[]} */
    const state = pts.map((p, k) => {
      const inland = inlandOf(pts, k, shore.closed, isLand)
      if (inland === undefined || holders(inland).length > 0) return null
      const near = nearest(inland)
      return near.polity !== null && near.km <= SHORT_OF_SHORE_KM ? { polity: near.polity, gap: near.km } : null
    })
    // A closed shore (the Black Sea, the Caspian) is walked round from a point held or empty, so a stretch across its
    // first point is one stretch, and its closing segment counts (review of 2026-11-09).
    const n = pts.length
    // Start where a stretch cannot be running: a point no polity is short of, or where the polity behind changes.
    const breakAt = state.findIndex((st, i) => st === null || st.polity !== state[(i - 1 + n) % n]?.polity)
    if (shore.closed && breakAt < 0 && state[0] !== null) {
      // The whole closed shore short of one polity: one stretch round, its closing segment counted.
      const s0 = /** @type {{ polity: string, gap: number }} */ (state[0])
      let km = 0
      for (let i = 0; i < n; i++) km += kmBetween(pts[i], pts[(i + 1) % n])
      const worst = Math.max(...state.map((st) => st?.gap ?? 0))
      found.push({ polity: s0.polity, from: pts[0], to: pts[0], points: n, km, worstKm: worst, shore: [...pts, pts[0]] })
      continue
    }
    const begin = shore.closed ? Math.max(0, breakAt) : 0
    const end = shore.closed ? begin + n : n
    const at = (/** @type {number} */ i) => i % n
    let k = begin
    while (k < end) {
      const s = state[at(k)]
      if (s === null) {
        k++
        continue
      }
      const first = k
      let km = 0
      let worst = s.gap
      while (k + 1 < end && state[at(k + 1)]?.polity === s.polity) {
        km += kmBetween(pts[at(k)], pts[at(k + 1)])
        worst = Math.max(worst, /** @type {{ gap: number }} */ (state[at(k + 1)]).gap)
        k++
      }
      if (k > first) {
        const shorePts = []
        for (let i = first; i <= k; i++) shorePts.push(pts[at(i)])
        found.push({ polity: s.polity, from: pts[at(first)], to: pts[at(k)], points: k - first + 1, km, worstKm: worst,
          shore: shorePts })
      }
      k++
    }
  }
  return found
}

/**
 * A planned retrace, in the shape the pilot's `junction` takes.
 * @typedef {{ polity: string, startAt: LonLat, startEdge: LonLat[] | null, endAt: LonLat, endEdge: LonLat[] | null,
 *   interior: number, interiorAt: LonLat[], path: LonLat[], km: number, expectedKm2: number }} ShoreRetrace
 */

/**
 * The retraces that put the measured stretches back on the shore — each on **its own stretch only** (the dev,
 * 2026-11-09: *"simplify, so the retouch is as simple as possible"*). Round 2 retraced whole free runs, hundreds of
 * anchors already on the coast, and the retrace tool lost its way on them.
 *
 * A stretch is the run of the polity's ring from one anchor to another: for one over the sea, its own anchors; for a
 * shore nobody holds, the polity's anchors nearest its two ends, the way between them that is the shorter. Each end on
 * the shore stays as it is; an end off it takes a junction point inland on the ring (the dev's method, `gestures.md`),
 * so neither a neighbour nor a shore anchor is needed — a ring alone (the Aegean coast of Turkey) is planned like any
 * other. A retrace that would change nothing (no anchor replaced, the coast within {@link OFF_COAST_KM} of the edge all
 * along) is not planned.
 * @param {YearMap} map - the map
 * @param {readonly { points: LonLat[], closed: boolean }[]} shores - the sea's shores
 * @param {(p: LonLat) => number} distance - from {@link shoreDistance}
 * @param {(p: LonLat) => boolean} isLand - the mask
 * @param {readonly { polity: string, claim: number, ring: number, from: number, to: number, whole: boolean }[]} out -
 *   from {@link offCoastStretches}
 * @param {readonly { polity: string, from: LonLat, to: LonLat }[]} short - from {@link unclaimedShores}
 * @returns {{ runs: ShoreRetrace[], refused: { polity: string, at: LonLat, why: string }[], unchanged: number }} one
 *   retrace per stretch, each once; the stretches left, with why; how many would have changed nothing
 */
export function shoreRetraces(map, shores, distance, isLand, out, short) {
  const onShore = (/** @type {number} */ a) => distance(map.anchors[a]) <= ON_SHORE_KM
  /** @type {Map<string, ShoreRetrace>} */
  const runs = new Map()
  /** @type {{ polity: string, at: LonLat, why: string }[]} */
  const refused = []
  let unchanged = 0
  /**
   * The retrace of a ring's stretch, forward from position i to position j.
   * @param {string} polity - the polity
   * @param {number[]} ring - its ring
   * @param {number} i - the first anchor's position
   * @param {number} j - the last anchor's position
   * @returns {void}
   */
  const plan = (polity, ring, i, j) => {
    const n = ring.length
    const key = `${polity}:${ring[i]}-${ring[j]}`
    if (runs.has(key)) return
    /** @type {number[]} */
    const anchors = []
    for (let k = i; ; k = (k + 1) % n) {
      anchors.push(ring[k])
      if (k === j) break
    }
    const ends = [
      { pos: i, away: /** @type {-1} */ (-1) },
      { pos: j, away: /** @type {1} */ (1) },
    ].map(({ pos, away }) =>
      onShore(ring[pos])
        ? { point: map.anchors[ring[pos]], edge: null, passed: [], own: true }
        : (() => {
            const found =
              junctionPoint(map, ring, pos, away, shores, isLand) ?? junctionPoint(map, ring, pos, away, shores, isLand, 1)
            return found === null ? null : { ...found, own: false }
          })()
    )
    const [start, end] = ends
    if (start === null || end === null) {
      refused.push({ polity, at: map.anchors[ring[i]], why: 'no junction point inland within reach' })
      return
    }
    // An end of its own on the shore is kept: the retrace starts from it. An end off the shore leaves with the run.
    const leaving = [
      ...[...start.passed].reverse(),
      ...anchors.slice(start.own ? 1 : 0, end.own ? -1 : anchors.length),
      ...end.passed,
    ]
    const old = [start.point, ...leaving.map((a) => map.anchors[a]), end.point]
    const match = matchRun(old, shores, { endKm: SHORE_REACH_KM, alongKm: SHORE_REACH_KM })
    if ('refused' in match) {
      refused.push({ polity, at: old[0], why: match.refused })
      return
    }
    // Nothing replaced and the coast within reach of the edge all along: the edge already lies on the shore, by the
    // measure's own threshold — a retrace would only add points.
    const offEdge = (/** @type {LonLat} */ q) =>
      Math.min(...old.slice(1).map((b, k) => kmToSegment(q, old[k], b))) > OFF_COAST_KM
    if (leaving.length === 0 && !match.path.some(offEdge)) {
      unchanged++
      return
    }
    runs.set(key, {
      polity,
      startAt: start.point,
      startEdge: start.edge === null ? null : start.edge.map((a) => map.anchors[a]),
      endAt: end.point,
      endEdge: end.edge === null ? null : end.edge.map((a) => map.anchors[a]),
      interior: leaving.length,
      interiorAt: leaving.map((a) => map.anchors[a]),
      path: match.path,
      km: match.km,
      expectedKm2: areaBetween(old, match.path),
    })
  }
  for (const s of out) {
    if (s.whole) {
      refused.push({ polity: s.polity, at: map.anchors[s.from], why: 'the whole ring is off the shore: an island to redraw' })
      continue
    }
    const ring = map.claims[s.claim]?.rings[s.ring]
    if (ring === undefined || map.claims[s.claim].polity !== s.polity) {
      refused.push({ polity: s.polity, at: map.anchors[s.from], why: 'its ring is not in the map any more' })
      continue
    }
    const [i, j] = [ring.indexOf(s.from), ring.indexOf(s.to)]
    // Both ends must be in the ring, or `plan` would walk it round for an end it never meets.
    if (i < 0 || j < 0) {
      refused.push({ polity: s.polity, at: map.anchors[s.from], why: 'its ring is not in the map any more' })
      continue
    }
    plan(s.polity, ring, i, j)
  }
  for (const s of short) {
    const rings = map.claims.filter((c) => c.polity === s.polity).flatMap((c) => c.rings)
    // The polity's anchors nearest the stretch's two ends, on one ring, within reach of it.
    /** @type {{ ring: number[], a: number, b: number, gap: number } | null} */
    let best = null
    for (const ring of rings) {
      const near = (/** @type {LonLat} */ q) =>
        ring.reduce((b, a, k) => (kmBetween(map.anchors[a], q) < kmBetween(map.anchors[ring[b]], q) ? k : b), 0)
      const a = near(s.from)
      const b = near(s.to)
      const gap = Math.max(kmBetween(map.anchors[ring[a]], s.from), kmBetween(map.anchors[ring[b]], s.to))
      if (a !== b && gap <= SHORT_OF_SHORE_KM && (best === null || gap < best.gap)) best = { ring, a, b, gap }
    }
    if (best === null) {
      refused.push({ polity: s.polity, at: s.from, why: 'no two anchors of the polity near its ends' })
      continue
    }
    const { ring, a, b } = best
    const n = ring.length
    // The way between them that is the shorter: the polity's edge behind this stretch, not the rest of its outline.
    const along = (/** @type {number} */ x, /** @type {number} */ y) => {
      let km = 0
      for (let k = x; k !== y; k = (k + 1) % n) km += kmBetween(map.anchors[ring[k]], map.anchors[ring[(k + 1) % n]])
      return km
    }
    if (along(a, b) <= along(b, a)) plan(s.polity, ring, a, b)
    else plan(s.polity, ring, b, a)
  }
  return { runs: [...runs.values()], refused, unchanged }
}

/**
 * The rings lying wholly on a traced contour — an island drawn on its coast, a lake carved on its shore. They are the
 * passes' work, not faults: the measures of waste and of edges off the shore leave them out (the run from zero of
 * 2026-11-09 counted 598 « lint » and 17,763 km « out » that were islands and lakes just drawn).
 * @param {YearMap} map - the map
 * @param {(p: LonLat) => number} distance - from {@link shoreDistance}, over every contour, lakes included
 * @returns {Set<number[]>} the rings, by identity
 */
export function ringsOnContours(map, distance) {
  /** @type {Set<number[]>} */
  const on = new Set()
  for (const claim of map.claims) {
    for (const ring of claim.rings) {
      if (ring.every((a) => distance(map.anchors[a]) <= ON_SHORE_KM)) on.add(ring)
    }
  }
  return on
}
