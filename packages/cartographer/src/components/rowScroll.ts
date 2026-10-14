/**
 * Where `{Polities}` scrolls to bring the target's row into view (the dev, 2026-10-14: 137 polities, and
 * the one chosen on the map had to be looked for). Pure arithmetic over the list's measures, so the rule is
 * exercised with numbers — jsdom lays nothing out.
 */

/** A row and the scrolling list around it, in CSS pixels. */
export interface RowMeasures {
  /** The row's top, from the top of the list's content. */
  rowTop: number
  /** The row's height. */
  rowHeight: number
  /** How far the list is scrolled. */
  scrollTop: number
  /** The list's visible height. */
  viewHeight: number
}

/**
 * Where to scroll the list so the row sits in its middle — or `null` when the row is already wholly in
 * view, so a row clicked in the list never moves under the pointer.
 *
 * Not clamped: the browser stops a scroll at either end, which is what puts the first rows at the top and
 * the last at the bottom.
 * @param measures - the row and the list
 * @returns the list's new `scrollTop`, or `null` when nothing needs to move
 */
export function scrollTopToShow(measures: RowMeasures): number | null {
  const { rowTop, rowHeight, scrollTop, viewHeight } = measures
  const inView = rowTop >= scrollTop && rowTop + rowHeight <= scrollTop + viewHeight
  if (inView) return null
  return rowTop - (viewHeight - rowHeight) / 2
}
