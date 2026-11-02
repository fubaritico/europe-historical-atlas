import { dropTarget, insertionY, movedRect, resizedRect } from './panelGeometry'

import type { PanelRect } from '../../../../state/panelsSlice'
import type { DockGeometry } from '../frameProps'
import type { DropTarget, ResizeEdges } from './panelGeometry'

/**
 * A drag or a resize in progress (CARTO-342): **the frame is moved by its style, never through React or the store**,
 * and the answer is handed back once, on release (`rules/troubleshooting.md`: per-frame state never goes through a
 * component). The style the frame had is put back at the end, so React's own style is what stays.
 */

/** How far the pointer must travel before a press on a head becomes a drag — a click on it does nothing. */
export const DRAG_THRESHOLD_PX = 4

/** The smallest a docked panel may be made. */
export const MIN_DOCKED_HEIGHT = 60

/** What a gesture remembers from its press. */
interface SessionStart {
  /** The pointer at the press. */
  readonly x: number
  /** The pointer at the press. */
  readonly y: number
  /** The frame's rectangle at the press. */
  readonly rect: PanelRect
  /** The frame's own style at the press, put back at the end. */
  readonly style: string
}

/** A panel being moved. */
export interface MoveSession extends SessionStart {
  /** What it is. */
  readonly kind: 'move'
  /** The column and the other docked panels, read at the press. */
  readonly geometry: DockGeometry
  /** Whether the pointer has gone past the threshold. */
  started: boolean
  /** Where it would land now. */
  target: DropTarget | null
}

/** A panel being resized. */
export interface ResizeSession extends SessionStart {
  /** What it is. */
  readonly kind: 'resize'
  /** The edges held. */
  readonly edges: ResizeEdges
  /** Whether the panel is docked: only its height changes. */
  readonly docked: boolean
  /** The rectangle now — {@link SessionStart.rect} stays the one at the press. */
  now: PanelRect
  /** Whether the pointer has gone past the threshold: a click on a handle resizes nothing. */
  moved: boolean
}

/** A gesture on a frame. */
export type FrameSession = MoveSession | ResizeSession

/** Where a pointer is. */
interface PointerAt {
  /** Across the window. */
  readonly clientX: number
  /** Down the window. */
  readonly clientY: number
}

/**
 * The frame's rectangle on the page.
 * @param frame - the frame
 * @returns its rectangle
 */
function rectOf(frame: HTMLElement): PanelRect {
  const box = frame.getBoundingClientRect()
  return { x: box.left, y: box.top, width: box.width, height: box.height }
}

/**
 * Lay the frame over the window at a rectangle, by its style.
 * @param frame - the frame
 * @param rect - where
 */
function place(frame: HTMLElement, rect: PanelRect): void {
  frame.style.position = 'fixed'
  frame.style.left = `${String(rect.x)}px`
  frame.style.top = `${String(rect.y)}px`
  frame.style.width = `${String(rect.width)}px`
  frame.style.height = `${String(rect.height)}px`
}

/**
 * Begin moving a panel.
 * @param frame - its frame
 * @param pointer - the press
 * @param geometry - the column and the other docked panels
 * @returns the session
 */
export function beginMove(
  frame: HTMLElement,
  pointer: PointerAt,
  geometry: DockGeometry
): MoveSession {
  const start = {
    x: pointer.clientX,
    y: pointer.clientY,
    rect: rectOf(frame),
    style: frame.style.cssText,
  }
  return { ...start, kind: 'move', geometry, started: false, target: null }
}

/**
 * Begin resizing a panel by some of its edges.
 * @param frame - its frame
 * @param pointer - the press
 * @param edges - the edges held
 * @param docked - whether it is docked, only its height changing
 * @returns the session
 */
export function beginResize(
  frame: HTMLElement,
  pointer: PointerAt,
  edges: ResizeEdges,
  docked: boolean
): ResizeSession {
  const rect = rectOf(frame)
  const style = frame.style.cssText
  return {
    kind: 'resize',
    x: pointer.clientX,
    y: pointer.clientY,
    rect,
    now: rect,
    moved: false,
    style,
    edges,
    docked,
  }
}

/**
 * Follow the pointer: move the frame, and show where it would dock.
 * @param session - the move
 * @param frame - its frame
 * @param pointer - the pointer now
 * @param line - the column's insertion line
 * @param window - the window's size
 * @param window.width - its width
 * @param window.height - its height
 */
export function followMove(
  session: MoveSession,
  frame: HTMLElement,
  pointer: PointerAt,
  line: HTMLElement | null,
  window: { readonly width: number; readonly height: number }
): void {
  const dx = pointer.clientX - session.x
  const dy = pointer.clientY - session.y
  if (!session.started && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
  session.started = true
  const rect = movedRect(session.rect, dx, dy, window)
  frame.dataset.dragging = 'true'
  place(frame, rect)
  const { dock, slots } = session.geometry
  session.target = dropTarget({
    pointer: { x: pointer.clientX, y: pointer.clientY },
    dock,
    slots,
    windowWidth: window.width,
    floatRect: rect,
  })
  if (line === null) return
  line.hidden = session.target.kind !== 'dock' || dock === null
  if (session.target.kind === 'dock' && dock !== null)
    line.style.top = `${String(insertionY(slots, session.target.index, dock) - dock.top)}px`
}

/**
 * Follow the pointer: resize the frame.
 * @param session - the resize
 * @param frame - its frame
 * @param pointer - the pointer now
 */
export function followResize(session: ResizeSession, frame: HTMLElement, pointer: PointerAt): void {
  const dx = pointer.clientX - session.x
  const dy = pointer.clientY - session.y
  // The same threshold as a move: a click, or a jitter, on a handle pins no size (review QUAL-002).
  if (!session.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
  session.moved = true
  if (session.docked) {
    // Docked, only the foot moves: the column decides the width and the place.
    const height = Math.max(MIN_DOCKED_HEIGHT, session.rect.height + dy)
    session.now = { ...session.rect, height }
    frame.style.height = `${String(height)}px`
    frame.style.flex = '0 0 auto'
    return
  }
  session.now = resizedRect(session.rect, session.edges, dx, dy)
  place(frame, session.now)
}

/**
 * End a gesture: put the frame's own style back, hide the insertion line, and say what it came to.
 * @param session - the gesture
 * @param frame - its frame
 * @param line - the column's insertion line
 * @returns where a moved panel lands, or the rectangle a resized one has; `null` for a press that never moved past the
 *   threshold
 */
export function endSession(
  session: FrameSession,
  frame: HTMLElement,
  line: HTMLElement | null
): DropTarget | PanelRect | null {
  cancelSession(session, frame, line)
  if (session.kind === 'resize') return session.moved ? session.now : null
  return session.started ? session.target : null
}

/**
 * Abandon a gesture the browser cancelled: put the frame's own style back and hide the insertion line, deciding
 * nothing (review QUAL-001) — the panel stays where it was.
 * @param session - the gesture
 * @param frame - its frame
 * @param line - the column's insertion line
 */
export function cancelSession(
  session: FrameSession,
  frame: HTMLElement,
  line: HTMLElement | null
): void {
  frame.style.cssText = session.style
  delete frame.dataset.dragging
  if (line !== null) line.hidden = true
}
