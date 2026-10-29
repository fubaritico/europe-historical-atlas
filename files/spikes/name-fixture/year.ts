/**
 * Place every name of 1100, at every level, as the atlas does, and write each one's text, size, slant and run to a JSON
 * file — so two versions of the construction can be compared name by name over the whole year, and a change made for
 * three countries shows what it does to the hundred others (ATLAS-301, 29/10: « pas d'effet de bord »).
 *
 * Run from the repository root: `packages/core/node_modules/.bin/tsx files/spikes/name-fixture/year.ts <out.json>`
 * Compare two runs: `packages/core/node_modules/.bin/tsx files/spikes/name-fixture/year.ts --diff <a.json> <b.json>`
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { projectRegions } from '../../../packages/core/src/data/regionSource'
import { toRegionPayload } from '../../../packages/core/src/data/toRegionPayload'
import { assembleAuthoredYear } from '../../../packages/core/src/data/yearConsistency'
import { homageLevels } from '../../../packages/core/src/editor/homageLevels'
import { bearersByLevel } from '../../../packages/core/src/editor/regionBearers'
import { DEFAULT_NAME_PLACEMENT } from '../../../packages/core/src/pipeline/namePlacement'
import { untitledName } from '../../../packages/core/src/pipeline/nameTitle'
import { NAME_GRID_WIDTH, placeYearNames } from '../../../packages/core/src/pipeline/yearNames'

import type { GlyphMetric } from '../../../packages/core/src/pipeline/yearNames'

/** The repository's root, from this file. */
const ROOT = resolve(import.meta.dirname, '../../..')

/** One name, as compared. */
interface Row {
  readonly key: string
  readonly text: string
  readonly size: number
  readonly slant: number
  readonly run: number
}

/**
 * Read a JSON file of the repository.
 * @param path - from the root
 * @returns its content
 */
function json(path: string): unknown {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
}

/**
 * Place the year and describe each name.
 * @returns every name of every level
 */
function place(): Row[] {
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
  const polities = authored.registry.polities
  const levels = bearersByLevel(
    regions.map(({ polityId }) => {
      if (polityId === undefined) throw new Error('a region with no polity')
      return polityId
    }),
    homageLevels(polities)
  )
  const texts = polities.flatMap(({ name }) => [name, untitledName(name)]).join('')
  const glyphs: Record<string, GlyphMetric> = {}
  for (const char of texts) glyphs[char] = { advance: 0.55, ascent: 0.72, descent: 0.22 }
  const names = placeYearNames({
    regions,
    bearersByLevel: levels,
    names: Object.fromEntries(polities.map(({ id, name }) => [id, untitledName(name)])),
    fullNames: Object.fromEntries(polities.map(({ id, name }) => [id, name])),
    glyphs,
    gridWidth: NAME_GRID_WIDTH,
    gridHeight: Math.round((NAME_GRID_WIDTH * relief.height) / relief.width),
    options: DEFAULT_NAME_PLACEMENT,
  })
  return names.levels.flatMap(({ placed }, level) =>
    placed.map(({ polity, piece, text, size, glyphs: letters }) => {
      const [first, last] = [letters[0], letters.at(-1)]
      const slant =
        first === undefined || last === undefined
          ? 0
          : (Math.atan2(last.y - first.y, last.x - first.x) * 180) / Math.PI
      const run = first === undefined || last === undefined ? 0 : Math.hypot(last.x - first.x, last.y - first.y)
      return {
        key: `${String(level)} ${polity} #${String(piece)}`,
        text,
        size: Number(size.toFixed(1)),
        slant: Math.round(slant),
        run: Math.round(run),
      }
    })
  )
}

/**
 * Print what changed between two runs.
 * @param before - the first run's file
 * @param after - the second's
 */
function diff(before: string, after: string): void {
  const a = new Map((JSON.parse(readFileSync(before, 'utf8')) as Row[]).map((row) => [row.key, row]))
  const b = new Map((JSON.parse(readFileSync(after, 'utf8')) as Row[]).map((row) => [row.key, row]))
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort()
  const changed = keys.flatMap((key) => {
    const [x, y] = [a.get(key), b.get(key)]
    if (x !== undefined && y !== undefined && x.text === y.text && x.size === y.size && x.slant === y.slant)
      return []
    return [
      {
        key,
        before: x === undefined ? '—' : `${x.text} ${String(x.size)} ${String(x.slant)}° ${String(x.run)}`,
        after: y === undefined ? '—' : `${y.text} ${String(y.size)} ${String(y.slant)}° ${String(y.run)}`,
      },
    ]
  })
  console.warn(`${String(changed.length)} of ${String(keys.length)} names changed`)
  console.table(changed)
}

const [first, second, third] = process.argv.slice(2)
if (first === '--diff' && second !== undefined && third !== undefined) diff(second, third)
else if (first !== undefined) {
  const rows = place()
  writeFileSync(first, `${JSON.stringify(rows, null, 1)}\n`)
  console.warn(`${String(rows.length)} names written to ${first}`)
} else throw new Error('an output file, or --diff and two files')
