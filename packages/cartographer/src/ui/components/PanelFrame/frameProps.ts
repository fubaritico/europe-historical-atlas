import type { DropTarget, PageBox } from './utils/panelGeometry'
import type { PanelId, PanelRect } from '../../../state/panelsSlice'
import type { ReactNode, RefObject } from 'react'

/*
 * The frame's props, apart from its component, so the dock that renders frames can name them without importing the
 * component's file twice.
 */

/** What the frame reads off the page when a drag begins: the column and the other docked panels. */
export interface DockGeometry {
  /** The column's box, or `null` when it is hidden. */
  readonly dock: PageBox | null
  /** The other docked panels' boxes, top to bottom. */
  readonly slots: readonly PageBox[]
}

/** What a frame needs. */
export interface PanelFrameProps {
  /** Its panel. */
  id: PanelId
  /** Docked in the column, or floating at a rectangle. */
  place:
    | { readonly kind: 'docked'; readonly height: number | null }
    | { readonly kind: 'floating'; readonly rect: PanelRect }
  /** The column and the other docked panels, read when a drag begins. */
  geometry: (id: PanelId) => DockGeometry
  /** The column's insertion line, shown where a panel would dock. */
  insertLine: RefObject<HTMLElement | null>
  /** The panel was released: dock it or float it. */
  onDrop: (id: PanelId, target: DropTarget) => void
  /** A floating panel was resized. */
  onResizeFloating: (id: PanelId, rect: PanelRect) => void
  /** A docked panel was given a height. */
  onResizeDocked: (id: PanelId, height: number) => void
  /** The panel. */
  children: ReactNode
}
