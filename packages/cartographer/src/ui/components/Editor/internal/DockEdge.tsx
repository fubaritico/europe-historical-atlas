import { useRef } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { PANEL_FRAME_MESSAGES } from '../../PanelFrame'
import { beginEdgeDrag, endEdgeDrag, followEdgeDrag } from '../utils/dockEdgeDrag'

import type { CartographerStoreHook } from '../../../../state/store'
import type { EdgeDrag } from '../utils/dockEdgeDrag'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * The column's left edge (CARTO-342): dragged, it widens or narrows the column (`utils/dockEdgeDrag`).
 * @param props - the store
 * @param props.store - the store the column's width lives in
 * @returns the edge
 */
export function DockEdge({ store }: { store: CartographerStoreHook }) {
  // Store actions
  const setDockWidth = store((state) => state.setDockWidth)

  // Context
  const t = useTranslation(PANEL_FRAME_MESSAGES)

  // Refs
  const drag = useRef<EdgeDrag | null>(null)

  // Handlers
  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const body = event.currentTarget.closest<HTMLElement>('.shell__body')
    if (event.button !== 0 || body === null) return
    drag.current = beginEdgeDrag(body, event.clientX, store.getState().panelLayout.dockWidth)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current !== null) followEdgeDrag(drag.current, event.clientX)
  }
  const finish = (commit: boolean) => {
    const current = drag.current
    drag.current = null
    if (current === null) return
    const width = endEdgeDrag(current, commit)
    if (width !== null) setDockWidth(width)
  }
  const handleUp = () => {
    finish(true)
  }
  const handleCancel = () => {
    finish(false)
  }

  // Render
  return (
    <div
      className="dock-edge"
      role="separator"
      aria-orientation="vertical"
      aria-label={t('resizeDock')}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
    />
  )
}
