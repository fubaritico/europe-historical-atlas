import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { fixMigrationImports, typeOnlyImports } from './typeOnlyImports'

const GENERATED = [
  "import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'",
  '',
  'export async function up({ db }: MigrateUpArgs): Promise<void> {}',
].join('\n')

describe('typeOnlyImports', () => {
  it('imports the two types of a generated migration as types, sql as a value', () => {
    expect(typeOnlyImports(GENERATED).split('\n').slice(0, 2)).toEqual([
      "import { sql } from '@payloadcms/db-sqlite'",
      "import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'",
    ])
  })

  it('leaves the rest of the migration as it is', () => {
    expect(
      typeOnlyImports(GENERATED).endsWith(
        'export async function up({ db }: MigrateUpArgs): Promise<void> {}'
      )
    ).toBe(true)
  })

  it('leaves a migration already rewritten unchanged', () => {
    const once = typeOnlyImports(GENERATED)
    expect(typeOnlyImports(once)).toBe(once)
  })

  it('leaves a migration written by hand, with its own imports, unchanged', () => {
    const byHand = "import { sql } from '@payloadcms/db-sqlite'\n\nexport async function up() {}"
    expect(typeOnlyImports(byHand)).toBe(byHand)
  })
})

describe('fixMigrationImports', () => {
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
    const folder = mkdtempSync(path.join(tmpdir(), 'cms-fix-imports-'))
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
      '20261116_people.json': GENERATED,
    })
    expect(fixMigrationImports(folder)).toEqual(['20261116_people.ts'])
    expect(readFileSync(path.join(folder, '20261116_people.ts'), 'utf8')).toBe(fixedOnce)
    expect(readFileSync(path.join(folder, 'index.ts'), 'utf8')).toBe(GENERATED)
    expect(readFileSync(path.join(folder, '20261116_people.json'), 'utf8')).toBe(GENERATED)
  })

  it('rewrites nothing in a folder already right', () => {
    expect(
      fixMigrationImports(folderWith({ '20261115_initial.ts': typeOnlyImports(GENERATED) }))
    ).toEqual([])
  })
})
