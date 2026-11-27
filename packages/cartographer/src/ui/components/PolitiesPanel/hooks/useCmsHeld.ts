import {
  NO_CMS_LOCKS,
  cmsLocks,
  isCmsLockable,
} from '@europe-historical-atlas/core/data/cmsAlignment'

import { withoutHeld } from '../utils/withoutHeld'

import type { CmsChannel } from '../../../utils/cmsChannel'
import type { TerritoryProposal } from '../../../utils/territoryProposals'
import type { WikidataView } from '../../../utils/wikidataView'
import type { CmsHeld, PolityFormField } from '../../PolityForm'
import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** What the dialogue takes from {@link useCmsHeld}. */
export interface CmsHold {
  /** What the form shows: the fields locked, the territory's page. */
  cmsHeld: CmsHeld
  /**
   * The form's writer, declining a field the CMS holds.
   * @param field - the field
   * @param value - its value
   */
  onField: (field: PolityFormField, value: string | null) => void
  /**
   * The CMS territory's proposals, without those for a field it holds.
   * @param proposals - the proposals
   * @returns those the author can take
   */
  proposals: (proposals: readonly TerritoryProposal[]) => TerritoryProposal[]
  /**
   * Wikidata's view, without the proposals for a field the CMS holds.
   * @param view - the view
   * @returns the view the panel shows
   */
  view: (view: WikidataView) => WikidataView
}

/**
 * What the CMS holds of the polity a dialogue edits (CARTO-568, `s10`'s « an aligned polity is locked »): the fields
 * locked, read from the polity as the map saved it and the store's territories. A field the CMS holds is read-only to
 * the keyboard; no proposal offers to write it (Wikidata's « Remplacer », the CMS's own) — an agreeing one stays; and
 * the writer declines it whatever else reaches it, said in the console.
 * @param editing - the polity edited, or `null` for a new one — nothing held
 * @param territories - every territory of the CMS
 * @param channel - how the chrome reaches the CMS — the link to the territory's page offline only
 * @param writeField - the draft's own writer
 * @returns what the form shows, the writer it uses, and the proposals' filters
 */
export function useCmsHeld(
  editing: YearPolity | null,
  territories: readonly ContentTerritory[],
  channel: CmsChannel,
  writeField: (field: PolityFormField, value: string | null) => void
): CmsHold {
  // Derived
  const locks = editing === null ? NO_CMS_LOCKS : cmsLocks(editing, territories)
  const page =
    channel.mode === 'offline' && editing?.territory !== undefined
      ? channel.pageOf(editing.territory)
      : null

  // Handlers
  const onField = (field: PolityFormField, value: string | null): void => {
    if (isCmsLockable(field) && locks[field]) {
      console.warn(`[Cartographer] the ${field} of ${editing?.id ?? ''} is the CMS's: not written`)
      return
    }
    writeField(field, value)
  }
  const proposals = (offered: readonly TerritoryProposal[]) => withoutHeld(offered, locks)
  const view = (shown: WikidataView): WikidataView =>
    shown.kind === 'found'
      ? { ...shown, suggestions: withoutHeld(shown.suggestions, locks) }
      : shown

  // Return
  return { cmsHeld: { locks, page }, onField, proposals, view }
}
