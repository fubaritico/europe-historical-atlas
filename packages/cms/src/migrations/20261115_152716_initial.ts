import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`type_id\` integer NOT NULL,
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
  	\`place_id\` integer,
  	\`wikidata\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`type_id\`) REFERENCES \`event_types\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`place_id\`) REFERENCES \`places\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`events_type_idx\` ON \`events\` (\`type_id\`);`)
  await db.run(sql`CREATE INDEX \`events_place_idx\` ON \`events\` (\`place_id\`);`)
  await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`events_locales\` (
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`events_locales_locale_parent_id_unique\` ON \`events_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`events_locales_parent_id_idx\` ON \`events_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`events_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`actors_id\` integer,
  	\`sources_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`actors_id\`) REFERENCES \`actors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sources_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`events_rels_order_idx\` ON \`events_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_parent_idx\` ON \`events_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_path_idx\` ON \`events_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_actors_id_idx\` ON \`events_rels\` (\`actors_id\`);`)
  await db.run(sql`CREATE INDEX \`events_rels_sources_id_idx\` ON \`events_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE TABLE \`event_types\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`icon\` text DEFAULT 'pin' NOT NULL,
  	\`colour\` text DEFAULT '#e3170a' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`event_types_updated_at_idx\` ON \`event_types\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`event_types_created_at_idx\` ON \`event_types\` (\`created_at\`);`)
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
  await db.run(sql`CREATE TABLE \`siege_engines\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`engine\` text NOT NULL,
  	\`in_use_start_year\` numeric NOT NULL,
  	\`in_use_start_month\` numeric,
  	\`in_use_start_day\` numeric,
  	\`in_use_start_circa\` integer,
  	\`in_use_start_margin\` numeric,
  	\`in_use_start_calendar\` text DEFAULT 'julian',
  	\`in_use_end_year\` numeric,
  	\`in_use_end_month\` numeric,
  	\`in_use_end_day\` numeric,
  	\`in_use_end_circa\` integer,
  	\`in_use_end_margin\` numeric,
  	\`in_use_end_calendar\` text DEFAULT 'julian',
  	\`wikidata\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`siege_engines_updated_at_idx\` ON \`siege_engines\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`siege_engines_created_at_idx\` ON \`siege_engines\` (\`created_at\`);`)
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
  await db.run(sql`CREATE TABLE \`siege_engines_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`sources_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`siege_engines\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sources_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`siege_engines_rels_order_idx\` ON \`siege_engines_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`siege_engines_rels_parent_idx\` ON \`siege_engines_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`siege_engines_rels_path_idx\` ON \`siege_engines_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`siege_engines_rels_sources_id_idx\` ON \`siege_engines_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE TABLE \`places\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`location\` text NOT NULL,
  	\`wikidata\` text,
  	\`country_name\` text,
  	\`country_wikidata\` text,
  	\`region_name\` text,
  	\`region_wikidata\` text,
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
  await db.run(sql`CREATE INDEX \`places_updated_at_idx\` ON \`places\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`places_created_at_idx\` ON \`places\` (\`created_at\`);`)
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
  await db.run(sql`CREATE TABLE \`place_periods_communities\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`confession_id\` integer NOT NULL,
  	\`weight\` text NOT NULL,
  	\`weight_attested\` integer DEFAULT false,
  	FOREIGN KEY (\`confession_id\`) REFERENCES \`confessions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`place_periods\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`place_periods_communities_order_idx\` ON \`place_periods_communities\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_communities_parent_id_idx\` ON \`place_periods_communities\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_communities_confession_idx\` ON \`place_periods_communities\` (\`confession_id\`);`)
  await db.run(sql`CREATE TABLE \`place_periods_testimonies\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`source_id\` integer NOT NULL,
  	\`subject\` text NOT NULL,
  	\`population\` numeric,
  	\`importance\` text,
  	\`reason_id\` integer,
  	\`holder_name\` text,
  	\`holder_qid\` text,
  	\`confession_id\` integer,
  	\`where\` text,
  	\`quotation\` text,
  	FOREIGN KEY (\`source_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`reason_id\`) REFERENCES \`importance_reasons\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`confession_id\`) REFERENCES \`confessions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`place_periods\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`place_periods_testimonies_order_idx\` ON \`place_periods_testimonies\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_testimonies_parent_id_idx\` ON \`place_periods_testimonies\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_testimonies_source_idx\` ON \`place_periods_testimonies\` (\`source_id\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_testimonies_reason_idx\` ON \`place_periods_testimonies\` (\`reason_id\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_testimonies_confession_idx\` ON \`place_periods_testimonies\` (\`confession_id\`);`)
  await db.run(sql`CREATE TABLE \`place_periods\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`place_id\` integer NOT NULL,
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
  	\`importance\` text NOT NULL,
  	\`show_in_atlas\` integer DEFAULT false,
  	\`holder_name\` text,
  	\`holder_qid\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`place_id\`) REFERENCES \`places\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`place_periods_place_idx\` ON \`place_periods\` (\`place_id\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_updated_at_idx\` ON \`place_periods\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_created_at_idx\` ON \`place_periods\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`place_periods_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`importance_reasons_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`place_periods\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`importance_reasons_id\`) REFERENCES \`importance_reasons\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`place_periods_rels_order_idx\` ON \`place_periods_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_rels_parent_idx\` ON \`place_periods_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_rels_path_idx\` ON \`place_periods_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`place_periods_rels_importance_reasons_id_idx\` ON \`place_periods_rels\` (\`importance_reasons_id\`);`)
  await db.run(sql`CREATE TABLE \`importance_reasons\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`importance_reasons_updated_at_idx\` ON \`importance_reasons\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`importance_reasons_created_at_idx\` ON \`importance_reasons\` (\`created_at\`);`)
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
  await db.run(sql`CREATE TABLE \`confessions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`confessions_updated_at_idx\` ON \`confessions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`confessions_created_at_idx\` ON \`confessions\` (\`created_at\`);`)
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
  await db.run(sql`CREATE TABLE \`actors\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`kind\` text DEFAULT 'person' NOT NULL,
  	\`wikidata\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`actors_updated_at_idx\` ON \`actors\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`actors_created_at_idx\` ON \`actors\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`actors_locales\` (
  	\`name\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`actors\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`actors_locales_locale_parent_id_unique\` ON \`actors_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`actors_locales_parent_id_idx\` ON \`actors_locales\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`sources\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`author\` text,
  	\`publisher\` text,
  	\`edition_year\` numeric,
  	\`kind\` text,
  	\`licence\` text,
  	\`url\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`sources_updated_at_idx\` ON \`sources\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`sources_created_at_idx\` ON \`sources\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`sources_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`sources_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sources_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`sources_rels_order_idx\` ON \`sources_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`sources_rels_parent_idx\` ON \`sources_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`sources_rels_path_idx\` ON \`sources_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`sources_rels_sources_id_idx\` ON \`sources_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`payload_mcp_api_keys\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`user_id\` integer NOT NULL,
  	\`label\` text,
  	\`description\` text,
  	\`places_find\` integer DEFAULT false,
  	\`places_create\` integer DEFAULT false,
  	\`places_update\` integer DEFAULT false,
  	\`place_periods_find\` integer DEFAULT false,
  	\`place_periods_create\` integer DEFAULT false,
  	\`place_periods_update\` integer DEFAULT false,
  	\`sources_find\` integer DEFAULT false,
  	\`sources_create\` integer DEFAULT false,
  	\`sources_update\` integer DEFAULT false,
  	\`importance_reasons_find\` integer DEFAULT false,
  	\`importance_reasons_create\` integer DEFAULT false,
  	\`importance_reasons_update\` integer DEFAULT false,
  	\`confessions_find\` integer DEFAULT false,
  	\`confessions_create\` integer DEFAULT false,
  	\`confessions_update\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`enable_a_p_i_key\` integer,
  	\`api_key\` text,
  	\`api_key_index\` text,
  	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_mcp_api_keys_user_idx\` ON \`payload_mcp_api_keys\` (\`user_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_mcp_api_keys_updated_at_idx\` ON \`payload_mcp_api_keys\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_mcp_api_keys_created_at_idx\` ON \`payload_mcp_api_keys\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
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
  	\`actors_id\` integer,
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
  	FOREIGN KEY (\`actors_id\`) REFERENCES \`actors\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sources_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_actors_id_idx\` ON \`payload_locked_documents_rels\` (\`actors_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sources_id_idx\` ON \`payload_locked_documents_rels\` (\`sources_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_payload_mcp_api_keys_id_idx\` ON \`payload_locked_documents_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`payload_mcp_api_keys_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`payload_mcp_api_keys_id\`) REFERENCES \`payload_mcp_api_keys\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_payload_mcp_api_keys_id_idx\` ON \`payload_preferences_rels\` (\`payload_mcp_api_keys_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`events\`;`)
  await db.run(sql`DROP TABLE \`events_locales\`;`)
  await db.run(sql`DROP TABLE \`events_rels\`;`)
  await db.run(sql`DROP TABLE \`event_types\`;`)
  await db.run(sql`DROP TABLE \`event_types_locales\`;`)
  await db.run(sql`DROP TABLE \`siege_engines\`;`)
  await db.run(sql`DROP TABLE \`siege_engines_locales\`;`)
  await db.run(sql`DROP TABLE \`siege_engines_rels\`;`)
  await db.run(sql`DROP TABLE \`places\`;`)
  await db.run(sql`DROP TABLE \`places_locales\`;`)
  await db.run(sql`DROP TABLE \`place_periods_communities\`;`)
  await db.run(sql`DROP TABLE \`place_periods_testimonies\`;`)
  await db.run(sql`DROP TABLE \`place_periods\`;`)
  await db.run(sql`DROP TABLE \`place_periods_rels\`;`)
  await db.run(sql`DROP TABLE \`importance_reasons\`;`)
  await db.run(sql`DROP TABLE \`importance_reasons_locales\`;`)
  await db.run(sql`DROP TABLE \`confessions\`;`)
  await db.run(sql`DROP TABLE \`confessions_locales\`;`)
  await db.run(sql`DROP TABLE \`actors\`;`)
  await db.run(sql`DROP TABLE \`actors_locales\`;`)
  await db.run(sql`DROP TABLE \`sources\`;`)
  await db.run(sql`DROP TABLE \`sources_rels\`;`)
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`payload_mcp_api_keys\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
}
