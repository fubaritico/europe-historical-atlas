#!/usr/bin/env node
import { writeFileSync } from 'node:fs'

import { formatLonLat } from './lib/args.mjs'
import { traceCoast } from './lib/coast.mjs'
import { lakeHolder, signedAreaKm } from './lib/islands.mjs'
import { lakeCrossings } from './lib/lakes.mjs'
import { REPO_ROOT, commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * The lakes to carve: every shore loop around water lying wholly in one polity, its water and its whole shore. The
 * gesture is an island's — aim the polity, the shore, the shore, close — and the ring drawn a second time over the
 * polity's own ground is a hole. Lakes a border crosses are left (CARTO-397). With `--json`, for the pilot's series.
 */

const USAGE = `node_modules/.bin/tsx lakes.mjs --map 1200 [--crossed] [--json out.json]
  --crossed plans the lakes two polities share: the border's edges over the water, each polity's shore`

const { values } = commandLine({ json: { type: 'string' }, crossed: { type: 'boolean' } }, USAGE)
const map = readYearMap(folderOf(String(values.map)), readJson)
const lakes = (await traceCoast(REPO_ROOT)).filter((c) => c.closed && !c.land)
if (values.crossed) {
  const { plans, left } = lakeCrossings(map, lakes)
  print([
    `lakes two polities share: ${String(plans.length)} to open, ${String(left.length)} left`,
    ...plans.map((p) => `open   #${String(p.lake).padEnd(5)} ${p.sides.map((s) => `${s.polity} (${String(s.edges.length)} edges, shore ${String(s.shore.length)} pts)`).join(' · ')}`),
    ...left.map((l) => `left   #${String(l.lake).padEnd(5)} ${l.why}`),
  ])
  if (values.json !== undefined) writeFileSync(String(values.json), JSON.stringify(plans))
  process.exit(0)
}
const listed = []
let crossed = 0
for (const lake of lakes) {
  const owner = lakeHolder(map, lake.points)
  if (owner === null) {
    crossed += 1
    continue
  }
  listed.push({ id: lake.id, owner, areaKm2: Math.abs(signedAreaKm(lake.points)), points: lake.points })
}
listed.sort((a, b) => a.areaKm2 - b.areaKm2)
print([
  `lakes: ${lakes.length} — ${listed.length} to carve, ${crossed} left (crossed by a border, nobody's, or carved already)`,
  ...listed.map(
    (l) =>
      `carve  #${String(l.id).padEnd(5)} ${String(l.points.length).padStart(5)} pts ${l.areaKm2.toFixed(1).padStart(9)} km²  ${formatLonLat(l.points[0])}  → ${l.owner}`
  ),
])
if (values.json !== undefined) writeFileSync(String(values.json), JSON.stringify(listed))
