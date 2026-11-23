import { sql } from '@payloadcms/db-sqlite'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

/**
 * A place's and a territory's « Nom » becomes their French name alone (CMS-495, the dev, 2026-11-23: _"finish it"_):
 * their other languages live in the table « Le nom dans les autres langues » since that day, and a name typed through
 * the admin's language switch was stored and never exported. Written by hand: the generator dropped the two tables of
 * translations before copying anything, and added a required column SQLite refuses on a filled table. Here the column
 * is added, each record's French name copied into it, and only then the tables of translations dropped — nothing points
 * at them, so nothing cascades, and their English rows are in the tables of other names already. A record with no
 * French name would break the copy (its column cannot stay empty), the migration failing, rather than an empty name.
 * @param args - Payload's migration arguments
 * @param args.db - the transaction the migration runs in
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`places\` ADD \`name\` text NOT NULL DEFAULT '';`)
  await db.run(sql`UPDATE \`places\` SET \`name\` = (SELECT \`name\` FROM \`places_locales\`
    WHERE \`_parent_id\` = \`places\`.\`id\` AND \`_locale\` = 'fr');`)
  await db.run(sql`ALTER TABLE \`territories\` ADD \`name\` text NOT NULL DEFAULT '';`)
  await db.run(sql`UPDATE \`territories\` SET \`name\` = (SELECT \`name\` FROM \`territories_locales\`
    WHERE \`_parent_id\` = \`territories\`.\`id\` AND \`_locale\` = 'fr');`)
  await db.run(sql`DROP TABLE \`places_locales\`;`)
  await db.run(sql`DROP TABLE \`territories_locales\`;`)
}

/**
 * The way down: the two tables of translations made again, the French name copied back into them from the column and
 * the English one from the table of other names, then the column dropped — nothing lost.
 * @param args - Payload's migration arguments
 * @param args.db - the transaction the migration runs in
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`places_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`places\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`places_locales_locale_parent_id_unique\` ON \`places_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`places_locales_parent_id_idx\` ON \`places_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`territories_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`territories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`territories_locales_locale_parent_id_unique\` ON \`territories_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`territories_locales_parent_id_idx\` ON \`territories_locales\` (\`_parent_id\`);`)
  await db.run(sql`INSERT INTO \`places_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`name\`, 'fr', \`id\` FROM \`places\`;`)
  await db.run(sql`INSERT INTO \`places_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`form\`, 'en', \`_parent_id\` FROM \`places_other_names\` WHERE \`language\` = 'en';`)
  await db.run(sql`INSERT INTO \`territories_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`name\`, 'fr', \`id\` FROM \`territories\`;`)
  await db.run(sql`INSERT INTO \`territories_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`form\`, 'en', \`_parent_id\` FROM \`territories_other_names\` WHERE \`language\` = 'en';`)
  await db.run(sql`ALTER TABLE \`places\` DROP COLUMN \`name\`;`)
  await db.run(sql`ALTER TABLE \`territories\` DROP COLUMN \`name\`;`)
}
