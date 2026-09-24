#!/usr/bin/env node
/**
 * Rasterise the Natural Earth land polygons (minus lakes) into a 1-bit land/water mask aligned to the
 * DEM's grid and projection.
 *
 * Why a mask at all: a DEM answers "how high", not "wet or dry". Deriving the shoreline from a 0 m
 * contour drowns every polder — about a quarter of the Netherlands sits below sea level and stays dry
 * only because of dikes and pumps, which no elevation model contains. Connectivity does not rescue it
 * either: at this grid size the dikes are far narrower than a cell, so the sea really is connected to
 * the polders in the data.
 *
 * Source: https://github.com/nvkelso/natural-earth-vector — public domain, no attribution required.
 *
 * `ne_10m_land` is cut against the ocean and does NOT carve out inland lakes, so the lakes layer is
 * rasterised separately and punched out; without that the Caspian would read as a plain.
 *
 * Output: a packed bitfield (MSB first, row-major, 1 = land) plus a JSON sidecar. One bit per cell is
 * cheap enough that the mask can be baked finer than the DEM — the shoreline's precision is then no
 * longer capped by the elevation grid.
 *
 * Usage:
 *   node files/spikes/fetch-land/rasterise-land.mjs \
 *     --land files/spikes/fetch-land/out/ne_10m_land.geojson \
 *     --lakes files/spikes/fetch-land/out/ne_10m_lakes.geojson \
 *     --meta public/heightmaps/europe-dem-z5.json \
 *     --out public/masks/europe-land \
 *     [--scale 2]
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
const landPath = args.land ?? 'files/spikes/fetch-land/out/ne_10m_land.geojson'
const lakesPath = args.lakes ?? 'files/spikes/fetch-land/out/ne_10m_lakes.geojson'
const metaPath = args.meta ?? 'public/heightmaps/europe-dem-z5.json'
const outBase = args.out ?? 'public/masks/europe-land'
const scale = args.scale !== undefined ? Math.max(1, Math.round(Number(args.scale))) : 2

const dem = JSON.parse(readFileSync(metaPath, 'utf8'))
if (!dem.bbox || !Number.isFinite(dem.bbox.west)) throw new Error(`${metaPath}: malformed bbox`)
const bbox = dem.bbox
const width = dem.width * scale
const height = dem.height * scale

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI
const MAX_LAT = 85.05112878

/** Project a latitude to Web Mercator y (radians of projected space). */
const mercatorY = (lat) =>
  Math.log(Math.tan(Math.PI / 4 + (Math.min(MAX_LAT, Math.max(-MAX_LAT, lat)) * DEG2RAD) / 2))

const northY = mercatorY(bbox.north)
const southY = mercatorY(bbox.south)

/** Latitude of a raster row centre — rows are evenly spaced in projected space, not in degrees. */
const rowLatitude = (row) =>
  (2 * Math.atan(Math.exp(northY + ((southY - northY) * row) / (height - 1))) - Math.PI / 2) *
  RAD2DEG

/** The fractional raster row a latitude falls on. */
const latitudeRow = (lat) => ((mercatorY(lat) - northY) / (southY - northY)) * (height - 1)

/** The fractional raster column a longitude falls on — Mercator x is linear in longitude. */
const longitudeColumn = (lon) => ((lon - bbox.west) / (bbox.east - bbox.west)) * (width - 1)

/**
 * Fill every polygon of a GeoJSON feature collection into `bits` using an even-odd scanline fill, so
 * that a polygon's holes stay unfilled.
 *
 * Edges are bucketed by the rows they span (a classic edge table): touching all 446k edges on each of
 * thousands of rows would be a billion tests, whereas most edges span less than a single row.
 * @param {Uint8Array} bits - one byte per cell, written to in place
 * @param {object} collection - the parsed GeoJSON
 * @param {number} value - the value to write inside the polygons
 * @returns {number} how many cells were written
 */
function fillPolygons(bits, collection, value) {
  /** @type {number[][]} one flat [lon1, lat1, lon2, lat2, ...] list per row */
  const table = Array.from({ length: height }, () => [])
  let edges = 0

  for (const feature of collection.features ?? []) {
    const geometry = feature.geometry
    if (!geometry) continue
    const polygons =
      geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : geometry.type === 'Polygon'
          ? [geometry.coordinates]
          : []
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i += 1) {
          const [lon1, lat1] = ring[i]
          const [lon2, lat2] = ring[(i + 1) % ring.length]
          if (lat1 === lat2) continue // horizontal edges contribute no crossing
          const top = Math.max(0, Math.ceil(latitudeRow(Math.max(lat1, lat2))))
          const bottom = Math.min(height - 1, Math.floor(latitudeRow(Math.min(lat1, lat2))))
          if (bottom < top) continue // entirely outside the frame, or thinner than a row
          for (let row = top; row <= bottom; row += 1) table[row].push(lon1, lat1, lon2, lat2)
          edges += 1
        }
      }
    }
  }

  let written = 0
  const crossings = []
  for (let row = 0; row < height; row += 1) {
    const bucket = table[row]
    if (bucket.length === 0) continue
    const lat = rowLatitude(row)
    crossings.length = 0
    for (let i = 0; i < bucket.length; i += 4) {
      const lon1 = bucket[i]
      const lat1 = bucket[i + 1]
      const lon2 = bucket[i + 2]
      const lat2 = bucket[i + 3]
      // Half-open test so a vertex shared by two edges is counted exactly once.
      if (lat >= Math.min(lat1, lat2) && lat < Math.max(lat1, lat2)) {
        crossings.push(lon1 + ((lon2 - lon1) * (lat - lat1)) / (lat2 - lat1))
      }
    }
    if (crossings.length < 2) continue
    crossings.sort((a, b) => a - b)
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.ceil(longitudeColumn(crossings[i])))
      const to = Math.min(width - 1, Math.floor(longitudeColumn(crossings[i + 1])))
      for (let col = from; col <= to; col += 1) {
        const index = row * width + col
        if (bits[index] !== value) {
          bits[index] = value
          written += 1
        }
      }
    }
  }
  return written
}

const cells = new Uint8Array(width * height)
const landCells = fillPolygons(cells, JSON.parse(readFileSync(landPath, 'utf8')), 1)
const lakeCells = fillPolygons(cells, JSON.parse(readFileSync(lakesPath, 'utf8')), 0)

// Pack to one bit per cell, MSB first.
const packed = new Uint8Array(Math.ceil(cells.length / 8))
for (let i = 0; i < cells.length; i += 1) {
  if (cells[i] === 1) packed[i >> 3] |= 0b1000_0000 >> (i & 7)
}

mkdirSync(dirname(outBase), { recursive: true })
writeFileSync(`${outBase}.bin`, packed)
writeFileSync(
  `${outBase}.json`,
  JSON.stringify({
    source: 'Natural Earth 10m land minus lakes (public domain)',
    width,
    height,
    scale,
    bbox,
    encoding: 'packed-bits-msb-first, 1 = land',
  })
)

const landTotal = cells.reduce((sum, value) => sum + value, 0)
console.warn(
  `wrote ${outBase}.bin — ${String(width)}x${String(height)} (x${String(scale)} the DEM), ` +
    `${(statSync(`${outBase}.bin`).size / 1024).toFixed(0)} KB packed\n` +
    `  land cells: ${String(landTotal)} (${((100 * landTotal) / cells.length).toFixed(1)}%), ` +
    `filled ${String(landCells)}, punched back out for lakes ${String(lakeCells)}`
)
