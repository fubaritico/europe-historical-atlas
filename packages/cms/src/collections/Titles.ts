import { claimLines } from '../fields/claimLines'
import { historicalDateField } from '../fields/historicalDate'
import { refuseBulkRemovalOverMcp } from '../mcp/refuseBulkRemoval'
import { titleEndpoints } from '../titles/attachEndpoint'

import { refreshLinksOfTitle, refuseDeletingCited, refuseTrashingCited } from './claimDependants'
import { refuseDuplicateClaim } from './refuseDuplicateClaim'
import { refuseRestoringOverBin } from './refuseRestoringOverBin'
import { writeTitleLabel } from './writeClaimTitles'

import type { Citers } from './claimDependants'
import type { CollectionConfig } from 'payload'

/** What cites a title, so neither deleted nor put in the bin from under them: the links, and the cities' sheets. */
const TITLE_CITERS: readonly Citers[] = [
  {
    collection: 'hierarchy-links',
    fields: ['vassal', 'suzerain'],
    subject: 'Ce titre',
    cited: 'cité',
    what: 'maillon(s)',
  },
  {
    collection: 'place-periods',
    fields: ['holderTitle'],
    subject: 'Ce titre',
    cited: 'cité',
    what: 'fiche(s) de ville',
  },
]

/**
 * A title (CMS-422 step 2) — **what a person holds or exercises, over a period, as the sources say**: Mathias II,
 * count of Nantes, 1084–1103; Gilles de Rais, marshal of France from 1429. A rank lives here, never on the person
 * (`files/plans/contribution/vassal-chain.md`, rule 3). The sheet of a place names its holder as a title; a hierarchical
 * link joins two titles.
 */
export const Titles: CollectionConfig = {
  slug: 'titles',
  labels: { singular: 'Titre', plural: 'Titres' },
  // CMS-508: a title removed goes to the bin, and comes back from it with « Restaurer »
  trash: true,
  admin: { useAsTitle: 'label', defaultColumns: ['label', 'person', 'territory'] },
  // CMS-507: the cities under its authority, attached at a year — the page's block and the historian's script.
  endpoints: titleEndpoints,
  hooks: {
    // Over MCP, one record at a time (CMS-454).
    beforeOperation: [refuseBulkRemovalOverMcp],
    beforeChange: [
      refuseRestoringOverBin,
      writeTitleLabel,
      refuseDuplicateClaim({
        collection: 'titles',
        relations: ['person', 'territory'],
        subject: 'Ce titre',
      }),
      // Nor put in the bin from under what cites it (CMS-508)
      ...TITLE_CITERS.map((citers) => refuseTrashingCited(citers)),
    ],
    afterChange: [refreshLinksOfTitle],
    beforeDelete: TITLE_CITERS.map((citers) => refuseDeletingCited(citers)),
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
          'Coché : ce titre ne relève de personne à ces dates — la chaîne hiérarchique s’arrête à lui.',
      },
    },
    claimLines(
      'Facultatif : la source qui dit que cette personne tenait ce territoire à cette date.'
    ),
    // CMS-507: a block of the page, no column — the cities are attached through the title's route
    {
      name: 'citiesUnderAuthority',
      type: 'ui',
      admin: { components: { Field: '/components/TitleCities/TitleCities#TitleCities' } },
    },
  ],
}
