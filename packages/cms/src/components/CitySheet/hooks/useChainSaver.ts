import { useRef, useState } from 'react'

import type { ChainAnswer } from '../utils/saveLines'

/** The chain's lines being entered, as the sheet's « Enregistrer » sees them. */
export interface ChainSaver {
  /** How many lines wait to be saved. */
  readonly waiting: number
  /** Says how many lines wait — called by the chain as its lines change. */
  readonly setWaiting: (count: number) => void
  /** Hands the chain's « save every line » to the sheet — called by the chain. */
  readonly register: (saveAll: () => Promise<ChainAnswer>) => void
  /** Saves every line waiting; `'saved'` when none is left behind, otherwise where it stopped. */
  readonly saveAll: () => Promise<ChainAnswer>
}

/**
 * The bridge between the sheet's « Enregistrer » and the lines « Vassal de » entered under the chain (the dev,
 * 2026-11-16: nothing saves itself — the button saves the lines, then the sheet). The chain registers how it saves its
 * lines and says how many wait; the form saves them first at « Enregistrer ».
 * @returns the bridge
 */
export function useChainSaver(): ChainSaver {
  const [waiting, setWaiting] = useState(0)
  const saver = useRef<() => Promise<ChainAnswer>>(() => Promise.resolve('saved'))
  return {
    waiting,
    setWaiting,
    register: (saveAll) => {
      saver.current = saveAll
    },
    saveAll: () => saver.current(),
  }
}
