import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`period_names_forms\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text NOT NULL,
  	\`form\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`period_names\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`period_names_forms_order_idx\` ON \`period_names_forms\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`period_names_forms_parent_id_idx\` ON \`period_names_forms\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`period_names_lines\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`source_id\` integer NOT NULL,
  	\`where\` text,
  	\`quotation\` text,
  	\`as_written\` text,
  	FOREIGN KEY (\`source_id\`) REFERENCES \`sources\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`period_names\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`period_names_lines_order_idx\` ON \`period_names_lines\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`period_names_lines_parent_id_idx\` ON \`period_names_lines\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`period_names_lines_source_idx\` ON \`period_names_lines\` (\`source_id\`);`)
  await db.run(sql`CREATE TABLE \`period_names\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`place_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`place_id\`) REFERENCES \`places\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`period_names_place_idx\` ON \`period_names\` (\`place_id\`);`)
  await db.run(sql`CREATE INDEX \`period_names_updated_at_idx\` ON \`period_names\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`period_names_created_at_idx\` ON \`period_names\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`place_periods\` ADD \`period_name_id\` integer REFERENCES \`period_names\`(\`id\`) ON UPDATE no action ON DELETE set null;`)
  await db.run(sql`CREATE INDEX \`place_periods_period_name_idx\` ON \`place_periods\` (\`period_name_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`period_names_find\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`period_names_create\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`period_names_update\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`period_names_delete\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`period_names_id\` integer REFERENCES \`period_names\`(\`id\`) ON UPDATE no action ON DELETE cascade;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_period_names_id_idx\` ON \`payload_locked_documents_rels\` (\`period_names_id\`);`)
}

// Written by hand (`known-issues/cms.md`): the generator's down rebuilt `place_periods` and
// `payload_locked_documents_rels` through a DROP TABLE, which cascades to every source line of every sheet under the
// dev's active foreign keys. The columns and their indexes are dropped instead — SQLite allows it once the index is
// gone — and the only tables dropped are the three this migration created, once nothing points at them.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`place_periods_period_name_idx\`;`)
  await db.run(sql`ALTER TABLE \`place_periods\` DROP COLUMN \`period_name_id\`;`)
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_period_names_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`period_names_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`period_names_find\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`period_names_create\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`period_names_update\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`period_names_delete\`;`)
  await db.run(sql`DROP TABLE \`period_names_forms\`;`)
  await db.run(sql`DROP TABLE \`period_names_lines\`;`)
  await db.run(sql`DROP TABLE \`period_names\`;`)
}
