#!/usr/bin/env node
import { writeFileSync } from 'node:fs'

import { formatLonLat } from './lib/args.mjs'
import { loadLand, seaShores, traceCoast } from './lib/coast.mjs'
import { junctionRuns, lobeCuts, seaCuts } from './lib/coasts.mjs'
import { REPO_ROOT, commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * Every coast run of a map, planned the dev's way (`references/gestures.md`, the junction point): a point inland on the
 * land border at each end, the coast between, the old anchors that leave, the area the polity should gain or lose.
 * Refused when no junction is found, or when the coast runs through another polity. With `--json`, for the pilot.
 */

const USAGE = `node_modules/.bin/tsx coasts.mjs --map 1200 [--polity id] [--refused] [--json out.json]
  --refused lists the runs left, with why`

const { values } = commandLine(
  {
    polity: { type: 'string' },
    refused: { type: 'boolean' },
    json: { type: 'string' },
    lobes: { type: 'string' },
    sea: { type: 'boolean' },
  },
  USAGE
)
const map = readYearMap(folderOf(String(values.map)), readJson)
// Every shore of the sea: a closed sea (the Black Sea, the Caspian) is a loop of water at this grid, its shore a coast
// all the same; a lake's shore is not — it goes to the lakes' plan (`lakes.mjs`), coasts first (the dev, 2026-11-09).
const contours = seaShores(await traceCoast(REPO_ROOT))
// With --lobes, the islands `within` a mainland ring (from `islands.mjs --json`): one retrace per lobe to cut.
if (values.sea) {
  const cut = seaCuts(map, contours, await loadLand(REPO_ROOT))
  print([
    `sea cuts: ${String(cut.plans.length)} rings to cut, ${String(cut.refused.length)} left`,
    ...cut.plans.map((p) => `cut    ${p.polity.padEnd(30)} ${String(p.edges.length)} sea edges, ${String(p.closings.length)} pieces: ${p.closings.map((c) => c.path.length).join(', ')} coast pts`),
    ...(values.refused ? cut.refused.map((r) => `left   ${r.polity.padEnd(30)} ${r.why}`) : []),
  ])
  if (values.json !== undefined) writeFileSync(String(values.json), JSON.stringify(cut.plans))
  process.exit(0)
}
const { runs, refused } =
  values.lobes === undefined
    ? junctionRuns(map, contours, await loadLand(REPO_ROOT))
    : (() => {
        const within = /** @type {{ state: string, id: number, owner: string, points: [number, number][] }[]} */ (
          readJson(String(values.lobes))
        ).filter((i) => i.state === 'within')
        const cut = lobeCuts(map, contours, within)
        return { runs: cut.plans, refused: cut.refused.map((r) => ({ polity: `island #${r.island}`, at: [0, 0], why: r.why })) }
      })()
const only = (/** @type {{ polity: string }} */ r) => values.polity === undefined || r.polity === values.polity
const listed = /** @type {any[]} */ (runs).filter(only)
const lines = [
  `coast runs: ${listed.length} to retrace, ${refused.filter(only).length} left`,
  ...listed.map(
    (r) =>
      `retrace ${r.polity.padEnd(30)} replaces ${String(r.interior).padStart(4)}  coast ${String(r.path.length).padStart(5)} pts  ${r.expectedKm2.toFixed(0).padStart(6)} km²  ${r.startEdge ? 'insert' : 'anchor'}/${r.endEdge ? 'insert' : 'anchor'}  at ${formatLonLat(r.startAt)}`
  ),
]
if (values.refused) {
  lines.push(...refused.filter(only).map((r) => `left    ${r.polity.padEnd(30)} at ${formatLonLat(r.at)}  ${r.why}`))
}
print(lines)
if (values.json !== undefined) writeFileSync(String(values.json), JSON.stringify(listed))
