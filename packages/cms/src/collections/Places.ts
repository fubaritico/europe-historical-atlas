import { groupAt, momentGroup } from '../fields/historicalDate'
import { countryField, regionField } from '../fields/lot'
import { trimmedText } from '../fields/trimmedText'
import { wikidataField } from '../fields/wikidata'
import { refuseBulkDeleteOverMcp } from '../mcp/refuseBulkDelete'
import { placeEndpoints } from '../wikidata/placeEndpoints'

import { refuseDeletingCited } from './claimDependants'
import { retitlePlaceSheets } from './retitleSheets'

import type { CollectionConfig } from 'payload'

/**
 * Everything that cites a place: the collection, the field that points at it, and what it is called in a refusal.
 * Held against the collections themselves by `deleteGuards.test.ts`: a field added later that points at a place and
 * is missing here fails there.
 */
export const PLACE_CITERS = [
  { collection: 'place-periods', field: 'place', what: 'fiche(s) de ville' },
  { collection: 'period-names', field: 'place', what: 'nom(s) d’époque' },
  { collection: 'events', field: 'place', what: 'événement(s)' },
] as const

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
  hooks: {
    // A renamed place renames its cities' sheets: « Paris — 1100 » is written from the place's name.
    afterChange: [retitlePlaceSheets],
    // A place a sheet or an event stands on is never deleted from under it (CMS-454): the base would empty their
    // field, and a city at a date would be a city nowhere. The sheet goes first, then the place.
    // Over MCP, one record at a time (CMS-454).
    beforeOperation: [refuseBulkDeleteOverMcp],
    beforeDelete: PLACE_CITERS.map(({ collection, field, what }) =>
      refuseDeletingCited({ collection, fields: [field], subject: 'Ce lieu', cited: 'cité', what })
    ),
  },
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
          hooks: { beforeValidate: [trimmedText] },
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
    // Its geographic lot today, the unit the research of the cities is done by, century after century (CMS-414).
    { type: 'row', fields: [countryField, regionField] },
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
