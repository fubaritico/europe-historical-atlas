import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { buildConfig, getPayload } from 'payload'

import { cmsConfig } from '../cmsConfig'
import { backupPath, fileStamp } from '../migrate/baseline'

import { parseMergeArgs } from './mergeArgs'
import { mergeRecords, mergeableRecords } from './mergeRecords'

/**
 * `pnpm cms:merge <collection> <kept> <merged away>` (CMS-509): the merge checked, the base copied, then the merge (`mergeRecords`), then
 * what it did, said in French. Wiring only: the reading of the arguments and the merge are their own modules, tested
 * there. A refusal stops the command with its reason and a failure status; the base is then as it was.
 */
try {
  const asked = parseMergeArgs(process.argv.slice(2))
  const databaseUrl = process.env.DATABASE_URL
  // The config has already refused a missing DATABASE_URL on import; this says it again for the type
  if (databaseUrl === undefined) throw new Error('DATABASE_URL manque dans packages/cms/.env')
  // Real transactions for this command alone: the merge is one gesture, all or nothing
  const payload = await getPayload({ config: await buildConfig(cmsConfig({ transactions: true })) })
  // Refused before anything is copied: a mistyped id leaves no copy behind (review QUAL-003)
  await mergeableRecords(payload, asked)
  const backup = backupPath(
    databaseUrl,
    fileStamp(new Date()),
    `merge-${asked.collection}-${String(asked.remove)}`
  )
  mkdirSync(path.dirname(backup), { recursive: true })
  const db = payload.db as unknown as {
    drizzle: { run: (query: ReturnType<typeof sql>) => Promise<unknown> }
  }
  await db.drizzle.run(sql`VACUUM INTO ${backup}`)
  console.warn(`[CMS] base copied before the merge: ${backup}`)

  const report = await mergeRecords(payload, asked)
  console.warn(
    `[CMS] ${asked.collection} ${String(asked.remove)} fusionnée dans ${String(asked.keep)}, puis mise à la corbeille.`
  )
  console.warn(`[CMS] ${String(report.moved.length)} fiche(s) reportée(s) :`)
  for (const { collection, id, fields } of report.moved)
    console.warn(`  ${collection} ${String(id)} — ${fields.join(', ')}`)
  if (report.leftBehind.length > 0)
    console.warn(
      `[CMS] ce que la fiche retirée avait en propre, à reporter à la main s’il le faut (elle reste lisible dans la corbeille) : ${report.leftBehind.join(', ')}`
    )
  process.exit(0)
} catch (error: unknown) {
  console.error(`[CMS] cms:merge — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
