import type { CollectionConfig } from 'payload'

/** The kinds of event — siege, battle, treaty, foundation — so two events at one place can be told apart. */
export const EventTypes: CollectionConfig = {
  slug: 'event-types',
  labels: { singular: 'Type d’événement', plural: 'Types d’événement' },
  admin: { useAsTitle: 'name' },
  fields: [{ name: 'name', type: 'text', label: 'Nom', required: true, localized: true }],
}
