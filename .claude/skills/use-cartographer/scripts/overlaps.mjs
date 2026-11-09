#!/usr/bin/env node
import { join } from 'node:path'

import { formatLonLat, parseBox } from './lib/args.mjs'
import { overlapZones } from './lib/overlaps.mjs'
import { REPO_ROOT, commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * The zones two polities or more cover — the Cartographer's hatched ground, computed by its own code. Each zone is one
 * to erase and redraw whole (`references/decide.md`, the dev, 2026-11-09). Run under `tsx`: `core` is TypeScript.
 */

const USAGE = `packages/core/node_modules/.bin/tsx overlaps.mjs --map 1300 [--box=w,s,e,n] [--min-km2 0.1]
  every zone two polities or more cover, largest first; the refusals of the geometry after them
  --min-km2 (0.1 by default) leaves out two polities that only touch: the clipping gives them a zone of 0 km²`

const { values } = commandLine({ 'min-km2': { type: 'string' } }, USAGE)
const map = readYearMap(folderOf(String(values.map)), readJson)
const box = values.box === undefined ? undefined : parseBox(String(values.box))
const minKm2 = Number(values['min-km2'] ?? '0.1')
const api = await import(join(REPO_ROOT, 'packages/core/src/data/overlaps.ts'))

const { zones, refused } = overlapZones(map, api)
const lines = zones
  .filter((z) => z.km2 >= minKm2)
  .filter((z) => box === undefined || (z.at[0] >= box[0] && z.at[0] <= box[2] && z.at[1] >= box[1] && z.at[1] <= box[3]))
  .map((z) => `overlap ${z.km2.toFixed(1).padStart(9)} km²  at ${formatLonLat(z.at)}  ${z.polities.join(' × ')}`)
for (const line of refused) lines.push(`refused ${line}`)
print(lines)
