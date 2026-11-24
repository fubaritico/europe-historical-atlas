import { sql } from '@payloadcms/db-sqlite'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

// dangers reviewed: written by hand — the renames keep the rows and their ids (CMS-422, 2026-11-15)

/**
 * CMS-422, step 1 — the register of people: `actors` renamed `people`, extended (birth and death, foundation and
 * end, house, founder), opened to the MCP keys.
 *
 * Written by hand, not by `payload migrate:create`: Drizzle cannot tell a renamed table from one dropped and one
 * created, and asks in the terminal. The rename comes first, by SQLite's own `RENAME` — the rows, their ids and the
 * relations that point to them stay where they are (SQLite rewrites the foreign keys of the tables that reference a
 * renamed table or column). An index cannot be renamed: each is dropped and created under its new name. The
 * additions after it are Drizzle's, generated from the initial snapshot with `actors` renamed `people` — so they
 * hold no rename. Proved twice: `src/migrate/migrateBase.test.ts` (every migration from an empty base gives exactly
 * the collections' schema) and `src/migrate/peopleMigration.test.ts` (rows entered at the old schema survive, ids, names
 * and links).
 * @param args - the migration's context
 * @param args.db - the base, inside Payload's transaction
 * @returns once the base holds the register
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // The rename: the tables, the relation columns that point to them, their indexes
  await db.run(sql`ALTER TABLE \`actors\` RENAME TO \`people\`;`)
  await db.run(sql`ALTER TABLE \`actors_locales\` RENAME TO \`people_locales\`;`)
  await db.run(sql`ALTER TABLE \`events_rels\` RENAME COLUMN \`actors_id\` TO \`people_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` RENAME COLUMN \`actors_id\` TO \`people_id\`;`)
  await db.run(sql`DROP INDEX \`actors_updated_at_idx\`;`)
  await db.run(sql`CREATE INDEX \`people_updated_at_idx\` ON \`people\` (\`updated_at\`);`)
  await db.run(sql`DROP INDEX \`actors_created_at_idx\`;`)
  await db.run(sql`CREATE INDEX \`people_created_at_idx\` ON \`people\` (\`created_at\`);`)
  await db.run(sql`DROP INDEX \`actors_locales_locale_parent_id_unique\`;`)
  await db.run(
    sql`CREATE UNIQUE INDEX \`people_locales_locale_parent_id_unique\` ON \`people_locales\` (\`_locale\`,\`_parent_id\`);`
  )
  await db.run(sql`DROP INDEX \`actors_locales_parent_id_idx\`;`)
  await db.run(sql`CREATE INDEX \`people_locales_parent_id_idx\` ON \`people_locales\` (\`_parent_id\`);`)
  await db.run(sql`DROP INDEX \`events_rels_actors_id_idx\`;`)
  await db.run(sql`CREATE INDEX \`events_rels_people_id_idx\` ON \`events_rels\` (\`people_id\`);`)
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_actors_id_idx\`;`)
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_people_id_idx\` ON \`payload_locked_documents_rels\` (\`people_id\`);`
  )

  // The additions (Drizzle's)
  for (const moment of ['born', 'died', 'founded', 'ended']) {
    await db.run(sql.raw(`ALTER TABLE \`people\` ADD \`${moment}_year\` numeric;`))
    await db.run(sql.raw(`ALTER TABLE \`people\` ADD \`${moment}_month\` numeric;`))
    await db.run(sql.raw(`ALTER TABLE \`people\` ADD \`${moment}_day\` numeric;`))
    await db.run(sql.raw(`ALTER TABLE \`people\` ADD \`${moment}_circa\` integer;`))
    await db.run(sql.raw(`ALTER TABLE \`people\` ADD \`${moment}_margin\` numeric;`))
    await db.run(sql.raw(`ALTER TABLE \`people\` ADD \`${moment}_calendar\` text DEFAULT 'julian';`))
  }
  // The foreign key written whole, as the collections declare it: Drizzle's own `REFERENCES people(id)` lacks the
  // `ON DELETE set null`, and its fix is a rebuild of `people` — a DROP TABLE that, with SQLite's foreign keys on
  // (measured, 15/11) and inside Payload's transaction, would cascade to every name and every event's link.
  await db.run(
    sql`ALTER TABLE \`people\` ADD \`house_id\` integer REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE set null;`
  )
  await db.run(
    sql`ALTER TABLE \`people\` ADD \`founder_id\` integer REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE set null;`
  )
  await db.run(sql`CREATE INDEX \`people_house_idx\` ON \`people\` (\`house_id\`);`)
  await db.run(sql`CREATE INDEX \`people_founder_idx\` ON \`people\` (\`founder_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`people_find\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`people_create\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`payload_mcp_api_keys\` ADD \`people_update\` integer DEFAULT false;`)
}

/**
 * Not reversible here, on purpose. SQLite refuses to drop a column a foreign key uses (`house_id`, `founder_id`), and
 * its way around — rebuilding `people` — is a DROP TABLE that, with the foreign keys on and inside Payload's
 * transaction, would cascade to every name and every event's link. **Going back is the copy** `pnpm migrate` took
 * before applying this one (`packages/cms/.backups/`, README « The schema changes by migrations »).
 * @param _args - the migration's context, unused
 * @returns never — it refuses, inside the transaction, so nothing is changed
 */
export function down(_args: MigrateDownArgs): Promise<void> {
  return Promise.reject(
    new Error(
      '[CMS] the people migration is not undone by `migrate:down`: put back the copy taken before it, ' +
        'from packages/cms/.backups/ (server stopped), instead.'
    )
  )
}
