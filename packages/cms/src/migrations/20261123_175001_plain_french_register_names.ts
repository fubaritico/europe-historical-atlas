import { sql } from '@payloadcms/db-sqlite'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

/**
 * The people's and the four registers' name becomes their French name alone, their other languages in the table « Le
 * nom dans les autres langues » (CMS-495, the dev, 2026-11-23: _"finish it"_) — as `plain_french_names` did for the
 * places and the territories. Written by hand over the generator's output, which dropped the tables of translations
 * before copying anything: each table of other names made, the column added, each French name copied into it and each
 * English name into the table, and only then the tables of translations dropped — nothing points at them, so nothing
 * cascades. A record with no French name breaks the copy (its column cannot stay empty): the migration fails rather
 * than leave an empty name.
 * @param args - Payload's migration arguments
 * @param args.db - the transaction the migration runs in
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`event_types_other_names\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`event_types\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`event_types_other_names_order_idx\` ON \`event_types_other_names\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`event_types_other_names_parent_id_idx\` ON \`event_types_other_names\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`siege_engines_other_names\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`siege_engines\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`siege_engines_other_names_order_idx\` ON \`siege_engines_other_names\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`siege_engines_other_names_parent_id_idx\` ON \`siege_engines_other_names\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`importance_reasons_other_names\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`importance_reasons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`importance_reasons_other_names_order_idx\` ON \`importance_reasons_other_names\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`importance_reasons_other_names_parent_id_idx\` ON \`importance_reasons_other_names\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`confessions_other_names\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`confessions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`confessions_other_names_order_idx\` ON \`confessions_other_names\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`confessions_other_names_parent_id_idx\` ON \`confessions_other_names\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`people_other_names\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`people_other_names_order_idx\` ON \`people_other_names\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`people_other_names_parent_id_idx\` ON \`people_other_names\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`event_types\` ADD \`name\` text DEFAULT '' NOT NULL;`)
  await db.run(sql`UPDATE \`event_types\` SET \`name\` = (SELECT \`name\` FROM \`event_types_locales\`
    WHERE \`_parent_id\` = \`event_types\`.\`id\` AND \`_locale\` = 'fr');`)
  await db.run(sql`INSERT INTO \`event_types_other_names\` (\`_order\`, \`_parent_id\`, \`id\`, \`language\`, \`form\`)
    SELECT 1, \`_parent_id\`, lower(hex(randomblob(12))), 'en', trim(\`name\`)
    FROM \`event_types_locales\`
    WHERE \`_locale\` = 'en' AND \`name\` IS NOT NULL AND trim(\`name\`) <> '';`)
  await db.run(sql`ALTER TABLE \`siege_engines\` ADD \`name\` text DEFAULT '' NOT NULL;`)
  await db.run(sql`UPDATE \`siege_engines\` SET \`name\` = (SELECT \`name\` FROM \`siege_engines_locales\`
    WHERE \`_parent_id\` = \`siege_engines\`.\`id\` AND \`_locale\` = 'fr');`)
  await db.run(sql`INSERT INTO \`siege_engines_other_names\` (\`_order\`, \`_parent_id\`, \`id\`, \`language\`, \`form\`)
    SELECT 1, \`_parent_id\`, lower(hex(randomblob(12))), 'en', trim(\`name\`)
    FROM \`siege_engines_locales\`
    WHERE \`_locale\` = 'en' AND \`name\` IS NOT NULL AND trim(\`name\`) <> '';`)
  await db.run(sql`ALTER TABLE \`importance_reasons\` ADD \`name\` text DEFAULT '' NOT NULL;`)
  await db.run(sql`UPDATE \`importance_reasons\` SET \`name\` = (SELECT \`name\` FROM \`importance_reasons_locales\`
    WHERE \`_parent_id\` = \`importance_reasons\`.\`id\` AND \`_locale\` = 'fr');`)
  await db.run(sql`INSERT INTO \`importance_reasons_other_names\` (\`_order\`, \`_parent_id\`, \`id\`, \`language\`, \`form\`)
    SELECT 1, \`_parent_id\`, lower(hex(randomblob(12))), 'en', trim(\`name\`)
    FROM \`importance_reasons_locales\`
    WHERE \`_locale\` = 'en' AND \`name\` IS NOT NULL AND trim(\`name\`) <> '';`)
  await db.run(sql`ALTER TABLE \`confessions\` ADD \`name\` text DEFAULT '' NOT NULL;`)
  await db.run(sql`UPDATE \`confessions\` SET \`name\` = (SELECT \`name\` FROM \`confessions_locales\`
    WHERE \`_parent_id\` = \`confessions\`.\`id\` AND \`_locale\` = 'fr');`)
  await db.run(sql`INSERT INTO \`confessions_other_names\` (\`_order\`, \`_parent_id\`, \`id\`, \`language\`, \`form\`)
    SELECT 1, \`_parent_id\`, lower(hex(randomblob(12))), 'en', trim(\`name\`)
    FROM \`confessions_locales\`
    WHERE \`_locale\` = 'en' AND \`name\` IS NOT NULL AND trim(\`name\`) <> '';`)
  await db.run(sql`ALTER TABLE \`people\` ADD \`name\` text DEFAULT '' NOT NULL;`)
  await db.run(sql`UPDATE \`people\` SET \`name\` = (SELECT \`name\` FROM \`people_locales\`
    WHERE \`_parent_id\` = \`people\`.\`id\` AND \`_locale\` = 'fr');`)
  await db.run(sql`INSERT INTO \`people_other_names\` (\`_order\`, \`_parent_id\`, \`id\`, \`language\`, \`form\`)
    SELECT 1, \`_parent_id\`, lower(hex(randomblob(12))), 'en', trim(\`name\`)
    FROM \`people_locales\`
    WHERE \`_locale\` = 'en' AND \`name\` IS NOT NULL AND trim(\`name\`) <> '';`)
  await db.run(sql`DROP TABLE \`event_types_locales\`;`)
  await db.run(sql`DROP TABLE \`siege_engines_locales\`;`)
  await db.run(sql`DROP TABLE \`importance_reasons_locales\`;`)
  await db.run(sql`DROP TABLE \`confessions_locales\`;`)
  await db.run(sql`DROP TABLE \`people_locales\`;`)
}

/**
 * The way down: the tables of translations made again, the French name copied back from the column and the English
 * one from the table of other names, then the tables of other names and the column dropped — nothing lost.
 * @param args - Payload's migration arguments
 * @param args.db - the transaction the migration runs in
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`event_types_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`event_types\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`event_types_locales_locale_parent_id_unique\` ON \`event_types_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`event_types_locales_parent_id_idx\` ON \`event_types_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`siege_engines_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`siege_engines\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`siege_engines_locales_locale_parent_id_unique\` ON \`siege_engines_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`siege_engines_locales_parent_id_idx\` ON \`siege_engines_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`importance_reasons_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`importance_reasons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`importance_reasons_locales_locale_parent_id_unique\` ON \`importance_reasons_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`importance_reasons_locales_parent_id_idx\` ON \`importance_reasons_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`confessions_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`confessions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`confessions_locales_locale_parent_id_unique\` ON \`confessions_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`confessions_locales_parent_id_idx\` ON \`confessions_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`people_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`people_locales_locale_parent_id_unique\` ON \`people_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`people_locales_parent_id_idx\` ON \`people_locales\` (\`_parent_id\`);`)
  await db.run(sql`INSERT INTO \`event_types_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`name\`, 'fr', \`id\` FROM \`event_types\`;`)
  await db.run(sql`INSERT INTO \`event_types_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`form\`, 'en', \`_parent_id\` FROM \`event_types_other_names\` WHERE \`language\` = 'en';`)
  await db.run(sql`INSERT INTO \`siege_engines_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`name\`, 'fr', \`id\` FROM \`siege_engines\`;`)
  await db.run(sql`INSERT INTO \`siege_engines_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`form\`, 'en', \`_parent_id\` FROM \`siege_engines_other_names\` WHERE \`language\` = 'en';`)
  await db.run(sql`INSERT INTO \`importance_reasons_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`name\`, 'fr', \`id\` FROM \`importance_reasons\`;`)
  await db.run(sql`INSERT INTO \`importance_reasons_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`form\`, 'en', \`_parent_id\` FROM \`importance_reasons_other_names\` WHERE \`language\` = 'en';`)
  await db.run(sql`INSERT INTO \`confessions_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`name\`, 'fr', \`id\` FROM \`confessions\`;`)
  await db.run(sql`INSERT INTO \`confessions_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`form\`, 'en', \`_parent_id\` FROM \`confessions_other_names\` WHERE \`language\` = 'en';`)
  await db.run(sql`INSERT INTO \`people_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`name\`, 'fr', \`id\` FROM \`people\`;`)
  await db.run(sql`INSERT INTO \`people_locales\` (\`name\`, \`_locale\`, \`_parent_id\`)
    SELECT \`form\`, 'en', \`_parent_id\` FROM \`people_other_names\` WHERE \`language\` = 'en';`)
  await db.run(sql`DROP TABLE \`event_types_other_names\`;`)
  await db.run(sql`DROP TABLE \`siege_engines_other_names\`;`)
  await db.run(sql`DROP TABLE \`importance_reasons_other_names\`;`)
  await db.run(sql`DROP TABLE \`confessions_other_names\`;`)
  await db.run(sql`DROP TABLE \`people_other_names\`;`)
  await db.run(sql`ALTER TABLE \`event_types\` DROP COLUMN \`name\`;`)
  await db.run(sql`ALTER TABLE \`siege_engines\` DROP COLUMN \`name\`;`)
  await db.run(sql`ALTER TABLE \`importance_reasons\` DROP COLUMN \`name\`;`)
  await db.run(sql`ALTER TABLE \`confessions\` DROP COLUMN \`name\`;`)
  await db.run(sql`ALTER TABLE \`people\` DROP COLUMN \`name\`;`)
}
