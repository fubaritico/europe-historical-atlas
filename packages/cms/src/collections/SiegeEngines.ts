import { SIEGE_ENGINES } from '@europe-historical-atlas/core/data/siegeEngines'

import { historicalDateField } from '../fields/historicalDate'
import { wikidataField } from '../fields/wikidata'

import type { SiegeEngine } from '@europe-historical-atlas/core/data/siegeEngines'
import type { CollectionConfig } from 'payload'

/** What the form calls each engin the atlas can draw. */
const ENGINE_LABELS: Record<SiegeEngine, string> = {
  'traction-trebuchet': 'Trébuchet à traction (mangonneau)',
  'counterweight-trebuchet': 'Trébuchet à contrepoids',
  cannon: 'Canon',
}

/**
 * The artillery a siege is drawn with in front of its tower, and when each was in use — the export gives each siege
 * the newest engin in use at its date (ATLAS-286, `files/plans/contribution/siege-engines.md`). A period is a claim
 * about history, so it cannot be saved without the sources it rests on (the dev, 2026-10-27).
 */
export const SiegeEngines: CollectionConfig = {
  slug: 'siege-engines',
  labels: { singular: 'Engin de siège', plural: 'Engins de siège' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'engine'] },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true, localized: true },
    {
      name: 'engine',
      type: 'select',
      label: 'Dessin sur la carte',
      required: true,
      options: SIEGE_ENGINES.map((value) => ({ value, label: ENGINE_LABELS[value] })),
    },
    historicalDateField({
      name: 'inUse',
      label: 'En usage',
      description:
        'Ce que disent les sources. Sans fin, l’engin est encore en usage. Quand deux périodes se chevauchent, la carte montre le plus récent.',
    }),
    {
      name: 'sources',
      type: 'relationship',
      relationTo: 'sources',
      hasMany: true,
      required: true,
      label: 'Sources',
      admin: { description: 'Au moins une : une période sans source ne s’enregistre pas.' },
    },
    wikidataField,
  ],
}
