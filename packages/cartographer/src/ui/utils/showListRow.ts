import { scrollTopToShow } from './rowScroll'

/**
 * Scroll a list, smoothly, to a row given by its place — centred, unless it is already wholly in view
 * (`scrollTopToShow`). Only the list scrolls, never the page; and at once when the system asks for less motion.
 * By its place rather than by its element: a long list draws only the rows in view (`{Cities}`, CARTO-485), so the
 * row to show may not be in the page yet.
 * @param list - the scrolling list
 * @param row - the row's top, from the top of the list's content, and its height, in CSS pixels
 * @param row.top - its top
 * @param row.height - its height
 */
export function showListRow(list: HTMLElement, row: { top: number; height: number }): void {
  const top = scrollTopToShow({
    rowTop: row.top,
    rowHeight: row.height,
    scrollTop: list.scrollTop,
    viewHeight: list.clientHeight,
  })
  if (top === null) return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  list.scrollTo({ top, behavior: still ? 'auto' : 'smooth' })
}
