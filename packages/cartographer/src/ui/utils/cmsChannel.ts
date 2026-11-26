import { createContext } from 'react'

import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import { createCmsTerritoryClient } from '../../persistence/cmsTerritory'
import { deploymentModeOf } from '../../persistence/deploymentMode'

import type { CmsTerritoryPort } from '../../persistence/cmsTerritory'

/**
 * How the chrome reaches the CMS (CARTO-498): on the author's machine, through the dev server's port; online, not from
 * the chrome — a contribution goes another way (REPO-533). Decided once at the composition root from the page's
 * address (`persistence/deploymentMode.ts`) and provided over the whole chrome, as the language is.
 */
export type CmsChannel =
  /** On the author's machine: « Ajouter au CMS » creates through the port. */
  | {
      mode: 'offline'
      /** Where « Ajouter au CMS » creates. */
      territories: CmsTerritoryPort
      /**
       * The address of a territory's page in the CMS's admin, for « Compléter la fiche dans le CMS ».
       * @param id - the territory's number
       * @returns the address
       */
      pageOf: (id: number) => string
      /**
       * Say that the CMS refused the session — « Ajouter au CMS » answered « sign in again »: the session's dialogue
       * opens over the map, as when the session expires while drawing (CARTO-535), nothing drawn lost.
       */
      sessionLost: () => void
    }
  /** Online: the chrome offers no direct write to the CMS. */
  | { mode: 'online' }

/**
 * The channel, provided at the composition root. **`null` without a provider**, so `useCmsChannel` throws: a button
 * hidden because nobody provided the channel would hide a wiring fault (`rules/error-handling.md`).
 */
export const CmsChannelContext = createContext<CmsChannel | null>(null)

/** A territory's page in the CMS of the author's machine — `localhost`, where the password manager knows the CMS. */
const CMS_TERRITORY_PAGE = 'http://localhost:3100/admin/collections/territories/'

/**
 * The channel for a page served from a host — the dev's rule of 2026-11-25, *the address decides*: on this machine,
 * « Ajouter au CMS » creates through the dev server; online, the chrome writes no CMS (REPO-533). Called once, by the
 * composition root.
 * @param hostname - `location.hostname`
 * @param route - the dev server's « Ajouter au CMS » route, `CMS_TERRITORY_ROUTE` — named by the composition root, the
 * one place that names `devServer/`
 * @param sessionLost - says that the CMS refused the session, the session's keeper's
 * @returns the channel
 */
export function cmsChannelOf(hostname: string, route: string, sessionLost: () => void): CmsChannel {
  if (deploymentModeOf(hostname) === 'online') return { mode: 'online' }
  return {
    mode: 'offline',
    territories: createCmsTerritoryClient(route, (input, init) => fetchWithin(input, init)),
    pageOf: (id) => `${CMS_TERRITORY_PAGE}${String(id)}`,
    sessionLost,
  }
}
