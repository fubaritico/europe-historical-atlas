import { describe, expect, it } from 'vitest'

import { typeOnlyImports } from './typeOnlyImports'

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
