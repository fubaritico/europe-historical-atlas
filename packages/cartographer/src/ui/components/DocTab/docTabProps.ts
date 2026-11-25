import type { Ref } from 'react'

/** One map open, as its tab shows it (CARTO-556). */
export interface DocTabEntry {
  /** The map — its folder's name, unique among the maps open. */
  id: string
  /** What the tab says: the map's name. */
  name: string
  /** Whether it is the map shown — the one tab whose zoom is written. */
  active: boolean
}

/** What a tab shows and does. */
export interface DocTabProps extends DocTabEntry {
  /** Where the zoom is written, outside React — the active tab's only. */
  zoomRef?: Ref<HTMLSpanElement>
  /**
   * Show this map — a click on the tab.
   * @param id - the map
   */
  onActivate: (id: string) => void
  /**
   * Close this map — its cross: « save first? » when it changed, then the start screen.
   * @param id - the map
   */
  onClose: (id: string) => void
}
