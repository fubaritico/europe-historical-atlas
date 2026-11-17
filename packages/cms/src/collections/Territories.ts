import { groupAt, momentGroup } from '../fields/historicalDate'
import { trimmedText } from '../fields/trimmedText'
import { wikidataField } from '../fields/wikidata'

import { refreshTitlesOf, refuseDeletingCited } from './claimDependants'

import type { CollectionConfig } from 'payload'

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
  'empire',
  'caliphate',
  'kingdom',
  'sultanate',
  'khanate',
  'principality',
  'emirate',
  'imamate',
  'despotate',
  'duchy',
  'march',
  'county',
  'viscounty',
  'lordship',
  'patriarchate',
  'archiepiscopal_lordship',
  'episcopal_lordship',
  'bishopric',
  'abbey',
  'city',
  'tribe',
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
  khanate: 'Khanat',
  principality: 'Principauté',
  emirate: 'Émirat',
  imamate: 'Imamat',
  despotate: 'Despotat',
  duchy: 'Duché',
  march: 'Marche',
  county: 'Comté',
  viscounty: 'Vicomté',
  lordship: 'Seigneurie',
  patriarchate: 'Patriarcat',
  archiepiscopal_lordship: 'Seigneurie archiépiscopale',
  episcopal_lordship: 'Seigneurie épiscopale',
  bishopric: 'Évêché (à reclasser)',
  abbey: 'Abbaye',
  city: 'Cité',
  tribe: 'Tribu',
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
  hooks: {
    afterChange: [refreshTitlesOf('territory')],
    beforeDelete: [
      refuseDeletingCited({
        collection: 'titles',
        fields: ['territory'],
        subject: 'Ce territoire',
        cited: 'cité',
        what: 'titre(s)',
      }),
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nom',
      required: true,
      localized: true,
      hooks: { beforeValidate: [trimmedText] },
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
