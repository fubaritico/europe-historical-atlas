import { useSyncExternalStore } from 'react'

import { followZoom } from '../utils/followZoom'

import { DocBar } from './DocBar'

import type { HistoryRelay } from '../../../../canvas/history/historyRelay'
import type { CartographerStoreHook } from '../../../../state/store'
import type { MapNameSource } from '../../../utils/mapNameSource'

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
  /** The map open's name — its tab's (CARTO-556); *Save as…* changes it. */
  mapName: MapNameSource
  /** Fichier › Fermer la carte — the tab's cross does the same (CARTO-556). */
  onCloseMap: () => void
}

/**
 * The document bar, bound to the store and to the canvas's history.
 * @param props - the store and the relay
 * @param props.store - the store
 * @param props.history - the canvas's undo and redo
 * @param props.mapName - the map open's name, for its tab
 * @param props.onCloseMap - close the map, from its tab's cross
 * @returns the document bar
 */
export function DocBarPanel({ store, history, mapName, onCloseMap }: DocBarPanelProps) {
  // Store
  const undoLabel = store((state) => state.undoLabel)
  const redoLabel = store((state) => state.redoLabel)

  // State
  const map = useSyncExternalStore(mapName.subscribe, mapName.get)

  // Derived
  // One map open, its tab shown — the list several maps open will fill (CARTO-556).
  const tabs = map === null ? [] : [{ id: map, name: map, active: true }]

  // Handlers
  const handleUndo = () => {
    history.run('undo')
  }
  const handleRedo = () => {
    history.run('redo')
  }
  const handleZoomRef = (node: HTMLSpanElement | null) => followZoom(store, node)
  // The one map open is the map shown: its tab clicked shows it already. Another — none today — is declined, said.
  const handleActivate = (id: string): void => {
    if (id !== map) console.warn(`[Cartographer] the map ${id} is not open in this page`)
  }
  const handleClose = (): void => {
    onCloseMap()
  }

  // Render
  return (
    <DocBar
      tabs={tabs}
      onActivate={handleActivate}
      onClose={handleClose}
      undoLabel={undoLabel}
      redoLabel={redoLabel}
      onUndo={handleUndo}
      onRedo={handleRedo}
      zoomRef={handleZoomRef}
    />
  )
}
