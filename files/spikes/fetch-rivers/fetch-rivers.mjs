#!/usr/bin/env node
/**
 * Crop the Natural Earth 10m river centrelines to the DEM's bounding box and emit a compact JSON the
 * app can load directly.
 *
 * Source: https://github.com/nvkelso/natural-earth-vector (public domain — Natural Earth places all of
 * its raster and vector data in the public domain, no attribution required).
 *
 * The app must not depend on the network at runtime, so this runs offline and its output is committed,
 * exactly like the DEM.
 *
 * Usage:
 *   node files/spikes/fetch-rivers/fetch-rivers.mjs \
 *     --in files/spikes/fetch-rivers/out/ne_10m_rivers.geojson \
 *     --meta public/heightmaps/europe-dem-z5.json \
 *     --out public/rivers/europe-rivers.json \
 *     [--precision 4] [--tolerance 0.005]
 *
 * `--precision` is decimal places of longitude/latitude kept (4 ≈ 11 m). `--tolerance` is the
 * Douglas-Peucker simplification threshold in degrees (0 disables it).
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
const inPath = args.in ?? 'files/spikes/fetch-rivers/out/ne_10m_rivers.geojson'
const metaPath = args.meta ?? 'public/heightmaps/europe-dem-z5.json'
const outPath = args.out ?? 'public/rivers/europe-rivers.json'
const precision = args.precision !== undefined ? Number(args.precision) : 4
const tolerance = args.tolerance !== undefined ? Number(args.tolerance) : 0.005

const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
if (!meta.bbox || !Number.isFinite(meta.bbox.west)) {
  throw new Error(`${metaPath}: missing or malformed "bbox"`)
}
const { west, south, east, north } = meta.bbox

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
 * Douglas-Peucker simplification: drop vertices that sit within `epsilon` of the chord they span.
 * @param {number[][]} points - the polyline
 * @param {number} epsilon - tolerance in degrees
 * @returns {number[][]} the simplified polyline
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
  const left = simplify(points.slice(0, index + 1), epsilon)
  const right = simplify(points.slice(index), epsilon)
  return [...left.slice(0, -1), ...right]
}

/**
 * Split a polyline into the runs that fall inside the bounding box, keeping one vertex past each
 * crossing so a line reaches the frame edge instead of stopping short of it.
 * @param {number[][]} points - the polyline in lon/lat
 * @returns {number[][][]} the runs inside the box
 */
function clipToBox(points) {
  const inside = (p) => p[0] >= west && p[0] <= east && p[1] >= south && p[1] <= north
  const runs = []
  let current = []
  for (let i = 0; i < points.length; i += 1) {
    if (inside(points[i])) {
      // Reach back one vertex so the run starts outside and crosses the edge.
      if (current.length === 0 && i > 0) current.push(points[i - 1])
      current.push(points[i])
    } else if (current.length > 0) {
      current.push(points[i]) // reach forward one vertex, then close the run
      runs.push(current)
      current = []
    }
  }
  if (current.length > 0) runs.push(current)
  return runs.filter((run) => run.length >= 2)
}

const round = (value) => Number(value.toFixed(precision))

const source = JSON.parse(readFileSync(inPath, 'utf8'))
/** @type {{ rank: number, kind: string, name: string | null, points: number[][] }[]} */
const rivers = []
let sourceVertices = 0

for (const feature of source.features ?? []) {
  const { geometry, properties } = feature
  if (!geometry) continue
  const parts =
    geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.type === 'MultiLineString'
        ? geometry.coordinates
        : []
  for (const part of parts) {
    sourceVertices += part.length
    for (const run of clipToBox(part)) {
      const simplified = simplify(run, tolerance).map(([lon, lat]) => [round(lon), round(lat)])
      if (simplified.length < 2) continue
      rivers.push({
        rank: Math.round(properties.scalerank ?? 9),
        kind: properties.featurecla ?? 'River',
        name: properties.name ?? null,
        points: simplified,
      })
    }
  }
}

const keptVertices = rivers.reduce((sum, river) => sum + river.points.length, 0)
const payload = {
  source: 'Natural Earth 10m rivers + lake centerlines (public domain)',
  bbox: { west, south, east, north },
  precision,
  tolerance,
  rivers,
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(payload))

const ranks = rivers.reduce((acc, river) => {
  acc[river.rank] = (acc[river.rank] ?? 0) + 1
  return acc
}, {})
console.warn(
  `wrote ${outPath} — ${String(rivers.length)} polylines, ` +
    `${String(keptVertices)} of ${String(sourceVertices)} source vertices kept, ` +
    `${(statSync(outPath).size / 1024).toFixed(0)} KB\n` +
    `  ranks: ${JSON.stringify(ranks)}`
)
