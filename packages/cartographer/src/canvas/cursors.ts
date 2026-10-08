import arrowUrl from '../cursors/arrow.svg'
import crossUrl from '../cursors/cross.svg'
import handClosedUrl from '../cursors/hand-closed.svg'
import handOpenUrl from '../cursors/hand-open.svg'

import type { EditorTool } from '../state/toolSlice'

/**
 * Which cursor the canvas shows, and the CSS that says so.
 *
 * **These are the canvas's cursors and nowhere else's.** Over the chrome — `{Polities}`, a form, a
 * button — the pointer is whatever the platform gives, and that is load-bearing rather than tidy: the
 * gesture that gives the Pen a subject is a **click in `{Polities}`**, so the pointer has to look
 * clickable exactly where the canvas refuses it. Verified in Illustrator by the dev on 2026-10-08 — the
 * selected tool's cursor appears only over the work area.
 *
 * It costs no code: `cursor` is a property of an **element**, so set on the canvas node it applies over
 * the canvas and the browser restores the surrounding pointer by itself. There is no "the pointer left"
 * handler to write, and therefore none to forget.
 *
 * **The images are inlined.** Each SVG is 400–700 bytes once the design tool's C2PA manifest is
 * stripped, which is under Vite's inlining threshold, so the bundler turns them into `data:` URIs: no
 * request, and no 404 that the CSS fallback would silently answer with a plain crosshair.
 */

/** The cursors this rung can reach. The other six wait for the hit-test, at step 4d-2 (d). */
export type CursorName = 'hand-open' | 'hand-closed' | 'cross' | 'arrow'

/** What the canvas may be doing, as far as the pointer is concerned. */
export interface CursorState {
  /** The tool in hand. */
  tool: EditorTool
  /** Whether the aimed-at polity resolves against the document. */
  hasTarget: boolean
  /** Whether the view is being dragged right now. */
  dragging: boolean
  /** Whether ‹space› is held, which borrows the hand under any tool. */
  spaceHeld: boolean
}

/**
 * The hot spot of each image, in the 32-px units every file is drawn at.
 *
 * **Not doubled for the `-2x` variants**, which `CURSORS.md` states explicitly — and the cross's hot
 * spot being its centre is the one its own handoff calls out: a one-pixel offset puts every anchor in
 * the wrong place, and nobody sees it until someone measures it.
 */
const HOT_SPOT: Record<CursorName, readonly [number, number]> = {
  'hand-open': [16, 16],
  'hand-closed': [16, 16],
  cross: [16, 16],
  arrow: [6, 4],
}

/** What the browser uses if the image cannot be had. Taken from the handoff's own table. */
const FALLBACK: Record<CursorName, string> = {
  'hand-open': 'grab',
  'hand-closed': 'grabbing',
  cross: 'crosshair',
  arrow: 'default',
}

/** The inlined image of each cursor. */
const IMAGE: Record<CursorName, string> = {
  'hand-open': handOpenUrl,
  'hand-closed': handClosedUrl,
  cross: crossUrl,
  arrow: arrowUrl,
}

/** What the pointer shows when a tool has no polity to act on — a CSS keyword, not an image of ours. */
export const REFUSED = 'not-allowed'

/**
 * Decide which cursor the canvas should be showing.
 *
 * **The precedence is the handoff's**, confirmed by the dev: ‹space› held, then the drag, then the
 * tool's own default. The refusal sits between them, because it is about the tool rather than about the
 * gesture — a Pen with no subject refuses wherever the pointer is.
 *
 * **Dragging shows the closed hand under every tool**, which is true today and will not be once the Pen
 * drags to draw: panning is what a drag does now, whatever is selected. Written here rather than
 * promised elsewhere, so step 4d-2 (d) finds it in the function it has to change.
 * @param state - the tool, the target, and the two gestures that override them
 * @returns the cursor's name, or the CSS keyword that refuses
 */
export function cursorFor(state: CursorState): CursorName | typeof REFUSED {
  if (state.dragging) return 'hand-closed'
  if (state.spaceHeld) return 'hand-open'
  if (state.tool === 'navigate') return 'hand-open'
  // ⟨draw⟩ and ⟨edit⟩ both need a subject: drawing with nobody selected would put anchors nowhere, and
  // selecting points with nobody selected is selecting *whose* points? (the dev, 2026-10-08).
  if (!state.hasTarget) return REFUSED
  return state.tool === 'draw' ? 'cross' : 'arrow'
}

/**
 * The whole value of the `cursor` property, image and fallback together.
 *
 * The comma matters: what follows it is what the browser uses if the image cannot be loaded, so the
 * canvas degrades to a crosshair rather than to an arrow that says nothing.
 * @param name - the cursor to show, or the refusal keyword
 * @returns the CSS value to assign
 */
export function cursorCss(name: CursorName | typeof REFUSED): string {
  if (name === REFUSED) return REFUSED
  const [x, y] = HOT_SPOT[name]
  return `url("${IMAGE[name]}") ${String(x)} ${String(y)}, ${FALLBACK[name]}`
}
