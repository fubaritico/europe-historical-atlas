import { useState } from 'react'

import { useOnChange } from './useOnChange'

import type { ChainReading } from '../utils/readVassalChain'

/** A chain read, as the block was loaded from it: its readings and the year they were read at. */
export interface LoadedChain {
  /** The readings. */
  readonly readings: ChainReading[]
  /** The year they were read at. */
  readonly year: number
}

/** The chain the block was loaded from, and how to load another. */
export interface LoadedBlock {
  /** The chain the block was last loaded from, kept while it is read again; `null` once emptied. */
  readonly loaded: LoadedChain | null
  /** Loads a chain read into the block — `null` empties it. */
  readonly load: (chain: LoadedChain | null) => void
}

/**
 * The chain the block was loaded from (review QUAL-001, 2026-11-16): **another holder or another year empties the block
 * at once**, before its chain is read — its lines were the old title's, and « Enregistrer » would have saved them under
 * the new one. A read again after a save, same holder and year, keeps the block on screen meanwhile.
 * @param holder - the holder's title
 * @param year - the sheet's year
 * @param fill - fills the block's lines from a chain read, `null` to empty them
 * @returns the chain loaded, and how to load another
 */
export function useLoadedBlock(
  holder: number | string | null,
  year: number | null,
  fill: (chain: LoadedChain | null) => void
): LoadedBlock {
  const [loaded, setLoaded] = useState<LoadedChain | null>(null)
  const load = (chain: LoadedChain | null) => {
    setLoaded(chain)
    fill(chain)
  }
  useOnChange(JSON.stringify([holder, year]), () => {
    load(null)
  })
  return { loaded, load }
}
