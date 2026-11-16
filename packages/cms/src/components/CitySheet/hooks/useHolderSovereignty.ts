import { useRef, useState } from 'react'

import { NO_SOVEREIGNTY, sovereigntyOf } from '../utils/pendingLine'

import type { HolderSovereignty, SovereigntyError } from '../utils/pendingLine'
import type { ChainReading } from '../utils/readVassalChain'

/** The holder's own « Souverain », as the block holds it. */
export interface HolderSovereigntyState {
  /** Ticked or not, the base's value, the holder's links. */
  readonly sovereignty: HolderSovereignty
  /** Why it was not saved, `null` when nothing went wrong. */
  readonly error: SovereigntyError | null
  /** Ticks or unticks it, forgetting the last error. */
  readonly mark: (sovereign: boolean) => void
  /**
   * Loads it from the chain's readings, as the base holds it — except, for the same holder, the tick and the error of
   * a save that did not go through (reviews ARCH-001, QUAL-001): read again after part of it was saved, the box keeps
   * the author's gesture and says why it is not done.
   */
  readonly load: (readings: readonly ChainReading[]) => void
  /** Says why it was not saved, or `null` once it is. */
  readonly setError: (error: SovereigntyError | null) => void
}

/**
 * The holder's own « Souverain » (the dev, 2026-11-16): a sovereignty of one link — ticked, the city is a sovereign
 * state. Read from the chain as the base holds it, ticked on the screen, saved at « Enregistrer ».
 * @returns its state and its gestures
 */
export function useHolderSovereignty(): HolderSovereigntyState {
  const [sovereignty, setSovereignty] = useState<HolderSovereignty>(NO_SOVEREIGNTY)
  const [error, setErrorState] = useState<SovereigntyError | null>(null)
  // Read by `load`, which runs in an effect after a save: the state of the render it closed over may be older
  const failed = useRef<SovereigntyError | null>(null)
  const holder = useRef<number | string | null>(null)
  const setError = (next: SovereigntyError | null) => {
    failed.current = next
    setErrorState(next)
  }
  return {
    sovereignty,
    error,
    mark: (sovereign) => {
      setSovereignty((current) => ({ ...current, sovereign }))
      setError(null)
    },
    load: (readings) => {
      const read = sovereigntyOf(readings)
      const same = (readings[0]?.titles[0]?.id ?? null) === holder.current
      holder.current = readings[0]?.titles[0]?.id ?? null
      if (same && failed.current !== null) {
        setSovereignty((current) => ({ ...read, sovereign: current.sovereign }))
        return
      }
      setSovereignty(read)
      setError(null)
    },
    setError,
  }
}
