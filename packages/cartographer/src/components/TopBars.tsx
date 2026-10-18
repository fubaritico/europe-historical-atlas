import { zoomLabel } from '../view/zoomLabel'

import { AppBar } from './AppBar'
import { DocBar } from './DocBar'

import type { HistoryRelay } from '../canvas/historyRelay'
import type { CartographerStoreHook } from '../state/store'

/**
 * The bindings of the two top bars: the one place each knows there is a store (`react-canvas-and-panels`).
 * `AppBar` and `DocBar` take values; these read the slices and hand them over.
 */

/** What the top bar's binding needs. */
export interface AppBarPanelProps {
  /** The store the open year is read from. */
  store: CartographerStoreHook
  /** The application's name. */
  name: string
  /** Save the open year — the same call as ‹ctrl+S›, from the composition root. */
  onSave: () => void
  /** Open the *Open snapshot* dialogue. */
  onOpenSnapshot: () => void
}

/**
 * The top bar, bound to the store.
 * @param props - the store, the name, and what saving does
 * @param props.store - the store
 * @param props.name - the application's name
 * @param props.onSave - save the open year
 * @param props.onOpenSnapshot - open the snapshot dialogue
 * @returns the top bar
 */
export function AppBarPanel({ store, name, onSave, onOpenSnapshot }: AppBarPanelProps) {
  // Store
  const year = store((state) => state.document.year)

  // Render
  return <AppBar name={name} year={year} onSave={onSave} onOpenSnapshot={onOpenSnapshot} />
}

/** What the document bar's binding needs. */
export interface DocBarPanelProps {
  /** The store the history's state and the view are read from. */
  store: CartographerStoreHook
  /** The canvas's undo and redo, gesture first — never `store.undo()` straight (ARCH-101). */
  history: HistoryRelay
}

/**
 * Write the zoom into its node and keep it written, outside React: subscribed to the viewport, which a
 * wheel changes on every notch.
 * @param store - the store
 * @param node - the zoom's node, or `null` on detach
 * @returns the unsubscription, or nothing on detach
 */
function followZoom(store: CartographerStoreHook, node: HTMLSpanElement | null) {
  if (node === null) return undefined
  return store.subscribe(
    (state) => state.viewport,
    (viewport) => {
      node.textContent = zoomLabel(viewport, window.devicePixelRatio)
    },
    { fireImmediately: true }
  )
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
