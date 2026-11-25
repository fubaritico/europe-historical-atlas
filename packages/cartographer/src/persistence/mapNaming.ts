import { isNewMapName, yearNamed } from '@europe-historical-atlas/core/data/mapName'

import type { PersistenceWords } from './persistenceWords'

/**
 * Why a name cannot be given to a new map of a year — *Save as…*'s (`s19`) and « Nouvelle carte »'s (CARTO-536), one
 * rule for both: a name a folder can take, and **a name that is a year must be that map's year** — the atlas publishes
 * the folder `1200` as the map of 1200 (the dev's « non », 2026-11-02).
 * @param name - the name typed, trimmed
 * @param year - the year the map holds
 * @param words - the words
 * @returns the sentence said under the name, or `null` when the name can be given
 */
export function whyNotMapName(name: string, year: number, words: PersistenceWords): string | null {
  const { t } = words
  if (!isNewMapName(name)) return t('saveAsBadName')
  const named = yearNamed(name)
  if (named !== null && named !== year) return t('saveAsOtherYear', { name, held: String(year) })
  return null
}
