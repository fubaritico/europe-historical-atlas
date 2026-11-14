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
  fields: [{ name: 'name', type: 'text', label: 'Nom', required: true, localized: true }],
}
