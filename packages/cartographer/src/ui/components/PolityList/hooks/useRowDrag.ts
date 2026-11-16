import { useEffect, useRef, useState } from 'react'

import { dropUnder } from '../utils/dropUnder'

import type { StackingSide } from '@europe-historical-atlas/core/editor/stacking'
import type { PointerEvent as ReactPointerEvent } from 'react'

/** How far the pointer goes, in pixels, before a press on a row becomes a drag — under it, a click. */
const DRAG_THRESHOLD_PX = 4

/** Where a dragged row would land: on which row, on which side of it. */
export interface RowDrop {
  /** The row dragged. */
  readonly id: string
  /** The row under the pointer, or `null` off the rows. */
  readonly overId: string | null
  /** In front of it — the upper half, the list showing the front first — or behind it. */
  readonly side: StackingSide
}

/** A row's drag: what it shows, what a row starts it with, and the click that chooses a row unless it ends a drag. */
export interface RowDrag {
  /** The drag under way, or `null`. */
  readonly drop: RowDrop | null
  /**
   * A press on a row — a drag begins once the pointer has gone {@link DRAG_THRESHOLD_PX} away.
   * @param id - the row's polity
   * @param event - the press
   */
  readonly onPointerDown: (id: string, event: ReactPointerEvent) => void
  /**
   * A click on a row: it chooses the row, unless it ends a drag.
   * @param id - the row's polity
   */
  readonly choose: (id: string) => void
}

/** A drag's state, outside React: where the press was, whether it became a drag, the drop as last shown. */
interface DragSession {
  /** The press, or `null` when none is held. */
  start: { id: string; x: number; y: number } | null
  /** Whether the press became a drag — the click that ends it is then swallowed. */
  dragged: boolean
  /** The drop as last shown, read at the release — never inside a state updater, which StrictMode runs twice. */
  shown: RowDrop | null
}

/**
 * The pointer moved: the drop it now shows, or `null` while no press is held or it has not gone far enough.
 * @param session - the drag's state, updated
 * @param event - the move
 * @returns the drop to show, or `null` for no change
 */
function moved(session: DragSession, event: PointerEvent): RowDrop | null {
  const pressed = session.start
  if (pressed === null || (!session.dragged && !wentFar(pressed, event))) return null
  session.dragged = true
  session.shown = { id: pressed.id, ...dropUnder(event.clientX, event.clientY) }
  return session.shown
}

/**
 * Whether the pointer has gone far enough from where it pressed for the press to be a drag.
 * @param pressed - where it pressed
 * @param pressed.x - in viewport pixels
 * @param pressed.y - in viewport pixels
 * @param event - where it is now
 * @returns whether it went {@link DRAG_THRESHOLD_PX} away or more
 */
function wentFar(pressed: { x: number; y: number }, event: PointerEvent): boolean {
  return Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) >= DRAG_THRESHOLD_PX
}

/**
 * The window's pointer and key listeners of a drag, added and the remover handed back.
 * @param on - what the pointer's move, its release and ‹escape› do
 * @param on.move - the pointer moved
 * @param on.up - the pointer released
 * @param on.escape - ‹escape› pressed
 * @returns the remover
 */
function listenToDrag(on: {
  move: (event: PointerEvent) => void
  up: () => void
  escape: () => void
}): () => void {
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') on.escape()
  }
  window.addEventListener('pointermove', on.move)
  window.addEventListener('pointerup', on.up)
  // A pointer the browser takes back — a touch turned into a scroll — ends the drag as ‹escape› does (review A11Y-001)
  window.addEventListener('pointercancel', on.escape)
  window.addEventListener('keydown', key)
  return () => {
    window.removeEventListener('pointermove', on.move)
    window.removeEventListener('pointerup', on.up)
    window.removeEventListener('pointercancel', on.escape)
    window.removeEventListener('keydown', key)
  }
}

/**
 * Drag a row of `{Polities}` onto a sibling (CARTO-457, the dev, 2026-11-16): press, move, the row under the pointer
 * marked on the side it would land; release drops it there through `onDrop`, which decides and says it; ‹escape› or a
 * pointer the browser takes back cancels; a release off the rows drops nothing and says so in the console. The click
 * a drag ends with chooses nothing; a drag cancelled is followed by no click, so the next one chooses (review
 * QUAL-001). The listeners follow the drop's handler; the drag lives in a ref, so nothing is lost when they are put
 * back.
 * @param onDrop - the drop: the row dragged, the row it lands on, the side
 * @param onChoose - a row chosen by a plain click
 * @returns the drag
 */
export function useRowDrag(
  onDrop: (id: string, besideId: string, side: StackingSide) => void,
  onChoose: (id: string) => void
): RowDrag {
  // Refs
  const session = useRef<DragSession>({ start: null, dragged: false, shown: null })

  // State
  const [drop, setDrop] = useState<RowDrop | null>(null)

  // Effects
  useEffect(() => {
    const held = session.current
    const end = (cancelled: boolean) => {
      held.start = null
      held.shown = null
      if (cancelled) held.dragged = false
      setDrop(null)
    }
    return listenToDrag({
      move: (event) => {
        const shown = moved(held, event)
        if (shown !== null) setDrop(shown)
      },
      up: () => {
        const current = held.shown
        end(false)
        if (current === null) return
        if (current.overId === null)
          console.warn('[Cartographer] a row of {Polities} dropped off the rows: nothing moved.')
        else onDrop(current.id, current.overId, current.side)
      },
      escape: () => {
        end(true)
      },
    })
  }, [onDrop])

  // Return
  return {
    drop,
    onPointerDown: (id, event) => {
      if (event.button !== 0) return
      session.current.dragged = false
      session.current.start = { id, x: event.clientX, y: event.clientY }
    },
    choose: (id) => {
      const ended = session.current.dragged
      session.current.dragged = false
      if (!ended) onChoose(id)
    },
  }
}
