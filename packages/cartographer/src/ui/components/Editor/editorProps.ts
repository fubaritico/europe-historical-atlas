import type { HistoryRelay } from '../../../canvas/history/historyRelay'
import type { PaintStyle } from '../../../canvas/paint/painter'
import type { ResultRelay } from '../../../persistence/resultRelay'
import type { SessionKeeper } from '../../../persistence/sessionKeeper'
import type { PolityColourSource } from '../../../state/polityColourSource'
import type { SessionStore } from '../../../state/sessionStore'
import type { CartographerStoreHook } from '../../../state/store'
import type { WikidataSource } from '../../../wikidata/wikidataSource'
import type { MapNameSource } from '../../utils/mapNameSource'
import type { BackdropLoad } from '../MapArea'
import type { ReactNode } from 'react'

/** What the page needs, which is what the map needs plus the store. */
export interface EditorProps {
  /** The store the canvas draws from and navigates. */
  store: CartographerStoreHook
  /** How to fetch and bake the backdrop. */
  load: BackdropLoad
  /** The colours and sizes the painter reads. */
  style: PaintStyle
  /** The page's `<h1>`, which {@link Shell} places inside the canvas landmark. */
  heading: ReactNode
  /** The top bar's *Open…*: the maps of `years/` (`s19`). */
  onOpen: () => void
  /** The top bar's `[Save]`, the same call as ‹ctrl+S›. */
  onSave: () => void
  /** The top bar's *Save as…*. */
  onSaveAs: () => void
  /** The top bar's *Save a copy*. */
  onSaveCopy: () => void
  /** Édition › Copier: the polity or the stretch selected, as ‹cmd+C› (CARTO-345). */
  onCopy: () => void
  /** Édition › Coller les entités: what the clipboard holds, as ‹cmd+V› (CARTO-345). */
  onPaste: () => void
  /** Édition › Tout sélectionner: every point of the polity selected, as ‹cmd+A› (`open-outlines.md`). */
  onSelectAll: () => void
  /** Édition › Copier la fiche: the polity selected's sheet alone, as ‹shift+cmd+C› (CARTO-345). */
  onCopySheet: () => void
  /** The map open's name, which *Save as…* changes — written in the top bar. */
  mapName: MapNameSource
  /** The canvas's undo and redo, for the document bar's buttons. */
  history: HistoryRelay
  /** Where the polities' colours come from — one source for the canvas and every panel. */
  colours: PolityColourSource
  /** Where the polity form reads Wikidata from (CARTO-243) — the public API, a stub in tests. */
  wikidata: WikidataSource
  /**
   * Messages from outside React for the result zone — the stacking keys' answers
   * (`persistence/resultRelay.ts`).
   */
  results: ResultRelay
  /** Who is signed in, and the keeper that signs in and out (CARTO-535) — the editor shows only once someone is. */
  session: SessionHandle
  /** « Se déconnecter »: the map saved first when the author says so, then the session closed (CARTO-535). */
  onSignOut: () => void
}

/** The session, as the editor reads and drives it (CARTO-535). */
export interface SessionHandle {
  /** Where the session stands. */
  store: SessionStore
  /** Signs in, out, and asks again. */
  keeper: SessionKeeper
}
