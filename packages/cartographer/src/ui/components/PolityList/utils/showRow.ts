import { optionId } from './optionId'
import { scrollTopToShow } from './rowScroll'

/**
 * Scroll the list, smoothly, to the target's row — centred, unless it is already wholly in view
 * (`scrollTopToShow`). Only the list scrolls, never the page; and at once when the system asks for less
 * motion.
 * @param targetId - the polity aimed at
 */
export function showRow(targetId: string): void {
  const row = document.getElementById(optionId(targetId))
  const list = row?.parentElement
  // A target that no longer resolves — an undo took its polity away — has no row. Ordinary, and said
  // where it matters: the status bar no longer names it, and the Pen refuses.
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
