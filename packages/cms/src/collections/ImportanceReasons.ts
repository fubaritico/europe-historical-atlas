import { otherNamesField } from '../fields/otherNames'
import { trimmedText } from '../fields/trimmedText'

import type { CollectionConfig } from 'payload'

/**
 * Why a city matters at a date — power, religion, trade, population, a pilgrimage, a port — a list the dev grows from
 * the admin, with no code (ATLAS-295, `files/plans/atlas/cities.md`, decision 6), picked many at once on a city's
 * sheet. Its form is Payload's own: a list this simple needs nothing more.
 */
export const ImportanceReasons: CollectionConfig = {
  slug: 'importance-reasons',
  labels: { singular: 'Raison d’importance', plural: 'Raisons d’importance' },
  admin: {
    useAsTitle: 'name',
    description:
      'Les raisons qu’on peut cocher sur une fiche « Ville à une date » : pouvoir, religion, commerce, population… Ajoutez-en autant qu’il faut.',
  },
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
    otherNamesField('pour « siège épiscopal » : anglais « episcopal see »'),
  ],
}
