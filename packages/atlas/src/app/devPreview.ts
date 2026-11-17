/**
 * The dev's preview (the dev, 2026-11-17, of the cathedral taken off the map once its trial was over: « elle me manque
 * déjà […] je veux pouvoir la voir […] remets le flag, proprement »): on the dev server alone, `?cathedral` in the
 * address stands a cathedral at Cologne and at Paris, so a kind that has no event type yet can be judged on the map —
 * how it zooms, how it lives. Never on the published site: the composition root says which is which.
 */

import type { PreviewIcon } from '../scene/events/previewIcons'

/** Where the preview stands its cathedrals: the two places the dev named. */
const CATHEDRALS: readonly PreviewIcon[] = [
  { lon: 6.96, lat: 50.94, kind: 'cathedral' }, // Cologne
  { lon: 2.35, lat: 48.85, kind: 'cathedral' }, // Paris
]

/**
 * The icons the address asks the preview for.
 * @param search - the address's query (`window.location.search`)
 * @param devServer - whether this is the dev server; on the published site nothing is ever previewed
 * @returns the icons to stand on the map, none unless asked on the dev server
 */
export function devPreviewIcons(search: string, devServer: boolean): readonly PreviewIcon[] {
  if (!devServer) return []
  return new URLSearchParams(search).has('cathedral') ? CATHEDRALS : []
}
