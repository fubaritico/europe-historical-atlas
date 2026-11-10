import { validateWikidataId } from './wikidata'

import type { NamedGroupField } from 'payload'

/**
 * One end of a place's geographic lot — its country or its region today (CMS-414, the dev, 2026-11-10): a name and its
 * Wikidata id, filled by « Chercher dans Wikidata » when the item chosen gives exactly one, chosen from a list when it
 * gives several, typed only when it gives none.
 * @param options - the group's field name and its label
 * @param options.name - `country` or `region`
 * @param options.label - what the form shows
 * @param options.description - the sentence under it
 * @returns the group: `name` and `wikidata`
 */
export function lotGroup(options: {
  name: string
  label: string
  description: string
}): NamedGroupField {
  return {
    name: options.name,
    type: 'group',
    label: options.label,
    admin: { description: options.description, width: '50%' },
    fields: [
      { name: 'name', type: 'text', label: 'Nom' },
      {
        name: 'wikidata',
        type: 'text',
        label: 'Wikidata',
        validate: (value: string | null | undefined) => validateWikidataId(value),
      },
    ],
  }
}

/** The country a place lies in today — the lot its research is done in. */
export const countryField = lotGroup({
  name: 'country',
  label: 'Pays aujourd’hui',
  description: 'Le lot de recherche du lieu. Rempli depuis Wikidata.',
})

/** The first-level division of that country — the lot's subdivision (a region of Italy, a Spanish community). */
export const regionField = lotGroup({
  name: 'region',
  label: 'Région aujourd’hui',
  description: 'La région du pays où est le lieu. Remplie depuis Wikidata.',
})
