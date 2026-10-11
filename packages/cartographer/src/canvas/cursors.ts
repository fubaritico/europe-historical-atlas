import arrowHandleUrl from '../cursors/arrow-handle.svg'
import arrowInsertUrl from '../cursors/arrow-insert.svg'
import arrowUrl from '../cursors/arrow.svg'
import crossAddUrl from '../cursors/cross-add.svg'
import crossBranchUrl from '../cursors/cross-branch.svg'
import crossCloseUrl from '../cursors/cross-close.svg'
import crossSnapUrl from '../cursors/cross-snap.svg'
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

/**
 * The cursors this rung can reach. One of the kit's ten waits for the gesture that calls for it — the
 * marquee.
 */
export type CursorName =
  | 'hand-open'
  | 'hand-closed'
  | 'cross'
  | 'cross-close'
  | 'cross-add'
  | 'cross-branch'
  | 'cross-snap'
  | 'arrow'
  | 'arrow-handle'
  | 'arrow-insert'

/** What the canvas may be doing, as far as the pointer is concerned. */
export interface CursorState {
  /** The tool in hand. */
  tool: EditorTool
  /** Whether the aimed-at polity resolves against the document. */
  hasTarget: boolean
  /** Whether the view is being dragged right now — a pan, not a tool's drag. */
  panning: boolean
  /** Whether ‹space› is held, which borrows the hand under any tool. */
  spaceHeld: boolean
  /** Whether a Pen click would close the outline — the pointer is on its first anchor. */
  closing: boolean
  /** Whether the white arrow is over one of the target's handles. */
  overHandle: boolean
  /** Whether the Pen, following the coast, has the coastline within reach. */
  snapping: boolean
  /** Whether the Pen is over an existing anchor it would join — CURSORS.md's branching mark. */
  branching: boolean
  /**
   * Whether a click here inserts a point on one of the target's stretches — the white arrow away from
   * any handle, or the Pen with no outline in progress, as Illustrator's Pen does over a selected path.
   */
  overStretch: boolean
  /** Whether the pointer is over a polity's fill — where the white arrow's click chooses it. */
  overFill: boolean
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
  'cross-close': [16, 16],
  'cross-add': [16, 16],
  'cross-branch': [16, 16],
  'cross-snap': [16, 16],
  arrow: [6, 4],
  'arrow-handle': [6, 4],
  'arrow-insert': [6, 4],
}

/** What the browser uses if the image cannot be had. Taken from the handoff's own table. */
const FALLBACK: Record<CursorName, string> = {
  'hand-open': 'grab',
  'hand-closed': 'grabbing',
  cross: 'crosshair',
  'cross-close': 'crosshair',
  'cross-add': 'crosshair',
  'cross-branch': 'crosshair',
  'cross-snap': 'crosshair',
  arrow: 'default',
  'arrow-handle': 'default',
  'arrow-insert': 'copy',
}

/** The inlined image of each cursor. */
const IMAGE: Record<CursorName, string> = {
  'hand-open': handOpenUrl,
  'hand-closed': handClosedUrl,
  cross: crossUrl,
  'cross-close': crossCloseUrl,
  'cross-add': crossAddUrl,
  'cross-branch': crossBranchUrl,
  'cross-snap': crossSnapUrl,
  arrow: arrowUrl,
  'arrow-handle': arrowHandleUrl,
  'arrow-insert': arrowInsertUrl,
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
 * **Only a pan shows the closed hand.** Until step 4d-2 (d) every drag panned, whatever the tool; now a
 * drag under the white arrow moves an anchor, and the arrow stays the arrow while it does.
 * @param state - the tool, the target, and the two gestures that override them
 * @returns the cursor's name, or the CSS keyword that refuses
 */
export function cursorFor(state: CursorState): CursorName | typeof REFUSED {
  if (state.panning) return 'hand-closed'
  if (state.spaceHeld) return 'hand-open'
  if (state.tool === 'navigate') return 'hand-open'
  // ⟨draw⟩ and ⟨edit⟩ both need a subject: drawing with nobody selected would put anchors nowhere, and
  // selecting points with nobody selected is selecting *whose* points? (the dev, 2026-10-08).
  // With nobody aimed at, the arrow still has one thing to do: a click in a fill chooses its polity.
  if (!state.hasTarget) return state.tool === 'edit' && state.overFill ? 'arrow' : REFUSED
  if (state.tool === 'draw') return drawCursor(state)
  if (state.overHandle) return 'arrow-handle'
  return state.overStretch ? 'arrow-insert' : 'arrow'
}

/**
 * The Pen's cursor: the closing mark, then the branching mark over an existing anchor, then the plus
 * over the target's stretch, then the snap mark over the coast, then the plain cross.
 * @param state - the Pen's two offers
 * @returns the cursor
 */
function drawCursor(state: CursorState): CursorName {
  if (state.closing) return 'cross-close'
  if (state.branching) return 'cross-branch'
  if (state.overStretch) return 'cross-add'
  return state.snapping ? 'cross-snap' : 'cross'
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
