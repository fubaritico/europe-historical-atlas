import { formIn } from './periodName'

import type { ContentCity } from './contentFormat'
import type { NameLanguage } from './periodName'

/**
 * The name a city is written by on a map (CMS-495; the dev, 2026-11-21 and 22): **its name of the time, alone**, in
 * the reader's language — « Ancyre » on the map of 1100 — and, *"when a sheet has no name of the time, the place's
 * name as it is today"*. A name of the time with no form in the reader's language is no name of the time for that
 * reader: the place's name is written. The place's name is its French one, as the maps wrote it before this rule —
 * which language it should be is ATLAS-448's.
 *
 * One rule for the atlas and the Cartographer, so the two never name a city differently.
 * @param city - the city, its place and its name of the time
 * @param language - the reader's language
 * @returns the name to write
 */
export function cityName(
  city: Pick<ContentCity, 'place' | 'periodName'>,
  language: NameLanguage
): string {
  const ofTheTime = city.periodName === null ? null : formIn(city.periodName, language)
  return ofTheTime ?? city.place.name.fr
}
