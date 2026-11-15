import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`place_periods\` ADD \`holder_title_id\` integer REFERENCES \`titles\`(\`id\`) ON UPDATE no action ON DELETE set null;`)
  await db.run(sql`CREATE INDEX \`place_periods_holder_title_idx\` ON \`place_periods\` (\`holder_title_id\`);`)
}

// Written by hand (`known-issues/cms.md`): the generator's down rebuilt `place_periods` through a DROP TABLE, which
// cascades to every source line of every sheet under the dev's active foreign keys. The column and its index are dropped
// instead — SQLite allows it once the index is gone.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`place_periods_holder_title_idx\`;`)
  await db.run(sql`ALTER TABLE \`place_periods\` DROP COLUMN \`holder_title_id\`;`)
}
