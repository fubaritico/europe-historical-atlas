import type { PolityRow } from '../../../utils/polityRows'
import type { RowDrop } from '../hooks/useRowDrag'
import type { StackingSide } from '@europe-historical-atlas/core/editor/stacking'

/**
 * The side a row shows a dragged row would land on (CARTO-457): the row under the pointer, never the row dragged, and
 * only a sibling of it — the same suzerain —, so the line never promises a drop the panel then refuses (review).
 * @param drop - the drag under way, or `null`
 * @param row - the row
 * @param rows - the rows shown, the dragged one among them
 * @returns the side, or `null` when the row is not a sibling aimed at
 */
export function dropSideOf(
  drop: RowDrop | null,
  row: PolityRow,
  rows: readonly PolityRow[]
): StackingSide | null {
  if (drop?.overId !== row.id || drop.id === row.id) return null
  const dragged = rows.find((each) => each.id === drop.id)
  return dragged?.suzerainName === row.suzerainName ? drop.side : null
}
