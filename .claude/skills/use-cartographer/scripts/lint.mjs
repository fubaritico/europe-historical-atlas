#!/usr/bin/env node
import { formatLonLat, parseBox } from './lib/args.mjs'
import { crumbs, stairs } from './lib/lint.mjs'
import { LEFTOVER_MAX_POINTS } from './lib/thresholds.mjs'
import { commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * What the conversion from Cliopatria left in a map (the dev, 2026-11-09 — `references/decide.md`): the lint — rings of
 * three or four points, small squares scattered here and there — and the whole paths pixelated, both removed in the
 * cleaning; with `--stairs`, the steps inside the paths that stay, softened in a pass of their own, later.
 */

const USAGE = `node lint.mjs --map 1300 [--polity id] [--box=w,s,e,n] [--stairs] [--drawn]
  lint       a ring of 3 or 4 points, a small square; « overflows X » when another polity holds its middle — removed
  pixelated  a whole path made of the grid's short edges — removed
  stair      (--stairs) a run of the grid's steps inside a path that stays — softened, in a later pass
  --drawn    leaves out the rings drawn on a contour (an island, a lake) — run under tsx then: the contours are core's`

const { values } = commandLine({ polity: { type: 'string' }, stairs: { type: 'boolean' }, drawn: { type: 'boolean' } }, USAGE)
const map = readYearMap(folderOf(String(values.map)), readJson)
/** @type {{ polity?: string, box?: readonly number[], skip?: Set<number[]> }} */
const only = {}
if (values.polity !== undefined) only.polity = String(values.polity)
if (values.box !== undefined) only.box = parseBox(String(values.box))
if (values.drawn) {
  const { traceCoast } = await import('./lib/coast.mjs')
  const { ringsOnContours, shoreDistance } = await import('./lib/offcoast.mjs')
  const { REPO_ROOT } = await import('./lib/system.mjs')
  only.skip = ringsOnContours(map, shoreDistance(await traceCoast(REPO_ROOT)))
}

const lines = crumbs(map, only).map(
  (c) =>
    `${(c.points <= LEFTOVER_MAX_POINTS ? 'lint' : 'pixelated').padEnd(9)}  ${c.polity.padEnd(32)} ring ${String(c.ring).padEnd(4)} ${c.points} points ${c.km2.toFixed(1).padStart(7)} km²  at ${formatLonLat(c.at)}${c.overflows.length > 0 ? `  overflows ${c.overflows.join(', ')}` : ''}${c.whole ? '  — the whole polity: redraw, never remove' : ''}`
)
for (const s of values.stairs ? stairs(map, only) : []) {
  lines.push(
    `stair      ${s.polities.join(' | ').padEnd(32)} anchors ${s.from} → ${s.to}  ${s.treads} treads, ${s.anchors} points between, ${s.km.toFixed(0)} km  at ${formatLonLat(s.at)}`
  )
}
print(lines)
