import { groupAt, momentGroup } from '../fields/historicalDate'
import { wikidataField } from '../fields/wikidata'
import { placeEndpoints } from '../wikidata/placeEndpoints'

import type { CollectionConfig } from 'payload'

/**
 * A named point on the map — a city, an abbey, a battlefield — written once for every event that happens there.
 *
 * Beside the name, a button searches Wikidata for it and fills the position and the id from the item chosen (the dev,
 * 2026-10-25); its two routes are this collection's endpoints. Its existence is two ends of a date, a beginning and
 * an end, the end empty while it exists (the dev, 2026-10-25).
 */
export const Places: CollectionConfig = {
  slug: 'places',
  labels: { singular: 'Lieu', plural: 'Lieux' },
  admin: { useAsTitle: 'name' },
  endpoints: placeEndpoints,
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Nom',
          required: true,
          localized: true,
          admin: { width: '50%' },
        },
        {
          name: 'wikidataLookup',
          type: 'ui',
          admin: {
            components: { Field: '/components/WikidataLookup/WikidataLookup#WikidataLookup' },
          },
        },
      ],
    },
    {
      name: 'location',
      type: 'point',
      label: 'Position (longitude, latitude)',
      required: true,
    },
    wikidataField,
    {
      type: 'row',
      fields: [
        momentGroup({
          name: 'existsFrom',
          label: 'Existe depuis',
          description: 'Sa fondation, ou sa première mention.',
        }),
        momentGroup({
          name: 'existsTo',
          label: 'Existe jusqu’à',
          description: 'Vide : le lieu existe encore aujourd’hui.',
          earlier: (data) => groupAt(data, 'existsFrom'),
        }),
      ],
    },
  ],
}
