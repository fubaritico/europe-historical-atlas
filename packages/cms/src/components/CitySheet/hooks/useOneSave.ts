import { useRef } from 'react'

/** One save at a time, and whether one is running. */
export interface OneSave {
  /** Whether a save is running. */
  readonly busy: () => boolean
  /**
   * Runs a save unless one is running — then answers `true`, the running one will say the rest.
   * @param save - the save
   * @returns its answer
   */
  readonly run: (save: () => Promise<boolean>) => Promise<boolean>
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
      if (running.current) return true
      running.current = true
      try {
        return await save()
      } finally {
        running.current = false
      }
    },
  }
}
