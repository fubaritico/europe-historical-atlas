import { useEffect, useState } from 'react'

import type { ChainReading } from '../utils/readVassalChain'

/** How long the chain waits after the last change of the title or the year before reading. */
export const READ_DELAY_MS = 300

/** Where the chain under the holder stands. */
export type VassalChainState =
  /** No title chosen: nothing to read. */
  | { kind: 'none' }
  /** A title chosen, but no year to read its chain at. */
  | { kind: 'no-year' }
  /** Being read. */
  | { kind: 'loading' }
  /**
   * Read: one reading when the sources agree, one per branch when they diverge — with the year it was read at, so a
   * heading never names a year its readings were not read at, in the render before a new read starts.
   */
  | { kind: 'read'; year: number; readings: ChainReading[] }
  /** The read failed: the field says so, the console keeps why. */
  | { kind: 'failed' }

/**
 * The chain of vassalage of the holder's title at the sheet's year (CMS-422 step 2c), read again whenever either
 * changes, once the typing stops ({@link READ_DELAY_MS}) — « loading » at once, so an old chain never reads as the
 * new one's — and the newest answer only: an older one arriving late never replaces it. A failure is said under the
 * holder and in the console (the dev, 2026-10-30: nothing silent).
 * @param title - the holder's title, `null` when none is chosen
 * @param year - the sheet's year, `null` when it is not a whole year yet
 * @param read - the chain of a title at a year, from the base
 * @returns where the chain stands
 */
export function useVassalChain(
  title: number | string | null,
  year: number | null,
  read: (title: number | string, year: number) => Promise<ChainReading[]>
): VassalChainState {
  const [state, setState] = useState<VassalChainState>({ kind: 'none' })

  useEffect(() => {
    let current = true
    if (title === null) {
      setState({ kind: 'none' })
      return undefined
    }
    if (year === null) {
      setState({ kind: 'no-year' })
      return undefined
    }
    setState({ kind: 'loading' })
    // The year is read as typed — 1, 11, 110, 1100 — and each read fetches every link: only the one the typing stops at
    const timer = setTimeout(() => {
      read(title, year).then(
        (readings) => {
          if (current) setState({ kind: 'read', year, readings })
        },
        (error: unknown) => {
          if (!current) return
          console.error('[CMS] the chain of vassalage could not be read', error)
          setState({ kind: 'failed' })
        }
      )
    }, READ_DELAY_MS)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [title, year, read])

  return state
}
