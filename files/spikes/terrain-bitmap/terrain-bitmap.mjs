#!/usr/bin/env node
/**
 * Bake the atlas's painted terrain texture to a PNG, outside the browser.
 *
 * This is the image the atlas lays on the relief — parchment, hypsometric tint, hillshade and vellum
 * grain — not the greyscale DEM that `dem-to-bitmap` produces. It exists so the Cartographer's interface
 * can be designed **over the real backdrop**: the polity palette runs from gold to slate blue over a
 * parchment ground, and a panel colour that disappears against it is obvious on sight and invisible in a
 * description.
 *
 * It runs in Node because `pipeline/composeTerrainRgba` is pure — no DOM, no three.js, enforced by the
 * ESLint boundary on that layer. The TypeScript is loaded through Vite's own Node API, so there is no
 * build step and no extra dependency.
 *
 * The political tint is left out on purpose: the Cartographer's default backdrop is the terrain with no
 * polity colours on it.
 *
 * Usage:
 *   node files/spikes/terrain-bitmap/terrain-bitmap.mjs \
 *     [--supersample 2] \
 *     [--out files/spikes/terrain-bitmap/out/europe-terrain.png]
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { PNG } from 'pngjs'
import { createServer } from 'vite'

import { accumulatePolyline, compositeCoverage, parseHexColor } from './rasterise-lines.mjs'

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
const root = resolve(import.meta.dirname, '../../..')
const outPath = resolve(root, args.out ?? 'files/spikes/terrain-bitmap/out/europe-terrain.png')

// Vite as a module loader: it resolves the project's TypeScript exactly as the app does, so this spike
// exercises the real compositor rather than a copy of it that could drift.
const server = await createServer({
  root,
  configFile: false,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'error',
  // Without this, Vite crawls `opensrc/` — the vendored three.js source, with hundreds of examples
  // importing packages this project does not have — and prints a wall of "are they installed?".
  optimizeDeps: { noDiscovery: true, include: [] },
})

const { createHeightmap } = await server.ssrLoadModule('/src/data/heightmap.ts')
const { createPackedLandMask, parseLandMaskMeta } = await server.ssrLoadModule('/src/data/landMask.ts')
const { composeTerrainRgba, terrainTextureSize, DEFAULT_TERRAIN_OPTIONS } = await server.ssrLoadModule(
  '/src/pipeline/terrainCompose.ts'
)
const { projectRivers, parseRiverPayload, extendRiversToSea, DEFAULT_RIVER_EXTENSION } =
  await server.ssrLoadModule('/src/data/riverSource.ts')
const { DEFAULT_RIVER_PARAMS } = await server.ssrLoadModule('/src/devParams/river.ts')

/**
 * Read a binary asset and its JSON sidecar.
 * @param {string} base - path without extension, relative to the repo root
 * @returns {{ meta: unknown, raw: Buffer }} the parsed sidecar and the raw bytes
 */
function readAsset(base) {
  return {
    meta: JSON.parse(readFileSync(resolve(root, `${base}.json`), 'utf8')),
    raw: readFileSync(resolve(root, `${base}.bin`)),
  }
}

const dem = readAsset('public/heightmaps/europe-dem-z5')
const demData = new Int16Array(dem.raw.buffer, dem.raw.byteOffset, dem.raw.byteLength / 2)
if (demData.length !== dem.meta.width * dem.meta.height) {
  throw new Error(`DEM size mismatch: ${demData.length} samples for ${dem.meta.width}×${dem.meta.height}`)
}
const heightmap = createHeightmap(dem.meta, demData)

const land = readAsset('public/masks/europe-land')
const maskMeta = parseLandMaskMeta(land.meta, 'public/masks/europe-land.json')
const maskBits = new Uint8Array(land.raw.buffer, land.raw.byteOffset, land.raw.byteLength)
const landMask = createPackedLandMask(maskMeta, maskBits)

// The defaults are the atlas's own, dev-tuned and baked into the source — so with no flag this writes
// exactly the image on screen. `--supersample` is an override for when a larger print is wanted, and it
// is the only setting that changes the pixels' resolution rather than their colour.
const supersample =
  args.supersample !== undefined ? Number(args.supersample) : DEFAULT_TERRAIN_OPTIONS.supersample
if (!Number.isInteger(supersample) || supersample < 1 || supersample > 4) {
  throw new Error(`--supersample must be an integer in 1…4, got ${String(args.supersample)}`)
}

const options = { ...DEFAULT_TERRAIN_OPTIONS, supersample }
const { width, height } = terrainTextureSize(heightmap, options)

const started = Date.now()
const rgba = composeTerrainRgba(heightmap, options, landMask)
const elapsed = Date.now() - started

// ---- rivers -------------------------------------------------------------------------------------
// They are not in the texture: the atlas draws them as 3D lines over it. Here they are rasterised, in
// the same normalized (u, v) space the compositor works in, so no projection is involved.

const drawRivers = args.rivers !== 'off'
let riverCount = 0

if (drawRivers) {
  const payload = parseRiverPayload(
    JSON.parse(readFileSync(resolve(root, 'public/rivers/europe-rivers.json'), 'utf8')),
    'public/rivers/europe-rivers.json'
  )
  const loaded = projectRivers(payload)
  // The dataset stops at the estuary head, so the atlas bridges the mouths; doing the same here keeps
  // the two images identical rather than merely similar.
  const rivers = extendRiversToSea(loaded, landMask, DEFAULT_RIVER_EXTENSION)

  const maxRank = args['max-rank'] !== undefined ? Number(args['max-rank']) : 9
  // Stroke widths are declared in CSS pixels on screen, so they only mean something against a display
  // width. Scale them to this image's, or a 2560 px PNG shows hairlines where the atlas shows strokes.
  const referenceWidth = args['reference-width'] !== undefined ? Number(args['reference-width']) : 1440
  const widthScale = width / referenceWidth

  // One coverage buffer for every river: the ink and the opacity are the same for all of them, so a
  // single maximum-then-blend pass draws crossings and confluences without darkening them.
  const coverage = new Float32Array(width * height)

  for (const river of rivers) {
    if (river.rank > maxRank) continue
    if (!DEFAULT_RIVER_PARAMS.includeLakeCenterlines && river.kind !== 'River') continue
    // Rank 1 is a major river, rank 9 the finest tributary; the atlas interpolates the width between
    // the two declared ends rather than giving each rank its own number.
    const t = Math.max(0, Math.min(1, (river.rank - 1) / 8))
    const strokeWidth =
      (DEFAULT_RIVER_PARAMS.widthMajor +
        t * (DEFAULT_RIVER_PARAMS.widthMinor - DEFAULT_RIVER_PARAMS.widthMajor)) *
      widthScale
    const points = river.points.map((p) => ({ x: p.u * (width - 1), y: p.v * (height - 1) }))
    accumulatePolyline(coverage, width, height, points, strokeWidth)
    riverCount += 1
  }

  compositeCoverage(rgba, coverage, parseHexColor(DEFAULT_RIVER_PARAMS.color), DEFAULT_RIVER_PARAMS.opacity)
}

const png = new PNG({ width, height })
png.data.set(rgba)

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, PNG.sync.write(png))

await server.close()

const km = ((dem.meta.bbox.east - dem.meta.bbox.west) * 111) / width
console.warn(
  `wrote ${outPath} — ${width}×${height}, supersample ${supersample}, ` +
    `~${km.toFixed(1)} km/px at the equator, composed in ${elapsed} ms` +
    (drawRivers ? `, ${riverCount} rivers drawn` : ', no rivers')
)
