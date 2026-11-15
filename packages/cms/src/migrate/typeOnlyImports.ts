import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/** The import line `payload migrate:create` writes at the top of every migration. */
const GENERATED_IMPORT =
  /^import \{ MigrateUpArgs, MigrateDownArgs, sql \} from '@payloadcms\/db-sqlite'$/m

/** The same import, the types said as types — what `verbatimModuleSyntax` and Vitest's loader require. */
const TYPED_IMPORT =
  "import { sql } from '@payloadcms/db-sqlite'\nimport type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'"

/**
 * Rewrite a generated migration's import so its two types are imported as types. Payload's template imports them as
 * values, which a loader that keeps every value import (Vitest's) fails on: « does not provide an export named
 * MigrateDownArgs ». A migration already rewritten, or written by hand, is returned unchanged.
 * @param source - the migration's text
 * @returns the text with the import fixed
 */
export function typeOnlyImports(source: string): string {
  return source.replace(GENERATED_IMPORT, TYPED_IMPORT)
}

/**
 * Rewrite, in place, every migration of a folder whose import needs it (`typeOnlyImports`) — its `.ts` files, the
 * index Payload writes beside them left out.
 * @param folder - the migrations' folder
 * @returns the names of the files rewritten
 */
export function fixMigrationImports(folder: string): string[] {
  const fixed: string[] = []
  for (const file of readdirSync(folder)) {
    if (!file.endsWith('.ts') || file === 'index.ts') continue
    const where = path.join(folder, file)
    const source = readFileSync(where, 'utf8')
    const rewritten = typeOnlyImports(source)
    if (rewritten !== source) {
      writeFileSync(where, rewritten)
      fixed.push(file)
    }
  }
  return fixed
}
