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
  fields: [{ name: 'name', type: 'text', label: 'Nom', required: true, localized: true }],
}
