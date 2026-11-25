import type { AutosaveTimers } from './autosaveKeeper'

/**
 * The window's timers, behind the port the year session and the automatic save take for their delays — in one place
 * since CARTO-536, where the composition root had them written twice.
 */
export const windowTimers: AutosaveTimers = {
  set: (run, delayMs) => window.setTimeout(run, delayMs),
  clear: (handle) => {
    window.clearTimeout(handle)
  },
}
