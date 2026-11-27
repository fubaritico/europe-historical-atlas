import { isCmsLockable } from '@europe-historical-atlas/core/data/cmsAlignment'

import type { CmsLocks } from '@europe-historical-atlas/core/data/cmsAlignment'

/**
 * Proposals — Wikidata's, the CMS territory's — without those that would write a field the CMS holds (CARTO-568): a
 * « Remplacer » on a name read-only would be a button that does nothing. A proposal that **agrees** stays, as it says
 * something true; the form's writer still declines a held field whatever reaches it (`useCmsHeld`).
 * @param proposals - the proposals, each naming its field
 * @param locks - what the CMS holds
 * @returns the proposals the author can take
 */
export function withoutHeld<T extends { field: string; state: string }>(
  proposals: readonly T[],
  locks: CmsLocks
): T[] {
  return proposals.filter(
    ({ field, state }) => state === 'same' || !isCmsLockable(field) || !locks[field]
  )
}
