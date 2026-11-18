import { trimmedText } from '../fields/trimmedText'
import { refuseBulkDeleteOverMcp } from '../mcp/refuseBulkDelete'

import { refuseDeletingCited } from './claimDependants'

import type { CollectionConfig } from 'payload'

/**
 * Everything that cites a source: the collection, the field that points at it, and what it is called in a refusal.
 * Held against the collections themselves by `deleteGuards.test.ts`: a field added later that points at a source and
 * is missing here fails there.
 */
export const SOURCE_CITERS = [
  { collection: 'place-periods', field: 'testimonies.source', what: 'fiche(s) de ville' },
  { collection: 'titles', field: 'lines.source', what: 'titre(s)' },
  { collection: 'vassal-links', field: 'lines.source', what: 'maillon(s)' },
  { collection: 'events', field: 'sources', what: 'événement(s)' },
  { collection: 'siege-engines', field: 'sources', what: 'engin(s) de siège' },
  { collection: 'sources', field: 'copyOf', what: 'source(s) qui la reprennent' },
] as const

/**
 * The source register: each source written once, then chosen from a list by every event that cites it — so one
 * chronicle is one record, however many events it supports. Fields from `files/plans/contribution/payload-check.md`
 * (the dev, 2026-10-23); only the title is required.
 */
export const Sources: CollectionConfig = {
  slug: 'sources',
  labels: { singular: 'Source', plural: 'Sources' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'author', 'kind'] },
  hooks: {
    // A source something still cites is never deleted from under it (CMS-454): a line would keep its quotation and
    // lose where it comes from. What cites it is changed or deleted first.
    // Over MCP, one record at a time (CMS-454).
    beforeOperation: [refuseBulkDeleteOverMcp],
    beforeDelete: SOURCE_CITERS.map(({ collection, field, what }) =>
      refuseDeletingCited({
        collection,
        fields: [field],
        subject: 'Cette source',
        cited: 'citée',
        what,
      })
    ),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titre',
      required: true,
      hooks: { beforeValidate: [trimmedText] },
    },
    { name: 'author', type: 'text', label: 'Auteur' },
    {
      type: 'row',
      fields: [
        { name: 'publisher', type: 'text', label: 'Éditeur' },
        { name: 'editionYear', type: 'number', label: 'Année d’édition' },
      ],
    },
    {
      name: 'kind',
      type: 'select',
      label: 'Genre',
      options: [
        { label: 'Document d’époque', value: 'primary' },
        { label: 'Atlas d’historien', value: 'historian-atlas' },
        { label: 'Ouvrage savant', value: 'scholarly' },
        { label: 'Encyclopédie', value: 'encyclopaedia' },
        { label: 'Base collaborative', value: 'crowd-database' },
      ],
    },
    {
      name: 'licence',
      type: 'select',
      label: 'Licence',
      options: [
        { label: 'Domaine public', value: 'public-domain' },
        { label: 'CC0', value: 'cc0' },
        { label: 'CC BY', value: 'cc-by' },
        { label: 'CC BY-SA', value: 'cc-by-sa' },
        { label: 'Tous droits réservés', value: 'all-rights-reserved' },
      ],
    },
    { name: 'url', type: 'text', label: 'Adresse en ligne' },
    {
      name: 'copyOf',
      type: 'relationship',
      relationTo: 'sources',
      hasMany: true,
      label: 'Copie de',
      admin: {
        description: 'Les sources qu’elle reprend : une carte redessinée d’après un atlas.',
      },
    },
  ],
}
