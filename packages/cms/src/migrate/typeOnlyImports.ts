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
