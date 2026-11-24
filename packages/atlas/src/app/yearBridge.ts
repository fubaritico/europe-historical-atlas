import type { AtlasStore } from './atlasStore'

/**
 * The map's side of the year (ATLAS-392): a year requested in the atlas's store is drawn on the map, and the request is
 * settled in the store once the drawing is over — whoever requested it, the interface or the dev panel.
 *
 * **A failure changes nothing here**: the map's drawing tells it itself (`loading/stages/political.ts`, the year's
 * notice) and leaves the year before on screen, so the request settles on the year still drawn — what the temporary
 * year switch did before the store (ATLAS-333). An unexpected rejection settles the request too, then goes on to the
 * atlas's error net.
 */

/** What the bridge needs of the map. */
export interface YearBridgeDeps {
  /** The atlas's store. */
  store: Pick<AtlasStore, 'getState' | 'subscribe'>
  /**
   * Set the year the map's drawing reads, and show it in the dev panel.
   * @param year - the year requested
   */
  setYear: (year: number) => void
  /** Draw the year set; settles when it is drawn, failed or overtaken. */
  draw: () => Promise<void>
  /** The year now drawn on the map; `null` before any. */
  drawnYear: () => number | null
}

/**
 * Bridge the year requested in the store to the map. Each request is drawn, even one for the year already being drawn:
 * a request is a new object, so the subscription hears it.
 * @param deps - the store, and how the map sets, draws and tells its year
 * @returns the unsubscription
 */
export function bridgeYear(deps: YearBridgeDeps): () => void {
  return deps.store.subscribe(
    (state) => state.requested,
    (request) => {
      if (request === null) return
      deps.setYear(request.year)
      // `finally` passes a rejection on: settled first, so the switch gives its buttons back, then the error net.
      void deps.draw().finally(() => {
        deps.store.getState().yearSettled(request.serial, deps.drawnYear())
      })
    }
  )
}
