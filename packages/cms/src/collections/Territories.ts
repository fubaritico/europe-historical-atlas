import { POLITY_RANKS } from '@europe-historical-atlas/core/data/ranks'

import { groupAt, momentGroup } from '../fields/historicalDate'
import { otherNamesField } from '../fields/otherNames'
import { trimmedText } from '../fields/trimmedText'
import { wikidataField } from '../fields/wikidata'

import { refreshTitlesOf } from './claimDependants'
import { registerRefusals } from './refuseRemovingCited'
import { refuseRestoringOverBin } from './refuseRestoringOverBin'

import type { CollectionConfig } from 'payload'

/** A territory a title still names is neither put in the bin nor erased from under it (CMS-509). */
const REFUSALS = registerRefusals({ subject: 'Ce territoire', cited: 'cité' })

/**
 * What a territory of the register is: a land held — from an empire to a lordship — or an office exercised. The kind
 * is **indicative, never a rule** (the dev, 2026-11-16): no code decides on it. The ranks of the three worlds (the
 * caliphate, the emirate, the imamate…) and the temporal power of a cleric — an episcopal or archiepiscopal lordship,
 * a patriarchate — are kinds of their own (the dev, 2026-11-16); a city's episcopal or archiepiscopal see is one of
 * its importance reasons, its function, never the rank of its holder
 * (`files/plans/contribution/vassals/saisie-et-exploitation-des-chaines-de-vassalité.md`). `bishopric` stays until
 * the historian has reclassed the sheets that carry it.
 */
export const TERRITORY_KINDS = [
  // The ranks of a polity: core's one list, which the Cartographer's form offers too (CARTO-487, the dev, 2026-11-20).
  ...POLITY_RANKS,
  // What only the register holds: a cleric's other powers, a city, an abbey, an office.
  'patriarchate',
  'episcopal_lordship',
  'bishopric',
  'abbey',
  'city',
  'office',
] as const

/** A territory's kind. */
export type TerritoryKind = (typeof TERRITORY_KINDS)[number]

/** The form's label of each kind. */
const KIND_LABELS: Record<TerritoryKind, string> = {
  empire: 'Empire',
  caliphate: 'Califat',
  kingdom: 'Royaume',
  sultanate: 'Sultanat',
  duchy: 'Duché',
  republic: 'République',
  imamate: 'Imamat',
  archiepiscopal_lordship: 'Seigneurie archiépiscopale',
  khanate: 'Khanat',
  despotate: 'Despotat',
  principality: 'Principauté',
  county: 'Comté',
  emirate: 'Émirat',
  lordship: 'Seigneurie',
  march: 'Marche',
  viscounty: 'Vicomté',
  confederation: 'Confédération de tribus',
  tribe: 'Tribu',
  tribe_outlined: 'Tribu à contour',
  people: 'Peuple',
  distant: 'Pays lointain',
  patriarchate: 'Patriarcat',
  episcopal_lordship: 'Seigneurie épiscopale',
  bishopric: 'Évêché (à reclasser)',
  abbey: 'Abbaye',
  city: 'Cité',
  office: 'Charge',
}

/**
 * The register of territories (CMS-422 step 2, the dev, 2026-11-15) — **what is held**: a land (the county of Nantes,
 * the march of Austria) or an office (marshal of France), never a point on the map — a place has a position, a
 * territory an extent, an office none. Who holds it, and when, is a **title**; whom it answers to, a **link** between
 * titles, dated — so a territory says nothing of its suzerain.
 */
export const Territories: CollectionConfig = {
  slug: 'territories',
  labels: { singular: 'Territoire', plural: 'Territoires' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'kind', 'wikidata'] },
  // CMS-509: a territory removed goes to the bin — a duplicate merged away too — and comes back from it with « Restaurer »
  trash: true,
  hooks: {
    afterChange: [refreshTitlesOf('territory')],
    beforeChange: [refuseRestoringOverBin, REFUSALS.beforeChange],
    beforeDelete: [REFUSALS.beforeDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nom',
      required: true,
      // The column's default, which SQLite needs to add a required column to a filled table (migration
      // `plain_french_names`); never saved — the field is required, and an empty name is refused.
      defaultValue: '',
      hooks: { beforeValidate: [trimmedText] },
      admin: {
        description:
          'Le nom français du territoire. Son nom dans les autres langues, l’anglais compris, se saisit dans le tableau ci-dessous.',
      },
    },
    {
      name: 'kind',
      type: 'select',
      label: 'Sorte',
      required: true,
      options: TERRITORY_KINDS.map((value) => ({ value, label: KIND_LABELS[value] })),
      admin: {
        description: 'Une terre tenue — d’un empire à une seigneurie — ou une charge exercée.',
      },
    },
    // CMS-495: one name a language (the dev, 2026-11-22) — the French one is the field above, which the titles and
    // the chains read; the others stand in this table, shared with the places.
    otherNamesField('pour le comté de Champagne : anglais « County of Champagne »'),
    wikidataField,
    {
      type: 'row',
      fields: [
        momentGroup({
          name: 'existsFrom',
          label: 'Existe depuis',
          description: 'Sa création, ou sa première mention.',
        }),
        momentGroup({
          name: 'existsTo',
          label: 'Existe jusqu’à',
          description: 'Vide : on ne sait pas, ou il existe encore.',
          earlier: (data) => groupAt(data, 'existsFrom'),
        }),
      ],
    },
  ],
}
