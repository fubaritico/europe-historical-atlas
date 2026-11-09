#!/usr/bin/env node
import { writeFileSync } from 'node:fs'

import { formatLonLat } from './lib/args.mjs'
import { loadLand, seaShores, traceCoast } from './lib/coast.mjs'
import { junctionRuns, lobeCuts, placeLobeRefusals, seaCuts } from './lib/coasts.mjs'
import { REPO_ROOT, commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * Every coast run of a map, planned the dev's way (`references/gestures.md`, the junction point): a point inland on the
 * land border at each end, the coast between, the old anchors that leave, the area the polity should gain or lose.
 * Refused when no junction is found, or when the coast runs through another polity. With `--json`, for the pilot.
 */

const USAGE = `node_modules/.bin/tsx coasts.mjs --map 1200 [--polity id] [--refused] [--json out.json] [--sea] [--lobes islands.json]
  --refused lists the runs left, with why
  --sea     the rings to cut where their edges cross the sea, instead of the coast runs
  --lobes   the retraces that free the islands \`within\` a mainland ring, from \`islands.mjs --json\``

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
const only = (/** @type {{ polity: string }} */ r) => values.polity === undefined || r.polity === values.polity
// Two answers to two questions: asked together, one would be dropped without a word (review of 2026-11-09).
if (values.sea && values.lobes !== undefined) throw new Error(`--sea and --lobes are two plans: ask one at a time\n${USAGE}`)
if (values.sea) {
  const cut = seaCuts(map, contours, await loadLand(REPO_ROOT))
  const plans = cut.plans.filter(only)
  print([
    `sea cuts: ${String(plans.length)} rings to cut, ${String(cut.refused.filter(only).length)} left`,
    ...plans.map((p) => `cut    ${p.polity.padEnd(30)} ${String(p.edges.length)} sea edges, ${String(p.closings.length)} pieces: ${p.closings.map((c) => c.path.length).join(', ')} coast pts`),
    ...(values.refused ? cut.refused.filter(only).map((r) => `left   ${r.polity.padEnd(30)} ${r.why}`) : []),
  ])
  if (values.json !== undefined) writeFileSync(String(values.json), JSON.stringify(plans))
  process.exit(0)
}
const { runs, refused } =
  values.lobes === undefined
    ? junctionRuns(map, contours, await loadLand(REPO_ROOT))
    : (() => {
        // With --lobes, the islands `within` a mainland ring (from `islands.mjs --json`): one retrace per lobe to cut.
        const within = /** @type {{ state: string, id: number, owner: string, points: [number, number][] }[]} */ (
          readJson(String(values.lobes))
        ).filter((i) => i.state === 'within')
        const cut = lobeCuts(map, contours, within)
        return { runs: cut.plans, refused: placeLobeRefusals(cut.refused, within) }
      })()
const listed = /**
 * @type {{ polity: string, interior: number, path: unknown[], expectedKm2: number, startEdge: unknown,
 *   endEdge: unknown, startAt: [number, number] }[]}
 */ (runs).filter(only)
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
