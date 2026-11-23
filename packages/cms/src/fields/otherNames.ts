import {
  LANGUAGE_LABELS,
  OTHER_LANGUAGES,
  REQUIRED_OTHER_LANGUAGES,
  validateOtherNames,
} from './nameForms'
import { trimmedText } from './trimmedText'

import type { ArrayField } from 'payload'

/**
 * A record's name in the languages other than French, one line a language (CMS-495, the dev, 2026-11-22: _"a name is
 * found by an id, and several translations answer that id"_). The French name is the record's own field « Nom »; this
 * table holds the others, all seen on one page, so a record is entered whole in one save — which the admin's language
 * switch could not do (the dev's choice of 2026-11-23, for the places as for the territories). Every language the site
 * is read in is required, the others optional (`validateOtherNames`).
 * @param example - a sentence of example for the table's help, in French: « pour le comté de Champagne : anglais «
 *   County of Champagne » »
 * @returns the field
 */
export function otherNamesField(example: string): ArrayField {
  const required = REQUIRED_OTHER_LANGUAGES.map((language) =>
    LANGUAGE_LABELS[language].toLowerCase()
  ).join(', ')
  return {
    name: 'otherNames',
    type: 'array',
    label: 'Le nom dans les autres langues',
    labels: { singular: 'Langue', plural: 'Langues' },
    validate: validateOtherNames,
    admin: {
      description:
        `Une ligne par langue — par exemple, ${example}. Obligatoire en ${required} ; les autres langues sont ` +
        'facultatives. Le nom français est le champ « Nom », au-dessus. Une seule forme par langue.',
    },
    fields: [
      {
        name: 'language',
        type: 'select',
        label: 'Langue',
        required: true,
        options: OTHER_LANGUAGES.map((value) => ({ value, label: LANGUAGE_LABELS[value] })),
      },
      {
        name: 'form',
        type: 'text',
        label: 'Nom',
        required: true,
        hooks: { beforeValidate: [trimmedText] },
        admin: { description: 'Le nom tel que cette langue l’écrit.' },
      },
    ],
  }
}
