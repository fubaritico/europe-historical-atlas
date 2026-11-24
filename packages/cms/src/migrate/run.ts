import { readFileSync } from 'node:fs'

import { getPayload, readMigrationFiles } from 'payload'

import config from '../payload.config'

import { migrateBase } from './migrateBase'
import { dangersOnDisk } from './migrationDangers'
import { MIGRATION_DIR } from './paths'

/**
 * `pnpm migrate` — run before the dev's server starts (`pnpm dev`), so a schema change is applied before Next serves
 * a request, never in the middle of one (CMS-276). Says what it did; a refusal stops here, and the server with it —
 * a pending migration that can lose data and was not read among them (CMS-280).
 */
const databaseUrl = process.env.DATABASE_URL
// The config has already refused a missing DATABASE_URL on import; this says it again for the type.
if (databaseUrl === undefined)
  throw new Error('[CMS] DATABASE_URL is missing from packages/cms/.env')
const payload = await getPayload({ config })
const report = await migrateBase(
  payload,
  databaseUrl,
  new Date(),
  await readMigrationFiles({ payload }),
  dangersOnDisk(MIGRATION_DIR, (file) => readFileSync(file, 'utf8'))
)
if (report.backup !== null) console.warn(`[CMS] base copied before the change: ${report.backup}`)
if (report.adopted.length > 0) {
  console.warn(`[CMS] base put under migrations, recorded as applied: ${report.adopted.join(', ')}`)
}
if (report.applied.length > 0)
  console.warn(`[CMS] migrations applied: ${report.applied.join(', ')}`)
process.exit(0)
