import { getPayload } from 'payload'

import config from '../payload.config'

import { finishMigrations, referencesLeft } from './finishMigrations'
import { MIGRATION_DIR } from './paths'

/**
 * `pnpm migrate:create <name>` — a migration written from the collections' change since the last snapshot, by
 * Payload's own generator, then finished (`finishMigrations`: its types imported as types, its added keys written whole). One script, so the name reaches
 * the generator: two commands chained by `&&` would hand it to the second.
 *
 * A rename makes the generator ask in the terminal (it cannot tell a renamed table or column from one removed and one
 * added): such a migration is written by hand instead — `packages/cms/README.md`.
 */
const name = process.argv.slice(2).find((arg) => !arg.startsWith('-'))
if (name === undefined) throw new Error('[CMS] name the migration: pnpm migrate:create <name>')
const payload = await getPayload({ config })
await payload.db.createMigration({ migrationName: name, payload })
for (const file of finishMigrations(MIGRATION_DIR)) {
  console.warn(`[CMS] migration finished: ${file}`)
}
// A key left without its actions would make the base differ from the collections — said here, where it is made, and
// the command fails, so nothing chained after it runs on a migration known to be wrong
const left = referencesLeft(MIGRATION_DIR)
for (const { file, columns } of left) {
  console.error(
    `[CMS] ${file}: a foreign key added with no ON DELETE, not completed — ${columns.join(', ')}. ` +
      'Write the actions by hand from its .json snapshot before applying it.'
  )
}
process.exit(left.length > 0 ? 1 : 0)
