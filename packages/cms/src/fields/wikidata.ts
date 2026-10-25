import type { TextField } from 'payload'

/** A Wikidata id: `Q` and digits. */
const WIKIDATA_ID = /^Q\d+$/

/**
 * Say whether a typed Wikidata id has the right shape — never whether the item exists.
 * @param value - what the field holds
 * @returns `true`, or the sentence the form shows under the field
 */
export function validateWikidataId(value: string | null | undefined): true | string {
  if (value === null || value === undefined || value === '') return true
  return WIKIDATA_ID.test(value)
    ? true
    : 'Un identifiant Wikidata s’écrit Q suivi de chiffres : Q1218.'
}

/** The Wikidata id field every record carries — optional, checked in shape. */
export const wikidataField: TextField = {
  name: 'wikidata',
  type: 'text',
  label: 'Wikidata',
  admin: { description: 'L’identifiant de l’élément, par exemple Q1218 pour Jérusalem.' },
  validate: (value: string | null | undefined) => validateWikidataId(value),
}
