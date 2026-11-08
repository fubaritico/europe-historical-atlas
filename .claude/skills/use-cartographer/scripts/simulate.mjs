#!/usr/bin/env node
import { readCities } from './lib/cities.mjs'
import { insideRing } from './lib/geo.mjs'
import { citySide, planPolygon, verdictAfterMove } from './lib/measures.mjs'
import {
  commandLine,
  findCmsDb,
  folderOf,
  openReadOnly,
  print,
  readJson,
  REPO_ROOT,
} from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * Before the first click: which cities a planned retouch moves. A plan names each zone that changes hands — the
 * polygon between the old line and the new one, written on anchor indices and free positions — and the polity it
 * goes to — or, `overlap`, is added to as a disputed zone. Every city inside is listed with where it lands; when one lands on the wrong side, everything is printed
 * and the command ends with code 1, so the plan stops there.
 */

const USAGE = `node simulate.mjs --map 1100 --plan plan.json
  plan.json: { "zones": [ { "label": "Sádaba", "to": "kingdom-of-aragon",
                            "polygon": [23, [-1.8, 42.215], [-1.73, 42.255], 71, 72, 73] } ] }
  "overlap": true makes a zone disputed: "to" is added over the polity there, not given the ground`

const { values } = commandLine({ plan: { type: 'string' } }, USAGE, ['map', 'plan'])
const map = readYearMap(folderOf(String(values.map)), readJson)
const cities = readCities(findCmsDb(REPO_ROOT), map.year, openReadOnly)
const plan =
  /** @type {{ zones: { label: string, to: string, polygon: (number | [number, number])[], overlap?: boolean }[] }} */ (
    readJson(String(values.plan))
  )
const polities = new Set(map.polityByQid.values())
for (const claim of map.claims) polities.add(claim.polity)

const lines = []
let wrong = 0
for (const zone of plan.zones) {
  if (!polities.has(zone.to))
    throw new Error(`zone ${zone.label}: no polity "${zone.to}" in the map`)
  if (zone.polygon.length < 3)
    throw new Error(`zone ${zone.label}: a zone needs three corners at least`)
  const polygon = planPolygon(map, zone.polygon)
  const inside = cities.filter((city) => insideRing(city.at, polygon))
  lines.push(`zone ${zone.label} ${zone.overlap ? '+' : '→'} ${zone.to}: ${inside.length} cities`)
  for (const city of inside) {
    const after = verdictAfterMove(citySide(map, city), zone.to, zone.overlap === true)
    if (after === 'wrong') wrong++
    lines.push(`  ${after.padEnd(9)} ${city.name.padEnd(28)} source: ${city.holderName ?? '-'}`)
  }
}
print(lines)
if (wrong > 0) {
  print([`${wrong} cities would land on the wrong side: the plan stops here`])
  process.exitCode = 1
}
