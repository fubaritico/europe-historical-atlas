import { followZoom } from '../utils/followZoom'

import { DocBar } from './DocBar'

import type { HistoryRelay } from '../../../../canvas/history/historyRelay'
import type { CartographerStoreHook } from '../../../../state/store'

/**
 * The document bar's binding: the one place it knows there is a store (`react-canvas-and-panels`). `DocBar`
 * takes values; this reads the slices and hands them over.
 */

/** What the document bar's binding needs. */
export interface DocBarPanelProps {
  /** The store the history's state and the view are read from. */
  store: CartographerStoreHook
  /** The canvas's undo and redo, gesture first — never `store.undo()` straight (ARCH-101). */
  history: HistoryRelay
}

/**
 * The document bar, bound to the store and to the canvas's history.
 * @param props - the store and the relay
 * @param props.store - the store
 * @param props.history - the canvas's undo and redo
 * @returns the document bar
 */
export function DocBarPanel({ store, history }: DocBarPanelProps) {
  // Store
  const year = store((state) => state.document.year)
  const undoLabel = store((state) => state.undoLabel)
  const redoLabel = store((state) => state.redoLabel)

  // Handlers
  const handleUndo = () => {
    history.run('undo')
  }
  const handleRedo = () => {
    history.run('redo')
  }
  const handleZoomRef = (node: HTMLSpanElement | null) => followZoom(store, node)

  // Render
  return (
    <DocBar
      year={year}
      undoLabel={undoLabel}
      redoLabel={redoLabel}
      onUndo={handleUndo}
      onRedo={handleRedo}
      zoomRef={handleZoomRef}
    />
  )
}
