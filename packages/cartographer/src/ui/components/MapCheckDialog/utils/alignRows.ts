import { alignedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'

import type { CartographerStore } from '../../../../state/store'
import type { TiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'

/**
 * Align rows of [Check this year] on the CMS (CARTO-568), as one undoable step: each polity takes its territory's French
 * name, number and the dates it gives (`alignedPolity`).
 * @param state - the store's state, read at the click
 * @param rows - the rows to align
 * @param label - the history's name of the gesture, from the polities aligned
 * @returns whether the document took them — `false` for a polity gone or a change refused, and nothing changed
 */
export function alignRows(
  state: CartographerStore,
  rows: readonly TiedPolity[],
  label: (count: number, name: string) => string
): boolean {
  const polities = rows.flatMap((row) => {
    const polity = state.document.polities.find(({ id }) => id === row.id)
    return polity === undefined ? [] : [alignedPolity(polity, row.cms)]
  })
  const [first] = polities
  if (first === undefined || polities.length !== rows.length) return false
  return state.editPolities(polities, {
    kind: 'align-on-cms',
    label: label(polities.length, first.name),
  })
}
