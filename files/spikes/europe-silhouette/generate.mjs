/**
 * Generate the splash-screen silhouette of Europe from the project's own land mask.
 *
 * The splash has to be on screen *before* anything is fetched, so it cannot read the mask at runtime —
 * the mask is precisely what it is waiting for. The outline is therefore traced once, here, and inlined
 * as an SVG path. Tracing it from `public/masks/europe-land.bin` rather than drawing one by hand is what
 * keeps the silhouette and the map that replaces it the same Europe.
 *
 * Usage: node files/spikes/europe-silhouette/generate.mjs [--ascii]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')

const MASK_BIN = resolve(repo, 'public/masks/europe-land.bin')
const MASK_JSON = resolve(repo, 'public/masks/europe-land.json')
const OUT_TS = resolve(repo, 'src/ui/europeSilhouette.ts')

/** The geographic window the silhouette shows. Europe as a reader pictures it, not the DEM's full frame. */
const CROP = { west: -11, east: 45, north: 68, south: 35.5 }

/** Target width of the traced grid. The silhouette is drawn ~300 px wide; tracing finer buys nothing. */
const GRID_WIDTH = 420

/** Rings smaller than this share of the grid are dropped — islets that read as dirt at 300 px. */
const MIN_RING_AREA_FRACTION = 0.00012

/** Douglas–Peucker tolerance, in grid cells. */
const SIMPLIFY_TOLERANCE = 1.2

/** Width of the emitted viewBox; the height follows from the crop's aspect. */
const VIEW_WIDTH = 300

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI
const MERCATOR_MAX_LATITUDE = 85.05112878

/** Project a latitude to Web Mercator `y` — the same formula as `src/geo/mercator.ts`. */
const latitudeToMercatorY = (lat) => {
  const clamped = Math.min(MERCATOR_MAX_LATITUDE, Math.max(-MERCATOR_MAX_LATITUDE, lat))
  return Math.log(Math.tan(Math.PI / 4 + (clamped * DEG2RAD) / 2))
}

/** Unproject a Web Mercator `y` back to a latitude. */
const mercatorYToLatitude = (y) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * RAD2DEG

/** Normalized vertical coordinate of a latitude within the given bounds (0 = north edge). */
const latitudeToVertical = (lat, bounds) => {
  const northY = latitudeToMercatorY(bounds.north)
  const southY = latitudeToMercatorY(bounds.south)
  return (latitudeToMercatorY(lat) - northY) / (southY - northY)
}

const meta = JSON.parse(readFileSync(MASK_JSON, 'utf8'))
const bits = new Uint8Array(readFileSync(MASK_BIN))

/** Whether a mask cell is land. */
const maskAt = (col, row) => {
  if (col < 0 || row < 0 || col >= meta.width || row >= meta.height) return false
  const index = row * meta.width + col
  return ((bits[index >> 3] ?? 0) >> (7 - (index & 7))) % 2 === 1
}

// The crop, in the mask's own pixel space. Horizontal is linear in longitude; vertical is not.
const x0 = ((CROP.west - meta.bbox.west) / (meta.bbox.east - meta.bbox.west)) * (meta.width - 1)
const x1 = ((CROP.east - meta.bbox.west) / (meta.bbox.east - meta.bbox.west)) * (meta.width - 1)
const y0 = latitudeToVertical(CROP.north, meta.bbox) * (meta.height - 1)
const y1 = latitudeToVertical(CROP.south, meta.bbox) * (meta.height - 1)

const gridWidth = GRID_WIDTH
const gridHeight = Math.max(1, Math.round((GRID_WIDTH * (y1 - y0)) / (x1 - x0)))

// Downsample by majority vote over each output cell's footprint, so a coastline one mask-cell wide does
// not vanish or spread depending on where the sample happened to land.
const land = new Uint8Array(gridWidth * gridHeight)
for (let row = 0; row < gridHeight; row++) {
  const sy0 = y0 + ((y1 - y0) * row) / gridHeight
  const sy1 = y0 + ((y1 - y0) * (row + 1)) / gridHeight
  for (let col = 0; col < gridWidth; col++) {
    const sx0 = x0 + ((x1 - x0) * col) / gridWidth
    const sx1 = x0 + ((x1 - x0) * (col + 1)) / gridWidth
    let hits = 0
    let total = 0
    for (let y = Math.floor(sy0); y <= Math.floor(sy1); y++) {
      for (let x = Math.floor(sx0); x <= Math.floor(sx1); x++) {
        total++
        if (maskAt(x, y)) hits++
      }
    }
    land[row * gridWidth + col] = total > 0 && hits * 2 >= total ? 1 : 0
  }
}

if (process.argv.includes('--ascii')) {
  // A look before committing to a path: if this does not read as Europe, the crop is wrong.
  const cols = 100
  const rows = Math.round((cols * gridHeight) / gridWidth / 2)
  let out = ''
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gx = Math.floor((c * gridWidth) / cols)
      const gy = Math.floor((r * gridHeight) / rows)
      out += land[gy * gridWidth + gx] ? '#' : '.'
    }
    out += '\n'
  }
  process.stdout.write(out)
  process.stdout.write(`grid ${gridWidth}x${gridHeight}\n`)
  process.exit(0)
}

/** Land test on the traced grid, with everything outside counting as sea. */
const at = (col, row) =>
  col >= 0 && row >= 0 && col < gridWidth && row < gridHeight && land[row * gridWidth + col] === 1

// Trace every boundary between a land cell and a sea cell as an edge on the integer lattice of cell
// corners, then chain the edges into closed rings. Corners are exact integers, so ends meet without an
// epsilon — the same reasoning the political border extraction uses.
const key = (x, y) => `${x},${y}`
const edges = new Map()
/** Record a directed edge, keeping land on its left so rings come out consistently wound. */
const addEdge = (ax, ay, bx, by) => {
  const from = key(ax, ay)
  const list = edges.get(from)
  if (list) list.push([bx, by])
  else edges.set(from, [[bx, by]])
}

for (let row = 0; row < gridHeight; row++) {
  for (let col = 0; col < gridWidth; col++) {
    if (!at(col, row)) continue
    if (!at(col, row - 1)) addEdge(col, row, col + 1, row) // north edge, running east
    if (!at(col + 1, row)) addEdge(col + 1, row, col + 1, row + 1) // east edge, running south
    if (!at(col, row + 1)) addEdge(col + 1, row + 1, col, row + 1) // south edge, running west
    if (!at(col - 1, row)) addEdge(col, row + 1, col, row) // west edge, running north
  }
}

const rings = []
while (edges.size > 0) {
  const [startKey] = edges.keys()
  const start = startKey.split(',').map(Number)
  const ring = [start]
  let current = start
  for (;;) {
    const list = edges.get(key(current[0], current[1]))
    if (!list || list.length === 0) break
    const next = list.pop()
    if (list.length === 0) edges.delete(key(current[0], current[1]))
    ring.push(next)
    current = next
    if (next[0] === start[0] && next[1] === start[1]) break
  }
  if (ring.length > 3) rings.push(ring)
}

/** Twice the signed area of a ring — used to size it and to tell outlines from holes. */
const signedArea2 = (ring) => {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return sum
}

/** Perpendicular distance from `p` to the segment `a`–`b`. */
const pointToSegment = (p, a, b) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Douglas–Peucker, iterative so a long coastline cannot blow the stack. */
const simplify = (points, tolerance) => {
  if (points.length < 3) return points
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    let worst = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const distance = pointToSegment(points[i], points[first], points[last])
      if (distance > worst) {
        worst = distance
        index = i
      }
    }
    if (index >= 0 && worst > tolerance) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i] === 1)
}

const minArea = MIN_RING_AREA_FRACTION * gridWidth * gridHeight * 2
const kept = rings
  .filter((ring) => Math.abs(signedArea2(ring)) >= minArea)
  .map((ring) => simplify(ring, SIMPLIFY_TOLERANCE))
  .filter((ring) => ring.length > 3)

const viewHeight = Math.round((VIEW_WIDTH * gridHeight) / gridWidth)
const sx = VIEW_WIDTH / gridWidth
const sy = viewHeight / gridHeight
const round = (n) => Math.round(n * 10) / 10

const path = kept
  .map((ring) => {
    const points = ring.map(([x, y]) => `${round(x * sx)} ${round(y * sy)}`)
    return `M${points[0]}L${points.slice(1).join('L')}Z`
  })
  .join('')

const file = `/**
 * The silhouette of Europe shown while the map loads, as an SVG path.
 *
 * Traced from this project's own land mask (\`public/masks/europe-land.bin\`, Natural Earth 10m land minus
 * lakes) by \`files/spikes/europe-silhouette/generate.mjs\` — not drawn by hand, and not taken from
 * elsewhere, so the shape a reader sees first is the shape the map arrives as.
 *
 * It is inlined rather than fetched on purpose: the splash has to be on screen *before* anything is
 * loaded, and the mask is precisely what it is waiting for.
 *
 * Generated file — edit the generator, not this.
 */

/** Width of the coordinate system the path is drawn in. */
export const EUROPE_SILHOUETTE_WIDTH = ${VIEW_WIDTH}

/** Height of that coordinate system, following the crop's aspect in Web Mercator. */
export const EUROPE_SILHOUETTE_HEIGHT = ${viewHeight}

/** The outline itself: one closed subpath per landmass, filled solid with an even-odd rule. */
export const EUROPE_SILHOUETTE_PATH =
  '${path}'
`

writeFileSync(OUT_TS, file)
process.stdout.write(
  `grid ${gridWidth}x${gridHeight} · ${String(rings.length)} rings traced, ${String(kept.length)} kept · ` +
    `path ${String(path.length)} chars → ${OUT_TS}\n`
)
