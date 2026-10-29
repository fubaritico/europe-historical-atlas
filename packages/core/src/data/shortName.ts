/**
 * The short name the map writes for a polity where its full name does not fit (ATLAS-301, CARTO-307): **the one its
 * author entered** (`YearPolity.shortName`, the dev, 2026-10-29: a usage name given with the polity, as in Crusader
 * Kings), **and where none was entered, the formal name without its title** — « Kingdom of France » becomes « France »
 * (the dev, 2026-10-29: *« son nom sans titre »*, never an abbreviation). One rule for the atlas that writes it, the
 * Cartographer's form that previews it, and the bench and spikes that measure it — in `data/`, so the document model
 * can read it too.
 */

import type { YearPolity } from './yearFormat'

/** The titles a formal name opens with, and the dynasty or adjective before them, read with their capitals. */
const TITLE =
  /^(?:\p{Lu}[\p{L}'-]* )*?(?:Grand |Palatine )?(?:Kingdom|Principality|Duchy|County|Republic|Lordship|Emirate|Caliphate|Imamate|Khanate|Sultanate|Margraviate|March|Despotate|Archbishopric|Bishopric|Empire|Barony|City|Dominions|Confederacy|Land|Lands|Realm) of (?:the )?/u

/**
 * A formal name without its title — and without the dynasty or adjective before the title, which belongs to it. A name
 * with no title before an « of » — a people, « Byzantine Empire » — is short already, and stays whole. What the map
 * writes for a polity whose author entered no short name ({@link shortNameOf}).
 * @param formal - the registry's name
 * @returns « France » for « Kingdom of France », « Ifriqiya » for « Zirid Emirate of Ifriqiya », « Kievan Rus » for
 *   « Principality of the Kievan Rus »; the name itself when it has no title before an « of »
 */
export function untitledName(formal: string): string {
  return formal.replace(TITLE, '')
}

/**
 * The full name the map may write for a polity, where it fits: its formal name — unless its author forced the short
 * one everywhere ({@link YearPolity.forceShortName}).
 * @param polity - its formal name, and whether its short name is forced
 * @returns the formal name; `null` when only the short one is written
 */
export function fullNameOf(polity: Pick<YearPolity, 'name' | 'forceShortName'>): string | null {
  return polity.forceShortName === true ? null : polity.name
}

/**
 * The short name the map writes for a polity.
 * @param polity - its formal name, and the short name its author entered, if any
 * @returns the short name entered, as is; the formal name without its title where none was
 */
export function shortNameOf(polity: Pick<YearPolity, 'name' | 'shortName'>): string {
  return polity.shortName ?? untitledName(polity.name)
}
