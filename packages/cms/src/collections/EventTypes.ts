import { DEFAULT_EVENT_COLOUR, EVENT_COLOURS } from '../fields/eventColours'
import { otherNamesField } from '../fields/otherNames'
import { trimmedText } from '../fields/trimmedText'

import type { EventIcon } from '@europe-historical-atlas/core/data/contentFormat'
import type { CollectionConfig } from 'payload'

/** What the form calls each icon. */
const ICON_LABELS: Record<EventIcon, string> = {
  pin: 'Épingle',
  swords: 'Épées croisées',
  tower: 'Tour et engin de siège',
  crown: 'Couronne',
  cathedral: 'Cathédrale',
  tomb: 'Pierre tombale',
  tiara: 'Tiare et crosse (concile)',
  oriflamme: 'Oriflamme (conquête)',
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
    otherNamesField('pour « Bataille » : anglais « Battle »'),
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
