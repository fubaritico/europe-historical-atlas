import { useRef } from 'react'

import type { ChainAnswer } from '../utils/saveLines'

/** One save at a time, and whether one is running. */
export interface OneSave {
  /** Whether a save is running. */
  readonly busy: () => boolean
  /**
   * Runs a save unless one is running — then answers `'busy'`: the running one will say the rest, and nothing after
   * it is sent (review QUAL-005).
   * @param save - the save
   * @returns its answer
   */
  readonly run: (save: () => Promise<ChainAnswer>) => Promise<ChainAnswer>
}

/**
 * One save at a time (QUAL-022): a second « Enregistrer » while the first runs sends nothing.
 * @returns the guard
 */
export function useOneSave(): OneSave {
  const running = useRef(false)
  return {
    busy: () => running.current,
    run: async (save) => {
      if (running.current) {
        console.warn('[CMS] a save is already running: this « Enregistrer » sends nothing')
        return 'busy'
      }
      running.current = true
      try {
        return await save()
      } finally {
        running.current = false
      }
    },
  }
}
