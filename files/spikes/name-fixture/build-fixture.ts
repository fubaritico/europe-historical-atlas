/**
 * Freeze nine countries of 1100 as the names' fixture (ATLAS-301, « The gap to the reference », 29/10): the owner grid
 * the atlas places the names on, built here the way the atlas builds it, cropped around each country with its
 * neighbours, and written run-length encoded into `packages/core/src/pipeline/testing/names1100.json`.
 *
 * Run from the repository root: `packages/core/node_modules/.bin/tsx files/spikes/name-fixture/build-fixture.ts`
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { rasteriseRegions } from '../../../packages/core/src/data/regionRaster'
import { projectRegions } from '../../../packages/core/src/data/regionSource'
import { toRegionPayload } from '../../../packages/core/src/data/toRegionPayload'
import { assembleAuthoredYear } from '../../../packages/core/src/data/yearConsistency'
import { homageLevels } from '../../../packages/core/src/editor/homageLevels'
import { bearersByLevel } from '../../../packages/core/src/editor/regionBearers'
import { ownerGrid } from '../../../packages/core/src/pipeline/ownerGrid'
import { NAME_GRID_WIDTH as GRID_WIDTH } from '../../../packages/core/src/pipeline/yearNames'

/** The repository's root, from this file. */
const ROOT = resolve(import.meta.dirname, '../../..')

/** How many cells of neighbours each crop keeps around its country. */
const PAD = 30

/** The shapes, and the level each is cut at: 0 the sovereigns, 1 their direct vassals shown. */
const TARGETS: readonly { readonly id: string; readonly level: number; readonly why: string }[] = [
  { id: 'empire-of-the-romans', level: 0, why: 'a crescent round a sea' },
  { id: 'cumans', level: 0, why: 'wide' },
  { id: 'kingdom-of-the-franks', level: 0, why: 'compact' },
  { id: 'kingdom-of-norway', level: 0, why: 'long, standing' },
  { id: 'kingdom-of-hungary', level: 0, why: 'a basin' },
  { id: 'duchy-of-brittany', level: 1, why: 'a small duchy' },
  // The dev's three of 29/10, afternoon: compact, written straight across and small.
  { id: 'roman-empire', level: 0, why: 'compact, wide' },
  { id: 'kingdom-of-england', level: 0, why: 'compact, standing' },
  { id: 'republic-of-novgorod', level: 0, why: 'compact, lakes inside' },
]

/**
 * Read a JSON file of the repository.
 * @param path - from the root
 * @returns its content
 */
function json(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
}

/**
 * A row-major grid as runs: `[value, count, value, count, …]`.
 * @param values - the grid
 * @returns its runs
 */
function runs(values: readonly number[]): number[] {
  const out: number[] = []
  for (const value of values) {
    const last = out.length - 2
    if (last >= 0 && out[last] === value) out[last + 1] = (out[last + 1] ?? 0) + 1
    else out.push(value, 1)
  }
  return out
}

const manifest = json('packages/atlas/public/years/index.json') as {
  bbox: Parameters<typeof toRegionPayload>[1]
}
const relief = json('packages/atlas/public/heightmaps/europe-dem-z6-1920.json') as {
  width: number
  height: number
}
const files = {
  registry: json('packages/atlas/public/years/1100/registry.json'),
  polities: json('packages/atlas/public/years/1100/polities.json'),
  borders: json('packages/atlas/public/years/1100/borders.json'),
} as Parameters<typeof assembleAuthoredYear>[0]
const authored = assembleAuthoredYear(files, '1100')
const { regions } = projectRegions(toRegionPayload(authored, manifest.bbox))
const gridHeight = Math.round((GRID_WIDTH * relief.height) / relief.width)
const { cells } = rasteriseRegions(regions, GRID_WIDTH, gridHeight)
const levels = bearersByLevel(
  regions.map(({ polityId }) => {
    if (polityId === undefined) throw new Error('a region with no polity')
    return polityId
  }),
  homageLevels(authored.registry.polities)
)
const nameOf = new Map(authored.registry.polities.map(({ id, name }) => [id, name]))

const shapes = TARGETS.map(({ id, level, why }) => {
  const bearers = levels[level]
  if (bearers === undefined) throw new Error(`no level ${String(level)}`)
  const { owners, ids } = ownerGrid(cells, bearers)
  const target = ids.indexOf(id)
  if (target < 0) throw new Error(`${id} owns no cell at level ${String(level)}`)
  // The country's frame, and its neighbours around it.
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity]
  owners.forEach((owner, at) => {
    if (owner !== target) return
    const [x, y] = [at % GRID_WIDTH, Math.floor(at / GRID_WIDTH)]
    left = Math.min(left, x)
    right = Math.max(right, x)
    top = Math.min(top, y)
    bottom = Math.max(bottom, y)
  })
  left = Math.max(0, left - PAD)
  top = Math.max(0, top - PAD)
  right = Math.min(GRID_WIDTH - 1, right + PAD)
  bottom = Math.min(gridHeight - 1, bottom + PAD)
  const width = right - left + 1
  const height = bottom - top + 1
  // The country is owner 0; each neighbour a number of its own, in order of meeting; nobody's ground -1.
  const renumbered = new Map<number, number>([[target, 0]])
  const neighbours: string[] = []
  const grid: number[] = []
  for (let y = top; y <= bottom; y += 1)
    for (let x = left; x <= right; x += 1) {
      const owner = owners[y * GRID_WIDTH + x] ?? -1
      if (owner < 0) {
        grid.push(-1)
        continue
      }
      let local = renumbered.get(owner)
      if (local === undefined) {
        local = renumbered.size
        renumbered.set(owner, local)
        neighbours.push(ids[owner] ?? '?')
      }
      grid.push(local)
    }
  return { id, name: nameOf.get(id) ?? id, level, why, width, height, neighbours, runs: runs(grid) }
})

const out = resolve(ROOT, 'packages/core/src/pipeline/testing/names1100.json')
writeFileSync(out, `${JSON.stringify({ year: 1100, gridWidth: GRID_WIDTH, shapes })}\n`)
for (const { id, width, height, runs: encoded } of shapes)
  console.warn(`${id}: ${String(width)} × ${String(height)}, ${String(encoded.length / 2)} runs`)
