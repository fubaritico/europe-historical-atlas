import { formatLonLat } from '../view/coordinateLabel'

/**
 * The status bar: what is under the pointer, written into the DOM by hand.
 *
 * **Its own module for two reasons that agree.** Fast Refresh refuses a file that exports both
 * components and other things (`react-refresh/only-export-components`), and `MapArea` had just walked
 * out of the 50-line readability budget. Both pushed the same way.
 */

/**
 * Write where the pointer is, straight into the DOM.
 *
 * **Imperative on purpose, and it is the decision taken for step 4 rather than a shortcut.** A pointer
 * emits a move per device sample; routing that through `useState` would reconcile the whole area at the
 * sampling rate, which is what kills canvas applications (`rules/troubleshooting.md`). The node is
 * written directly, so React never hears about it.
 *
 * Outside the component so it can be read — and so `MapArea` stays inside the readability budget, which
 * it had just left.
 * @param node - the status bar's element, or `null` before it is mounted
 * @param lonLat - the position in degrees, or `null` off the map
 */
export function writePosition(
  node: HTMLParagraphElement | null,
  lonLat: [number, number] | null
): void {
  if (node === null) return
  // Off the map the bar goes quiet rather than holding the last place the pointer was over — a stale
  // coordinate reads exactly like a live one.
  node.textContent = lonLat === null ? '' : formatLonLat(lonLat)
}

/** The status bar: bottom-left, over the canvas, out of the way of the drawing. */
export const STATUS_BAR = {
  position: 'absolute',
  left: 8,
  bottom: 6,
  margin: 0,
  font: '11px ui-monospace, monospace',
  color: '#4a4238',
  pointerEvents: 'none',
} as const
