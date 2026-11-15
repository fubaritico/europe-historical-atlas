import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`territories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`kind\` text NOT NULL,
  	\`wikidata\` text,
  	\`exists_from_year\` numeric,
  	\`exists_from_month\` numeric,
  	\`exists_from_day\` numeric,
  	\`exists_from_circa\` integer,
  	\`exists_from_margin\` numeric,
  	\`exists_from_calendar\` text DEFAULT 'julian',
  	\`exists_to_year\` numeric,
  	\`exists_to_month\` numeric,
  	\`exists_to_day\` numeric,
  	\`exists_to_circa\` integer,
  	\`exists_to_margin\` numeric,
  	\`exists_to_calendar\` text DEFAULT 'julian',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`territories_updated_at_idx\` ON \`territories\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`territories_created_at_idx\` ON \`territories\` (\`created_at\`);`)
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
  await db.run(sql`CREATE TABLE \`titles_lines\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`source_id\` integer NOT NULL,
  	\`where\` text,
  	\`quotation\` text,
  	\`as_written\` text,
  	FOREIGN KEY (\`source_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`titles\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`titles_lines_order_idx\` ON \`titles_lines\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`titles_lines_parent_id_idx\` ON \`titles_lines\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`titles_lines_source_idx\` ON \`titles_lines\` (\`source_id\`);`)
  await db.run(sql`CREATE TABLE \`titles\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`person_id\` integer NOT NULL,
  	\`territory_id\` integer NOT NULL,
  	\`date_start_year\` numeric NOT NULL,
  	\`date_start_month\` numeric,
  	\`date_start_day\` numeric,
  	\`date_start_circa\` integer,
  	\`date_start_margin\` numeric,
  	\`date_start_calendar\` text DEFAULT 'julian',
  	\`date_end_year\` numeric,
  	\`date_end_month\` numeric,
  	\`date_end_day\` numeric,
  	\`date_end_circa\` integer,
  	\`date_end_margin\` numeric,
  	\`date_end_calendar\` text DEFAULT 'julian',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`person_id\`) REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`territory_id\`) REFERENCES \`territories\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`titles_person_idx\` ON \`titles\` (\`person_id\`);`)
  await db.run(sql`CREATE INDEX \`titles_territory_idx\` ON \`titles\` (\`territory_id\`);`)
  await db.run(sql`CREATE INDEX \`titles_updated_at_idx\` ON \`titles\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`titles_created_at_idx\` ON \`titles\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`vassal_links_lines\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`source_id\` integer NOT NULL,
  	\`where\` text,
  	\`quotation\` text,
  	\`as_written\` text,
  	FOREIGN KEY (\`source_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`vassal_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`vassal_links_lines_order_idx\` ON \`vassal_links_lines\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`vassal_links_lines_parent_id_idx\` ON \`vassal_links_lines\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`vassal_links_lines_source_idx\` ON \`vassal_links_lines\` (\`source_id\`);`)
  await db.run(sql`CREATE TABLE \`vassal_links\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`vassal_id\` integer NOT NULL,
  	\`answers_to\` text DEFAULT 'suzerain' NOT NULL,
  	\`suzerain_id\` integer,
  	\`date_start_year\` numeric NOT NULL,
  	\`date_start_month\` numeric,
  	\`date_start_day\` numeric,
  	\`date_start_circa\` integer,
  	\`date_start_margin\` numeric,
  	\`date_start_calendar\` text DEFAULT 'julian',
  	\`date_end_year\` numeric,
  	\`date_end_month\` numeric,
  	\`date_end_day\` numeric,
  	\`date_end_circa\` integer,
  	\`date_end_margin\` numeric,
  	\`date_end_calendar\` text DEFAULT 'julian',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`vassal_id\`) REFERENCES \`titles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`suzerain_id\`) REFERENCES \`titles\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`vassal_links_vassal_idx\` ON \`vassal_links\` (\`vassal_id\`);`)
  await db.run(sql`CREATE INDEX \`vassal_links_suzerain_idx\` ON \`vassal_links\` (\`suzerain_id\`);`)
  await db.run(sql`CREATE INDEX \`vassal_links_updated_at_idx\` ON \`vassal_links\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`vassal_links_created_at_idx\` ON \`vassal_links\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`territories_find\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`territories_create\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`territories_update\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`titles_find\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`titles_create\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`titles_update\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`vassal_links_find\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`vassal_links_create\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`vassal_links_update\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`territories_id\` integer REFERENCES \`territories\`(\`id\`) ON UPDATE no action ON DELETE cascade;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`titles_id\` integer REFERENCES \`titles\`(\`id\`) ON UPDATE no action ON DELETE cascade;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`vassal_links_id\` integer REFERENCES \`vassal_links\`(\`id\`) ON UPDATE no action ON DELETE cascade;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_territories_id_idx\` ON \`payload_locked_documents_rels\` (\`territories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_titles_id_idx\` ON \`payload_locked_documents_rels\` (\`titles_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_vassal_links_id_idx\` ON \`payload_locked_documents_rels\` (\`vassal_links_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`territories\`;`)
  await db.run(sql`DROP TABLE \`territories_locales\`;`)
  await db.run(sql`DROP TABLE \`titles_lines\`;`)
  await db.run(sql`DROP TABLE \`titles\`;`)
  await db.run(sql`DROP TABLE \`vassal_links_lines\`;`)
  await db.run(sql`DROP TABLE \`vassal_links\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`events_id\` integer,
  	\`event_types_id\` integer,
  	\`siege_engines_id\` integer,
  	\`places_id\` integer,
  	\`place_periods_id\` integer,
  	\`importance_reasons_id\` integer,
  	\`confessions_id\` integer,
  	\`people_id\` integer,
  	\`sources_id\` integer,
  	\`users_id\` integer,
  	\`payload_mcp_api_keys_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`event_types_id\`) REFERENCES \`event_types\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`siege_engines_id\`) REFERENCES \`siege_engines\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`places_id\`) REFERENCES \`places\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`place_periods_id\`) REFERENCES \`place_periods\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`importance_reasons_id\`) REFERENCES \`importance_reasons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`confessions_id\`) REFERENCES \`confessions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`people_id\`) REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sources_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "events_id", "event_types_id", "siege_engines_id", "places_id", "place_periods_id", "importance_reasons_id", "confessions_id", "people_id", "sources_id", "users_id", "payload_mcp_api_keys_id") SELECT "id", "order", "parent_id", "path", "events_id", "event_types_id", "siege_engines_id", "places_id", "place_periods_id", "importance_reasons_id", "confessions_id", "people_id", "sources_id", "users_id", "payload_mcp_api_keys_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_event_types_id_idx\` ON \`payload_locked_documents_rels\` (\`event_types_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_siege_engines_id_idx\` ON \`payload_locked_documents_rels\` (\`siege_engines_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_places_id_idx\` ON \`payload_locked_documents_rels\` (\`places_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_place_periods_id_idx\` ON \`payload_locked_documents_rels\` (\`place_periods_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_importance_reasons_id_idx\` ON \`payload_locked_documents_rels\` (\`importance_reasons_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_confessions_id_idx\` ON \`payload_locked_documents_rels\` (\`confessions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_people_id_idx\` ON \`payload_locked_documents_rels\` (\`people_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sources_id_idx\` ON \`payload_locked_documents_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`territories_find\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`territories_create\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`territories_update\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`titles_find\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`titles_create\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`titles_update\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`vassal_links_find\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`vassal_links_create\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`vassal_links_update\`;`)
}
