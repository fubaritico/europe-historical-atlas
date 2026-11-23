import { SIEGE_ENGINES } from '@europe-historical-atlas/core/data/siegeEngines'

import { historicalDateField } from '../fields/historicalDate'
import { otherNamesField } from '../fields/otherNames'
import { trimmedText } from '../fields/trimmedText'
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
    {
      name: 'name',
      type: 'text',
      label: 'Nom',
      required: true,
      // The column's default, which SQLite needs to add a required column to a filled table (migration
      // `plain_french_register_names`); never saved — the field is required, and an empty name is refused.
      defaultValue: '',
      hooks: { beforeValidate: [trimmedText] },
      admin: {
        description:
          'Le nom français. Les autres langues se saisissent dans le tableau ci-dessous.',
      },
    },
    // CMS-495: the name in the other languages, the same table as a place's and a territory's (the dev, 2026-11-23).
    otherNamesField('pour « Trébuchet à contrepoids » : anglais « Counterweight trebuchet »'),
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
