/**
 * Render the *emitted* SVG path back to ASCII, by parsing it and filling it even-odd.
 *
 * The generator's preview shows the grid it traced from; this shows what actually came out the other end,
 * after chaining and simplification. Shipping 13 kB of coordinates nobody has ever seen drawn is how a
 * chaining bug reaches a user as a smear.
 *
 * Usage: node files/spikes/europe-silhouette/verify.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Read the generated module as text rather than importing it: it is TypeScript, and this tool must stay
// runnable with a bare `node` and no build step.
const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/ui/europeSilhouette.ts'),
  'utf8'
)
const read = (name) => {
  const match = new RegExp(`${name} =\\s*'?([^'\\n]*)'?`).exec(source)
  if (!match) throw new Error(`could not read ${name}`)
  return match[1]
}
const EUROPE_SILHOUETTE_WIDTH = Number(read('EUROPE_SILHOUETTE_WIDTH'))
const EUROPE_SILHOUETTE_HEIGHT = Number(read('EUROPE_SILHOUETTE_HEIGHT'))
const EUROPE_SILHOUETTE_PATH = read('EUROPE_SILHOUETTE_PATH')

const rings = EUROPE_SILHOUETTE_PATH.split('M')
  .filter((part) => part.length > 0)
  .map((part) =>
    part
      .replace(/Z$/, '')
      .split('L')
      .map((pair) => pair.trim().split(/\s+/).map(Number))
  )

const cols = 100
const rows = Math.round((cols * EUROPE_SILHOUETTE_HEIGHT) / EUROPE_SILHOUETTE_WIDTH / 2)
let bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
for (const ring of rings)
  for (const [x, y] of ring) {
    bounds = {
      minX: Math.min(bounds.minX, x),
      minY: Math.min(bounds.minY, y),
      maxX: Math.max(bounds.maxX, x),
      maxY: Math.max(bounds.maxY, y),
    }
  }

/** Even-odd crossing count at a point — the same rule the SVG `fill-rule` will apply. */
const inside = (px, py) => {
  let crossings = 0
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i]
      const [bx, by] = ring[(i + 1) % ring.length]
      if (ay > py !== by > py && px < ax + ((py - ay) / (by - ay)) * (bx - ax)) crossings++
    }
  }
  return crossings % 2 === 1
}

let out = ''
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    out += inside(
      ((c + 0.5) * EUROPE_SILHOUETTE_WIDTH) / cols,
      ((r + 0.5) * EUROPE_SILHOUETTE_HEIGHT) / rows
    )
      ? '#'
      : '.'
  }
  out += '\n'
}
process.stdout.write(out)
process.stdout.write(
  `${String(rings.length)} subpaths · bounds x ${bounds.minX.toFixed(1)}..${bounds.maxX.toFixed(1)} ` +
    `y ${bounds.minY.toFixed(1)}..${bounds.maxY.toFixed(1)} of ${String(EUROPE_SILHOUETTE_WIDTH)}x${String(EUROPE_SILHOUETTE_HEIGHT)}\n`
)
