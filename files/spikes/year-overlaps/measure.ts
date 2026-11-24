/**
 * How much the polities of a map cover one another — read-only, the map's files are never written. The plan of 1200
 * (`files/plans/historian/autonomy-and-1200.md`) asks it of `years/1200/`, which Cliopatria left with polities of
 * several epochs laid over one another (`rules/known-issues/data.md`). The same computation the atlas hatches with
 * (`core/data/yearOverlaps`); each piece is weighed against the smaller of its two polities, so « Mann inside Alba »
 * reads 100 %.
 *
 *   packages/core/node_modules/.bin/tsx files/spikes/year-overlaps/measure.ts <years folder> <map>
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { assembleAuthoredYear } from '../../../packages/core/src/data/yearConsistency'
import { openYearDocument } from '../../../packages/core/src/data/yearDocument'
import { polityShape } from '../../../packages/core/src/data/overlaps'
import { yearOverlaps } from '../../../packages/core/src/data/yearOverlaps'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
} from '../../../packages/core/src/data/yearSource'

import type { MultiPolygon } from 'polygon-clipping'

/**
 * A ground's area in km², on the sphere's local scale — enough to rank overlaps, not to survey.
 * @param ground - the ground, in longitude and latitude
 * @returns its area
 */
function areaKm2(ground: MultiPolygon): number {
  let total = 0
  for (const polygon of ground) {
    polygon.forEach((ring, index) => {
      let sum = 0
      let lat = 0
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % ring.length]
        if (a === undefined || b === undefined) continue
        sum += a[0] * b[1] - b[0] * a[1]
        lat += a[1]
      }
      const kmPerDegree = 111.32
      const scale = kmPerDegree * kmPerDegree * Math.cos(((lat / ring.length) * Math.PI) / 180)
      total += (index === 0 ? 1 : -1) * Math.abs(sum / 2) * scale
    })
  }
  return total
}

const [, , folder, map] = process.argv
if (folder === undefined || map === undefined) {
  console.error('usage: measure.ts <years folder> <map>')
  process.exit(1)
}
const read = (name: string): unknown => JSON.parse(readFileSync(join(folder, map, name), 'utf8')) as unknown
const source = join(folder, map)
const year = assembleAuthoredYear(
  {
    registry: parseYearRegistry(read('registry.json'), source),
    polities: parseYearPolities(read('polities.json'), source),
    borders: parseYearBorders(read('borders.json'), source),
  },
  source
)
const document = openYearDocument(year)
const names = new Map(year.registry.polities.map((polity) => [polity.id, polity.name]))
const sizes = new Map<string, number>()
const sizeOf = (id: string): number => {
  const known = sizes.get(id)
  if (known !== undefined) return known
  const shape = polityShape(document, id)
  const size = shape === null ? 0 : areaKm2(shape.shape)
  sizes.set(id, size)
  return size
}
const { pieces, refused } = yearOverlaps(document)
const rows = pieces
  .filter((piece) => piece.polities.length >= 2)
  .map((piece) => {
    const [a = '', b = ''] = piece.polities
    const area = areaKm2(piece.area)
    const smaller = Math.min(sizeOf(a), sizeOf(b))
    return { a, b, area, share: smaller === 0 ? 0 : area / smaller }
  })
  .sort((x, y) => y.share - x.share)
console.warn(`${map}: ${String(year.registry.polities.length)} polities, ${String(rows.length)} pieces covered twice`)
for (const row of rows) {
  console.warn(
    `${String(Math.round(row.share * 100)).padStart(3)} %  ${String(Math.round(row.area)).padStart(7)} km²  ${names.get(row.a) ?? row.a}  ×  ${names.get(row.b) ?? row.b}`
  )
}
for (const refusal of refused) console.warn(`refused: ${refusal.a} ${refusal.b ?? ''} — ${refusal.reason}`)
