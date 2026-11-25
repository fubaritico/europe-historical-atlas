import { isMapName } from '@europe-historical-atlas/core/data/mapName'

import type { PageStorage } from './guardedStorage'

/**
 * Which map this tab has open — kept in the tab's storage, never in the address (the dev, 2026-11-25: « je veux plus de
 * variables d'URL », CARTO-536). A reload reopens it; a new tab, or a map closed, opens on the start screen.
 *
 * **No map is the ordinary case, not a failure**: the Cartographer opens on its start screen, where the author chooses
 * one. **A kept name that cannot be a map's** — only this module writes it, so a defect or a hand edit — opens the start
 * screen too, said in the console: it would be no safer to guess a map in its place (CARTO-536, the coder's call).
 * Closing a map writes the empty name, which is no map's: the storage the page holds has no `removeItem`.
 *
 * **Unlike the view or the panels, this is no comfort**: a tab whose storage the browser refuses cannot open a map at
 * all, since the page reloads to open one. So a write is read back, and the caller is told when it did not hold (review
 * ARCH-001, 2026-11-25).
 */

/** Where the map open is kept, in the tab's storage. */
export const OPEN_MAP_KEY = 'cartographer:open-map'

/**
 * The map this tab had open, to open again.
 * @param storage - the tab's storage
 * @returns the map's name, or `null` when the tab has none open
 */
export function keptOpenMap(storage: PageStorage): string | null {
  const kept = storage.getItem(OPEN_MAP_KEY)
  if (kept === null || kept === '') return null
  if (isMapName(kept)) return kept
  console.warn(
    `[Cartographer] the map kept open, « ${kept} », cannot be a map's name — opening on the start screen`
  )
  return null
}

/**
 * Keep a map as the one this tab has open — written before the page reloads on it.
 * @param storage - the tab's storage
 * @param map - the map's name
 * @returns `true` when the tab holds it — `false` when the browser refused the write
 */
export function keepOpenMap(storage: PageStorage, map: string): boolean {
  storage.setItem(OPEN_MAP_KEY, map)
  return storage.getItem(OPEN_MAP_KEY) === map
}

/**
 * Keep no map open: the page reloads on the start screen.
 * @param storage - the tab's storage
 * @returns `true` when the tab holds no map — `false` when the browser refused the write
 */
export function forgetOpenMap(storage: PageStorage): boolean {
  storage.setItem(OPEN_MAP_KEY, '')
  return storage.getItem(OPEN_MAP_KEY) === ''
}

/** The map open, kept in the tab and followed — what the page does with it. */
export interface TabMapKeeper {
  /**
   * Keep a map, or none, then reload the page on it; a write the browser refused changes nothing, said.
   * @param map - the map to open, or `null` for the start screen
   */
  reloadOn: (map: string | null) => void
  /** No map kept, then the page reloaded — « Se déconnecter » closes the map (the dev, 2026-11-25). */
  forget: () => void
  /**
   * Keep the map the page has become, with no reload — *Save as…*; a refused write said.
   * @param map - the map's name
   */
  follow: (map: string) => void
}

/** What keeping the map open needs. */
export interface TabMapKeeperDeps {
  /** The tab's storage. */
  storage: PageStorage
  /** Reload the page — `window.location.reload` in the page, a spy in a test. */
  reload: () => void
  /**
   * Say that the browser refused the write — the page stays as it is.
   * @param map - the map that could not be kept, or `null` for the start screen
   */
  refused: (map: string | null) => void
}

/**
 * Build the keeper of the map open (CARTO-536, review ARCH-001 of 2026-11-25).
 * @param deps - the storage, the reload, and how a refusal is said
 * @returns the keeper
 */
export function createTabMapKeeper(deps: TabMapKeeperDeps): TabMapKeeper {
  const reloadOn = (map: string | null): void => {
    const kept = map === null ? forgetOpenMap(deps.storage) : keepOpenMap(deps.storage, map)
    if (kept) deps.reload()
    else deps.refused(map)
  }
  return {
    reloadOn,
    forget: () => {
      reloadOn(null)
    },
    follow: (map) => {
      if (!keepOpenMap(deps.storage, map)) deps.refused(map)
    },
  }
}
