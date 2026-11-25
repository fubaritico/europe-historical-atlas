import { changeMap, closeMap, leaveMap } from './mapChange'
import { createNewMap } from './newMap'

import type { MapChangeDeps } from './mapChange'
import type { NewMapDeps, NewMapOutcome, NewMapRequest } from './newMap'
import type { SaveAsOutcome, YearSession } from './yearSession'

/**
 * The gestures that change which map the page is — *Open…*, « Fermer la carte », « Nouvelle carte », *Save as…* — with a
 * map open or from the start screen, where none is (CARTO-536). From the start screen a map opens at once, nothing open
 * to save; « Fermer la carte » and *Save as…* need a map, and are greyed there — reaching one anyway is declined in the
 * console.
 */

/** What the gestures need. */
export interface MapGesturesDeps extends Omit<MapChangeDeps, 'session' | 'go'> {
  /** The map's session, or `null` on the start screen. */
  session: YearSession | null
  /**
   * Reload the page on a map, or on the start screen — the map kept in the tab first.
   * @param map - the map to open, or `null` for the start screen
   */
  reloadOn: (map: string | null) => void
  /** Where a new map is written. */
  archive: NewMapDeps['archive']
  /** The empty document of a year. */
  emptyYear: NewMapDeps['emptyYear']
}

/** The gestures. */
export interface MapGestures {
  /**
   * Open a map — the question first when the map open changed.
   * @param map - the map chosen
   * @returns `true` when the page is on its way to it
   */
  openMap: (map: string) => Promise<boolean>
  /**
   * « Fermer la carte » — back to the start screen.
   * @returns `true` when the page is on its way to the start screen
   */
  closeMap: () => Promise<boolean>
  /**
   * « Nouvelle carte » — an empty map of a year, then the page on it.
   * @param request - the year and the name typed
   * @returns done, or the refusal the form shows
   */
  createMap: (request: NewMapRequest) => Promise<NewMapOutcome>
  /**
   * *Save as…* — the session's.
   * @param name - the name typed
   * @returns done, or the refusal the form shows
   */
  saveAs: (name: string) => Promise<SaveAsOutcome>
}

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/**
 * Build the gestures over the map's session, or over none.
 * @param deps - the session, the question, the view, the reload, the archive, where to report
 * @returns the gestures
 */
export function createMapGestures(deps: MapGesturesDeps): MapGestures {
  const { session, reloadOn, archive, emptyYear, ...asking } = deps
  const leaving = (mapSession: YearSession): MapChangeDeps => ({
    ...asking,
    session: mapSession,
    go: reloadOn,
  })
  return {
    openMap: (map) => {
      if (session !== null) return changeMap(leaving(session), map)
      reloadOn(map)
      return Promise.resolve(true)
    },
    closeMap: () => {
      if (session !== null) return closeMap(leaving(session))
      console.warn(`${LOG_TAG} close the map declined: no map is open`)
      return Promise.resolve(false)
    },
    createMap: (request) =>
      createNewMap(
        {
          archive,
          emptyYear,
          current: () => (session === null ? null : session.map()),
          leave: (map) =>
            session === null
              ? Promise.resolve(true)
              : leaveMap(leaving(session), { kind: 'open', map }),
          open: (map) => {
            asking.carryView()
            reloadOn(map)
          },
          words: asking.words,
        },
        request
      ),
    saveAs: (name) => {
      if (session !== null) return session.saveAs(name)
      console.warn(`${LOG_TAG} save as declined: no map is open`)
      return Promise.resolve({ done: false, refusal: null })
    },
  }
}
