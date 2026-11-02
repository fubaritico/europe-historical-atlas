import { useRef } from 'react'

import {
  beginMove,
  beginResize,
  cancelSession,
  endSession,
  followMove,
  followResize,
} from '../utils/dragSession'
import { grabsPanel } from '../utils/grabbable'

import type { PanelRect } from '../../../../state/panelsSlice'
import type { PanelFrameProps } from '../frameProps'
import type { FrameSession } from '../utils/dragSession'
import type { DropTarget, ResizeEdges } from '../utils/panelGeometry'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

/** What the frame's element and its handles are given. */
export interface FrameGesture {
  /** A press on the frame: on the panel's head, it starts a move. */
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** The pointer moved, captured by the frame. */
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  /** The pointer was released: the gesture decides. */
  onPointerUp: () => void
  /** The browser cancelled the gesture: nothing is decided, the panel stays where it was. */
  onPointerCancel: () => void
  /** A press on a resize handle, with the edges it holds. */
  onResizeDown: (event: ReactPointerEvent<HTMLDivElement>, edges: ResizeEdges) => void
}

/**
 * Whether what a gesture came to is a drop rather than a rectangle.
 * @param outcome - the gesture's answer
 * @returns `true` for a drop
 */
function isDrop(outcome: DropTarget | PanelRect): outcome is DropTarget {
  return 'kind' in outcome
}

/**
 * The frame's gesture: a move from the panel's head, a resize from a handle — followed by the frame's style, answered
 * once on release (`utils/dragSession`).
 * @param frame - the frame's element, created by the frame
 * @param props - the frame's panel, where it is, and what to do on release
 * @returns the frame's handlers
 */
export function useFrameGesture(
  frame: RefObject<HTMLDivElement | null>,
  props: Omit<PanelFrameProps, 'children'>
): FrameGesture {
  // Refs
  const session = useRef<FrameSession | null>(null)

  // Derived
  const { id, place, geometry, insertLine, onDrop, onResizeFloating, onResizeDocked } = props
  const floating = place.kind === 'floating'

  // Return
  return {
    onPointerDown: (event) => {
      if (event.button !== 0 || frame.current === null || !grabsPanel(event.target)) return
      session.current = beginMove(frame.current, event, geometry(id))
      frame.current.setPointerCapture(event.pointerId)
    },
    onResizeDown: (event, edges) => {
      if (event.button !== 0 || frame.current === null) return
      event.stopPropagation()
      session.current = beginResize(frame.current, event, edges, !floating)
      frame.current.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event) => {
      const current = session.current
      if (current === null || frame.current === null) return
      const size = { width: window.innerWidth, height: window.innerHeight }
      if (current.kind === 'move')
        followMove(current, frame.current, event, insertLine.current, size)
      else followResize(current, frame.current, event)
    },
    onPointerUp: () => {
      const current = session.current
      session.current = null
      if (current === null || frame.current === null) return
      const outcome = endSession(current, frame.current, insertLine.current)
      if (outcome === null) return
      if (isDrop(outcome)) onDrop(id, outcome)
      else if (floating) onResizeFloating(id, outcome)
      else onResizeDocked(id, outcome.height)
    },
    onPointerCancel: () => {
      const current = session.current
      session.current = null
      if (current === null || frame.current === null) return
      console.warn(
        `[Cartographer] moving or resizing the ${id} panel was cancelled; it stays where it was`
      )
      cancelSession(current, frame.current, insertLine.current)
    },
  }
}
