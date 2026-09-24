#!/usr/bin/env node
/**
 * Ingest historical national boundaries from **OpenHistoricalMap** and emit the same per-year payload
 * `fetch-borders` produces — so the app can consume it with no code change.
 *
 * Source: https://www.openhistoricalmap.org — **CC0** since 2022-08-03 (every Overpass response carries
 * the dedication). Unlike OpenStreetMap, OHM is *not* ODbL. Individual features may still opt out via a
 * `license=*` tag (usually `ODbL`, on features imported from OSM); those are dropped here and counted.
 *
 * THE QUESTION THIS SPIKE PROBES: OHM follows the OSM data model, so a boundary is a *relation of ways*
 * that has to be assembled into closed rings. Incomplete relations yield broken polygons. **What is the
 * failure rate?** That is the one unverified assumption behind adopting OHM as the import source
 * (see `files/plans/cartographer/06-contribution-tooling.md`).
 *
 * Usage:
 *   node files/spikes/fetch-ohm/fetch-ohm.mjs --year 1500 \
 *     [--meta public/heightmaps/europe-dem-z5.json] \
 *     [--out files/spikes/fetch-ohm/out/europe-1500.json] \
 *     [--tolerance 0.01] [--refresh]
 *
 * To see it in the app, copy the result over the file the app fetches (it overwrites — look first):
 *   cp files/spikes/fetch-ohm/out/europe-1500.json public/borders/europe-1500.json
 */

import { mkdirSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** The OHM Overpass instance — same API as OSM's, different corpus. */
const OVERPASS = 'https://overpass-api.openhistoricalmap.org/api/interpreter'

/** Coordinates are matched as strings at this precision to chain ways; OSM shares node identity exactly. */
const JOIN_PRECISION = 7

/** `license=*` values that restate a permissive dedication rather than restricting reuse. */
const PERMISSIVE_LICENSES = /^(CC0|public[- ]?domain|PD)/i

/**
 * Parse `--key value` pairs and bare `--flag` switches from argv.
 * @param {string[]} argv - raw process arguments
 * @returns {Record<string, string>} the parsed flags, bare switches mapped to `'true'`
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) {
      out[key.slice(2)] = 'true'
      continue
    }
    out[key.slice(2)] = value
    i += 1
  }
  return out
}

/**
 * Read the leading year of an OSM-style date tag, tolerating `-0100`, `1500`, `1500-01-01` and friends.
 * @param {string | undefined} value - the raw tag value
 * @returns {number | null} the year, negative for BCE, or `null` when unparseable
 */
function parseYear(value) {
  if (!value) return null
  const text = value.trim()
  const negative = text.startsWith('-')
  const match = /^(\d{1,6})/.exec(negative ? text.slice(1) : text)
  if (!match) return null
  const year = Number(match[1])
  return negative ? -year : year
}

/**
 * Run an Overpass QL query against the OHM instance.
 * @param {string} query - the Overpass QL source
 * @returns {Promise<{elements: unknown[]}>} the decoded JSON response
 */
async function overpass(query) {
  const response = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: query }),
  })
  if (!response.ok) throw new Error(`overpass ${String(response.status)}: ${await response.text()}`)
  return response.json()
}

/**
 * Perpendicular distance from a point to the segment `a`–`b`, in degrees.
 * Mirrors `fetch-borders` — spikes stay standalone rather than importing each other.
 * @param {number[]} p - the point
 * @param {number[]} a - segment start
 * @param {number[]} b - segment end
 * @returns {number} the distance
 */
function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/**
 * Douglas-Peucker simplification of a ring, in degrees.
 * @param {number[][]} points - the ring's vertices
 * @param {number} tolerance - the maximum deviation allowed, in degrees
 * @returns {number[][]} the simplified ring
 */
function simplify(points, tolerance) {
  if (points.length < 3 || tolerance <= 0) return points
  const keep = new Array(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  /** @type {[number, number][]} */
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const span = stack.pop()
    if (!span) break
    const [first, last] = span
    let farthest = -1
    let maxDistance = tolerance
    for (let i = first + 1; i < last; i += 1) {
      const distance = pointSegmentDistance(points[i], points[first], points[last])
      if (distance > maxDistance) {
        maxDistance = distance
        farthest = i
      }
    }
    if (farthest === -1) continue
    keep[farthest] = true
    stack.push([first, farthest], [farthest, last])
  }
  return points.filter((_, i) => keep[i])
}

/**
 * Chain a relation's member ways into closed rings, the way an OSM multipolygon is assembled: walk from
 * one way's end to another way that starts or ends on the same node, until the chain closes on itself.
 * @param {{geometry?: {lat: number, lon: number}[]}[]} members - the relation's way members, with geometry
 * @returns {{rings: number[][][], unclosed: number, danglingWays: number}} closed rings plus what failed
 */
function assembleRings(members) {
  /** @type {number[][][]} */
  const pending = []
  for (const member of members) {
    const geometry = member.geometry
    if (!geometry || geometry.length < 2) continue
    pending.push(geometry.map((point) => [point.lon, point.lat]))
  }
  /** @param {number[]} point @returns {string} the join key for a coordinate */
  const key = (point) => `${point[0].toFixed(JOIN_PRECISION)},${point[1].toFixed(JOIN_PRECISION)}`

  /** @type {number[][][]} */
  const rings = []
  let unclosed = 0
  let danglingWays = 0
  const used = new Set()
  for (let i = 0; i < pending.length; i += 1) {
    if (used.has(i)) continue
    used.add(i)
    let chain = pending[i].slice()
    let chainLength = 1
    let extended = true
    while (extended && key(chain[0]) !== key(chain[chain.length - 1])) {
      extended = false
      for (let j = 0; j < pending.length; j += 1) {
        if (used.has(j)) continue
        const candidate = pending[j]
        const tail = key(chain[chain.length - 1])
        if (key(candidate[0]) === tail) {
          chain = chain.concat(candidate.slice(1))
        } else if (key(candidate[candidate.length - 1]) === tail) {
          chain = chain.concat(candidate.slice(0, -1).reverse())
        } else {
          continue
        }
        used.add(j)
        chainLength += 1
        extended = true
        break
      }
    }
    if (key(chain[0]) === key(chain[chain.length - 1]) && chain.length >= 4) {
      rings.push(chain)
    } else {
      unclosed += 1
      danglingWays += chainLength
    }
  }
  return { rings, unclosed, danglingWays }
}

const args = parseArgs(process.argv.slice(2))
const year = Number(args.year ?? '1500')
const metaPath = args.meta ?? 'public/heightmaps/europe-dem-z5.json'
const outPath = args.out ?? `files/spikes/fetch-ohm/out/europe-${String(year)}.json`
const tolerance = args.tolerance !== undefined ? Number(args.tolerance) : 0.01
const precision = args.precision !== undefined ? Number(args.precision) : 4
const cachePath = 'files/spikes/fetch-ohm/out/relations.json'

const dem = JSON.parse(readFileSync(metaPath, 'utf8'))
const { west, south, east, north } = dem.bbox

/** @param {number} value @returns {number} the value rounded to the output precision */
const round = (value) => Number(value.toFixed(precision))

/**
 * Does a ring have at least one vertex inside the DEM frame? Rings entirely outside are dropped.
 * @param {number[][]} ring - the ring's vertices
 * @returns {boolean} true when the ring touches the frame
 */
function touchesFrame(ring) {
  return ring.some(([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north)
}

// 1. Every dated national boundary in frame, tags only — cached, it is the slow query.
if (args.refresh === 'true' || !existsSync(cachePath)) {
  console.warn('querying OHM for every admin_level=2 boundary in frame…')
  const all = await overpass(
    `[out:json][timeout:300];` +
      `rel["boundary"="administrative"]["admin_level"="2"]` +
      `(${String(south)},${String(west)},${String(north)},${String(east)});out tags;`
  )
  mkdirSync(dirname(cachePath), { recursive: true })
  writeFileSync(cachePath, JSON.stringify(all))
}
const catalogue = JSON.parse(readFileSync(cachePath, 'utf8')).elements

// 2. Keep those alive at the target year.
const alive = catalogue.filter((element) => {
  const tags = element.tags ?? {}
  const start = parseYear(tags.start_date)
  const end = parseYear(tags.end_date)
  return start !== null && start <= year && (end === null || end >= year)
})
console.warn(`${String(alive.length)} of ${String(catalogue.length)} boundaries alive in ${String(year)}`)
if (alive.length === 0) throw new Error(`no boundary alive in ${String(year)}`)

// 3. Their geometry, inline.
const geometry = await overpass(
  `[out:json][timeout:300];rel(id:${alive.map((element) => element.id).join(',')});out geom;`
)

// 4. Assemble, crop, simplify.
const byId = new Map(alive.map((element) => [element.id, element.tags ?? {}]))
const regions = []
const stats = {
  relations: 0,
  assembled: 0,
  emptyOfRings: 0,
  unclosedChains: 0,
  danglingWays: 0,
  subRelations: 0,
  licensedOut: 0,
  outOfFrame: 0,
  sourceVertices: 0,
  keptVertices: 0,
}
for (const element of geometry.elements) {
  if (element.type !== 'relation') continue
  const tags = byId.get(element.id)
  if (!tags) continue
  stats.relations += 1
  // A feature may carry its own `license` tag. Most such tags *restate* a permissive dedication (OHM
  // spells the database default `CC0-1.0`); only a genuinely restrictive one — `ODbL` on features
  // imported from OSM — has to be dropped. Rejecting every tagged feature would throw away Spain.
  if (tags.license && !PERMISSIVE_LICENSES.test(tags.license)) {
    stats.licensedOut += 1
    continue
  }
  const members = (element.members ?? []).filter((member) => {
    if (member.type === 'relation') {
      stats.subRelations += 1
      return false
    }
    return member.type === 'way' && ['outer', 'inner', ''].includes(member.role ?? '')
  })
  const { rings, unclosed, danglingWays } = assembleRings(members)
  stats.unclosedChains += unclosed
  stats.danglingWays += danglingWays
  if (rings.length === 0) {
    stats.emptyOfRings += 1
    continue
  }
  stats.assembled += 1
  // Every ring of a polity goes into one flat list: an even-odd fill then handles its holes without the
  // consumer needing to know which ring is which — same contract as `fetch-borders`.
  const kept = []
  for (const ring of rings) {
    stats.sourceVertices += ring.length
    if (!touchesFrame(ring)) continue
    const reduced = simplify(ring, tolerance).map(([lon, lat]) => [round(lon), round(lat)])
    if (reduced.length < 4) continue // too small to enclose an area
    stats.keptVertices += reduced.length
    kept.push(reduced)
  }
  if (kept.length === 0) {
    stats.outOfFrame += 1
    continue
  }
  regions.push({
    // English names keep the polity patterns in `data/regionPalette` matchable across languages.
    name: tags['name:en'] ?? tags.name ?? null,
    // OHM carries no equivalent of historical-basemaps' SUBJECTO / PARTOF — the identity hierarchy will
    // come from the Studio registry instead.
    subjectTo: null,
    partOf: null,
    rings: kept,
  })
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  JSON.stringify({
    source: 'OpenHistoricalMap (CC0) — https://www.openhistoricalmap.org',
    year,
    bbox: { west, south, east, north },
    tolerance,
    regions,
  })
)

const assembledPct = ((stats.assembled / Math.max(1, stats.relations)) * 100).toFixed(1)
console.warn(
  `\nwrote ${outPath} — ${String(regions.length)} polities, ` +
    `${String(stats.keptVertices)} of ${String(stats.sourceVertices)} vertices kept, ` +
    `${(statSync(outPath).size / 1024).toFixed(0)} KB\n` +
    `\nRING ASSEMBLY (the question this spike probes)\n` +
    `  relations fetched     ${String(stats.relations)}\n` +
    `  assembled ≥1 ring     ${String(stats.assembled)}  (${assembledPct} %)\n` +
    `  no ring at all        ${String(stats.emptyOfRings)}\n` +
    `  dropped, out of frame ${String(stats.outOfFrame)}\n` +
    `  dropped, license tag  ${String(stats.licensedOut)}\n` +
    `  unclosed chains       ${String(stats.unclosedChains)} (over ${String(stats.danglingWays)} ways)\n` +
    `  sub-relation members  ${String(stats.subRelations)} (not expanded by \`out geom\`)`
)
