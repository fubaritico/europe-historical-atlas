import type { StackingSide } from '@europe-historical-atlas/core/editor/stacking'

/**
 * The row of `{Polities}` under the pointer, and the side a dragged row would land on (CARTO-457): the upper half of a
 * row is in front of it — the list shows the front first —, the lower half behind it.
 * @param x - the pointer, in viewport pixels
 * @param y - the pointer, in viewport pixels
 * @returns the row's polity, `null` off the rows, and the side
 */
export function dropUnder(x: number, y: number): { overId: string | null; side: StackingSide } {
  const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-polity-id]') ?? null
  const overId = row?.dataset.polityId ?? null
  if (row === null || overId === null) return { overId: null, side: 'front' }
  const box = row.getBoundingClientRect()
  return { overId, side: y < box.top + box.height / 2 ? 'front' : 'back' }
}
