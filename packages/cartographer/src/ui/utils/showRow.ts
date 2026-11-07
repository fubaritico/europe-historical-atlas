import { scrollTopToShow } from './rowScroll'

/**
 * Scroll a list, smoothly, to one of its rows — centred, unless it is already wholly in view
 * (`scrollTopToShow`). Only the list scrolls, never the page; and at once when the system asks for less
 * motion. `{Polities}` scrolls to the polity aimed at, `{Cities}` to the city chosen on the map (CARTO-384).
 * @param rowId - the DOM id of the row, a child of the scrolling list
 */
export function showRow(rowId: string): void {
  const row = document.getElementById(rowId)
  const list = row?.parentElement
  // A row that no longer resolves — an undo took its polity away, a filter hides the city — has nothing to
  // scroll to. Ordinary, and said where it matters: the status bar no longer names the polity, the city's row
  // is simply not listed.
  if (row === null || list === null || list === undefined) return
  const top = scrollTopToShow({
    rowTop: row.offsetTop,
    rowHeight: row.offsetHeight,
    scrollTop: list.scrollTop,
    viewHeight: list.clientHeight,
  })
  if (top === null) return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  list.scrollTo({ top, behavior: still ? 'auto' : 'smooth' })
}
