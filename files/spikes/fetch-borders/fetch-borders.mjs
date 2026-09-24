#!/usr/bin/env node
/**
 * Crop a `historical-basemaps` year to the DEM's bounding box and emit a compact per-year file holding
 * the polity rings — used both as fill areas and as border lines.
 *
 * Source: https://github.com/aourednik/historical-basemaps
 *
 * LICENCE WARNING: that repository is **GPL-3.0**, with no separate licence carved out for the data.
 * A strict reading means redistributing these files would put the whole distributed work under
 * GPL-3.0. Its output therefore goes to a git-ignored directory: this is a spike to look at, not an
 * asset to ship. Publishing needs either accepting GPL-3.0 for the project, loading the data from
 * upstream at runtime rather than redistributing it, or a permissively licensed source.
 *
 * Usage:
 *   node files/spikes/fetch-borders/fetch-borders.mjs --year 1500 \
 *     [--in files/spikes/fetch-borders/out/world_1500.geojson] \
 *     [--meta public/heightmaps/europe-dem-z5.json] \
 *     [--out public/borders/europe-1500.json] [--tolerance 0.01]
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Parse `--key value` pairs from argv.
 * @param {string[]} argv - raw process arguments
 * @returns {Record<string, string>} the parsed flags
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) continue
    out[key.slice(2)] = value
    i += 1
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const year = args.year ?? '1500'
const inPath = args.in ?? `files/spikes/fetch-borders/out/world_${year}.geojson`
const metaPath = args.meta ?? 'public/heightmaps/europe-dem-z5.json'
const outPath = args.out ?? `public/borders/europe-${year}.json`
const tolerance = args.tolerance !== undefined ? Number(args.tolerance) : 0.01
const precision = args.precision !== undefined ? Number(args.precision) : 4

const dem = JSON.parse(readFileSync(metaPath, 'utf8'))
const { west, south, east, north } = dem.bbox

/**
 * Perpendicular distance from a point to the segment `a`–`b`, in degrees.
 * @param {number[]} p - the point
 * @param {number[]} a - segment start
 * @param {number[]} b - segment end
 * @returns {number} the distance
 */
function pointToSegment(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/**
 * Douglas-Peucker simplification, keeping the first and last vertex.
 * @param {number[][]} points - the ring or polyline
 * @param {number} epsilon - tolerance in degrees
 * @returns {number[][]} the simplified line
 */
function simplify(points, epsilon) {
  if (epsilon <= 0 || points.length < 3) return points
  let worst = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = pointToSegment(points[i], points[0], points[points.length - 1])
    if (distance > worst) {
      worst = distance
      index = i
    }
  }
  if (worst <= epsilon) return [points[0], points[points.length - 1]]
  return [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)]
}

/** Whether a ring has any vertex inside the frame. */
const touchesFrame = (ring) =>
  ring.some(([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north)

const round = (value) => Number(value.toFixed(precision))

const source = JSON.parse(readFileSync(inPath, 'utf8'))
const regions = []
let sourceVertices = 0
let keptVertices = 0

for (const feature of source.features ?? []) {
  const geometry = feature.geometry
  if (!geometry) continue
  const polygons =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : []
  // Every ring of a polity is kept in one flat list: an even-odd fill then handles its holes without
  // the consumer needing to know which ring is which.
  const rings = []
  for (const polygon of polygons) {
    for (const ring of polygon) {
      sourceVertices += ring.length
      if (!touchesFrame(ring)) continue
      const simplified = simplify(ring, tolerance).map(([lon, lat]) => [round(lon), round(lat)])
      if (simplified.length < 4) continue // too small to enclose an area
      keptVertices += simplified.length
      rings.push(simplified)
    }
  }
  if (rings.length === 0) continue
  regions.push({
    name: feature.properties.NAME ?? null,
    subjectTo: feature.properties.SUBJECTO ?? null,
    partOf: feature.properties.PARTOF ?? null,
    rings,
  })
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  JSON.stringify({
    source: 'historical-basemaps (GPL-3.0) — spike only, not for redistribution',
    year: Number(year),
    bbox: { west, south, east, north },
    tolerance,
    regions,
  })
)

console.warn(
  `wrote ${outPath} — year ${year}, ${String(regions.length)} polities, ` +
    `${String(keptVertices)} of ${String(sourceVertices)} vertices kept, ` +
    `${(statSync(outPath).size / 1024).toFixed(0)} KB`
)
