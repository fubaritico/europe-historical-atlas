import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { migrationFiles } from './finishMigrations'
import {
  dangerSentence,
  dangersIn,
  dangersOfNewFiles,
  dangersOnDisk,
  unreviewedDangers,
} from './migrationDangers'
import { MIGRATION_DIR } from './paths'

const way = (statements: readonly string[]) =>
  statements
    .map((statement) => `  await db.run(sql\`${statement.replaceAll('`', '\\`')}\`)`)
    .join('\n')

/**
 * A migration as Payload writes one: each statement in `sql\`…\``, its backticks escaped.
 * @param up - the way up's statements
 * @param down - the way down's statements
 * @param head - lines above the two ways, a review mark for one
 * @returns its source
 */
function migration(up: readonly string[], down: readonly string[], head = ''): string {
  return [
    "import { sql } from '@payloadcms/db-sqlite'",
    head,
    'export async function up({ db }: MigrateUpArgs): Promise<void> {',
    way(up),
    '}',
    'export async function down({ db }: MigrateDownArgs): Promise<void> {',
    way(down),
    '}',
  ].join('\n')
}

/** The way down Payload generated on 2026-11-15 for one column added: `place_periods` rebuilt. */
const REBUILT_DOWN = migration(
  ['ALTER TABLE `place_periods` ADD `holder_title_id` integer;'],
  [
    'CREATE TABLE `__new_place_periods` (`id` integer PRIMARY KEY NOT NULL);',
    'INSERT INTO `__new_place_periods`("id") SELECT "id" FROM `place_periods`;',
    'DROP TABLE `place_periods`;',
    'ALTER TABLE `__new_place_periods` RENAME TO `place_periods`;',
  ]
)

describe('migrationDangers', () => {
  describe('happy path', () => {
    it('says a rebuild once, by the table rebuilt, in the way it is in', () => {
      expect(dangersIn(REBUILT_DOWN)).toEqual([
        { direction: 'down', kind: 'rebuild', table: 'place_periods' },
      ])
    })

    it('says nothing of a migration that only adds', () => {
      const adding = migration(
        [
          'CREATE TABLE `period_names` (`id` integer);',
          'ALTER TABLE `place_periods` ADD `period_name_id` integer;',
        ],
        ['DROP TABLE `period_names`;', 'ALTER TABLE `place_periods` DROP COLUMN `period_name_id`;']
      )
      expect(dangersIn(adding)).toEqual([])
    })
  })

  describe('variants', () => {
    it('says a table dropped, a column dropped and a rename in the way up', () => {
      const losing = migration(
        [
          'DROP TABLE `places_locales`;',
          'ALTER TABLE `people` DROP COLUMN `house_id`;',
          'ALTER TABLE `actors` RENAME TO `people`;',
        ],
        []
      )
      expect(dangersIn(losing).map(dangerSentence)).toEqual([
        'up drops the table places_locales',
        'up drops a column of people',
        'up renames actors',
      ])
    })

    it('says a way down that drops a column its way up did not add', () => {
      const down = migration([], ['ALTER TABLE `places` DROP COLUMN `name`;'])
      expect(dangersIn(down)).toEqual([{ direction: 'down', kind: 'drop-column', table: 'places' }])
    })

    it('reads a name in double quotes, and a drop that says it may not find the table', () => {
      expect(dangersIn(migration(['DROP TABLE IF EXISTS "titles_lines";'], []))).toEqual([
        { direction: 'up', kind: 'drop-table', table: 'titles_lines' },
      ])
    })
  })

  describe('the ways around a template (review SEC-001 of CMS-280)', () => {
    it('reads a drop run through sql.raw, as a hand-written migration runs its statements', () => {
      const raw = [
        'export async function up({ db }: MigrateUpArgs): Promise<void> {',
        "  await db.run(sql.raw('DROP TABLE `places_locales`;'))",
        '}',
        'export async function down(): Promise<void> {}',
      ].join('\n')
      expect(dangersIn(raw)).toEqual([
        { direction: 'up', kind: 'drop-table', table: 'places_locales' },
      ])
    })

    it('says a table named by a computed value, whatever it is', () => {
      const computed = migration(['DROP TABLE `${table}`;'], [])
      expect(dangersIn(computed)).toEqual([
        { direction: 'up', kind: 'drop-table', table: '${table}' },
      ])
    })

    it('says every drop of a string that holds several', () => {
      const two = migration(['DROP TABLE `a`; DROP TABLE `b`;'], [])
      expect(dangersIn(two).map(dangerSentence)).toEqual([
        'up drops the table a',
        'up drops the table b',
      ])
    })

    it('does not read a statement a comment names', () => {
      const commented = migration(
        ['SELECT 1;'],
        [],
        '// once: DROP TABLE `places`;\n/* DROP TABLE `people` */'
      )
      expect(dangersIn(commented)).toEqual([])
    })

    it('counts with the way up a constant written before it', () => {
      const constant = [
        "const STEP = 'ALTER TABLE `people` DROP COLUMN `house_id`;'",
        'export async function up({ db }: MigrateUpArgs): Promise<void> {',
        '  await db.run(sql.raw(STEP))',
        '}',
        'export async function down(): Promise<void> {}',
      ].join('\n')
      expect(dangersIn(constant)).toEqual([
        { direction: 'up', kind: 'drop-column', table: 'people' },
      ])
    })

    it('reads a name in brackets, in single quotes, or with its schema', () => {
      const quoted = migration(['DROP TABLE [a];', "DROP TABLE 'b';", 'DROP TABLE main.c;'], [])
      expect(dangersIn(quoted).map((danger) => danger.table)).toEqual(['a', 'b', 'c'])
    })

    it('reads a helper written after the way down, said with it — and migrate refuses either way', () => {
      const helper = [
        'export async function up({ db }: MigrateUpArgs): Promise<void> {',
        '  await dropOld(db)',
        '}',
        'export async function down(): Promise<void> {}',
        "async function dropOld(db: Db) { await db.run(sql.raw('DROP TABLE `old`;')) }",
      ].join('\n')
      expect(unreviewedDangers(helper)).toEqual([
        { direction: 'down', kind: 'drop-table', table: 'old' },
      ])
    })

    it('says a way down that renames, even what its way up brought', () => {
      const renaming = migration(
        ['CREATE TABLE `x` (`id` integer);'],
        ['ALTER TABLE `x` RENAME TO `y`;']
      )
      expect(dangersIn(renaming)).toEqual([{ direction: 'down', kind: 'rename', table: 'x' }])
    })
  })

  describe('managed errors', () => {
    it('lets a migration through once it says its dangers were read', () => {
      const read = migration(
        ['DROP TABLE `places_locales`;'],
        [],
        '// dangers reviewed: a child table nothing points at'
      )
      expect(unreviewedDangers(read)).toEqual([])
      expect(dangersIn(read)).toHaveLength(1)
    })

    it('does not take a review mark with no reason', () => {
      const bare = migration(['DROP TABLE `places_locales`;'], [], '// dangers reviewed:')
      expect(unreviewedDangers(bare)).toHaveLength(1)
    })

    it('lets a file that cannot be read stop the migration rather than count as safe', () => {
      const dangersOf = dangersOnDisk('/nowhere', () => {
        throw new Error('ENOENT: /nowhere/x.ts')
      })
      expect(() => dangersOf('x')).toThrow('ENOENT')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses to read a file with no way up, rather than count it safe', () => {
      expect(() => dangersIn('// not a migration')).toThrow('no way up found')
      expect(() => unreviewedDangers('// dangers reviewed: none\nexport const value = 1')).toThrow(
        'no way up found'
      )
    })
  })

  describe('edge cases', () => {
    it('names the dangers of the files a command wrote, and of no file there before', () => {
      const files: Record<string, string> = {
        'old.ts': migration(['DROP TABLE `old`;'], []),
        'new.ts': migration([], ['CREATE TABLE `__new_places` (`id` integer);']),
        'kept.ts': migration(['DROP TABLE `kept`;'], [], '// dangers reviewed: a child table'),
      }
      const said = dangersOfNewFiles(
        new Set(['old.ts']),
        Object.keys(files),
        (file) => files[file] ?? ''
      )
      expect(said).toEqual([
        'new.ts: down rebuilds (copy, drop, rename — a cascade erases what points at it) places',
      ])
    })

    it('leaves no migration of this repository with an unread danger, either way', () => {
      const unread = migrationFiles(MIGRATION_DIR).flatMap((file) =>
        unreviewedDangers(readFileSync(path.join(MIGRATION_DIR, file), 'utf8')).map(
          (danger) => `${file}: ${dangerSentence(danger)}`
        )
      )
      expect(unread).toEqual([])
    })
  })
})
