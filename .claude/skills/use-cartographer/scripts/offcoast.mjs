#!/usr/bin/env node
import { formatLonLat } from './lib/args.mjs'
import { writeFileSync } from 'node:fs'

import { loadLand, seaShores, traceCoast } from './lib/coast.mjs'
import { itineraryRank } from './lib/itinerary.mjs'
import { offCoastStretches, ringsOnContours, shoreDistance, shoreRetraces, unclaimedShores } from './lib/offcoast.mjs'
import { REPO_ROOT, commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { holdersAt, readYearMap } from './lib/yearMap.mjs'

/**
 * Every coast the shore pass left wrong, in the dev's itinerary (2026-11-09): `out`, a polity's edge running over the
 * sea off the shore; `short`, a shore nobody holds with a polity just behind it. Nothing is dropped: every stretch is
 * printed, whatever its gap. Run under `tsx`: the shore is traced by `core`.
 */

const USAGE = `packages/core/node_modules/.bin/tsx offcoast.mjs --map 1300 [--min-km 5]
  out    a polity's edge over the sea, off the shore — from anchor to anchor, its length and widest gap
  short  a mainland's shore nobody holds, a polity's edge just behind it — from shore point to shore point (the
         islands' shores are the ledger's)
  --min-km leaves out the stretches shorter than this (0 by default: everything)
  --plan out.json  plans the retraces of those stretches — each from a shore anchor of the polity to the next, only
                   what lies off the shore between them replaced — in the itinerary's order, for the pilot's
                   \`junction\`; the stretches it cannot plan are printed with why`

const { values } = commandLine({ 'min-km': { type: 'string' }, plan: { type: 'string' } }, USAGE)
const map = readYearMap(folderOf(String(values.map)), readJson)
const minKm = Number(values['min-km'] ?? '0')
const contours = await traceCoast(REPO_ROOT)
const shores = seaShores(contours)
const isLand = await loadLand(REPO_ROOT)

const distance = shoreDistance(shores)
// An island or a lake drawn on its contour is the passes' work, not a fault.
const out = offCoastStretches(map, distance, isLand, ringsOnContours(map, shoreDistance(contours)))
// The islands' shores are left out: an island erased is in the ledger, redrawn whole after the coasts.
const short = unclaimedShores(map, shores.filter((s) => !s.closed || !s.land), isLand, (p) => holdersAt(map, p))

if (values.plan !== undefined) {
  const { runs, refused, unchanged } = shoreRetraces(map, shores, distance, isLand, out, short)
  const ordered = runs
    .map((r) => ({ r, rank: itineraryRank(r.startAt).rank }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ r }) => r)
  writeFileSync(String(values.plan), JSON.stringify(ordered))
  print([
    `plan: ${ordered.length} retraces written, ${refused.length} stretches left, ${unchanged} already right (a retrace would change nothing)`,
    ...refused.map((r) => `left   ${r.polity.padEnd(32)} at ${formatLonLat(r.at)}  ${r.why}`),
  ])
  process.exit(0)
}

const rows = [
  ...out.map((s) => ({
    at: s.at,
    km: s.km,
    line: `out    ${s.polity.padEnd(32)} anchors ${s.from} → ${s.to}  ${s.km.toFixed(0).padStart(5)} km, up to ${s.worstKm.toFixed(0)} km off  at ${formatLonLat(s.at)}`,
  })),
  ...short.map((s) => ({
    at: s.from,
    km: s.km,
    line: `short  ${s.polity.padEnd(32)} ${formatLonLat(s.from)} → ${formatLonLat(s.to)}  ${s.km.toFixed(0).padStart(5)} km, up to ${s.worstKm.toFixed(0)} km short`,
  })),
]
  .filter((r) => r.km >= minKm)
  .map((r) => ({ ...r, ...itineraryRank(r.at) }))
  .sort((a, b) => a.rank - b.rank)

/** @type {string[]} */
const lines = []
let stretch = ''
for (const r of rows) {
  if (r.stretch !== stretch) lines.push(`— ${(stretch = r.stretch)}`)
  lines.push(r.line)
}
print(lines)
