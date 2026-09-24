/**
 * Spike: fetch-dem — source a georeferenced heightmap of Europe programmatically.
 *
 * Downloads Terrarium terrain tiles (AWS Open Data, no API key), decodes the RGB-encoded
 * elevation, stitches them into one grayscale heightmap PNG, and reports the exact geographic
 * bounds covered. Purpose: get a georeferenced relief (known CRS = Web Mercator) so historical
 * GeoJSON can later overlay it, and compare its quality to `files/resources/blender/europeelevation.png`.
 *
 * Terrarium encoding:  elevation_metres = (R * 256 + G + B / 256) - 32768
 * Tile URL:            https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
 * Projection:          Web Mercator (standard XYZ / slippy-map tiles)
 *
 * Usage (from repo root):
 *   node files/spikes/fetch-dem/fetch-dem.mjs [--zoom 5] [--west -25] [--south 34] [--east 45] [--north 72]
 *
 * Output: files/spikes/fetch-dem/out/europe-dem-z<zoom>.png (+ prints stats & covered bounds).
 */
import { PNG } from 'pngjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TILE_SIZE = 256
const TILE_BASE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const CONCURRENCY = 12
const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * Parse `--key value` CLI pairs into an object.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Record<string, string>} parsed flags
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]
    if (key?.startsWith('--')) out[key.slice(2)] = argv[i + 1] ?? ''
  }
  return out
}

/**
 * Fractional Web-Mercator tile X for a longitude.
 * @param {number} lon - longitude in degrees
 * @param {number} n - number of tiles per axis (2^zoom)
 * @returns {number} fractional tile X
 */
function lonToTileX(lon, n) {
  return ((lon + 180) / 360) * n
}

/**
 * Fractional Web-Mercator tile Y for a latitude.
 * @param {number} lat - latitude in degrees
 * @param {number} n - number of tiles per axis (2^zoom)
 * @returns {number} fractional tile Y
 */
function latToTileY(lat, n) {
  const rad = (lat * Math.PI) / 180
  return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * n
}

/**
 * Longitude of a tile's left edge.
 * @param {number} x - tile X
 * @param {number} n - tiles per axis
 * @returns {number} longitude in degrees
 */
function tileXToLon(x, n) {
  return (x / n) * 360 - 180
}

/**
 * Latitude of a tile's top edge.
 * @param {number} y - tile Y
 * @param {number} n - tiles per axis
 * @returns {number} latitude in degrees
 */
function tileYToLat(y, n) {
  return (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI
}

/**
 * Fetch and decode one Terrarium tile. Returns null on failure (treated as sea).
 * @param {number} z - zoom
 * @param {number} x - tile X
 * @param {number} y - tile Y
 * @returns {Promise<{ data: Buffer } | null>} decoded PNG or null
 */
async function fetchTile(z, x, y) {
  const url = `${TILE_BASE}/${z}/${x}/${y}.png`
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      return PNG.sync.read(buf)
    } catch (err) {
      if (attempt === 1) {
        console.error(`  tile ${z}/${x}/${y} failed: ${String(err)}`)
        return null
      }
    }
  }
  return null
}

/**
 * Run async tasks with a bounded concurrency pool.
 * @param {Array<() => Promise<void>>} tasks - task thunks
 * @param {number} limit - max concurrent
 * @returns {Promise<void>} resolves when all done
 */
async function runPool(tasks, limit) {
  let next = 0
  /** @returns {Promise<void>} worker loop */
  async function worker() {
    while (next < tasks.length) {
      const i = next++
      await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
}

/**
 * Box-average downsample a grid to a target width (aspect preserved). Returns the source unchanged when
 * `targetWidth` is 0 or already ≥ the source width.
 * @param {Float32Array} src - source grid, row-major
 * @param {number} w - source width
 * @param {number} h - source height
 * @param {number} targetWidth - desired width (0 = no downsample)
 * @returns {{ data: Float32Array, width: number, height: number }} the (possibly) downsampled grid
 */
function downsample(src, w, h, targetWidth) {
  if (!targetWidth || targetWidth >= w) return { data: src, width: w, height: h }
  const scale = w / targetWidth
  const gw = targetWidth
  const gh = Math.max(1, Math.round(h / scale))
  const out = new Float32Array(gw * gh)
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const sx0 = Math.floor(x * scale)
      const sx1 = Math.min(w, Math.floor((x + 1) * scale))
      const sy0 = Math.floor(y * scale)
      const sy1 = Math.min(h, Math.floor((y + 1) * scale))
      let sum = 0
      let count = 0
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          sum += src[sy * w + sx]
          count++
        }
      }
      out[y * gw + x] = count ? sum / count : 0
    }
  }
  return { data: out, width: gw, height: gh }
}

/** Entry point. @returns {Promise<void>} */
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const zoom = Number(args.zoom ?? 5)
  const west = Number(args.west ?? -25)
  const south = Number(args.south ?? 34)
  const east = Number(args.east ?? 45)
  const north = Number(args.north ?? 72)
  // Tone curve for land: g = (elev/maxLand)^gamma. < 1 lifts the lowlands (Europe is mostly plains,
  // so a raw linear stretch crushes them to near-black). 1 = linear.
  const gamma = Number(args.gamma ?? 0.45)
  // Geometry grid target width (px). The raw Int16 elevation grid consumed by the app is downsampled to
  // this width (aspect preserved) to keep the asset light. 0 = keep native tile resolution.
  const grid = Number(args.grid ?? 1024)
  const n = 2 ** zoom

  const xMin = Math.max(0, Math.floor(lonToTileX(west, n)))
  const xMax = Math.min(n - 1, Math.floor(lonToTileX(east, n)))
  const yMin = Math.max(0, Math.floor(latToTileY(north, n)))
  const yMax = Math.min(n - 1, Math.floor(latToTileY(south, n)))
  const cols = xMax - xMin + 1
  const rows = yMax - yMin + 1
  const width = cols * TILE_SIZE
  const height = rows * TILE_SIZE

  console.warn(
    `fetch-dem: zoom ${zoom}, bbox W${west}/S${south}/E${east}/N${north} → ` +
      `tiles x[${xMin}..${xMax}] y[${yMin}..${yMax}] = ${cols * rows} tiles, ${width}×${height}px`,
  )

  const elev = new Float32Array(width * height)
  let done = 0
  const tasks = []
  for (let ty = yMin; ty <= yMax; ty++) {
    for (let tx = xMin; tx <= xMax; tx++) {
      tasks.push(async () => {
        const png = await fetchTile(zoom, tx, ty)
        const ox = (tx - xMin) * TILE_SIZE
        const oy = (ty - yMin) * TILE_SIZE
        for (let py = 0; py < TILE_SIZE; py++) {
          for (let px = 0; px < TILE_SIZE; px++) {
            let m = -32768
            if (png) {
              const i = (py * TILE_SIZE + px) * 4
              m = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768
            }
            elev[(oy + py) * width + (ox + px)] = m
          }
        }
        if (++done % 10 === 0 || done === tasks.length) console.warn(`  ${done}/${tasks.length} tiles`)
      })
    }
  }
  await runPool(tasks, CONCURRENCY)

  // Stats + normalization (sea = elevation <= 0 → black; land linear 0..maxLand → 1..255).
  let min = Infinity
  let max = -Infinity
  let maxLand = 0
  for (let i = 0; i < elev.length; i++) {
    const m = elev[i]
    if (m < min) min = m
    if (m > max) max = m
    if (m > 0 && m > maxLand) maxLand = m
  }

  const out = new PNG({ width, height })
  for (let i = 0; i < elev.length; i++) {
    const m = elev[i]
    const g = m <= 0 ? 0 : Math.max(1, Math.min(255, Math.round(Math.pow(m / maxLand, gamma) * 255)))
    const j = i * 4
    out.data[j] = g
    out.data[j + 1] = g
    out.data[j + 2] = g
    out.data[j + 3] = 255
  }

  const outPath = resolve(HERE, 'out', `europe-dem-z${zoom}-g${gamma}.png`)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, PNG.sync.write(out))

  const bW = tileXToLon(xMin, n)
  const bE = tileXToLon(xMax + 1, n)
  const bN = tileYToLat(yMin, n)
  const bS = tileYToLat(yMax + 1, n)

  // Raw elevation grid for the app — real metres, Int16 little-endian (the geometry source, no banding).
  const ds = downsample(elev, width, height, grid)
  const int16 = new Int16Array(ds.data.length)
  for (let i = 0; i < ds.data.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, Math.round(ds.data[i])))
  }
  const publicDir = resolve(HERE, '../../../public/heightmaps')
  await mkdir(publicDir, { recursive: true })
  const binPath = resolve(publicDir, `europe-dem-z${zoom}.bin`)
  const metaPath = resolve(publicDir, `europe-dem-z${zoom}.json`)
  await writeFile(binPath, Buffer.from(int16.buffer, int16.byteOffset, int16.byteLength))
  await writeFile(
    metaPath,
    JSON.stringify(
      {
        width: ds.width,
        height: ds.height,
        zoom,
        bbox: { west: bW, south: bS, east: bE, north: bN },
        min,
        max,
        encoding: 'int16-le-metres',
      },
      null,
      2,
    ),
  )

  console.warn(`elevation min ${min.toFixed(0)}m / max ${max.toFixed(0)}m (land max ${maxLand.toFixed(0)}m)`)
  console.warn(`grid ${ds.width}×${ds.height} → ${binPath} (${(int16.byteLength / 1e6).toFixed(2)} MB) + ${metaPath}`)
  console.warn(`covered bounds (Web Mercator, tile-aligned): W ${bW.toFixed(3)} / S ${bS.toFixed(3)} / E ${bE.toFixed(3)} / N ${bN.toFixed(3)}`)
  console.warn(`wrote ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
