#!/usr/bin/env node
import { parseBox } from './lib/args.mjs'
import { inBox, readCities } from './lib/cities.mjs'
import { citySide, enclaveRule } from './lib/measures.mjs'
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
 * For every city on the wrong side, the enclave rule of `references/decide.md`: its nearest opposing witness, and
 * whether that leaves room for an enclave (and how wide) or makes the zone disputed. Run it once no border move can
 * set the city right — `simulate.mjs` proves that first. A city on one weak witness gets nothing, whatever this says:
 * the sources file says which are weak, and whether its sources diverge.
 */

const USAGE = 'node enclaves.mjs --map 1100 [--box=west,south,east,north]'

const { values } = commandLine({}, USAGE)
const box = parseBox(/** @type {string | undefined} */ (values.box))
const map = readYearMap(folderOf(String(values.map)), readJson)
const cities = readCities(findCmsDb(REPO_ROOT), map.year, openReadOnly)

print(
  cities
    .filter((city) => inBox(city, box))
    .map((city) => citySide(map, city))
    .filter((side) => side.verdict === 'wrong')
    .map((side) => {
      const rule = enclaveRule(side.city, cities)
      const facing =
        rule.nearest === null
          ? 'no opposing witness'
          : `${rule.nearest.name} at ${rule.km.toFixed(1)} km`
      const what =
        rule.verdict === 'enclave'
          ? `enclave of ${side.wanted}, radius ≤ ${rule.radiusKm.toFixed(1)} km`
          : 'disputed zone'
      return `${side.city.name.padEnd(28)} ${what.padEnd(48)} facing ${facing}`
    })
)
