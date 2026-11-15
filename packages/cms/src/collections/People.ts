import { groupAt, momentGroup } from '../fields/historicalDate'
import { wikidataField } from '../fields/wikidata'

import type { CollectionConfig, Condition, GroupField } from 'payload'

/** What a record of the register is: a person, or a house — a dynasty, a lineage (the Almoravids, the Stuarts). */
export const PERSON_KINDS = ['person', 'house'] as const

/** A record of the register's kind. */
export type PersonKind = (typeof PERSON_KINDS)[number]

/** The form's label of each kind. */
const KIND_LABELS: Record<PersonKind, string> = { person: 'Personne', house: 'Maison' }

/**
 * Show a field for one kind of record only.
 * @param kind - the kind it belongs to
 * @returns the form's condition
 */
function forKind(kind: PersonKind): Condition {
  return (data) => (data as { kind?: unknown }).kind === kind
}

/**
 * A group of the register shown for one kind only — the date groups keep their own description.
 * @param group - the group
 * @param kind - the kind it belongs to
 * @returns the group, with its condition
 */
function onlyFor(group: GroupField, kind: PersonKind): GroupField {
  return { ...group, admin: { ...group.admin, condition: forKind(kind) } }
}

/**
 * The register of people (« Personnes », CMS-422 step 1, the dev, 2026-11-15) — **who someone is, nothing more**: a
 * name, a Wikidata id, when they lived, and the house they belong to. Any person, lords or not (Pascal, Joan of Arc,
 * Luther), so it grows into genealogies; a house is a record of the same register, with its founder.
 *
 * What changes over a life is never a field here (`files/plans/contribution/vassal-chain.md`, rule 3): a rank goes to
 * the title held, a part in an event to the event (`events.actors`), a confession to a dated claim.
 */
export const People: CollectionConfig = {
  slug: 'people',
  labels: { singular: 'Personne', plural: 'Personnes' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'kind', 'wikidata'] },
  fields: [
    { name: 'name', type: 'text', label: 'Nom', required: true, localized: true },
    {
      name: 'kind',
      type: 'select',
      label: 'Personne ou maison',
      required: true,
      defaultValue: 'person',
      options: PERSON_KINDS.map((value) => ({ value, label: KIND_LABELS[value] })),
    },
    wikidataField,
    {
      type: 'row',
      fields: [
        onlyFor(
          momentGroup({
            name: 'born',
            label: 'Naissance',
            description: 'Le jour, l’année, ou « vers ».',
          }),
          'person'
        ),
        onlyFor(
          momentGroup({
            name: 'died',
            label: 'Mort',
            description: 'Vide : on ne sait pas, ou la personne vit encore.',
            earlier: (data) => groupAt(data, 'born'),
          }),
          'person'
        ),
      ],
    },
    {
      type: 'row',
      fields: [
        onlyFor(
          momentGroup({
            name: 'founded',
            label: 'Fondation',
            description: 'Sa première mention, à défaut.',
          }),
          'house'
        ),
        onlyFor(
          momentGroup({
            name: 'ended',
            label: 'Extinction',
            description: 'Vide : on ne sait pas, ou la maison existe encore.',
            earlier: (data) => groupAt(data, 'founded'),
          }),
          'house'
        ),
      ],
    },
    {
      name: 'house',
      type: 'relationship',
      relationTo: 'people',
      label: 'Maison',
      filterOptions: { kind: { equals: 'house' } },
      admin: {
        condition: forKind('person'),
        description:
          'La maison à laquelle elle appartient (Wikidata, P53), choisie parmi les maisons du registre.',
      },
    },
    {
      name: 'founder',
      type: 'relationship',
      relationTo: 'people',
      label: 'Fondateur',
      filterOptions: { kind: { equals: 'person' } },
      admin: {
        condition: forKind('house'),
        description: 'La personne qui l’a fondée, choisie dans le registre.',
      },
    },
  ],
}
