/**
 * The dev's preview (the dev, 2026-11-17, of the cathedral taken off the map once its trial was over: « elle me manque
 * déjà […] je veux pouvoir la voir […] remets le flag, proprement »): `?cathedral` in the address stands a cathedral
 * at Cologne and at Paris, `?tomb` a grave at Cluny and at Canterbury, and `?tiara` the council's tiara at Lyon and at
 * Pisa (ATLAS-476), `?oriflamme` the conquest's oriflamme at Toledo and at Palermo (ATLAS-477), so a kind that has no event type yet can be judged on the map — how it zooms, how it lives. They
 * may be asked together.
 *
 * **On the published site too** (the dev, the same evening: « qu'avec le flag en ligne, je puisse voir la cathédrale,
 * qu'on ait tout ce que l'on a fait aujourd'hui en ligne ») — on the dev server alone at first. Unasked, the map shows
 * nothing of it: these icons state no fact of the content, and no reader meets them without the flag.
 */

import type { PreviewIcon } from '../scene/events/previewIcons'

/** Where the preview stands its cathedrals: the two places the dev named. */
const CATHEDRALS: readonly PreviewIcon[] = [
  { lon: 6.96, lat: 50.94, kind: 'cathedral' }, // Cologne
  { lon: 2.35, lat: 48.85, kind: 'cathedral' }, // Paris
]

/**
 * Where the preview stands its graves: two places clear of the map's own events of 1100 — Rome, tried first, already
 * holds one.
 */
const TOMBS: readonly PreviewIcon[] = [
  { lon: 4.66, lat: 46.43, kind: 'tomb' }, // Cluny
  { lon: 1.08, lat: 51.28, kind: 'tomb' }, // Canterbury
]

/** Where the preview stands its tiaras: two places clear of the map's own events of 1100 (ATLAS-476). */
const TIARAS: readonly PreviewIcon[] = [
  { lon: 4.84, lat: 45.76, kind: 'tiara' }, // Lyon
  { lon: 10.4, lat: 43.72, kind: 'tiara' }, // Pisa
]

/** Where the preview stands its oriflammes: two cities taken a few years before 1100 (ATLAS-477). */
const ORIFLAMMES: readonly PreviewIcon[] = [
  { lon: -4.02, lat: 39.86, kind: 'oriflamme' }, // Toledo
  { lon: 13.36, lat: 38.12, kind: 'oriflamme' }, // Palermo
]

/**
 * The icons the address asks the preview for.
 * @param search - the address's query (`window.location.search`)
 * @returns the icons to stand on the map, none unless asked
 */
export function previewIcons(search: string): readonly PreviewIcon[] {
  const asked = new URLSearchParams(search)
  return [
    ...(asked.has('cathedral') ? CATHEDRALS : []),
    ...(asked.has('tomb') ? TOMBS : []),
    ...(asked.has('tiara') ? TIARAS : []),
    ...(asked.has('oriflamme') ? ORIFLAMMES : []),
  ]
}
