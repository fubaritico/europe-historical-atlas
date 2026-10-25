# The CMS's tooling — a schema that changes every day, safely (2026-10-25) — CMS-276 to CMS-280

> **Decided by the dev, 2026-10-25, to be carried out at the next session.** The CMS's screens are not designed in
> advance: *« la base va bouger et ça va arriver constamment »* for the next two weeks, then now and then. The dev
> does not hold a full picture of the tables — *« elle va se construire au fur et à mesure que l'on construira nos
> écrans »* — so the tooling has to make every change safe, visible and reversible.

## Why — what happened on 2026-10-25

A change to the event's date fields removed a column (`date_calendar`) and added others (`date_start_margin`…) in
the same table. In development, Payload's SQLite adapter **pushes** the schema at connection
(`db-sqlite/src/connect.ts` l. 60–67, Payload 3.92.0 in `opensrc/`); when a column disappears while another appears,
Drizzle cannot tell a rename from a new column and **asks in the terminal** (`drizzle/src/utilities/pushDevSchema.ts`
l. 47); a data-loss warning answered *no* **exits the server** (`process.exit(0)`). Payload connects at the first
request, so the question appeared in the middle of a click and every request waited behind it — two minutes, then a
server that answered nothing. The base held only the dev's account; it was deleted with his agreement.

Payload's docs advise keeping push in development and *« treat your local dev database as a sandbox »*
(`docs/database/migrations.mdx`). **Ours is not a sandbox**: it is where the contribution lives, and what the export
publishes. Hence migrations, and the tools below.

## The steps, in order

Five tickets of the chantier CMS-285, in À faire in this order: **CMS-276** (steps 1, 4) · **CMS-277** (2) ·
**CMS-278** (3, 5) · **CMS-279** (8, 9) · **CMS-280** (6, 7). Each step is verified and committed alone. The CMS server is the dev's: I never start, stop or restart it; I verify
through tests and scripts on a database of my own.

### 1. Migrations instead of push — CMS-276

- `sqliteAdapter({ push: false, migrationDir, allowIDOnCreate: true })` — `allowIDOnCreate` read in the code
  (`db-sqlite/src/index.ts` l. 70, `drizzle/src/upsertRow/index.ts` l. 263), needed by step 5.
- The first migration, generated from today's collections: `payload migrate:create initial`, committed under
  `packages/cms/src/migrations/`.
- Scripts: `migrate` (apply), `migrate:create <name>`, `migrate:status`; the dev's `pnpm dev:cms` runs `migrate`
  first, so a pending migration is applied before Next starts — never mid-request.
- **Before writing**: read in Payload's code how `migrate:create` compares the config to the last migration (the
  JSON snapshot beside each migration?), and whether a run with no change says so — step 4's guard depends on it.
- **Verified by**: a fresh `cms.db` built by `migrate` alone; the dev creates his account; no question in the terminal.

### 2. The rule and the skill — CMS-277

- `.claude/rules/cms.md`, `paths: packages/cms/**`, its topic in `.claude/skills/rules/topics.json` (rule of
  `claude-config.md`): no schema change without its migration; never touch the dev's server; regenerate the types and
  the import map after a field change; the push trap above, in two lines.
- `/cms-field` skill — the procedure for any change to a collection: classify it (add only · rename · remove · type
  change); back up (step 3); `migrate:create`; read the SQL (step 6); `migrate` on my database; regenerate; tests;
  the schema map (step 7); tell the dev in one line what changed and whether anything waits on him.
- A known-issues slice `rules/known-issues/cms.md`, indexed in `known-issues.md`.
- **Read first**: the current Claude Code pages on skills and rules (`claude-config.md`), cited.

### 3. A copy of the base before every migration — the safety net — CMS-278

- `migrate` copies `cms.db` to `packages/cms/.backups/cms-<date>-<last migration>.db` before applying anything;
  `.backups/` git-ignored (`**/` pattern, `tooling.md`).
- `pnpm cms:restore <file>` puts a copy back; the dev's server must be stopped — the script refuses while port 3100
  answers, and says so.
- Kept like the Cartographer's snapshots: rarely needed, there when it is (*« on peut très bien se tromper »*, the dev).

### 4. A guard: no schema change without its migration — CMS-276

- A test (or a pre-commit step) fails when the collections' schema differs from the last migration's — depends on
  what step 1's reading finds. If Payload offers no reliable comparison, the guard is the integration test of step 5
  failing on a missing column, and this step says so instead of pretending.

### 5. The full export and its re-import — the real backup — CMS-278

- `pnpm cms:dump`: every collection through the Local API, every locale, relations as ids, users never; one JSON per
  collection plus a manifest (date, last migration applied, count per collection); written to
  `packages/cms/content/` and **committed** — the dev's call, 2026-10-25: the content's history in git and a copy off
  the machine.
- `pnpm cms:load`: into an **empty** base, in dependency order (sources, places, actors, types, events), ids kept
  (`allowIDOnCreate`), through Payload's validation, in **one transaction — all or nothing**; a record that no longer
  fits the schema is refused by name. Refuses a base that is not empty.
- **Guarded by a round trip**: dump → empty base → load → dump again, the two identical.

### 6. A detector of dangerous migrations — CMS-280

- A script reads the SQL a new migration holds and flags: `DROP TABLE`, `DROP COLUMN`, a rename, and SQLite's table
  rebuild (create `__new_…`, copy, drop the old). On a flag, `/cms-field` stops and asks the dev.

### 7. The schema map — CMS-280

- A script (`payload run`) walks the collections — each field, its type, required, localized, and the relations (to
  which collection, one or many) — and writes a Mermaid diagram with the French labels to
  `files/plans/contribution/schema.md`; GitHub and WebStorm render it. Generated from the config, not the SQLite
  tables, which hold Payload's own `_locales`, `_rels` and `payload_migrations`.
- Regenerated by `/cms-field`; a test fails when the file is older than the config.

### 8. The test data — CMS-279

- A TypeScript file typed by `payload-types.ts`, so a field change breaks its compilation until it is updated.
- Facts read from Wikidata, each record with its `Q…` (Paris Q90, Jerusalem Q1218, the capture of Jerusalem, the
  Gesta Francorum) — never from memory.
- `pnpm cms:seed`, idempotent (finds a record by its Wikidata id before creating it). **Refuses a base holding
  records it did not create** — proposed, the dev to confirm (an error-handling decision, `rules/error-handling.md`).
- Used by the integration test, by my database, and by the dev after a reset if he wants.

### 9. The integration test — CMS-279

- Boots Payload on a temporary SQLite file: applies every migration from zero, seeds, creates through the Local API,
  runs the export, checks it against `core`'s schema, runs the dump/load round trip. The net for steps 1, 5 and 8.

## Decided

| what | by | when |
| --- | --- | --- |
| migrations instead of push, switched while the base is empty | the dev, on my recommendation | 2026-10-25 |
| a copy of the base before each migration, kept as a safety net | the dev | 2026-10-25 |
| a full JSON export, re-importable with its relations, committed to the repository | the dev, on my recommendation | 2026-10-25 |
| a schema map and a seed | the dev | 2026-10-25 |
| the CMS server is the dev's; I verify on my own database, never on his server | me — after 2026-10-25 | 2026-10-25 |
| the seed refuses a base holding records it did not create | **me — proposed** | 2026-10-25 |

## Not in this plan

- The places' periods (*what Paris was in 1100*, a list in the place's form) — CMS-281, the next screen, built with
  `/cms-field` once the tooling exists.
- Sources returned with Wikidata's dates (the references of P571) — after.
- The official `@payloadcms/plugin-import-export`: one collection at a time, new ids in create mode — fit for a CSV of
  200 places later, not for a backup.
