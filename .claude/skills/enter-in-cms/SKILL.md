---
name: enter-in-cms
description: Enter what the historian found into the CMS's base through the Payload MCP server « cms » — a source, a place, a city at a date with its holder and its source lines — searching before creating, one source per line, never deleting, then telling the code instance what was entered so it checks the base. Use whenever the dev asks to put something in the base or the CMS (« saisis », « entre-le dans la base », « mets-le dans le CMS », « tenue par », « ville à une date »), and before any MCP call to the cms server.
metadata:
  author: europe-map
  version: "1.0"
---

# Enter in the CMS — the historian's procedure

**Outcome**: what the historian researched is in the dev's base, each fact with the source that says it, no record
created twice, nothing deleted, and the code instance told what to check. Written 2026-11-03 at the dev's request: a
procedure followed by memory drifts from one session to the next — *"the first time you do something it's fine; if it
isn't wrapped in a skill with its recommendations, you end up forgetting something."*

Sources of this procedure: `files/plans/maps-1100-1200-code-and-historian.md` (the two instances),
`files/plans/contribution/source-manager.md` (« Driven by voice »), `files/plans/evidence-system.md` (sources,
témoins, concordance), the collections in `packages/cms/src/collections/`, and `packages/cms/src/mcp/mcpAccess.ts`
(what the key allows). When one of them changes, this skill is updated in the same change.

## Before anything — the connection, done once by the dev

The skill works only once Claude Code reaches the CMS's MCP server. **Check first**: the `cms` server is listed as
connected (`/mcp`), and its tools are there. If not, **stop** and give the dev these steps, in French, one at a time:

1. **His CMS server runs** (`pnpm dev:cms`, port 3100) — his to start, never mine.
2. **An API key** in the admin: menu **MCP › API Keys**, create; in the sidebar tick **find, create, update** for
   `places`, `place-periods`, `sources`, and **find** for `importance-reasons`; save, copy the key. A key created before
   2026-11-03 lacks the box for `importance-reasons`: he opens it and ticks it.
3. **The key in his own terminal**, never in the conversation: it sits in `.env.local` (ignored by git); he loads it
   into the shell, then, from the `europe-map` folder:
   `claude mcp add --transport http cms http://localhost:3100/api/mcp --header "Authorization: Bearer $<his variable>"`.
   Done once: Claude Code keeps it in `~/.claude.json` for this folder (another folder, a worktree: `--scope user`).
4. **A new Claude session** in that folder (or `/mcp` to reconnect), and `/mcp` shows `cms` connected.

The key acts as the dev's account: what the historian enters appears in the admin as entered by him.

## The frame — never crossed

- **Through the MCP only.** Never the seed (`pnpm cms:seed` once ran on his base), never SQL that writes, never the
  REST API by `curl`, never a script. If the `cms` tools are absent or refused, **stop and tell the dev** — no other way in.
- **Never delete.** The key does not allow it (`mcpAccess.ts`, `delete: false`) and it is not asked for: a wrong record
  is corrected by `update`, or reported to the dev, who deletes by hand in the admin.
- **Every fact with its source.** A value with no source is not entered. A fact *de mémoire* is never entered — it is
  researched first (climb the chain of reference: the quotation, then the work Wikipedia or the page cites).
- **A divergence is kept, never settled.** Two sources that disagree are two lines, each with its own value. The dev
  arbitrates; the concordance is computed, never typed (`evidence-system.md`).
- **The map is the dev's.** A fact that changes a border or a suzerain is entered as a source line *and* sent to the
  code instance; nobody touches `years/` — he decides in the Cartographer.
- **His server is his.** If `localhost:3100` does not answer, tell him; never start, stop or restart it.
- **The key never enters the conversation** — not read, not echoed, not written in a file of the repository.

## The order — sources first, then the place, then the city at a date

A record points to the ones before it, so they are entered in this order. **Search before every create**: a record
that exists is reused (its id), never created again.

1. **The source** (`sources`). Search by `url`, then by `title`.
   - `title` (required), `author`, `publisher`, `editionYear`, `url`.
   - `kind` — what sets its reliability: `primary` (document of the time), `historian-atlas`, `scholarly`,
     `encyclopaedia`, `crowd-database` (Wikidata, OpenHistoricalMap).
   - `licence` when known: `public-domain`, `cc0`, `cc-by`, `cc-by-sa`, `all-rights-reserved`.
   - **The work at the end of the chain is the source**: a Wikipedia page that cites a book → the book is a source, the
     page another, and the page's `copyOf` names the book — sources that copy one another are one *témoin*.
2. **The place** (`places`). Search by `wikidata` (the `Q…`), then by `name`.
   - `name` in French (required; the default locale is `fr`), the English name as a second locale when known.
   - `location` = **`{ "longitude": …, "latitude": … }`** — the MCP tools take an object and store Payload's
     `[longitude, latitude]` tuple; never send the tuple. Wikidata P625 gives the latitude first: read both by name.
   - `wikidata` = `Q` followed by digits, or nothing.
   - `existsFrom` / `existsTo` only with a source; `existsTo` empty while the place exists.
3. **The city at a date** (`place-periods`). Search by `place` first: **one sheet per place per year** — the server
   refuses a second one, so an existing sheet is **updated** (a line added), never duplicated.
   - `place` (its id), `date.start.year` (required; `date.end` makes it a span), `importance`: `capital`,
     `large-city`, `city`.
   - `holderName` + `holderQid` — the polity holding it at that date. **Never the id without the name.**
   - `testimonies`, one line per thing a source says: `source` (its id), `subject` and the one value it names —
     `holder` → `holderName` (+ `holderQid`) · `population` → `population` · `importance` → `importance` ·
     `reason` → `reason` — plus `where` (page, chapter, section) and `quotation` (the source's own words).
   - `title` is written by the server (« Paris — 1100 »): never set it.

## After each batch — say it, then let it be checked

1. **Tell the dev, in French, in a few lines**: what was entered (names, not ids), what was reused, what was refused
   and why, what diverges.
2. **Send the code instance one message** (`ListAgents`, then `SendMessage`): the collection and the ids created or
   changed. The code instance reads the base **read-only** (`sqlite3 "file:packages/cms/cms.db?mode=ro"`) and reports
   any fault to the dev; the historian then corrects it by `update`.
3. **The year's file stays the home of the questions** (`files/plans/sources/1100.md`, `1200.md`): the question, the
   answer, its certainty, its sources — the base holds the facts, the file the reasoning (CMS-338, parked).

## Gotchas

- **A refusal names every issue** (the sheet is checked by `core/data/citySheet.ts` before it is saved): read them all,
  fix them all, then retry once. Never retry blind.
- **An interrupted or refused call may have acted**: search for the record before creating it again.
- **The importance reasons are read only** (`importance-reasons`: find, nothing else). A `reason` line or the
  `reasons` field cites one by its id, found with `find` — never guessed. A reason that does not exist is not created:
  say it to the dev, who adds it. One is misspelt in his data (« pelrinage »): use its id, never re-type the name.
- **A change the dev made by hand in the admin is his**: an `update` over it is said to him before it is made.
- **He dictates by voice**: a garbled name is a dictation error — say what you understood before entering it.
- **Reply in French**, the records' French fields in French, never franglais.
