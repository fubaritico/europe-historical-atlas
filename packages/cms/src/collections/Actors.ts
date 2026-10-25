import { wikidataField } from '../fields/wikidata'

import type { CollectionConfig } from 'payload'

/** Who takes part in an event: a person or a house, as the sources name them (the dev, 2026-10-23). */
export const Actors: CollectionConfig = {
  slug: 'actors',
  labels: { singular: 'Acteur', plural: 'Acteurs' },
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true, localized: true },
    {
      name: 'kind',
      type: 'select',
      label: 'Personne ou maison',
      required: true,
      defaultValue: 'person',
      options: [
        { label: 'Personne', value: 'person' },
        { label: 'Maison', value: 'house' },
      ],
    },
    wikidataField,
  ],
}
