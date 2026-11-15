import { describe, expect, it } from 'vitest'

import { addedReferences, shortReferencesLeft } from './addedReferences'

import type { MigrationSnapshot } from './addedReferences'

/** A line as the generator writes it in a migration's text, its backticks escaped. */
const SHORT =
  'await db.run(sql`ALTER TABLE \\`payload_locked_documents_rels\\` ADD \\`titles_id\\` integer REFERENCES titles(id);`)'

const SNAPSHOT: MigrationSnapshot = {
  tables: {
    payload_locked_documents_rels: {
      foreignKeys: {
        payload_locked_documents_rels_titles_fk: {
          tableFrom: 'payload_locked_documents_rels',
          columnsFrom: ['titles_id'],
          onDelete: 'cascade',
          onUpdate: 'no action',
        },
      },
    },
    people: {
      foreignKeys: {
        people_house_id_people_id_fk: {
          tableFrom: 'people',
          columnsFrom: ['house_id'],
          onDelete: 'set null',
        },
      },
    },
  },
}

describe('addedReferences', () => {
  describe('happy path', () => {
    it('writes an added column’s key with the actions its snapshot declares', () => {
      expect(addedReferences(SHORT, SNAPSHOT)).toBe(
        'await db.run(sql`ALTER TABLE \\`payload_locked_documents_rels\\` ADD \\`titles_id\\` integer REFERENCES \\`titles\\`(\\`id\\`) ON UPDATE no action ON DELETE cascade;`)'
      )
    })
  })

  describe('variants', () => {
    it('writes an action the snapshot leaves out as SQLite’s default, no action', () => {
      const line = 'ALTER TABLE \\`people\\` ADD \\`house_id\\` integer REFERENCES people(id);'
      expect(addedReferences(line, SNAPSHOT)).toBe(
        'ALTER TABLE \\`people\\` ADD \\`house_id\\` integer REFERENCES \\`people\\`(\\`id\\`) ON UPDATE no action ON DELETE set null;'
      )
    })

    it('completes every short reference of a migration, and leaves its other lines alone', () => {
      const text = [
        SHORT,
        'await db.run(sql`CREATE INDEX \\`x\\` ON \\`y\\` (\\`z\\`);`)',
        SHORT,
      ].join('\n')
      const lines = addedReferences(text, SNAPSHOT).split('\n')
      expect(lines.map((line) => line.includes('ON DELETE cascade'))).toEqual([true, false, true])
    })
  })

  describe('edge cases', () => {
    it('leaves a column its snapshot has no key for as it is', () => {
      const line = 'ALTER TABLE \\`events\\` ADD \\`place_id\\` integer REFERENCES places(id);'
      expect(addedReferences(line, SNAPSHOT)).toBe(line)
    })

    it('leaves a reference already written whole unchanged', () => {
      const whole = addedReferences(SHORT, SNAPSHOT)
      expect(addedReferences(whole, SNAPSHOT)).toBe(whole)
    })
  })

  // L3/L4: N/A — a text and a snapshot in, a text out; nothing refused, nothing read from outside.
})

describe('shortReferencesLeft', () => {
  it('names a column still added with no action — a fix that did not apply', () => {
    expect(shortReferencesLeft(SHORT)).toEqual(['titles_id'])
  })

  it('names a reference spelled differently by a later generator, its target quoted', () => {
    expect(
      shortReferencesLeft(
        'ALTER TABLE \\`t\\` ADD \\`x_id\\` integer REFERENCES \\`x\\`(\\`id\\`);'
      )
    ).toEqual(['x_id'])
  })

  it('names nothing once every reference carries its actions', () => {
    expect(shortReferencesLeft(addedReferences(SHORT, SNAPSHOT))).toEqual([])
  })
})
