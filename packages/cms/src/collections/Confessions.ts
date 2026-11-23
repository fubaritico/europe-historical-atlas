import { otherNamesField } from '../fields/otherNames'
import { trimmedText } from '../fields/trimmedText'

import type { CollectionConfig } from 'payload'

/**
 * The confessions a city's communities belong to — catholic, orthodox, Church of the East, Sunni Muslim, Jewish, pagan…
 * (CMS-433) — a list the dev grows from the admin, with no code, as the importance reasons; the historian adds one
 * over MCP when a source attests it. Its form is Payload's own: a list this simple needs nothing more.
 */
export const Confessions: CollectionConfig = {
  slug: 'confessions',
  labels: { singular: 'Confession', plural: 'Confessions' },
  admin: {
    useAsTitle: 'name',
    description:
      'Les confessions qu’on peut donner à une communauté sur une fiche « Ville à une date » : catholique, orthodoxe, musulmane sunnite, juive… Ajoutez-en autant qu’il faut.',
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
    otherNamesField('pour « juive » : anglais « Jewish »'),
  ],
}
