import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { APP_MESSAGES } from '../../../i18n/app'
import { EDITOR_MESSAGES } from '../i18n'

import { AppBar } from './AppBar'
import { MenuBarPanel } from './MenuBarPanel'

import type { AppBarProps } from './AppBar'
import type { HistoryRelay } from '../../../../canvas/history/historyRelay'
import type { CartographerStoreHook } from '../../../../state/store'
import type { MapNameSource } from '../../../utils/mapNameSource'
import type { ReactNode } from 'react'

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
  /** Édition › Copier la fiche, and ‹shift+cmd+C›. */
  onCopySheet: () => void
  /** Nobody signed in (CARTO-535): every gesture of the bar and its menus greyed. */
  signedOut?: boolean
  /** Who is signed in and « Se déconnecter », at the bar's right end. */
  account?: ReactNode
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
 * @param props.onCopySheet - Édition › Copier la fiche
 * @param props.signedOut - nobody signed in: every gesture greyed
 * @param props.account - who is signed in, at the right end
 * @returns the top bar
 */
export function AppBarPanel({
  mapName,
  store,
  history,
  onCopy,
  onPaste,
  onSelectAll,
  onCopySheet,
  signedOut,
  account,
  ...gestures
}: AppBarPanelProps) {
  // Context
  const app = useTranslation(APP_MESSAGES)
  const t = useTranslation(EDITOR_MESSAGES)

  // State
  const map = useSyncExternalStore(mapName.subscribe, mapName.get)

  // Render
  return (
    <AppBar
      name={app('name')}
      map={map}
      {...gestures}
      {...(signedOut === true ? { unavailable: t('signInFirst') } : {})}
      account={account}
      menus={
        <MenuBarPanel
          store={store}
          history={history}
          onCopy={onCopy}
          onPaste={onPaste}
          onSelectAll={onSelectAll}
          onCopySheet={onCopySheet}
          disabled={signedOut === true}
          {...gestures}
        />
      }
    />
  )
}
