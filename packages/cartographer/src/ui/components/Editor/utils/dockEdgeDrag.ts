import { clampDockWidth } from '../../../../state/panelsSlice'

/**
 * Widening or narrowing the panels' column by its left edge (CARTO-342): the shell's `--dock-w` set on the page while
 * the pointer moves, the store written once, on release — never on a cancel, nor when the width did not change.
 */

/** A drag of the column's edge in progress. */
export interface EdgeDrag {
  /** The pointer at the press. */
  readonly x: number
  /** The column's width at the press. */
  readonly width: number
  /** The width now, kept within the column's range. */
  now: number
  /** The shell's body, whose `--dock-w` the drag sets. */
  readonly body: HTMLElement
  /** The body's own `--dock-w` at the press, put back at the end. */
  readonly was: string
}

/**
 * Begin a drag of the column's edge.
 * @param body - the shell's body
 * @param x - the pointer at the press
 * @param width - the column's width now
 * @returns the drag
 */
export function beginEdgeDrag(body: HTMLElement, x: number, width: number): EdgeDrag {
  return { x, width, now: width, body, was: body.style.getPropertyValue('--dock-w') }
}

/**
 * Follow the pointer: the column is on the right, so moving its left edge leftwards widens it.
 * @param drag - the drag
 * @param x - the pointer now
 */
export function followEdgeDrag(drag: EdgeDrag, x: number): void {
  drag.now = clampDockWidth(drag.width - (x - drag.x))
  drag.body.style.setProperty('--dock-w', `${String(drag.now)}px`)
}

/**
 * End the drag: the body's own `--dock-w` back, and the width it came to — `null` on a cancel, said in the console, or
 * when the width did not change.
 * @param drag - the drag
 * @param commit - `false` when the browser cancelled it
 * @returns the width to keep, or `null`
 */
export function endEdgeDrag(drag: EdgeDrag, commit: boolean): number | null {
  drag.body.style.setProperty('--dock-w', drag.was)
  if (!commit) {
    console.warn('[Cartographer] widening the panels’ column was cancelled; it keeps its width')
    return null
  }
  return drag.now === drag.width ? null : drag.now
}
