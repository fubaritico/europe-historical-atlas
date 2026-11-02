import { useRef } from 'react'
import { createPortal } from 'react-dom'

import { PANEL_IDS } from '../../../../state/panelsSlice'
import { PanelFrame } from '../../PanelFrame'
import { dockGeometry } from '../utils/dockGeometry'

import { DockEdge } from './DockEdge'
import { DockedPanel } from './DockedPanel'

import type { PanelDeps } from './DockedPanel'
import type { PanelId } from '../../../../state/panelsSlice'
import type { DockGeometry, DropTarget } from '../../PanelFrame'

/**
 * The panels — `{Polities}`, `{Line}`, `{Overrides}`, `{Layers}`, `{Cities}` — docked in the right column in the order
 * the author left them, or floating over the window (CARTO-342). Each is in a frame that moves and resizes it; the
 * column holds the insertion line a dragged panel docks at, and its left edge widens or narrows it.
 * @param props - what the panels need
 * @param props.store - the store the layout lives in
 * @returns the column's content, and the floating panels over the window
 */
export function Dock({ store, ...deps }: PanelDeps) {
  // Store
  const layout = store((state) => state.panelLayout)

  // Store actions
  const floatPanel = store((state) => state.floatPanel)
  const dockPanel = store((state) => state.dockPanel)
  const setPanelHeight = store((state) => state.setPanelHeight)

  // Refs
  const stack = useRef<HTMLDivElement | null>(null)
  const line = useRef<HTMLDivElement | null>(null)

  // Handlers
  const geometry = (id: PanelId): DockGeometry => dockGeometry(stack.current, id)
  const handleDrop = (id: PanelId, target: DropTarget) => {
    if (target.kind === 'dock') dockPanel(id, target.index)
    else floatPanel(id, target.rect)
  }
  const frameOf = (id: PanelId, place: Parameters<typeof PanelFrame>[0]['place']) => (
    <PanelFrame
      key={id}
      id={id}
      place={place}
      geometry={geometry}
      insertLine={line}
      onDrop={handleDrop}
      onResizeFloating={floatPanel}
      onResizeDocked={setPanelHeight}
    >
      <DockedPanel id={id} store={store} {...deps} />
    </PanelFrame>
  )

  // Render
  return (
    <>
      <div className="dock-stack" ref={stack}>
        {layout.docked.map((id) =>
          frameOf(id, { kind: 'docked', height: layout.heights[id] ?? null })
        )}
        <div className="dock-insert" ref={line} hidden />
      </div>
      <DockEdge store={store} />
      {createPortal(
        PANEL_IDS.map((id) => {
          const rect = layout.floating[id]
          return rect === undefined ? null : frameOf(id, { kind: 'floating', rect })
        }),
        document.body
      )}
    </>
  )
}
