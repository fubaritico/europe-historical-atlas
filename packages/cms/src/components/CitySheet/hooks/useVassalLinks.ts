import { useCallback } from 'react'

import { readVassalChain } from '../utils/readVassalChain'
import { saveSovereign } from '../utils/saveSovereign'
import { saveVassalLink } from '../utils/saveVassalLink'

import type { ChainReading } from '../utils/readVassalChain'
import type { SaveSovereign } from '../utils/saveSovereign'
import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'

/** The chain of vassalage's wiring to the base, each stable for the life of the form. */
export interface VassalLinks {
  /** The chain of a title at a year. */
  readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  /** Saves a link of vassalage. */
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  /** Ticks or unticks « souverain » on a title. */
  saveSovereign: SaveSovereign
}

/**
 * The chain of vassalage under the holder, wired to the base through the API (CMS-422): read at a year, a link
 * saved from a line « Vassal de », and « souverain » ticked on a title.
 * @param api - the API's root: `/api`
 * @returns the reader and the writers
 */
export function useVassalLinks(api: string): VassalLinks {
  const readChain = useCallback(
    (title: number | string, year: number) => readVassalChain(fetch, api, title, year),
    [api]
  )
  const saveLink = useCallback((link: NewVassalLink) => saveVassalLink(fetch, api, link), [api])
  const sovereign = useCallback(
    (title: number | string, value: boolean) => saveSovereign(fetch, api, title, value),
    [api]
  )
  return { readChain, saveLink, saveSovereign: sovereign }
}
