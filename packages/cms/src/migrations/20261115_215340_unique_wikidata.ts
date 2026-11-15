import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

// Hand-completed: an id left empty is no id (fields/wikidata.ts, emptyAsNoId), but the hook guards only the writes
// after this change — two rows saved empty before it would make the unique index fail and the server refuse to start.
// A true duplicate is left for the base to refuse loudly: never deleted here, the foreign keys would cascade.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  for (const table of ['events', 'siege_engines', 'places', 'people', 'territories']) {
    await db.run(sql.raw(`UPDATE \`${table}\` SET \`wikidata\` = NULL WHERE \`wikidata\` = '';`))
  }
  await db.run(sql`CREATE UNIQUE INDEX \`events_wikidata_idx\` ON \`events\` (\`wikidata\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`siege_engines_wikidata_idx\` ON \`siege_engines\` (\`wikidata\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`places_wikidata_idx\` ON \`places\` (\`wikidata\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`people_wikidata_idx\` ON \`people\` (\`wikidata\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`territories_wikidata_idx\` ON \`territories\` (\`wikidata\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`events_wikidata_idx\`;`)
  await db.run(sql`DROP INDEX \`siege_engines_wikidata_idx\`;`)
  await db.run(sql`DROP INDEX \`places_wikidata_idx\`;`)
  await db.run(sql`DROP INDEX \`people_wikidata_idx\`;`)
  await db.run(sql`DROP INDEX \`territories_wikidata_idx\`;`)
}
