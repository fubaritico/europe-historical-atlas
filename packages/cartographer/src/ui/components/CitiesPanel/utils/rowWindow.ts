/**
 * Which rows of a long list are drawn (CARTO-485): `{Cities}` lists thirteen thousand cities and shows some twenty —
 * drawing them all made every box ticked, every filter lifted and the panel's opening wait on thirteen thousand rows.
 * Only the rows in view are in the page, with a few either side so a scroll never shows a blank, and two gaps stand
 * for the rest, so the list keeps its whole height and its scrollbar. Pure arithmetic over the list's measures —
 * jsdom lays nothing out.
 */

/** The height of a city's row, in CSS pixels — the stylesheet's `.layer-row`, pinned to it by a test. */
export const CITY_ROW_HEIGHT = 24

/** How many rows are drawn beyond the view, above and below: a scroll of a few rows shows rows already there. */
export const ROWS_BEYOND_VIEW = 20

/** A list and how far it is scrolled, in rows and CSS pixels. */
export interface RowWindowMeasures {
  /** How many rows the list holds. */
  count: number
  /** The height of a row. */
  rowHeight: number
  /** The index of the first row in view — how far the list is scrolled, in whole rows. */
  firstInView: number
  /** The list's visible height; `0` while it is not laid out, and then only the rows beyond the view are drawn. */
  viewHeight: number
  /** How many rows are drawn beyond the view, on each side. */
  beyond: number
}

/** The rows to draw, and the gaps standing for the others. */
export interface RowWindow {
  /** The index of the first row drawn. */
  first: number
  /** The index after the last row drawn. */
  end: number
  /** The height of the gap above the rows drawn, in CSS pixels. */
  before: number
  /** The height of the gap below them. */
  after: number
}

/**
 * The rows to draw for a list scrolled to a row. A list scrolled past its end — its rows filtered away while it was
 * scrolled far — draws its last rows, never none.
 * @param measures - the list's rows, their height, how far it is scrolled, its height, and the rows beyond the view
 * @returns the rows to draw and the two gaps
 */
export function rowWindow(measures: RowWindowMeasures): RowWindow {
  const { count, rowHeight, firstInView, viewHeight, beyond } = measures
  // One more than the view holds: a row cut by the top edge and one cut by the bottom edge are both in view.
  const inView = Math.ceil(viewHeight / rowHeight) + 1
  const start = Math.min(Math.max(0, firstInView), Math.max(0, count - inView))
  const first = Math.max(0, start - beyond)
  const end = Math.min(count, start + inView + beyond)
  return { first, end, before: first * rowHeight, after: (count - end) * rowHeight }
}
