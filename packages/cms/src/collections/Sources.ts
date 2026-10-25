import type { CollectionConfig } from 'payload'

/**
 * The source register: each source written once, then chosen from a list by every event that cites it — so one
 * chronicle is one record, however many events it supports. Fields from `files/plans/contribution/payload-check.md`
 * (the dev, 2026-10-23); only the title is required.
 */
export const Sources: CollectionConfig = {
  slug: 'sources',
  labels: { singular: 'Source', plural: 'Sources' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'author', 'kind'] },
  fields: [
    { name: 'title', type: 'text', label: 'Titre', required: true },
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
