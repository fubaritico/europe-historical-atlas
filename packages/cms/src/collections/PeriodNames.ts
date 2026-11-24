import { APIError } from 'payload'

import {
  NAME_LANGUAGES,
  periodNameLabel,
  repeatedLanguage,
} from '@europe-historical-atlas/core/data/periodName'

import { claimLines } from '../fields/claimLines'
import { LANGUAGE_LABELS, nameForms } from '../fields/nameForms'
import { relationId } from '../fields/relationId'
import { trimmedText } from '../fields/trimmedText'
import { refuseBulkRemovalOverMcp } from '../mcp/refuseBulkRemoval'

import { refuseDeletingCited, refuseTrashingCited } from './claimDependants'
import { refuseRestoringOverBin } from './refuseRestoringOverBin'

import type { Citers } from './claimDependants'
import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

/**
 * The rule of the table of correspondence: one form a language — a second spelling in the same language is another
 * name, with its own sources. A `validate` of our own replaces Payload's, `required` and `minRows` included
 * (`rules/known-issues/cms.md`), so the empty table is refused here too.
 * @param value - the `forms` field
 * @returns `true`, or the sentence said under the table
 */
export function validateForms(value: unknown): string | true {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Un nom d’époque a au moins une ligne : une langue et le nom dans cette langue.'
  }
  const twice = repeatedLanguage(nameForms(value))
  return twice === null
    ? true
    : `La langue « ${LANGUAGE_LABELS[twice]} » est saisie deux fois : une seule forme par langue. Une autre graphie dans la même langue est un autre nom d’époque.`
}

/**
 * Write a name's label from its forms at every save — « Ancyre · Ancyra » — never typed.
 * @param args - Payload's hook arguments
 * @param args.data - the name as it will be saved
 * @returns the data, with its label
 */
export const writePeriodNameLabel: CollectionBeforeChangeHook = ({ data }) => ({
  ...data,
  label: periodNameLabel(nameForms(data.forms)),
})

/** The HTTP status of a change refused because other records stand on what it would change. */
const CONFLICT = 409

/**
 * The other half of « a sheet's name is a name of its own place » (`refuseForeignPeriodName` holds the sheet's side):
 * a name **a sheet cites** does not change place — the sheets of Ankara would then write a name of Smyrna, with no
 * save of theirs to refuse it. A name no sheet cites yet moves freely: one entered under the wrong place is corrected.
 * @param args - Payload's hook arguments
 * @param args.data - the name as it will be saved
 * @param args.originalDoc - the name before this save, absent for a new one
 * @param args.operation - create or update
 * @param args.req - the request, whose Payload finds the sheets that cite the name
 * @returns the data, unchanged
 * @throws {APIError} when the place changes under sheets that cite the name — said under the place, kept in the console
 */
export const refuseMovingCitedName: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return data
  const saved = originalDoc as { id: number | string; place?: unknown }
  const from = relationId(saved.place)
  const to = relationId(data.place)
  if (String(from) === String(to)) return data
  const { totalDocs } = await req.payload.count({
    collection: 'place-periods',
    where: { periodName: { equals: saved.id } },
    req,
  })
  if (totalDocs === 0) return data
  console.warn(
    `[CMS] moving the name ${String(saved.id)} to another place refused: ${String(totalDocs)} sheet(s) cite it`
  )
  const message = `Ce nom d’époque est cité par ${String(totalDocs)} fiche(s) de ville de son lieu : il ne peut pas changer de lieu. Retirez-le de ces fiches d’abord, ou créez un autre nom pour l’autre lieu.`
  throw new APIError(message, CONFLICT, { errors: [{ path: 'place', message }] }, true)
}

/** What cites a name of the time: the cities' sheets that name it. */
const PERIOD_NAME_CITERS: Citers = {
  collection: 'place-periods',
  fields: ['periodName'],
  subject: 'Ce nom d’époque',
  cited: 'cité',
  what: 'fiche(s) de ville',
}

/**
 * A name of the time (« Nom d'époque », CMS-495; the dev, 2026-11-21) — **the name a place bore, as the sources of
 * the time or its historians write it**: Ankara is « Ancyre » in 1100. A record of its own, never a field of the
 * sheet: it holds its table of correspondence by language and its sources, the dated sheets point at it — the sheets
 * of 1100 and of 1200 at the same one — and it is created on the fly from a sheet's form, as a title is
 * (`files/plans/contribution/names.md`). The place itself bears its present name.
 */
export const PeriodNames: CollectionConfig = {
  slug: 'period-names',
  labels: { singular: 'Nom d’époque', plural: 'Noms d’époque' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'place'],
    description:
      'Le nom qu’un lieu portait à une époque — Ancyre pour Ankara en 1100 — dans chaque langue, avec ses sources. La fiche d’une ville à une date le désigne ; le lieu, lui, porte son nom d’aujourd’hui.',
  },
  // CMS-508: a name removed goes to the bin, and comes back from it with « Restaurer »
  trash: true,
  hooks: {
    // Over MCP, one record at a time (CMS-454).
    beforeOperation: [refuseBulkRemovalOverMcp],
    // Neither deleted nor put in the bin from under a sheet that names it (CMS-508)
    beforeChange: [
      refuseRestoringOverBin,
      refuseMovingCitedName,
      writePeriodNameLabel,
      refuseTrashingCited(PERIOD_NAME_CITERS),
    ],
    beforeDelete: [refuseDeletingCited(PERIOD_NAME_CITERS)],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Nom d’époque',
      admin: {
        readOnly: true,
        description: 'Écrit seul à l’enregistrement : le nom dans chaque langue saisie.',
      },
    },
    {
      name: 'place',
      type: 'relationship',
      relationTo: 'places',
      label: 'Lieu',
      required: true,
      admin: { description: 'Le lieu qui portait ce nom, choisi dans « Lieux ».' },
    },
    {
      name: 'forms',
      type: 'array',
      label: 'Le nom dans chaque langue',
      labels: { singular: 'Langue', plural: 'Langues' },
      required: true,
      minRows: 1,
      validate: validateForms,
      admin: {
        description:
          'Une ligne par langue — par exemple : français « Ancyre », anglais « Ancyra ». Une seule forme par langue.',
      },
      fields: [
        {
          name: 'language',
          type: 'select',
          label: 'Langue',
          required: true,
          options: NAME_LANGUAGES.map((value) => ({ value, label: LANGUAGE_LABELS[value] })),
        },
        {
          name: 'form',
          type: 'text',
          label: 'Nom',
          required: true,
          hooks: { beforeValidate: [trimmedText] },
          admin: { description: 'Le nom tel que cette langue l’écrit.' },
        },
      ],
    },
    claimLines('Facultatif : la source qui donne ce nom au lieu à cette époque.'),
  ],
}
