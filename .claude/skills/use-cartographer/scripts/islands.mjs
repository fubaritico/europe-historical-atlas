#!/usr/bin/env node
import { writeFileSync } from 'node:fs'

import { formatLonLat, parseBox } from './lib/args.mjs'
import { traceCoastLoops } from './lib/coast.mjs'
import { islandOwner, islandState, signedAreaKm } from './lib/islands.mjs'
import { REPO_ROOT, commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * Every island of the coast the Pen follows, down to four points: the polity it goes to, and whether the map draws it
 * on the coast (`done`), otherwise (`redo`, its rings to erase), or not at all (`missing`). Lakes' shores are left out.
 * With `--json`, the list is written to a file for the pilot that draws them.
 */

const USAGE = `node_modules/.bin/tsx islands.mjs --map 1200 [--owners-from 1200.before-…] [--box=w,s,e,n] [--all] [--json out.json]
  without --all, the done islands are left out; --json writes every listed island with its coast points;
  --owners-from reads who each island goes to on the map before the cleaning`

const { values } = commandLine(
  { all: { type: 'boolean' }, json: { type: 'string' }, 'owners-from': { type: 'string' } },
  USAGE
)
const map = readYearMap(folderOf(String(values.map)), readJson)
// Who an island goes to is read on the map before the cleaning: an islet just given would otherwise bring the next
// one within reach, and the gifts would chain away from the coast.
const ownersMap =
  values['owners-from'] === undefined ? map : readYearMap(folderOf(String(values['owners-from'])), readJson)
const box = values.box === undefined ? null : parseBox(String(values.box))

const loops = (await traceCoastLoops(REPO_ROOT)).filter((loop) => loop.land)
const listed = []
/** @type {Record<string, number>} */
const counts = { done: 0, shared: 0, partial: 0, redo: 0, within: 0, missing: 0, none: 0 }
for (const loop of loops) {
  const first = loop.points[0]
  if (box !== null && !loop.points.some((p) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3])) {
    continue
  }
  const owner = islandOwner(ownersMap, loop.points)
  // Who it goes to, from the map before the cleaning; whether it is covered, from the map as it is — a coast
  // retraced frees the islands its coarse ring held, and they are then missing, not within.
  const now = islandOwner(map, loop.points)
  const measured = islandState(map, loop.points, {
    ...now,
    polity: owner.polity,
    how: now.how === 'covers' ? 'covers' : 'nearest',
  })
  const rings = measured.rings
  // No polity within reach: not ours to give — listed for the dev, never drawn.
  const state = owner.polity === null ? 'none' : measured.state
  counts[state] += 1
  if (state === 'done' && !values.all) continue
  listed.push({
    id: loop.id,
    state,
    owner: owner.polity,
    how: owner.how,
    km: owner.km,
    areaKm2: Math.abs(signedAreaKm(loop.points)),
    rings,
    at: first,
    points: loop.points,
  })
}
listed.sort((a, b) => b.areaKm2 - a.areaKm2)

print([
  `islands: ${Object.values(counts).reduce((a, b) => a + b, 0)} — ${Object.entries(counts)
    .map(([state, n]) => `${state} ${n}`)
    .join(', ')}`,
  ...listed.map(
    (i) =>
      `${i.state.padEnd(8)} #${String(i.id).padEnd(5)} ${String(i.points.length).padStart(4)} pts ${i.areaKm2.toFixed(1).padStart(9)} km²  ${formatLonLat(i.at)}  → ${i.owner ?? '(none)'}${i.how === 'nearest' ? ` (nearest, ${i.km.toFixed(0)} km)` : ''}${i.how === 'none' ? ` (nearest ${i.km.toFixed(0)} km)` : ''}${i.rings.length > 0 ? `  erase ${i.rings.map((r) => `${r.polity}[${r.ring}]`).join(' ')}` : ''}`
  ),
])
if (values.json !== undefined) writeFileSync(String(values.json), JSON.stringify(listed))
