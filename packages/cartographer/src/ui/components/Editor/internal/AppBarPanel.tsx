import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { APP_MESSAGES } from '../../../i18n/app'

import { AppBar } from './AppBar'
import { MenuBarPanel } from './MenuBarPanel'

import type { AppBarProps } from './AppBar'
import type { HistoryRelay } from '../../../../canvas/history/historyRelay'
import type { HeldClipboard } from '../../../../state/heldClipboard'
import type { CartographerStoreHook } from '../../../../state/store'
import type { MapNameSource } from '../../../utils/mapNameSource'

/**
 * The top bar's binding: the one place it knows where the map's name comes from (`react-canvas-and-panels`). `AppBar`
 * takes values; this reads the name — which *Save as…* changes — and hands it over with the four gestures, and puts the
 * menu bar beside the name, bound to the store (CARTO-345).
 */

/** What the top bar's binding needs: the gestures, where the map's name is read, and what the menus read. */
export interface AppBarPanelProps extends Omit<AppBarProps, 'name' | 'map' | 'menus'> {
  /** The map open's name, which *Save as…* changes. */
  mapName: MapNameSource
  /** The store the menus read the history and the selection from. */
  store: CartographerStoreHook
  /** The canvas's undo and redo, for Édition's first two commands. */
  history: HistoryRelay
  /** Édition › Copier. */
  onCopy: () => void
  /** Édition › Coller les entités, and ‹cmd+V›. */
  onPaste: () => void
  /** Édition › Tout sélectionner, and ‹cmd+A›. */
  onSelectAll: () => void
  /** What the clipboard holds, which lights Coller les entités. */
  clipboard: HeldClipboard
}

/**
 * The top bar, bound to the map's name, with the menu bar beside it.
 * @param props - the name's source, the store, the relay and the gestures
 * @param props.mapName - where the map's name is read
 * @param props.store - what the menus read
 * @param props.history - the canvas's undo and redo
 * @param props.onCopy - Édition › Copier
 * @param props.onPaste - Édition › Coller les entités
 * @param props.onSelectAll - Édition › Tout sélectionner
 * @param props.clipboard - what the clipboard holds
 * @returns the top bar
 */
export function AppBarPanel({
  mapName,
  store,
  history,
  onCopy,
  onPaste,
  onSelectAll,
  clipboard,
  ...gestures
}: AppBarPanelProps) {
  // Context
  const app = useTranslation(APP_MESSAGES)

  // State
  const map = useSyncExternalStore(mapName.subscribe, mapName.get)

  // Render
  return (
    <AppBar
      name={app('name')}
      map={map}
      {...gestures}
      menus={
        <MenuBarPanel
          store={store}
          history={history}
          clipboard={clipboard}
          onCopy={onCopy}
          onPaste={onPaste}
          onSelectAll={onSelectAll}
          {...gestures}
        />
      }
    />
  )
}
