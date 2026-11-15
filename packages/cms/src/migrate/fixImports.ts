import { MIGRATION_DIR } from './paths'
import { fixMigrationImports } from './typeOnlyImports'

/**
 * Run after `payload migrate:create` (`pnpm migrate:create`): every migration's import of its types rewritten as
 * types, the files already right left untouched.
 */
for (const file of fixMigrationImports(MIGRATION_DIR)) {
  console.warn(`[CMS] types imported as types: ${file}`)
}
process.exit(0)
