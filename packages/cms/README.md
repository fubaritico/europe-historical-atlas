# The CMS — places, cities at a date, events, sources

The contribution tool of the Europe historical atlas: a [Payload 3](https://payloadcms.com) application on Next, with
its base in a SQLite file. **Local only** for now — it runs on the developer's machine, and the atlas reads what it
exports as JSON (`packages/atlas/public/content/`).

## Run it

```bash
pnpm install                 # from the repository root
pnpm dev:cms                 # http://localhost:3100/admin
```

The server listens on this machine only (`--hostname 127.0.0.1`): Next's default, every address, would open the admin
and the MCP endpoint to the local network.

`packages/cms/.env` (ignored by git) must hold `DATABASE_URL` (the SQLite file, `file:./cms.db`) and `PAYLOAD_SECRET`;
the server refuses to start without either.

| command, from the root                                          | what it does                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev:cms`                                                  | the admin and the API on port 3100                                           |
| `pnpm export:content`                                           | writes the content the atlas reads, then reload the atlas                    |
| `pnpm --filter @europe-historical-atlas/cms generate:types`     | after a field change: `src/payload-types.ts`, committed as Payload writes it |
| `pnpm --filter @europe-historical-atlas/cms generate:importmap` | after a new admin component: `src/app/(payload)/admin/importMap.js`          |

**`pnpm seed:cms` writes into whatever base `DATABASE_URL` names** — never run it against a base that holds real
content.

## The schema changes by migrations

The base's schema never changes by itself: **`pnpm dev:cms` runs `migrate` before the server starts** (`push: false`,
CMS-276). Before applying anything, `migrate` copies the base to `packages/cms/.backups/` (ignored by git, as every
`.db`), named by the moment and the last migration it held. A base built by the old schema push is adopted the first
time — once it is checked to be exactly the collections' schema; a base that differs is refused, nothing written, and
the server does not start.

| command, in `packages/cms`   | what it does                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm migrate`               | copies the base, then applies what is pending — run by `dev` and `seed`                                   |
| `pnpm migrate:create <name>` | after a field change: writes `src/migrations/<moment>_<name>.ts` and its `.json` snapshot, both committed |
| `pnpm migrate:status`        | which migrations the base holds                                                                           |

**A rename asks a question**: `migrate:create` cannot tell a renamed table or column from one removed and one added, and
asks in its terminal — such a migration is written by hand, then proved by `src/migrate/migrateBase.test.ts`, which
applies every migration to an empty base and fails on any difference with the collections. **Going back** is the copy:
stop the server, put the copy in place of `cms.db`, start it again.

## Connect Claude to it — the MCP server

The CMS is an MCP server (`@payloadcms/plugin-mcp`) at `http://localhost:3100/api/mcp`, so a Claude Code session can
read and enter places, cities at a date, names of the time, sources, importance reasons and confessions — **never delete**. What a key may reach is set in
`src/mcp/mcpAccess.ts`.

1. **A key**: in the admin, **MCP › API Keys**, create one. In the sidebar, tick **find, create, update** for `places`,
   `place-periods`, `period-names`, `sources`, `importance-reasons` and `confessions`. Save, copy the key. The key acts as the account that created
   it. A key made before 2026-11-22 lacks some of these boxes (`period-names` since that day): tick them.
2. **Keep it out of the repository**: put it in `.env.local` at the repository root (ignored by git), as `CMS_MCP_KEY=…`.
3. **Register it once**, in a terminal, from the repository's folder:

   ```bash
   export $(grep '^CMS_MCP_KEY=' .env.local)
   claude mcp add --transport http cms http://localhost:3100/api/mcp --header "Authorization: Bearer $CMS_MCP_KEY"
   ```

   Claude Code keeps it in `~/.claude.json`, for this folder only (`--scope user` for every folder).

4. **A new Claude session** in that folder: `/mcp` shows `cms` connected. In the session, `/enter-in-cms` is the
   procedure for entering anything.

## When something fails

| what you see                                                                                     | what it means                                                                      | what to do                                                   |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `cms` missing from `/mcp`                                                                        | the session started before `claude mcp add`; a session never rereads it            | open a new session; `claude mcp list` shows the real state   |
| `MCP server cms already exists`                                                                  | it was registered already                                                          | nothing; check with `claude mcp list`                        |
| ✘ _connection timed out after 30000ms_                                                           | **the server is stuck, not the key** — a wrong key is refused at once              | open `/admin`: if it hangs too, read the server's terminal   |
| `[CMS] the base was built by the schema push and differs from the collections` at `pnpm dev:cms` | the base's schema is not the one the code describes; nothing was written           | tell the coder: the differences are listed under the message |
| `401` with the key                                                                               | the key is wrong, or `CMS_MCP_KEY` was empty when `claude mcp add` ran             | `export` it again, `claude mcp remove cms`, add it again     |
| an entry refused on the importance reasons or the confessions                                    | the key's **find**, **create** or **update** box for that collection is not ticked | admin › MCP › API Keys, tick the three                       |

**A healthy server, checked without a key**: an MCP `initialize` posted to `/api/mcp` answers **401 within
milliseconds**, and `/admin` answers 200 (a few seconds the first time, while Next compiles). No answer within 20
seconds: the server is stuck — read its terminal.

The story of the stuck server (2026-11-03) and what was measured: `.claude/rules/known-issues/cms.md`.
