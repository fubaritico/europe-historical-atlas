import { otherNamesField } from '../fields/otherNames'
import { trimmedText } from '../fields/trimmedText'

import { registerRefusals } from './refuseRemovingCited'
import { refuseRestoringOverBin } from './refuseRestoringOverBin'

import type { CollectionConfig } from 'payload'

/** A reason a sheet or its line still cites is neither put in the bin nor erased from under it (CMS-509). */
const REFUSALS = registerRefusals({ subject: 'Cette raison d’importance', cited: 'citée' })

/**
 * Why a city matters at a date — power, religion, trade, population, a pilgrimage, a port — a list the dev grows from
 * the admin, with no code (ATLAS-295, `files/plans/atlas/cities.md`, decision 6), picked many at once on a city's
 * sheet. Its form is Payload's own: a list this simple needs nothing more.
 */
export const ImportanceReasons: CollectionConfig = {
  slug: 'importance-reasons',
  labels: { singular: 'Raison d’importance', plural: 'Raisons d’importance' },
  // CMS-509: a reason removed goes to the bin — a duplicate merged away too — and comes back from it
  trash: true,
  hooks: {
    beforeChange: [refuseRestoringOverBin, REFUSALS.beforeChange],
    beforeDelete: [REFUSALS.beforeDelete],
  },
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
