import { useCallback } from 'react'

import { readVassalChain } from '../utils/readVassalChain'
import { saveVassalLink } from '../utils/saveVassalLink'

import type { ChainReading } from '../utils/readVassalChain'
import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'

/** The chain of vassalage's wiring to the base, each stable for the life of the form. */
export interface VassalLinks {
  /** The chain of a title at a year. */
  readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  /** Saves a link of vassalage. */
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
}

/**
 * The chain of vassalage under the holder, wired to the base through the API (CMS-422): read at a year, and a link
 * saved from a line « Vassal de ».
 * @param api - the API's root: `/api`
 * @returns the reader and the writer
 */
export function useVassalLinks(api: string): VassalLinks {
  const readChain = useCallback(
    (title: number | string, year: number) => readVassalChain(fetch, api, title, year),
    [api]
  )
  const saveLink = useCallback((link: NewVassalLink) => saveVassalLink(fetch, api, link), [api])
  return { readChain, saveLink }
}
