/**
 * The name the map writes where a formal one does not fit (ATLAS-301): the formal name without its title — « Kingdom of
 * France » becomes « France » (the dev, 2026-10-29: *« son nom sans titre »*, never an abbreviation). **Provisional**: the
 * short name entered in the Cartographer is CARTO-307. One rule for the atlas, the names' fixture and the spikes that
 * measure them, so the numbers the construction is judged by are the names the atlas writes.
 */

/** The titles a formal name opens with, and the dynasty or adjective before them, read with their capitals. */
const TITLE =
  /^(?:\p{Lu}[\p{L}'-]* )*?(?:Grand |Palatine )?(?:Kingdom|Principality|Duchy|County|Republic|Lordship|Emirate|Caliphate|Imamate|Khanate|Sultanate|Margraviate|March|Despotate|Archbishopric|Bishopric|Empire|Barony|City|Dominions|Confederacy|Land|Lands|Realm) of (?:the )?/u

/**
 * The name the map writes for a formal one, provisionally: the formal name without its title — and without the dynasty
 * or adjective before the title, which belongs to it. A name with no title before an « of » — a people, « Byzantine
 * Empire » — is short already, and stays whole.
 * @param formal - the registry's name
 * @returns « France » for « Kingdom of France », « Ifriqiya » for « Zirid Emirate of Ifriqiya », « Kievan Rus » for
 *   « Principality of the Kievan Rus »; the name itself when it has no title before an « of »
 */
export function untitledName(formal: string): string {
  return formal.replace(TITLE, '')
}
