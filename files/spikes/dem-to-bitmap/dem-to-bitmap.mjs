#!/usr/bin/env node
/**
 * Render the Int16 DEM as a greyscale heightmap bitmap (PNG) — an inspection artefact.
 *
 * The app's terrain compositor reads the Int16 `.bin` directly (65 536 levels, no async load), so this
 * PNG is NOT consumed by the render: it exists so the elevation bitmap can be opened, eyeballed, and
 * reworked in an image editor.
 *
 * Convention: the lower the sample the blacker, the higher the whiter (elevation-bitmap standard).
 *
 * Usage:
 *   node files/spikes/dem-to-bitmap/dem-to-bitmap.mjs \
 *     --in public/heightmaps/europe-dem-z5 \
 *     --out files/spikes/dem-to-bitmap/out/europe-dem-z5.png \
 *     [--floor <m>] [--ceiling <m>]
 *
 * With no --floor/--ceiling, the DEM's own min/max are used (full dynamic range).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { PNG } from 'pngjs'

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
const base = args.in ?? 'public/heightmaps/europe-dem-z5'
const outPath = args.out ?? 'files/spikes/dem-to-bitmap/out/europe-dem-z5.png'

const meta = JSON.parse(readFileSync(`${base}.json`, 'utf8'))

// Validate the sidecar before trusting its numbers: without this, a missing field yields NaN, the size
// check below compares NaN to NaN and the failure surfaces much later as a confusing size mismatch.
for (const field of ['width', 'height', 'min', 'max']) {
  if (!Number.isFinite(meta[field])) {
    throw new Error(`${base}.json: "${field}" must be a finite number, got ${String(meta[field])}`)
  }
}
if (!Number.isInteger(meta.width) || !Number.isInteger(meta.height) || meta.width < 1 || meta.height < 1) {
  throw new Error(`${base}.json: width/height must be positive integers, got ${meta.width}×${meta.height}`)
}

const raw = readFileSync(`${base}.bin`)
const data = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2)

const { width, height } = meta
if (data.length !== width * height) {
  throw new Error(`DEM size mismatch: ${data.length} samples for ${width}×${height}`)
}

const floor = args.floor !== undefined ? Number(args.floor) : meta.min
const ceiling = args.ceiling !== undefined ? Number(args.ceiling) : meta.max
const span = Math.max(1, ceiling - floor)

const png = new PNG({ width, height, colorType: 0 }) // colorType 0 = greyscale
for (let p = 0; p < width * height; p += 1) {
  const t = (data[p] - floor) / span
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t
  png.data[p * 4] = Math.round(clamped * 255)
  png.data[p * 4 + 1] = png.data[p * 4]
  png.data[p * 4 + 2] = png.data[p * 4]
  png.data[p * 4 + 3] = 255
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, PNG.sync.write(png, { colorType: 0 }))

console.warn(
  `wrote ${outPath} — ${width}×${height}, black=${floor} m, white=${ceiling} m ` +
    `(DEM range ${meta.min}…${meta.max} m)`
)
