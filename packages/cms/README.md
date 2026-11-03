# The CMS — places, cities at a date, events, sources

The contribution tool of the Europe historical atlas: a [Payload 3](https://payloadcms.com) application on Next, with
its base in a SQLite file. **Local only** for now — it runs on the developer's machine, and the atlas reads what it
exports as JSON (`packages/atlas/public/content/`).

## Run it

```bash
pnpm install                 # from the repository root
pnpm dev:cms                 # http://localhost:3100/admin
```

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

**A field removed or renamed** makes Payload ask a question in the server's terminal, and every request waits behind it
(it pushes the schema at the first request, in development). Until migrations replace that push, a field is only ever
added.

## Connect Claude to it — the MCP server

The CMS is an MCP server (`@payloadcms/plugin-mcp`) at `http://localhost:3100/api/mcp`, so a Claude Code session can
read and enter places, cities at a date and sources — **never delete**. What a key may reach is set in
`src/mcp/mcpAccess.ts`.

1. **A key**: in the admin, **MCP › API Keys**, create one. In the sidebar, tick **find, create, update** for `places`,
   `place-periods` and `sources`, and **find** for `importance-reasons`. Save, copy the key. The key acts as the account
   that created it.
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

| what you see                                                                 | what it means                                                                    | what to do                                                                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `cms` missing from `/mcp`                                                    | the session started before `claude mcp add`; a session never rereads it          | open a new session; `claude mcp list` shows the real state                                                                        |
| `MCP server cms already exists`                                              | it was registered already                                                        | nothing; check with `claude mcp list`                                                                                             |
| ✘ _connection timed out after 30000ms_                                       | **the server is stuck, not the key** — a wrong key is refused at once            | open `/admin`: if it hangs too, read the server's terminal                                                                        |
| `SQLITE_ERROR: index … already exists` in the terminal, the admin showing it | a schema push failed halfway after a field change; every request waits behind it | stop the server; check on **a copy** of `cms.db` that the push has nothing left to do; restart. Never try a push on the real base |
| `401` with the key                                                           | the key is wrong, or `CMS_MCP_KEY` was empty when `claude mcp add` ran           | `export` it again, `claude mcp remove cms`, add it again                                                                          |
| an entry refused on the importance reasons                                   | the key's **find** box for `importance-reasons` is not ticked                    | admin › MCP › API Keys, tick it                                                                                                   |

**A healthy server, checked without a key**: an MCP `initialize` posted to `/api/mcp` answers **401 within
milliseconds**, and `/admin` answers 200 (a few seconds the first time, while Next compiles). No answer within 20
seconds: the server is stuck — read its terminal.

The story of the stuck server (2026-11-03) and what was measured: `.claude/rules/known-issues/cms.md`.
