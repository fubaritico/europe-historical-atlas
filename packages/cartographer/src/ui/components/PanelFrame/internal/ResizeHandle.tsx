import type { ResizeEdges } from '../utils/panelGeometry'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * One resize handle of a frame: a strip on an edge, or a square at the corner — by the pointer only; a panel's size
 * by the keyboard is not built (review A11Y-004, a courtesy in the editor).
 * @param props - where it is, what it holds, its name and its press
 * @param props.where - `right`, `bottom`, `left` or `corner`, for its place and cursor
 * @param props.edges - the edges it moves
 * @param props.onDown - a press on it
 * @returns the handle
 */
export function ResizeHandle({
  where,
  edges,
  onDown,
}: {
  where: string
  edges: ResizeEdges
  onDown: (event: ReactPointerEvent<HTMLDivElement>, edges: ResizeEdges) => void
}) {
  // Handlers
  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onDown(event, edges)
  }

  // Render
  return (
    <div
      className={`panel-frame__resize panel-frame__resize--${where}`}
      onPointerDown={handleDown}
    />
  )
}
