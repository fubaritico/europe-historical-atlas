import { useEffect, useState } from 'react'

import type { VassalChainState } from './useVassalChain'

/** The chain once read, with the year it was read at. */
export type ReadChain = Extract<VassalChainState, { kind: 'read' }>

/**
 * The chain last read, kept on screen while it is read again (CMS-422, 2026-11-16) — so the lines « Vassal de » being
 * entered under it stay where they are when another line is saved; forgotten once no title is chosen.
 * @param state - where the chain's reading stands
 * @returns the last reading, or `null`
 */
export function useLastRead(state: VassalChainState): ReadChain | null {
  const [last, setLast] = useState<ReadChain | null>(null)
  useEffect(() => {
    if (state.kind === 'read') setLast(state)
    if (state.kind === 'none') setLast(null)
  }, [state])
  return state.kind === 'read' ? state : last
}
