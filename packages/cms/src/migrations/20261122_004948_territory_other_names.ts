import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`territories_other_names\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`territories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`territories_other_names_order_idx\` ON \`territories_other_names\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`territories_other_names_parent_id_idx\` ON \`territories_other_names\` (\`_parent_id\`);`)
  // Written by hand (CMS-495): the English names entered so far through the admin's language switch become lines of
  // the table, which is their home from now on. They are copied, not moved — the localized rows stay as they are,
  // so the way down loses nothing.
  await db.run(sql`INSERT INTO \`territories_other_names\` (\`_order\`, \`_parent_id\`, \`id\`, \`language\`, \`form\`)
    SELECT 1, \`_parent_id\`, lower(hex(randomblob(12))), 'en', trim(\`name\`)
    FROM \`territories_locales\`
    WHERE \`_locale\` = 'en' AND \`name\` IS NOT NULL AND trim(\`name\`) <> '';`)
}

// The only table dropped is the one this migration created; nothing else points at it (`known-issues/cms.md`).
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`territories_other_names\`;`)
}
