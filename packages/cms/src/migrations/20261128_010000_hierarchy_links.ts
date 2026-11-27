import { sql } from '@payloadcms/db-sqlite'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

// dangers reviewed: renames only — two tables, four columns, nine indexes; no row copied, no table rebuilt, nothing
// dropped but the old indexes, each made again under its new name. Written by hand: the generator cannot tell a
// renamed table from one removed and one added (packages/cms/README.md).

/** The indexes renamed, each with its table and column — the same on the way up and down. */
const INDEXES: readonly (readonly [string, string, string])[] = [
  ['links_lines_order_idx', 'links_lines', '_order'],
  ['links_lines_parent_id_idx', 'links_lines', '_parent_id'],
  ['links_lines_source_idx', 'links_lines', 'source_id'],
  ['links_vassal_idx', 'links', 'vassal_id'],
  ['links_suzerain_idx', 'links', 'suzerain_id'],
  ['links_updated_at_idx', 'links', 'updated_at'],
  ['links_created_at_idx', 'links', 'created_at'],
  ['links_deleted_at_idx', 'links', 'deleted_at'],
]

/** The columns other tables give the collection, renamed with it. */
const COLUMNS: readonly (readonly [string, string])[] = [
  ['payload_locked_documents_rels', 'links_id'],
  ['payload_mcp_api_keys', 'links_find'],
  ['payload_mcp_api_keys', 'links_create'],
  ['payload_mcp_api_keys', 'links_update'],
]

/**
 * Rename every table, column and index of the collection from one prefix to the other. SQLite rewrites the references
 * other tables hold to a renamed table (the lines' parent, the locks) — the base's foreign keys are on, which does it
 * even with `legacy_alter_table` on (measured, `hierarchyLinksRename.test.ts`); it is set off besides, so the rename
 * does not rest on the connection's setting.
 * @param run - runs one statement
 * @param from - the prefix the base has, `vassal` or `hierarchy`
 * @param to - the prefix it takes
 */
async function renamePrefix(
  run: (statement: ReturnType<typeof sql.raw>) => Promise<unknown>,
  from: string,
  to: string
): Promise<void> {
  await run(sql.raw('PRAGMA legacy_alter_table = OFF;'))
  for (const [name] of INDEXES) await run(sql.raw(`DROP INDEX \`${from}_${name}\`;`))
  await run(
    sql.raw(`DROP INDEX \`payload_locked_documents_rels_${from}_links_id_idx\`;`)
  )
  await run(sql.raw(`ALTER TABLE \`${from}_links_lines\` RENAME TO \`${to}_links_lines\`;`))
  await run(sql.raw(`ALTER TABLE \`${from}_links\` RENAME TO \`${to}_links\`;`))
  for (const [table, column] of COLUMNS)
    await run(
      sql.raw(`ALTER TABLE \`${table}\` RENAME COLUMN \`${from}_${column}\` TO \`${to}_${column}\`;`)
    )
  for (const [name, table, column] of INDEXES)
    await run(sql.raw(`CREATE INDEX \`${to}_${name}\` ON \`${to}_${table}\` (\`${column}\`);`))
  await run(
    sql.raw(
      `CREATE INDEX \`payload_locked_documents_rels_${to}_links_id_idx\` ON \`payload_locked_documents_rels\` (\`${to}_links_id\`);`
    )
  )
}

/**
 * The links of a city's chain, « vassal links » until now, named hierarchy links (REPO-589, the dev, 2026-11-28: the
 * chain is hierarchical, feudalism is one age of it) — every row kept as it is.
 * @param args - the migration's arguments
 * @param args.db - the base
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await renamePrefix((statement) => db.run(statement), 'vassal', 'hierarchy')
}

/**
 * Back to the « vassal links » names, every row kept.
 * @param args - the migration's arguments
 * @param args.db - the base
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await renamePrefix((statement) => db.run(statement), 'hierarchy', 'vassal')
}
