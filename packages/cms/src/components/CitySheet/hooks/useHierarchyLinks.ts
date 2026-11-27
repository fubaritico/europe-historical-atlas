import { useCallback } from 'react'

import { readHierarchyChain } from '../utils/readHierarchyChain'
import {
  deleteHierarchyLink,
  saveHierarchyLink,
  updateHierarchyLink,
} from '../utils/saveHierarchyLink'
import { saveSovereign } from '../utils/saveSovereign'

import type { ChainReading } from '../utils/readHierarchyChain'
import type { ChangedHierarchyLink, LinkAnswer, NewHierarchyLink } from '../utils/saveHierarchyLink'
import type { SaveSovereign } from '../utils/saveSovereign'

/** The hierarchical chain's wiring to the base, each stable for the life of the form. */
export interface HierarchyLinks {
  /** The chain of a title at a year. */
  readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  /** Saves a hierarchical link. */
  saveLink: (link: NewHierarchyLink) => Promise<LinkAnswer>
  /** Changes a hierarchical link. */
  updateLink: (change: ChangedHierarchyLink) => Promise<LinkAnswer>
  /** Removes a hierarchical link. */
  deleteLink: (link: string) => Promise<LinkAnswer>
  /** Ticks or unticks « souverain » on a title. */
  saveSovereign: SaveSovereign
}

/**
 * The hierarchical chain under the holder, wired to the base through the API (CMS-422): read at a year, a link
 * saved from a line « Vassal de », and « souverain » ticked on a title.
 * @param api - the API's root: `/api`
 * @returns the reader and the writers
 */
export function useHierarchyLinks(api: string): HierarchyLinks {
  const readChain = useCallback(
    (title: number | string, year: number) => readHierarchyChain(fetch, api, title, year),
    [api]
  )
  const saveLink = useCallback(
    (link: NewHierarchyLink) => saveHierarchyLink(fetch, api, link),
    [api]
  )
  const sovereign = useCallback(
    (title: number | string, value: boolean) => saveSovereign(fetch, api, title, value),
    [api]
  )
  const updateLink = useCallback(
    (change: ChangedHierarchyLink) => updateHierarchyLink(fetch, api, change),
    [api]
  )
  const deleteLink = useCallback((link: string) => deleteHierarchyLink(fetch, api, link), [api])
  return { readChain, saveLink, updateLink, deleteLink, saveSovereign: sovereign }
}
