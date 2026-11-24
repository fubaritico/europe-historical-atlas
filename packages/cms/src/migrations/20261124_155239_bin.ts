import { sql } from '@payloadcms/db-sqlite'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

// dangers reviewed: CMS-508 — up adds a `deleted_at` column and its index to six tables, no row touched, no table
// rebuilt; the six columns it drops are the MCP key's « delete » boxes of the collections the key no longer deletes in
// — only their ticks are lost, the right being withdrawn. down drops each index then its column, and gives the boxes
// back unticked — and every record then in the bin is live again, its date dropped with the column. Proved on a copy
// of the base, up, down and up again.

/**
 * The bin (CMS-508): a `deleted_at` column and its index on the six collections, and the MCP key's « delete » boxes
 * dropped.
 * @param args - the migration's arguments
 * @param args.db - the base
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`places\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`places_deleted_at_idx\` ON \`places\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`place_periods\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`place_periods_deleted_at_idx\` ON \`place_periods\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`period_names\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`period_names_deleted_at_idx\` ON \`period_names\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`titles\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`titles_deleted_at_idx\` ON \`titles\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`vassal_links\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`vassal_links_deleted_at_idx\` ON \`vassal_links\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`sources\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`sources_deleted_at_idx\` ON \`sources\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`places_delete\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`place_periods_delete\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`period_names_delete\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`sources_delete\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`titles_delete\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` DROP COLUMN \`vassal_links_delete\`;`)
}

/**
 * Back before the bin: each index then its column dropped, the key's boxes given back unticked.
 * @param args - the migration's arguments
 * @param args.db - the base
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`places_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`places\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`place_periods_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`place_periods\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`period_names_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`period_names\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`titles_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`titles\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`vassal_links_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`vassal_links\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`sources_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`sources\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`places_delete\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`place_periods_delete\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`period_names_delete\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`sources_delete\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`titles_delete\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`vassal_links_delete\` integer DEFAULT false;`)
}
