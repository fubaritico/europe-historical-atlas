/**
 * The page's storage, guarded (CARTO-371, the dev, 2026-11-07: *"si le navigateur refuse de garder les filtres, on ne le
 * fait pas"*). The browser may refuse it — site data blocked in its settings, a private window, a full quota — and then
 * `localStorage` throws, at its first touch or at a write. **What is kept there is a comfort** (the panels' layout, the
 * cities' filters): refused, nothing is kept and the Cartographer carries on as at first; **the console says it once**,
 * since no refusal is silent (`rules/error-handling.md`), never at each write.
 */

/** The storage, reduced to what is read and written — `localStorage` in the page, a map in a test. */
export interface PageStorage {
  /**
   * @param key - the key
   * @returns the value, or `null` when none is kept — or the storage refused
   */
  getItem: (key: string) => string | null
  /**
   * @param key - the key
   * @param value - the value; not kept when the storage refuses
   */
  setItem: (key: string, value: string) => void
}

/**
 * The page's storage behind a guard: a refusal — at opening it, at a read, at a write — keeps nothing and is said once.
 * @param open - how to reach the storage, `() => window.localStorage` in the page; it may throw
 * @returns the guarded storage
 */
export function guardedStorage(open: () => PageStorage): PageStorage {
  let said = false
  const refused = (error: unknown): void => {
    if (said) return
    said = true
    console.warn(
      '[Cartographer] the browser refuses its storage: nothing is kept from one session to the next',
      error
    )
  }
  let storage: PageStorage | null = null
  try {
    storage = open()
  } catch (error: unknown) {
    refused(error)
  }
  return {
    getItem: (key) => {
      if (storage === null) return null
      try {
        return storage.getItem(key)
      } catch (error: unknown) {
        refused(error)
        return null
      }
    },
    setItem: (key, value) => {
      if (storage === null) return
      try {
        storage.setItem(key, value)
      } catch (error: unknown) {
        refused(error)
      }
    },
  }
}
