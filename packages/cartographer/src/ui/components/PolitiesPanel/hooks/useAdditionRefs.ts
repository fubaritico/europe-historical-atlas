import { useEffect, useRef } from 'react'

import type { RefObject } from 'react'

/** What an answer of « Ajouter au CMS » reads when it arrives, current then and not when it was sent. */
export interface AdditionRefs {
  /** Whether the polity's dialogue is still open. */
  open: RefObject<boolean>
  /** The Wikidata item the form offers now, or `null` when it offers none. */
  offeredNow: RefObject<string | null>
}

/**
 * The two values « Ajouter au CMS » reads at its answer (CARTO-498): whether the dialogue is still open, and which
 * Wikidata item the form names now — an answer for another item is not written on the polity (review QUAL-001).
 * @param offered - the Wikidata item the form offers at this render, or `null`
 * @returns the two refs
 */
export function useAdditionRefs(offered: string | null): AdditionRefs {
  // Refs
  // Set again at each setup: StrictMode runs setup → cleanup → setup, and a flag only cleared would stay cleared
  const open = useRef(true)
  const offeredNow = useRef<string | null>(null)

  // Effects
  useEffect(() => {
    open.current = true
    return () => {
      open.current = false
    }
  }, [])
  useEffect(() => {
    offeredNow.current = offered
  }, [offered])

  // Return
  return { open, offeredNow }
}
