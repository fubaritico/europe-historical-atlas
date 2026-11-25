import { useSyncExternalStore } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { APP_MESSAGES } from '../../../i18n/app'

import { AppBar } from './AppBar'
import { MenuBarPanel } from './MenuBarPanel'

import type { HistoryRelay } from '../../../../canvas/history/historyRelay'
import type { CartographerStoreHook } from '../../../../state/store'
import type { MapNameSource } from '../../../utils/mapNameSource'
import type { ReactNode } from 'react'

/**
 * The top bar's binding: the one place it knows where the map's name comes from (`react-canvas-and-panels`). `AppBar`
 * takes values; this reads the name — which *Save as…* changes — and hands it over, and puts the menu bar against the
 * mark, bound to the store and holding every gesture of the files (CARTO-345, CARTO-555).
 */

/** What the top bar's binding needs: the gestures, where the map's name is read, and what the menus read. */
export interface AppBarPanelProps {
  /** The map open's name, which *Save as…* changes — `null` on the start screen (CARTO-536). */
  mapName: MapNameSource
  /** Fichier › Ouvrir…, and ‹cmd+O›. */
  onOpen: () => void
  /** Fichier › Enregistrer, and ‹cmd+S›. */
  onSave: () => void
  /** Fichier › Enregistrer sous…, and ‹shift+cmd+S›. */
  onSaveAs: () => void
  /** Fichier › Enregistrer une copie. */
  onSaveCopy: () => void
  /** Fichier › Nouvelle carte… (CARTO-536). */
  onNewMap: () => void
  /** Fichier › Fermer la carte (CARTO-536). */
  onCloseMap: () => void
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
  /** Nobody signed in (CARTO-535): the menus Fichier and Édition greyed whole (CARTO-555). */
  signedOut?: boolean
  /** Who is signed in and « Se déconnecter », at the bar's right end. */
  account?: ReactNode
}

/**
 * The top bar, bound to the map's name, with the menu bar beside it.
 * @param props - the name's source, the store, the relay and the gestures
 * @param props.mapName - where the map's name is read
 * @param props.onOpen - Fichier › Ouvrir…
 * @param props.onSave - Fichier › Enregistrer
 * @param props.onSaveAs - Fichier › Enregistrer sous…
 * @param props.onSaveCopy - Fichier › Enregistrer une copie
 * @param props.store - what the menus read
 * @param props.history - the canvas's undo and redo
 * @param props.onCopy - Édition › Copier
 * @param props.onPaste - Édition › Coller les entités
 * @param props.onSelectAll - Édition › Tout sélectionner
 * @param props.onCopySheet - Édition › Copier la fiche
 * @param props.onNewMap - Fichier › Nouvelle carte…
 * @param props.onCloseMap - Fichier › Fermer la carte
 * @param props.signedOut - nobody signed in: the menus greyed whole
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
  onNewMap,
  onCloseMap,
  signedOut,
  account,
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
      account={account}
      menus={
        <MenuBarPanel
          store={store}
          history={history}
          onCopy={onCopy}
          onPaste={onPaste}
          onSelectAll={onSelectAll}
          onCopySheet={onCopySheet}
          onNewMap={onNewMap}
          onCloseMap={onCloseMap}
          disabled={signedOut === true}
          mapOpen={map !== null}
          {...gestures}
        />
      }
    />
  )
}
