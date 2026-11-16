import { claimLines } from '../fields/claimLines'
import { historicalDateField } from '../fields/historicalDate'
import { relationId } from '../fields/relationId'

import { refuseDuplicateClaim } from './refuseDuplicateClaim'
import { writeLinkLabel } from './writeClaimTitles'

import type { CollectionConfig, Validate } from 'payload'

/** Whom a link says the title answers to: a suzerain's title, or no one — a sovereign, as a source states it. */
export const ANSWERS_TO = ['suzerain', 'no-one'] as const

/** One of {@link ANSWERS_TO}. */
export type AnswersTo = (typeof ANSWERS_TO)[number]

/** The form's label of each answer. */
const ANSWER_LABELS: Record<AnswersTo, string> = {
  suzerain: 'Un titre — son suzerain',
  'no-one': 'Personne — il est souverain',
}

/**
 * The suzerain of a link that names one: required, and never the vassal itself.
 * @param value - the suzerain chosen
 * @param options - Payload's validation options
 * @param options.siblingData - the link's other fields
 * @returns `true`, or the sentence the form shows under the field
 */
export const validateSuzerain: Validate = (value, { siblingData }) => {
  const sibling = siblingData as { vassal?: unknown; answersTo?: unknown }
  if (sibling.answersTo === 'no-one') return true
  const suzerain = relationId(value)
  if (suzerain === null) {
    return 'Choisissez le titre dont il relève — ou « Personne » s’il est souverain.'
  }
  return suzerain === relationId(sibling.vassal)
    ? 'Un titre ne peut pas relever de lui-même : choisissez un autre suzerain.'
    : true
}

/**
 * A link of vassalage (« maillon », CMS-422 step 2) — **a title answering to another, over a period, as the sources
 * say**: the count of Nantes to the duke of Brittany, 1084–1103. Entered once, read by every place under it
 * (`files/plans/contribution/vassal-chain.md`, rule 2). It names the title it is for, never the person alone (rule
 * 1: Robert II answers to two lords for two lands). A divergent reading is a second link.
 *
 * **Sovereignty is said, never inferred from a blank** (the dev's « vas-y », 2026-11-15): `answersTo` is « no-one »
 * when a source states the title answers to no one. A title with no link, or whose suzerain is gone, is « we do not
 * know » in the chain (`core/data/vassalChain`) — so nothing forgotten reads as certain.
 */
export const VassalLinks: CollectionConfig = {
  slug: 'vassal-links',
  labels: { singular: 'Maillon', plural: 'Maillons' },
  admin: { useAsTitle: 'label', defaultColumns: ['label'] },
  hooks: {
    // The label's hook first: it empties the suzerain of a « no one » link, so the twin is looked for as stored
    beforeChange: [
      writeLinkLabel,
      refuseDuplicateClaim({
        collection: 'vassal-links',
        relations: ['vassal', 'suzerain'],
        subject: 'Ce maillon',
      }),
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: 'Maillon',
      admin: {
        readOnly: true,
        description: 'Écrit seul à l’enregistrement : le vassal → son suzerain.',
      },
    },
    {
      name: 'vassal',
      type: 'relationship',
      relationTo: 'titles',
      label: 'Vassal',
      required: true,
      admin: { description: 'Le titre qui relève d’un autre, choisi dans « Titres ».' },
    },
    {
      name: 'answersTo',
      type: 'radio',
      label: 'Relève de',
      required: true,
      defaultValue: 'suzerain',
      options: ANSWERS_TO.map((value) => ({ value, label: ANSWER_LABELS[value] })),
      // Hidden (the dev, 2026-11-16: a sovereign is ticked « Souverain » on its title, never a link to no one) — kept
      // in the base, every link answering to a suzerain
      admin: { hidden: true },
    },
    {
      name: 'suzerain',
      type: 'relationship',
      relationTo: 'titles',
      label: 'Suzerain',
      validate: validateSuzerain,
      admin: {
        condition: (_data, sibling) => (sibling as { answersTo?: unknown }).answersTo !== 'no-one',
        description: 'Le titre dont il relève, choisi dans « Titres ».',
      },
    },
    historicalDateField({
      name: 'date',
      label: 'Date',
      description: 'Quand ce lien vaut. Une année suffit ; remplir la fin en fait une durée.',
    }),
    claimLines('Au moins une : la source qui dit ce lien à cette date.'),
  ],
}
