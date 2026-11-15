import { getPayload } from 'payload'

import config from '../payload.config'

import { MIGRATION_DIR } from './paths'
import { fixMigrationImports } from './typeOnlyImports'

/**
 * `pnpm migrate:create <name>` — a migration written from the collections' change since the last snapshot, by
 * Payload's own generator, then its types imported as types (`fixMigrationImports`). One script, so the name reaches
 * the generator: two commands chained by `&&` would hand it to the second.
 *
 * A rename makes the generator ask in the terminal (it cannot tell a renamed table or column from one removed and one
 * added): such a migration is written by hand instead — `packages/cms/README.md`.
 */
const name = process.argv.slice(2).find((arg) => !arg.startsWith('-'))
if (name === undefined) throw new Error('[CMS] name the migration: pnpm migrate:create <name>')
const payload = await getPayload({ config })
await payload.db.createMigration({ migrationName: name, payload })
for (const file of fixMigrationImports(MIGRATION_DIR)) {
  console.warn(`[CMS] types imported as types: ${file}`)
}
process.exit(0)
