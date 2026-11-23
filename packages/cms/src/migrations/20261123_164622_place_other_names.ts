import { sql } from '@payloadcms/db-sqlite'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

/**
 * A place's names in the other languages, as a territory's (CMS-495): the table, then the English names copied in.
 * @param args - Payload's migration arguments
 * @param args.db - the transaction the migration runs in
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`places_other_names\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`places\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`places_other_names_order_idx\` ON \`places_other_names\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`places_other_names_parent_id_idx\` ON \`places_other_names\` (\`_parent_id\`);`)
  // Written by hand (CMS-495, the dev's choice of 2026-11-23: a place's names as a territory's): the English names —
  // the 13 558 the catch-up wrote from Wikidata that day, and the eleven entered before — become lines of the table,
  // their home from now on. Copied, not moved: the localized rows stay as they are, so the way down loses nothing.
  await db.run(sql`INSERT INTO \`places_other_names\` (\`_order\`, \`_parent_id\`, \`id\`, \`language\`, \`form\`)
    SELECT 1, \`_parent_id\`, lower(hex(randomblob(12))), 'en', trim(\`name\`)
    FROM \`places_locales\`
    WHERE \`_locale\` = 'en' AND \`name\` IS NOT NULL AND trim(\`name\`) <> '';`)
}

/**
 * The way down: the only table dropped is the one this migration created; nothing else points at it, and the
 * localized English rows it copied are still there (`known-issues/cms.md`).
 * @param args - Payload's migration arguments
 * @param args.db - the transaction the migration runs in
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`places_other_names\`;`)
}
