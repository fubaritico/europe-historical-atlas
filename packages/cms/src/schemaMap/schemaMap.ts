import type { CollectionConfig, Field } from 'payload'

/**
 * The map of the CMS's schema (CMS-280, `files/plans/contribution/cms-tooling.md` step 7): every collection, each field
 * with its type, whether it is required or translated, and the relations between collections — drawn as a Mermaid
 * diagram, with the French names, from the configuration and never from the SQLite tables (which also hold Payload's
 * `_locales`, `_rels` and `payload_migrations`). Pure: collections in, Markdown out — `run.ts` writes it, a test keeps
 * the committed file in step with the configuration.
 */

/** Where the map is written, from the repository's root. */
export const SCHEMA_MAP_PATH = 'files/plans/contribution/schema.md'

/** The field kinds that hold no data of their own: an interface element, a virtual join. */
const NO_DATA = new Set(['ui', 'join'])

/** A line of an entity: a field. */
interface Attribute {
  /** Its kind, Payload's: text, number, relationship… */
  readonly type: string
  /** Its path, the dots of a list or a group made underscores — Mermaid takes no dot in a name. */
  readonly name: string
  /** Its French name, and « requis », « traduit ». */
  readonly comment: string
}

/** A relation between two collections. */
interface Relation {
  /** The collection that cites. */
  readonly from: string
  /** The collection cited. */
  readonly to: string
  /** Mermaid's cardinality: one value or many, required or not. */
  readonly arrow: string
  /** The field's path. */
  readonly path: string
}

/**
 * A label as Payload holds it, in French: a text, a text per language — anything else (a function, none) gives the
 * fallback.
 * @param label - the label
 * @param fallback - what is said without one
 * @returns the French label
 */
function frenchOf(label: unknown, fallback: string): string {
  if (typeof label === 'string') return label
  if (label !== null && typeof label === 'object') {
    const byLanguage = label as Record<string, unknown>
    const french = byLanguage.fr ?? byLanguage.en
    if (typeof french === 'string') return french
  }
  return fallback
}

/**
 * A text inside Mermaid's double quotes: no double quote of its own.
 * @param text - the text
 * @returns the text, safe in quotes
 */
function quoted(text: string): string {
  return text.replace(/"/g, '’')
}

/**
 * An entity's name for Mermaid: a slug's dashes made underscores.
 * @param slug - the collection's slug
 * @returns the name
 */
function entity(slug: string): string {
  return slug.replace(/-/g, '_')
}

/**
 * The comment of a field: its French name, « requis » when required, « traduit » when localised.
 * @param field - a field with a name
 * @returns the comment
 */
function commentOf(field: Field & { name: string }): string {
  const marks = [
    frenchOf('label' in field ? field.label : undefined, field.name),
    ...('required' in field && field.required ? ['requis'] : []),
    ...('localized' in field && field.localized ? ['traduit'] : []),
  ]
  return quoted(marks.join(' · '))
}

/**
 * Refuse a kind of field that holds fields the walk does not read — it would leave the map silently partial (review
 * ARCH-002), so it is taught to the walk the day the CMS uses one.
 * @param field - the field
 * @param prefix - the path it sits under, for the message
 * @throws {Error} on a `blocks` field
 */
function refuseUnread(field: Field, prefix: string): void {
  if (field.type === 'blocks')
    throw new Error(
      `the schema map does not draw a « blocks » field yet (${prefix}${field.name}): teach it to schemaMap.walk`
    )
}

/**
 * The fields of a collection, flattened: a list's or a group's under its path, a row's or a tab's as their parent's.
 * @param fields - the fields
 * @param prefix - the path of the list or group they are in
 * @param inList - whether they sit in a list, where a relation is one of many
 * @param visit - what each field with a name is given, with its path and whether it sits in a list
 * @throws {Error} on a field of a kind that holds fields it does not read: `blocks`
 */
function walk(
  fields: readonly Field[],
  prefix: string,
  inList: boolean,
  visit: (field: Field & { name: string }, path: string, inList: boolean) => void
): void {
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs)
        walk(tab.fields, 'name' in tab ? `${prefix}${tab.name}.` : prefix, inList, visit)
      continue
    }
    if (NO_DATA.has(field.type)) continue
    refuseUnread(field, prefix)
    if ('name' in field) visit(field, `${prefix}${field.name}`, inList)
    if ('fields' in field)
      walk(
        field.fields,
        'name' in field ? `${prefix}${field.name}.` : prefix,
        inList || field.type === 'array',
        visit
      )
  }
}

/**
 * The attributes and the relations of one collection.
 * @param collection - the collection
 * @returns its fields as lines, and its relations
 */
function readCollection(collection: CollectionConfig): {
  attributes: Attribute[]
  relations: Relation[]
} {
  const attributes: Attribute[] = []
  const relations: Relation[] = []
  walk(collection.fields, '', false, (field, path, inList) => {
    attributes.push({ type: field.type, name: path.replace(/\./g, '_'), comment: commentOf(field) })
    if (field.type !== 'relationship' && field.type !== 'upload') return
    const many = inList || ('hasMany' in field && field.hasMany === true)
    const required = 'required' in field && field.required
    const arrow = many ? '}o--o{' : required ? '}o--||' : '}o--o|'
    for (const to of Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo])
      relations.push({ from: collection.slug, to, arrow, path })
  })
  return { attributes, relations }
}

/**
 * The map of the schema, as the Markdown file holds it.
 * @param collections - the CMS's collections
 * @returns the file's text
 */
export function schemaMap(collections: readonly CollectionConfig[]): string {
  const read = collections.map((collection) => ({ collection, ...readCollection(collection) }))
  const entities = read.flatMap(({ collection, attributes }) => [
    `  ${entity(collection.slug)}["${quoted(frenchOf(collection.labels?.singular, collection.slug))}"] {`,
    ...attributes.map(({ type, name, comment }) => `    ${type} ${name} "${comment}"`),
    '  }',
  ])
  const relations = read.flatMap(({ relations: each }) =>
    each.map(
      ({ from, to, arrow, path }) => `  ${entity(from)} ${arrow} ${entity(to)} : "${quoted(path)}"`
    )
  )
  return [
    '# The CMS’s schema',
    '',
    '> Generated by `pnpm cms:schema` from the built configuration (CMS-280) — never edited by hand.',
    '> `pnpm migrate:create` writes it again, and a test fails when it lags behind the configuration. Each field: its',
    '> kind, its French name, « requis » when required, « traduit » when translated — the fields Payload adds itself',
    '> (its dates, the bin’s) included. A relation reads « the collection on the left cites the one on the right »;',
    '> many (`}o--o{`) for a field of many values or one inside a list. Not drawn: the MCP plugin’s keys, Payload’s own',
    '> collections, and the tables it lays under them (`_locales`, `_rels`).',
    '',
    '```mermaid',
    'erDiagram',
    ...entities,
    ...relations,
    '```',
    '',
  ].join('\n')
}
