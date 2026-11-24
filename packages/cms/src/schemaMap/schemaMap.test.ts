import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { schemaMap } from './schemaMap'
import { SCHEMA_MAP_FILE, cmsCollectionsIn, writeSchemaMap } from './writeSchemaMap'

import type { CollectionConfig } from 'payload'

/** A collection that holds every shape the map draws. */
const SHEET: CollectionConfig = {
  slug: 'place-periods',
  labels: { singular: { fr: 'Ville à une date', en: 'City at a date' }, plural: 'Villes' },
  fields: [
    { name: 'place', type: 'relationship', relationTo: 'places', required: true, label: 'Lieu' },
    { name: 'periodName', type: 'relationship', relationTo: 'period-names', label: 'Nom d’époque' },
    {
      name: 'reasons',
      type: 'relationship',
      relationTo: 'importance-reasons',
      hasMany: true,
      label: 'Raisons',
    },
    { name: 'note', type: 'text', localized: true, label: 'Note « dite "ainsi" »' },
    {
      name: 'testimonies',
      type: 'array',
      label: 'Lignes',
      fields: [{ name: 'source', type: 'relationship', relationTo: 'sources', label: 'Source' }],
    },
    { type: 'row', fields: [{ name: 'inRow', type: 'number' }] },
    {
      type: 'tabs',
      tabs: [{ name: 'more', fields: [{ name: 'deep', type: 'checkbox' }] }],
    },
    { name: 'button', type: 'ui', admin: { components: { Field: '/x' } } },
  ],
}

/**
 * The map's lines.
 * @param collections - the collections drawn
 * @returns its lines
 */
const lines = (collections: CollectionConfig[]): string[] => schemaMap(collections).split('\n')

// CMS-280: the map of the CMS's schema, from the configuration.
describe('schemaMap', () => {
  describe('happy path', () => {
    it('draws a collection under its French name, each field with its kind, its name and its marks', () => {
      expect(lines([SHEET])).toEqual(
        expect.arrayContaining([
          '  place_periods["Ville à une date"] {',
          '    relationship place "Lieu · requis"',
          '    text note "Note « dite ’ainsi’ » · traduit"',
        ])
      )
    })
  })

  describe('variants', () => {
    it('draws a relation by its cardinality: required, optional, many, one of a list', () => {
      expect(lines([SHEET])).toEqual(
        expect.arrayContaining([
          '  place_periods }o--|| places : "place"',
          '  place_periods }o--o| period_names : "periodName"',
          '  place_periods }o--o{ importance_reasons : "reasons"',
          '  place_periods }o--o{ sources : "testimonies.source"',
        ])
      )
    })

    it('lays a list’s fields under its path, a row’s and an unnamed tab’s as their parent’s, a named tab’s under its name', () => {
      expect(lines([SHEET])).toEqual(
        expect.arrayContaining([
          '    array testimonies "Lignes"',
          '    relationship testimonies_source "Source"',
          '    number inRow "inRow"',
          '    checkbox more_deep "deep"',
        ])
      )
    })
  })

  describe('managed errors', () => {
    it('draws no line for a field that holds no data', () => {
      expect(schemaMap([SHEET])).not.toContain('button')
    })
  })

  // L4: N/A — a pure reading of the configuration's literals.

  describe('edge cases', () => {
    it('names a collection with no label by its slug', () => {
      expect(lines([{ slug: 'raw', fields: [] }])).toContain('  raw["raw"] {')
    })

    // Review ARCH-002: the shapes the CMS does not use today, drawn or refused, never silently left out
    it('draws an upload, a relation to two collections, a named group, and labels in English only or computed', () => {
      const odd: CollectionConfig = {
        slug: 'odd',
        fields: [
          { name: 'scan', type: 'upload', relationTo: 'places', label: { en: 'Scan' } },
          { name: 'either', type: 'relationship', relationTo: ['places', 'sources'] },
          {
            name: 'meta',
            type: 'group',
            label: () => 'computed',
            fields: [{ name: 'by', type: 'relationship', relationTo: 'people' }],
          },
        ],
      }
      expect(lines([odd])).toEqual(
        expect.arrayContaining([
          '    upload scan "Scan"',
          '    group meta "meta"',
          '  odd }o--o| places : "scan"',
          '  odd }o--o| places : "either"',
          '  odd }o--o| sources : "either"',
          '  odd }o--o| people : "meta.by"',
        ])
      )
    })

    it('refuses a blocks field, whose fields the map would leave out', () => {
      const blocks = {
        slug: 'paged',
        fields: [{ name: 'body', type: 'blocks', blocks: [] }],
      } as unknown as CollectionConfig
      expect(() => schemaMap([blocks])).toThrow('« blocks »')
    })

    // The file is written by `pnpm cms:schema` and by `pnpm migrate:create`, both from the built configuration: a field
    // changed without either fails here
    it('keeps the committed map in step with the CMS’s built configuration', async () => {
      process.env.DATABASE_URL ??= 'file:/nowhere/never-opened.db'
      process.env.PAYLOAD_SECRET ??= 'test-secret-of-the-schema-map'
      const { buildConfig } = await import('payload')
      const { cmsConfig } = await import('../cmsConfig')
      const built = await buildConfig(cmsConfig())
      expect(readFileSync(SCHEMA_MAP_FILE, 'utf8')).toBe(schemaMap(cmsCollectionsIn(built)))
    }, 30_000)
  })
})

describe('writeSchemaMap', () => {
  it('writes the map of the collections it is given to the file it is given', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'cms-schema-map-'))
    const file = path.join(folder, 'schema.md')
    try {
      expect(writeSchemaMap([{ slug: 'raw', fields: [] }], file)).toBe(file)
      expect(readFileSync(file, 'utf8')).toBe(schemaMap([{ slug: 'raw', fields: [] }]))
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
