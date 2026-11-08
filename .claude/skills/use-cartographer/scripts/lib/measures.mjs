import { angleAt, kmBetween, kmToSegment, sampleSegment } from './geo.mjs'
import {
  ENCLAVE_MAX_RADIUS_KM,
  ENCLAVE_MIN_GAP_KM,
  RIVER_MIN_RUN_KM,
  RIVER_NEAR_KM,
  RIVER_PREFILTER_DEGREES,
  RIVER_SAMPLE_KM,
  SLIVER_KM,
  SPIKE_DEGREES,
  STIFF_SEGMENT_KM,
} from './thresholds.mjs'
import { holdersAt, segmentKey, segmentOwners, ringVertices } from './yearMap.mjs'

/**
 * The measures the decisions read — pure functions of a map, the cities and the rivers. Each answers one question of
 * `references/decide.md`; none draws, none decides for the dev.
 *
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {import('./yearMap.mjs').YearMap} YearMap
 * @typedef {import('./cities.mjs').City} City
 * @typedef {{ name: string | null, points: LonLat[] }} River
 */

/**
 * Where a city stands: on its sourced holder's ground, on someone else's, or its holder is not on the map.
 * @param {YearMap} map - the map
 * @param {City} city - the city
 * @returns {{ city: City, verdict: 'ok' | 'wrong' | 'absent' | 'unsourced', wanted: string | null, held: string[] }}
 *   `absent`: the holder is not a polity of the map; `unsourced`: the city has no holder
 */
export function citySide(map, city) {
  const held = holdersAt(map, city.at)
  if (city.holderQid === null) return { city, verdict: 'unsourced', wanted: null, held }
  const wanted = map.polityByQid.get(city.holderQid) ?? null
  if (wanted === null) return { city, verdict: 'absent', wanted, held }
  return { city, verdict: held.includes(wanted) ? 'ok' : 'wrong', wanted, held }
}

/**
 * What a planned zone does to a city inside it. A **cession** gives the ground to `to`: the city is right when its
 * sourced holder is `to`. An **overlap** — a disputed zone — adds `to` over the polity already there: the city is right
 * when its sourced holder is either (Valtierra stays Zaragoza's under the Aragonese overlap of Arguedas).
 * @param {ReturnType<typeof citySide>} side - the city's side today
 * @param {string} to - the polity the zone goes to, or is added for
 * @param {boolean} [overlap] - `true` for a disputed zone; a cession by default
 * @returns {'ok' | 'wrong' | 'absent' | 'unsourced'} a city whose holder is not on the map, or has none, keeps that
 *   verdict — the plan cannot set it right
 */
export function verdictAfterMove(side, to, overlap = false) {
  if (side.wanted === null) return side.verdict
  if (side.wanted === to) return 'ok'
  return overlap && side.held.includes(side.wanted) ? 'ok' : 'wrong'
}

/**
 * The cities whose side changed between two states of a map — the proof of a retouch against the copy made before it.
 * @param {YearMap} before - the copy
 * @param {YearMap} now - the map
 * @param {readonly City[]} cities - the cities
 * @returns {{ before: string, side: ReturnType<typeof citySide> }[]} each changed city, with its verdict before
 */
export function verdictChanges(before, now, cities) {
  return cities
    .map((city) => ({ before: citySide(before, city).verdict, side: citySide(now, city) }))
    .filter((change) => change.before !== change.side.verdict)
}

/**
 * The anchors a retouch added: those whose position the copy made before it does not have. **Compared by position,
 * never by index** — the Cartographer renumbers the anchors at every save, so an index means nothing across two files.
 * @param {YearMap} map - the map
 * @param {YearMap} before - the copy
 * @returns {(anchor: number) => boolean} `true` for an anchor of `map` the copy lacks
 */
export function anchorsAddedSince(map, before) {
  const key = (point) => `${point[0]},${point[1]}`
  const known = new Set(before.anchors.map(key))
  return (anchor) => !known.has(key(map.anchors[anchor]))
}

/**
 * The enclave rule for a city on the wrong side: how far its nearest opposing witness is, and what that allows.
 * An opposing witness is any city whose sources name **another holder** — on the map or not: at Zaidín the witness
 * 1.5 km away is Velilla, held by a taifa the map does not draw (measured 2026-11-08; the first version, which only
 * counted the map's holder of the ground, saw a witness 17 km away and offered an enclave).
 * @param {City} city - the city on the wrong side
 * @param {readonly City[]} cities - every city of the year
 * @returns {{ nearest: City | null, km: number, verdict: 'enclave' | 'disputed', radiusKm: number }} `radiusKm` is the
 *   enclave's largest radius, half the gap to the nearest opposing witness and never over the cap; 0 when disputed
 */
export function enclaveRule(city, cities) {
  let nearest = null
  let km = Number.POSITIVE_INFINITY
  for (const other of cities) {
    if (other === city || other.holderQid === null || other.holderQid === city.holderQid) continue
    const distance = kmBetween(city.at, other.at)
    if (distance < km) {
      km = distance
      nearest = other
    }
  }
  const verdict = km < ENCLAVE_MIN_GAP_KM ? 'disputed' : 'enclave'
  const radiusKm = verdict === 'enclave' ? Math.min(ENCLAVE_MAX_RADIUS_KM, km / 2) : 0
  return { nearest, km, verdict, radiusKm }
}

/**
 * The spikes: vertices of a polity's rings whose angle is under the threshold.
 * @param {YearMap} map - the map
 * @param {string | undefined} polity - one polity, or every polity
 * @param {(anchor: number) => boolean} [touched] - keeps only the vertices this accepts (the anchors changed); all by default
 * @returns {{ polity: string, anchor: number, at: LonLat, degrees: number }[]} sharpest first
 */
export function spikes(map, polity, touched = () => true) {
  return ringVertices(map, polity)
    .filter((v) => touched(v.at) || touched(v.previous) || touched(v.next))
    .map((v) => ({
      polity: v.polity,
      anchor: v.at,
      at: map.anchors[v.at],
      degrees: angleAt(map.anchors[v.previous], map.anchors[v.at], map.anchors[v.next]),
    }))
    .filter((s) => s.degrees < SPIKE_DEGREES)
    .sort((a, b) => a.degrees - b.degrees)
}

/**
 * The doubled points: segments of a ring between two anchors at one position. The snap never makes them in drawing;
 * an import does (1100: three, from Cliopatria and the Natural Earth coast). Listed apart from the spikes because the
 * angle there cannot be measured — {@link spikes} would drop them without a word, and the measure would read clean
 * where it is blind (the dev's call, 2026-11-08: name them, do not stop).
 * @param {YearMap} map - the map
 * @param {string | undefined} polity - one polity, or every polity
 * @returns {{ polity: string, a: number, b: number, at: LonLat }[]} each doubled segment, once per ring holding it
 */
export function doubledPoints(map, polity) {
  return ringVertices(map, polity)
    .filter((v) => {
      const [p, q] = [map.anchors[v.at], map.anchors[v.next]]
      return v.at !== v.next && p[0] === q[0] && p[1] === q[1]
    })
    .map((v) => ({ polity: v.polity, a: v.at, b: v.next, at: map.anchors[v.at] }))
}

/**
 * The slivers: an anchor a retouch touched that runs within {@link SLIVER_KM} of a segment of the same polity that is
 * not its own neighbour — the thin blade a polity keeps between two of its rings (its outline and a hole) or between two
 * stretches of one ring. Each ring taken alone has no sharp angle there, so {@link spikes} cannot see it: found by the
 * dev at Besalú's tip on 2026-11-08, a Roussillon blade between Besalú and Cerdanya, closed by dragging the neighbour's
 * anchor onto Besalú's.
 * @param {YearMap} map - the map
 * @param {(anchor: number) => boolean} touched - the anchors to examine (those the retouch added or moved)
 * @returns {{ polity: string, anchor: number, at: LonLat, km: number }[]} narrowest first, one per anchor and polity
 */
export function slivers(map, touched) {
  const found = new Map()
  for (const claim of map.claims) {
    const segments = claim.rings.flatMap((ring) =>
      ring.map((a, k) => [a, ring[(k + 1) % ring.length]])
    )
    for (const ring of claim.rings) {
      for (const anchor of ring) {
        if (!touched(anchor)) continue
        const p = map.anchors[anchor]
        for (const [a, b] of segments) {
          if (a === anchor || b === anchor) continue
          const pa = map.anchors[a]
          const pb = map.anchors[b]
          if (pa[0] === p[0] && pa[1] === p[1]) continue
          if (pb[0] === p[0] && pb[1] === p[1]) continue
          const km = kmToSegment(p, pa, pb)
          const key = `${claim.polity}#${anchor}`
          if (km < SLIVER_KM && km < (found.get(key)?.km ?? Number.POSITIVE_INFINITY)) {
            found.set(key, { polity: claim.polity, anchor, at: p, km })
          }
        }
      }
    }
  }
  return [...found.values()].sort((x, y) => x.km - y.km)
}

/**
 * The registry's forgotten dates: polities given a Wikidata id but no `existsFrom` or no `existsTo`. The form proposes
 * Wikidata's dates beside the id, and the step that takes them — « Use » — is forgotten mid-gesture (four counties on
 * 2026-11-08); this measure catches it at the end of a zone, so no one has to remember (the dev's call, same day).
 * @param {YearMap} map - the map
 * @returns {{ id: string, name: string, wikidata: string, missing: ('existsFrom' | 'existsTo')[] }[]} by id
 */
export function undatedPolities(map) {
  return map.registry
    .filter((polity) => typeof polity.wikidata === 'string' && polity.wikidata !== '')
    .map((polity) => ({
      id: polity.id,
      name: polity.name,
      wikidata: /** @type {string} */ (polity.wikidata),
      missing: /** @type {('existsFrom' | 'existsTo')[]} */ (
        ['existsFrom', 'existsTo'].filter((field) => typeof polity[field] !== 'number')
      ),
    }))
    .filter((polity) => polity.missing.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * The stiff segments: borders between two polities longer than the threshold, each counted once. **Land borders only**:
 * a segment one polity holds alone — a coast, an edge on unclaimed ground — is not listed, or every straight stretch of
 * Cliopatria's coasts would drown the borders (decide.md says so).
 * @param {YearMap} map - the map
 * @param {string | undefined} polity - only the borders of this polity, or every border
 * @returns {{ a: number, b: number, km: number, polities: string[] }[]} longest first
 */
export function stiffSegments(map, polity) {
  const out = []
  for (const [key, owners] of segmentOwners(map)) {
    if (owners.size < 2 || (polity !== undefined && !owners.has(polity))) continue
    const [a, b] = key.split('-').map(Number)
    const km = kmBetween(map.anchors[a], map.anchors[b])
    if (km > STIFF_SEGMENT_KM) out.push({ a, b, km, polities: [...owners].sort() })
  }
  return out.sort((x, y) => y.km - x.km)
}

/**
 * A planned zone's points: anchor indices of the map, or positions, mixed — a plan is written on the anchors it starts
 * and ends on, and on the free points between.
 * @param {YearMap} map - the map
 * @param {readonly (number | LonLat)[]} items - the zone's corners, in order
 * @returns {LonLat[]} the polygon
 */
export function planPolygon(map, items) {
  return items.map((item) => {
    if (typeof item !== 'number') return item
    const point = map.anchors[item]
    if (point === undefined)
      throw new Error(`the plan names anchor ${item}, which the map does not have`)
    return point
  })
}

/**
 * The nearest river to a point.
 * @param {LonLat} point - the point
 * @param {readonly River[]} rivers - the rivers
 * @returns {{ km: number, name: string | null, key: string | null }} its distance, its name, and the key that says two
 *   samples are on the same river — its name (the dataset cuts a river into several pieces of one name), or its own
 *   index when it has none (no name, nothing says two pieces are one); infinite and `null` when there is no river
 */
export function nearestRiver(point, rivers) {
  let best = {
    km: Number.POSITIVE_INFINITY,
    name: /** @type {string | null} */ (null),
    key: /** @type {string | null} */ (null),
  }
  for (const [index, river] of rivers.entries()) {
    for (let k = 0; k + 1 < river.points.length; k++) {
      const a = river.points[k]
      const b = river.points[k + 1]
      // A cheap pre-filter on the stretch's box widened by a margin — never on its ends' distance, which drops a long
      // stretch passing right by the point (caught by the test of the 223 km meridian, 2026-11-08).
      const m = RIVER_PREFILTER_DEGREES
      if (point[0] < Math.min(a[0], b[0]) - m || point[0] > Math.max(a[0], b[0]) + m) continue
      if (point[1] < Math.min(a[1], b[1]) - m || point[1] > Math.max(a[1], b[1]) + m) continue
      const km = kmToSegment(point, a, b)
      if (km < best.km) {
        best = {
          km,
          name: river.name,
          key: river.name === null ? `#${index}` : `name:${river.name}`,
        }
      }
    }
  }
  return best
}

/**
 * A border walked every few kilometres: one sample per step along each land segment of a polity's rings, with the
 * neighbour across it.
 * @param {YearMap} map - the map
 * @param {string} polity - the polity
 * @returns {{ at: LonLat, neighbour: string | null, stepKm: number }[][]} one list per ring, in ring order;
 *   `neighbour` is `null` along a coast or unclaimed ground
 */
export function borderSamples(map, polity) {
  const owners = segmentOwners(map)
  return map.claims
    .filter((claim) => claim.polity === polity)
    .flatMap((claim) => claim.rings)
    .map((ring) =>
      ring.flatMap((a, k) => {
        const b = ring[(k + 1) % ring.length]
        const others = [...(owners.get(segmentKey(a, b)) ?? [])].filter((p) => p !== polity).sort()
        const points = sampleSegment(map.anchors[a], map.anchors[b], RIVER_SAMPLE_KM).slice(0, -1)
        const stepKm = kmBetween(map.anchors[a], map.anchors[b]) / Math.max(1, points.length)
        return points.map((at) => ({
          at,
          neighbour: others.length > 0 ? others.join(',') : null,
          stepKm,
        }))
      })
    )
}

/**
 * The river candidates of a polity: runs of its land borders whose samples all stay near one river, over a length
 * that makes it a course — measured sample by sample, because a long straight segment can graze a river along half
 * its length (the Tagus in 1100: no segment wholly near, 180 km of samples within 8 km).
 * @param {YearMap} map - the map
 * @param {string} polity - the polity
 * @param {readonly River[]} rivers - the rivers
 * @returns {{ river: string | null, neighbour: string, km: number, from: LonLat, to: LonLat, maxGapKm: number }[]}
 *   longest first
 */
export function riverCandidates(map, polity, rivers) {
  const out = []
  for (const samples of borderSamples(map, polity)) {
    let run = null
    const flush = () => {
      if (run !== null && run.km >= RIVER_MIN_RUN_KM) {
        const { key: _key, ...candidate } = run
        out.push(candidate)
      }
      run = null
    }
    for (const sample of samples) {
      const near = nearestRiver(sample.at, rivers)
      if (sample.neighbour === null || near.km > RIVER_NEAR_KM) {
        flush()
        continue
      }
      if (run !== null && (run.key !== near.key || run.neighbour !== sample.neighbour)) flush()
      run ??= {
        key: near.key,
        river: near.name,
        neighbour: sample.neighbour,
        km: 0,
        from: sample.at,
        to: sample.at,
        maxGapKm: 0,
      }
      run.km += sample.stepKm
      run.to = sample.at
      run.maxGapKm = Math.max(run.maxGapKm, near.km)
    }
    flush()
  }
  return out.sort((x, y) => y.km - x.km)
}
