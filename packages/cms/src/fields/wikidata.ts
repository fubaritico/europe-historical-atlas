import { WIKIDATA_ID } from '@europe-historical-atlas/core/data/wikidataId'

import type { TextField } from 'payload'

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

/**
 * An id left empty, read as no id: a unique index counts every `''` as one value, so the second record entered
 * without an id would be refused as a duplicate of the first — which is not one. `null` is never compared.
 * @param args - Payload's field hook arguments
 * @param args.value - the id as sent
 * @returns the id, or `null` for an empty one
 */
export function emptyAsNoId({ value }: { value?: unknown }): unknown {
  return value === '' ? null : value
}

/**
 * The Wikidata id field every record carries — optional, checked in shape, and **unique** (the dev, 2026-11-15:
 * *"there must never again be duplicates like that"*): the base refuses a second record with an id another already
 * holds, at its creation and at a correction alike — Humbert II was entered twice by a correction. A record without
 * one stays allowed; for those, searching before creating is the only guard.
 */
export const wikidataField: TextField = {
  name: 'wikidata',
  type: 'text',
  label: 'Wikidata',
  unique: true,
  hooks: { beforeValidate: [emptyAsNoId] },
  admin: {
    description:
      'L’identifiant de l’élément, par exemple Q1218 pour Jérusalem. Unique : une seconde fiche avec le même identifiant est refusée.',
  },
  validate: (value: string | null | undefined) => validateWikidataId(value),
}
