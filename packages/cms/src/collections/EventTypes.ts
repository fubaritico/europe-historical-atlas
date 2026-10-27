import { DEFAULT_EVENT_COLOUR, EVENT_COLOURS } from '../fields/eventColours'

import type { EventIcon } from '@europe-historical-atlas/core/data/contentFormat'
import type { CollectionConfig } from 'payload'

/** What the form calls each icon. */
const ICON_LABELS: Record<EventIcon, string> = {
  pin: 'Épingle',
  swords: 'Épées croisées',
  tower: 'Tour et engin de siège',
  crown: 'Couronne',
}

/**
 * The kinds of event — siege, battle, treaty, foundation — so two events at one place can be told apart, and the
 * shape their events stand on the map as (ATLAS-156). The icon is required with `pin` as its default, which is also
 * the column's default: adding the field gave every type already written the pin, with no question in the terminal.
 * The colour its pins wear (ATLAS-298) is added the same way: required, defaulting to the pin's red.
 */
export const EventTypes: CollectionConfig = {
  slug: 'event-types',
  labels: { singular: 'Type d’événement', plural: 'Types d’événement' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'icon', 'colour'] },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true, localized: true },
    {
      name: 'icon',
      type: 'select',
      label: 'Icône sur la carte',
      required: true,
      defaultValue: 'pin',
      options: (Object.keys(ICON_LABELS) as EventIcon[]).map((value) => ({
        value,
        label: ICON_LABELS[value],
      })),
    },
    {
      name: 'colour',
      type: 'select',
      label: 'Couleur de l’épingle',
      required: true,
      defaultValue: DEFAULT_EVENT_COLOUR,
      options: EVENT_COLOURS.map(({ value, label }) => ({ value, label })),
    },
  ],
}
