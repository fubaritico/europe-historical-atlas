import { useRef } from 'react'

import { useFrameGesture } from './hooks/useFrameGesture'
import { ResizeHandle } from './internal/ResizeHandle'

import type { PanelFrameProps } from './frameProps'
import type { ResizeEdges } from './utils/panelGeometry'
import type { CSSProperties } from 'react'

/**
 * A panel's frame (CARTO-342): grabbed by the panel's head, it follows the pointer and lands in the column — at the
 * place its insertion line shows — or floats where it is released; its edges resize it. **No library, no per-frame
 * React**: the gesture moves the frame by its style (`utils/dragSession`) and the store hears of it once, on release.
 */

/** The edges a floating panel is resized by. */
const FLOATING_HANDLES: readonly { readonly edges: ResizeEdges; readonly where: string }[] = [
  { edges: { right: true }, where: 'right' },
  { edges: { bottom: true }, where: 'bottom' },
  { edges: { left: true }, where: 'left' },
  { edges: { right: true, bottom: true }, where: 'corner' },
]

/** A docked panel's one handle: its foot. */
const DOCKED_HANDLES: readonly { readonly edges: ResizeEdges; readonly where: string }[] = [
  { edges: { bottom: true }, where: 'bottom' },
]

/**
 * Render a panel in its frame.
 * @param props - the panel, where it is, how to read the column, and what to do on release
 * @param props.children - the panel
 * @returns the frame
 */
export function PanelFrame({ children, ...props }: PanelFrameProps) {
  // Refs
  const frame = useRef<HTMLDivElement | null>(null)

  // Derived
  const { id, place } = props
  const floating = place.kind === 'floating'
  const style: CSSProperties = floating
    ? { left: place.rect.x, top: place.rect.y, width: place.rect.width, height: place.rect.height }
    : place.height === null
      ? {}
      : // Its height as its basis: the docked panels share what the column's height leaves alike, and shrink in
        // proportion to their bases when it lacks (`editor-chrome.css`, `.dock-stack > .panel-frame`).
        { flex: `1 1 ${String(place.height)}px` }

  // Handlers
  const gesture = useFrameGesture(frame, props)

  // Render
  return (
    <div
      ref={frame}
      className="panel-frame"
      data-panel={id}
      data-place={place.kind}
      data-sized={!floating && place.height !== null}
      style={style}
      onPointerDown={gesture.onPointerDown}
      onPointerMove={gesture.onPointerMove}
      onPointerUp={gesture.onPointerUp}
      onPointerCancel={gesture.onPointerCancel}
    >
      {children}
      {(floating ? FLOATING_HANDLES : DOCKED_HANDLES).map(({ edges, where }) => (
        <ResizeHandle
          key={where}
          where={where}
          edges={edges}

          onDown={gesture.onResizeDown}
        />
      ))}
    </div>
  )
}
