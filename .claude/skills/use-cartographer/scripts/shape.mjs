#!/usr/bin/env node
import { formatLonLat } from './lib/args.mjs'
import {
  anchorsAddedSince,
  doubledPoints,
  slivers,
  spikes,
  stiffSegments,
} from './lib/measures.mjs'
import { commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * How a border looks: its spikes and its stiff straight segments, the two faults of `references/decide.md`, and the
 * doubled points where the spike measure is blind; with `--against`, the slivers a retouch left (a polity's blade between
 * two of its own rings, which no angle shows) (always listed, the whole map: an import's defect, to clean). With
 * `--against`, only the spikes at anchors that did not exist in that folder — the ones a retouch just made.
 */

const USAGE = `node shape.mjs --map 1100 [--polity kingdom-of-aragon] [--against 1100.before-claude-2026-11-08] [--stiff]
  spikes and doubled points are always listed; --stiff adds the land segments over the threshold`

const { values } = commandLine(
  { polity: { type: 'string' }, against: { type: 'string' }, stiff: { type: 'boolean' } },
  USAGE
)
const map = readYearMap(folderOf(String(values.map)), readJson)
const polity = /** @type {string | undefined} */ (values.polity)
const touched =
  values.against === undefined
    ? undefined
    : anchorsAddedSince(map, readYearMap(folderOf(String(values.against)), readJson))

const lines = spikes(map, polity, touched).map(
  (s) =>
    `spike  ${s.polity.padEnd(26)} anchor ${String(s.anchor).padEnd(6)} at ${formatLonLat(s.at)}  ${s.degrees.toFixed(0)}°`
)
if (touched !== undefined) {
  for (const s of slivers(map, touched)) {
    lines.push(
      `sliver ${s.polity.padEnd(26)} anchor ${String(s.anchor).padEnd(6)} at ${formatLonLat(s.at)}  ${(s.km * 1000).toFixed(0)} m from its own border`
    )
  }
}
for (const d of doubledPoints(map, polity)) {
  lines.push(
    `double ${d.polity.padEnd(26)} anchors ${d.a} and ${d.b} at ${formatLonLat(d.at)} — one position, the angle cannot be measured`
  )
}
if (values.stiff) {
  for (const s of stiffSegments(map, polity)) {
    lines.push(
      `stiff  ${s.polities.join(' | ').padEnd(48)} ${s.km.toFixed(0)} km  ${formatLonLat(map.anchors[s.a])} → ${formatLonLat(map.anchors[s.b])}`
    )
  }
}
print(lines)
