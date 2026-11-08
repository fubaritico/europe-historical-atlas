#!/usr/bin/env node
import { formatLonLat, parseBox } from './lib/args.mjs'
import { inBox, readCities } from './lib/cities.mjs'
import { citySide, verdictChanges } from './lib/measures.mjs'
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
 * Which polity of the map holds each witness city, against the holder its sources name — the first measure of every
 * retouch, and the last. With `--against`, only the cities whose verdict changed since another folder (the copy made
 * before touching the map).
 */

const USAGE = `node sides.mjs --map 1100 [--box=west,south,east,north] [--against 1100.before-claude-2026-11-08] [--all]
  ok      on its sourced holder's ground        wrong      on another polity's ground
  absent  its holder is not a polity of the map  unsourced  no holder entered
  without --all, the ok cities are left out`

const { values } = commandLine({ against: { type: 'string' }, all: { type: 'boolean' } }, USAGE)
const box = parseBox(/** @type {string | undefined} */ (values.box))
const map = readYearMap(folderOf(String(values.map)), readJson)
const cities = readCities(findCmsDb(REPO_ROOT), map.year, openReadOnly).filter((city) =>
  inBox(city, box)
)

/**
 * One line for a city's side.
 * @param {ReturnType<typeof citySide>} side - the measure
 * @returns {string} the line
 */
function line(side) {
  const { city, verdict, held } = side
  return `${verdict.padEnd(9)} ${city.name.padEnd(30)} ${formatLonLat(city.at).padEnd(15)} source: ${city.holderName ?? '-'} · map: ${held.join(', ') || 'none'}`
}

if (values.against === undefined) {
  print(
    cities
      .map((city) => citySide(map, city))
      .filter((side) => values.all || side.verdict !== 'ok')
      .map(line)
  )
} else {
  const before = readYearMap(folderOf(String(values.against)), readJson)
  print(
    verdictChanges(before, map, cities).map((change) => `${change.before} → ${line(change.side)}`)
  )
}
