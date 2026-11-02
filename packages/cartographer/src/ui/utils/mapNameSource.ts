/**
 * The name of the map the page is (`s19`), as the chrome reads it: the top bar writes it, the page's heading says it,
 * and *Save as…* changes it without a reload. A tiny external store, like the dialogue openers
 * (`dialogueOpener.ts`): the session that changes it lives outside React.
 */

/** The map's name, read and listened to. */
export interface MapNameSource {
  /**
   * The name now.
   * @returns the map's name
   */
  get: () => string
  /**
   * Listen to it changing.
   * @param listener - called after each change
   * @returns a function that stops listening
   */
  subscribe: (listener: () => void) => () => void
}

/** The source, with the one gesture that changes it — the composition root's. */
export interface MapNameStore extends MapNameSource {
  /**
   * Change the name.
   * @param map - the map the page is now
   */
  set: (map: string) => void
}

/**
 * Build the store on the map the page opened.
 * @param initial - the map's name
 * @returns the store
 */
export function createMapNameStore(initial: string): MapNameStore {
  let name = initial
  const listeners = new Set<() => void>()
  return {
    get: () => name,
    set: (map) => {
      if (map === name) return
      name = map
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
