import type { ArrayField } from 'payload'

/**
 * The source lines of a claim — a title held, a link of vassalage (CMS-422): one line per source that says it, with
 * where it says it, its own words, and the name as it writes the person or the land. **Facultative** (the dev,
 * 2026-11-16: the sources are not to be made mandatory) — a claim may be entered first and sourced later; a divergent
 * reading is a second claim, never a second line here.
 * @param description - the sentence under the list, saying what the lines prove
 * @returns the array field
 */
export function claimLines(description: string): ArrayField {
  return {
    name: 'lines',
    type: 'array',
    label: 'Ce que disent les sources',
    labels: { singular: 'Source', plural: 'Sources' },
    admin: { description },
    fields: [
      {
        name: 'source',
        type: 'relationship',
        relationTo: 'sources',
        label: 'Source',
        required: true,
        admin: { description: 'Choisie parmi celles déjà saisies dans « Sources ».' },
      },
      {
        name: 'where',
        type: 'text',
        label: 'Où',
        admin: { description: 'Une page, une ligne, une colonne. Facultatif.' },
      },
      {
        name: 'quotation',
        type: 'textarea',
        label: 'Citation',
        admin: { description: 'Les mots de la source, recopiés tels quels.' },
      },
      {
        name: 'asWritten',
        type: 'text',
        label: 'Nom dans la source',
        admin: {
          description:
            'Facultatif — le nom tel que la source l’écrit, recopié tel quel : « Mathieu, comte nantais ».',
        },
      },
    ],
  }
}
