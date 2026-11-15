import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { finishMigrations, referencesLeft } from './finishMigrations'
import { typeOnlyImports } from './typeOnlyImports'

const GENERATED = [
  "import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'",
  '',
  'export async function up({ db }: MigrateUpArgs): Promise<void> {}',
].join('\n')

/** A snapshot with no foreign key: nothing to complete. */
const EMPTY_SNAPSHOT = JSON.stringify({ tables: {} })

describe('finishMigrations', () => {
  const folders: string[] = []
  afterEach(() => {
    for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
  })

  /**
   * A migrations folder with the files named.
   * @param files - name to text
   * @returns its path
   */
  function folderWith(files: Record<string, string>): string {
    const folder = mkdtempSync(path.join(tmpdir(), 'cms-finish-migrations-'))
    folders.push(folder)
    for (const [name, text] of Object.entries(files)) writeFileSync(path.join(folder, name), text)
    return folder
  }

  it('rewrites a generated migration, and only it, naming it', () => {
    const fixedOnce = typeOnlyImports(GENERATED)
    const folder = folderWith({
      '20261116_people.ts': GENERATED,
      '20261115_initial.ts': fixedOnce,
      'index.ts': GENERATED,
      '20261116_people.json': EMPTY_SNAPSHOT,
    })
    expect(finishMigrations(folder)).toEqual(['20261116_people.ts'])
    expect(readFileSync(path.join(folder, '20261116_people.ts'), 'utf8')).toBe(fixedOnce)
    expect(readFileSync(path.join(folder, 'index.ts'), 'utf8')).toBe(GENERATED)
    expect(readFileSync(path.join(folder, '20261116_people.json'), 'utf8')).toBe(EMPTY_SNAPSHOT)
  })

  it('writes an added key whole from the snapshot beside the migration', () => {
    const short =
      'await db.run(sql`ALTER TABLE \\`titles\\` ADD \\`person_id\\` integer REFERENCES people(id);`)'
    const snapshot = JSON.stringify({
      tables: {
        titles: {
          foreignKeys: {
            titles_person_id_people_id_fk: {
              tableFrom: 'titles',
              columnsFrom: ['person_id'],
              onDelete: 'set null',
              onUpdate: 'no action',
            },
          },
        },
      },
    })
    const folder = folderWith({ '20261117_titles.ts': short, '20261117_titles.json': snapshot })
    expect(finishMigrations(folder)).toEqual(['20261117_titles.ts'])
    expect(readFileSync(path.join(folder, '20261117_titles.ts'), 'utf8')).toContain(
      'REFERENCES \\`people\\`(\\`id\\`) ON UPDATE no action ON DELETE set null;'
    )
  })

  it('leaves a migration with no snapshot beside it — written by hand — to its import alone', () => {
    const byHand =
      'await db.run(sql`ALTER TABLE \\`titles\\` ADD \\`x_id\\` integer REFERENCES x(id);`)'
    expect(finishMigrations(folderWith({ '20261118_by_hand.ts': byHand }))).toEqual([])
  })

  it('rewrites nothing in a folder already right', () => {
    expect(
      finishMigrations(folderWith({ '20261115_initial.ts': typeOnlyImports(GENERATED) }))
    ).toEqual([])
  })
})

describe('referencesLeft', () => {
  it('names a generated migration whose added key could not be completed, and only it', () => {
    const short = 'await db.run(sql`ALTER TABLE \\`t\\` ADD \\`x_id\\` integer REFERENCES x(id);`)'
    const folder = mkdtempSync(path.join(tmpdir(), 'cms-references-left-'))
    try {
      writeFileSync(path.join(folder, '20261119_generated.ts'), short)
      writeFileSync(path.join(folder, '20261119_generated.json'), EMPTY_SNAPSHOT)
      writeFileSync(path.join(folder, '20261119_by_hand.ts'), short)
      expect(referencesLeft(folder)).toEqual([{ file: '20261119_generated.ts', columns: ['x_id'] }])
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})

describe('finishMigrations, a snapshot that cannot be read', () => {
  it('names the snapshot that is not JSON, and leaves its migration as it was', () => {
    const short = 'await db.run(sql`ALTER TABLE \\`t\\` ADD \\`x_id\\` integer REFERENCES x(id);`)'
    const folder = mkdtempSync(path.join(tmpdir(), 'cms-broken-snapshot-'))
    try {
      writeFileSync(path.join(folder, '20261120_broken.ts'), short)
      writeFileSync(path.join(folder, '20261120_broken.json'), '{ "tables": ')
      expect(() => finishMigrations(folder)).toThrow(
        'the snapshot 20261120_broken.json cannot be read'
      )
      expect(readFileSync(path.join(folder, '20261120_broken.ts'), 'utf8')).toBe(short)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('names a snapshot with no tables', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'cms-tableless-snapshot-'))
    try {
      writeFileSync(path.join(folder, '20261121_odd.ts'), 'export {}')
      writeFileSync(path.join(folder, '20261121_odd.json'), '{}')
      expect(() => finishMigrations(folder)).toThrow('the snapshot 20261121_odd.json has no tables')
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
