import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

/**
 * The registers' bin (CMS-509): a `deleted_at` column and its index on the territories, the people, the confessions
 * and the importance reasons — no row touched, no table rebuilt.
 * @param args - the migration's arguments
 * @param args.db - the base
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`importance_reasons\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`importance_reasons_deleted_at_idx\` ON \`importance_reasons\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`confessions\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`confessions_deleted_at_idx\` ON \`confessions\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`people\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`people_deleted_at_idx\` ON \`people\` (\`deleted_at\`);`)
  await db.run(sql`ALTER TABLE \`territories\` ADD \`deleted_at\` text;`)
  await db.run(sql`CREATE INDEX \`territories_deleted_at_idx\` ON \`territories\` (\`deleted_at\`);`)
}

/**
 * Back before the registers' bin: each index then its column dropped — every register record then in the bin is live
 * again, its date dropped with the column.
 * @param args - the migration's arguments
 * @param args.db - the base
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`importance_reasons_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`importance_reasons\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`confessions_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`confessions\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`people_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`people\` DROP COLUMN \`deleted_at\`;`)
  await db.run(sql`DROP INDEX \`territories_deleted_at_idx\`;`)
  await db.run(sql`ALTER TABLE \`territories\` DROP COLUMN \`deleted_at\`;`)
}
