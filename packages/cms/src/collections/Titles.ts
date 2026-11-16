import { claimLines } from '../fields/claimLines'
import { historicalDateField } from '../fields/historicalDate'

import { refreshLinksOfTitle, refuseDeletingCited } from './claimDependants'
import { refuseDuplicateClaim } from './refuseDuplicateClaim'
import { writeTitleLabel } from './writeClaimTitles'

import type { CollectionConfig } from 'payload'

/**
 * A title (CMS-422 step 2) — **what a person holds or exercises, over a period, as the sources say**: Mathias II,
 * count of Nantes, 1084–1103; Gilles de Rais, marshal of France from 1429. A rank lives here, never on the person
 * (`files/plans/contribution/vassal-chain.md`, rule 3). The sheet of a place names its holder as a title; a link of
 * vassalage joins two titles.
 */
export const Titles: CollectionConfig = {
  slug: 'titles',
  labels: { singular: 'Titre', plural: 'Titres' },
  admin: { useAsTitle: 'label', defaultColumns: ['label', 'person', 'territory'] },
  hooks: {
    beforeChange: [
      writeTitleLabel,
      refuseDuplicateClaim({
        collection: 'titles',
        relations: ['person', 'territory'],
        subject: 'Ce titre',
      }),
    ],
    afterChange: [refreshLinksOfTitle],
    beforeDelete: [
      refuseDeletingCited({
        collection: 'vassal-links',
        fields: ['vassal', 'suzerain'],
        subject: 'Ce titre',
        cited: 'cité',
        what: 'maillon(s)',
      }),
      refuseDeletingCited({
        collection: 'place-periods',
        fields: ['holderTitle'],
        subject: 'Ce titre',
        cited: 'cité',
        what: 'fiche(s) de ville',
      }),
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Titre',
      admin: {
        readOnly: true,
        description: 'Écrit seul à l’enregistrement : la personne, le territoire, la date.',
      },
    },
    {
      name: 'person',
      type: 'relationship',
      relationTo: 'people',
      label: 'Personne',
      required: true,
      admin: { description: 'Celle qui tient le territoire, choisie dans « Personnes ».' },
    },
    {
      name: 'territory',
      type: 'relationship',
      relationTo: 'territories',
      label: 'Territoire',
      required: true,
      admin: { description: 'Ce qu’elle tient ou exerce, choisi dans « Territoires ».' },
    },
    historicalDateField({
      name: 'date',
      label: 'Date',
      description:
        'Une année suffit ; remplir la fin en fait une durée : de son avènement à sa mort ou à sa perte.',
    }),
    {
      name: 'sovereign',
      type: 'checkbox',
      label: 'Souverain',
      defaultValue: false,
      admin: {
        description:
          'Coché : ce titre ne relève de personne à ces dates — la chaîne de vassalité s’arrête à lui.',
      },
    },
    claimLines(
      'Facultatif : la source qui dit que cette personne tenait ce territoire à cette date.'
    ),
  ],
}
