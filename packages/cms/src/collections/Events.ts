import { eventDateField } from '../fields/historicalDate'
import { wikidataField } from '../fields/wikidata'

import type { CollectionConfig } from 'payload'

/**
 * Something that happened at a date and a place. It points to records — its type, its place, its actors, its
 * sources — each written once in its own collection and chosen here from a list, or created on the spot.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Événement', plural: 'Événements' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'type', 'place'] },
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true, localized: true },
    {
      name: 'type',
      type: 'relationship',
      relationTo: 'event-types',
      label: 'Type',
      required: true,
    },
    eventDateField,
    { name: 'place', type: 'relationship', relationTo: 'places', label: 'Lieu' },
    {
      name: 'actors',
      type: 'relationship',
      relationTo: 'actors',
      hasMany: true,
      label: 'Acteurs',
    },
    { name: 'description', type: 'textarea', label: 'Description', localized: true },
    {
      name: 'sources',
      type: 'relationship',
      relationTo: 'sources',
      hasMany: true,
      label: 'Sources',
    },
    wikidataField,
  ],
}
