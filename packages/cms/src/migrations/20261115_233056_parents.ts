import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`people\` ADD \`father_id\` integer REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE set null;`)
  await db.run(sql`ALTER TABLE \`people\` ADD \`mother_id\` integer REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE set null;`)
  await db.run(sql`CREATE INDEX \`people_father_idx\` ON \`people\` (\`father_id\`);`)
  await db.run(sql`CREATE INDEX \`people_mother_idx\` ON \`people\` (\`mother_id\`);`)
}

// Written by hand (`known-issues/cms.md`): the generator's down rebuilt `people` through a DROP TABLE, which cascades to
// every title and every house under the dev's active foreign keys. The two columns and their indexes are dropped
// instead — SQLite allows it once the indexes are gone.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`people_father_idx\`;`)
  await db.run(sql`DROP INDEX \`people_mother_idx\`;`)
  await db.run(sql`ALTER TABLE \`people\` DROP COLUMN \`father_id\`;`)
  await db.run(sql`ALTER TABLE \`people\` DROP COLUMN \`mother_id\`;`)
}
