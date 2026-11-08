#!/usr/bin/env node
import { join } from 'node:path'

import { formatLonLat } from './lib/args.mjs'
import { riverCandidates } from './lib/measures.mjs'
import { commandLine, folderOf, print, readJson, REPO_ROOT, RIVERS_FILE } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * The river rule's candidates for one polity: the runs of its land borders that stay near one river along a length
 * that makes it a course, not a crossing. Show the first ones of a zone to the dev before following them.
 */

const USAGE = 'node rivers.mjs --map 1100 --polity kingdom-of-castile'

const { values } = commandLine({ polity: { type: 'string' } }, USAGE, ['map', 'polity'])
const map = readYearMap(folderOf(String(values.map)), readJson)
const rivers = /** @type {{ rivers: { name: string | null, points: [number, number][] }[] }} */ (
  readJson(join(REPO_ROOT, RIVERS_FILE))
).rivers

print(
  riverCandidates(map, String(values.polity), rivers).map(
    (r) =>
      `${String(r.river).padEnd(14)} with ${r.neighbour.padEnd(26)} ${r.km.toFixed(0)} km  ` +
      `${formatLonLat(r.from)} → ${formatLonLat(r.to)}  max gap ${r.maxGapKm.toFixed(1)} km`
  )
)
