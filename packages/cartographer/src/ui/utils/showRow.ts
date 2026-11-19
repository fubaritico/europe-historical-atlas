import { showListRow } from './showListRow'

/**
 * Scroll a list, smoothly, to one of its rows — centred, unless it is already wholly in view
 * (`showListRow`). Only the list scrolls, never the page; and at once when the system asks for less
 * motion. `{Polities}` scrolls to the polity aimed at; `{Cities}`, which draws only its rows in view, scrolls by
 * the row's place (`showListRow`, CARTO-485).
 * @param rowId - the DOM id of the row, a child of the scrolling list
 */
export function showRow(rowId: string): void {
  const row = document.getElementById(rowId)
  const list = row?.parentElement
  // A row that no longer resolves — an undo took its polity away — has nothing to scroll to. Ordinary, and said
  // where it matters: the status bar no longer names the polity.
  if (row === null || list === null || list === undefined) return
  showListRow(list, { top: row.offsetTop, height: row.offsetHeight })
}
