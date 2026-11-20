---
name: jira
description: Track the project's work as tickets on the Europe Historical Atlas Jira board, through Atlassian's MCP server — list the board, add an idea or a backlog ticket from its template, move it, assign it, comment on it, mark it done against the Definition of Done. Use when the dev says Jira, ticket, tableau, idée, backlog, épique, "mets-le dans Jira", "c'est fait", "on en est où", and at every start-session and end-session, or when a task starts, finishes, waits on him or is tested.
metadata:
  author: europe-map
  version: "1.0"
---

# Jira — the board of record for the work

Since 2026-11-20 (the dev's call) **the list of tasks is the Jira project `EHA`**:
https://europehistoricalatlas.atlassian.net/jira/software/c/projects/EHA/boards/3 — it replaces the Trello board
of 2026-10-17, moved whole (`files/plans/jira-migration.md`). `next.md` keeps the session pointer and the context,
never a second list. **Every gesture goes through the MCP server `atlassian`** (`mcp__atlassian__*`), signed in as
the dev: no script of ours, no token in the repository.

| what | value |
| --- | --- |
| site, `cloudId` | `europehistoricalatlas.atlassian.net` · `c1d3fe36-388d-4bf0-93db-ee6f3af209cc` |
| project, board | `EHA` (company-managed Kanban) · board `3` |
| people (`accountId`) | the dev `712020:b7a37695-bbcf-4627-a5ae-e6f878c3be9a` · Claude Coder `712020:b4d3a6dd-7906-438b-b274-555e4ceaee64` · Claude Historian `712020:a6f50c06-0aa5-4148-884b-261a1c8cedd4` |

## The reference — `[CARTO-67]` is `EHA-67` (the dev's rule, 2026-11-20)

> _"A practice we will keep, so that you and the historian are not thrown."_

**We write `[CARTO-67]`** — the application's prefix and the number — in commits, plans, messages and in the
ticket's own title. Jira's key is `EHA-67`: **the same number**, and the only form the MCP takes. One counter for
the whole project, never reused, never changed — not even when a ticket changes scope (`[CARTO-41]` → `[ATLAS-41]`,
the key stays `EHA-41`). Prefixes, in capitals: `[ATLAS]` · `[CARTO]` · `[CORE]` · `[CMS]` · `[REPO]` (CI, lint, the
board, skills) · `[DESIGN]`; two scopes: `[ATLAS-12 · CARTO]`, the number on the first.

**Titles are French, in the dev's words**, short: what is wrong or what is wanted — never an id, a path or a
function name. The description is French too, the dev reads it alone.

## Sync — one home per fact, the others link (the dev's call, 2026-10-17)

The board and the markdown files are **not copies of each other**. A fact written in two places drifts.

| home | what lives there | what no longer does |
| --- | --- | --- |
| **the board** | the list of tasks and the state of each — what, its stage, blocked or not, who holds it | — |
| `files/plans/*.md` | an epic's or a ticket's design: why, how, the trade-offs. Its ticket links the file in **Détails** | progress — read on the board |
| `.claude/rules/known-issues/<package>.md` | a problem's mechanism. An entry **that asks for an action** gets a ticket naming it | the to-do — on the ticket |
| `.claude/next.md` | the resume point: where we stopped, what is mid-flight, context that is not a task | **any list of tasks** |
| `.claude/completed.md` | a short account of each session, citing tickets (`CARTO-41`) | the detail of what shipped — in the ticket's closing comment |
| Basic Memory, `main`, `patterns/` | what holds **across** projects | anything specific to this project |

**Every gesture keeps both sides in step, in the same breath**: a ticket created from a known-issue or a plan names
it in **Détails**, and the entry or the file gets ` — CARTO-41`; a known-issue closed is archived **and** its ticket
done; a ticket done is cited in `completed.md`, never re-described.

**The work check — the board against the code and the commits, never against `next.md` alone.** At `/end-session`:
every subject worked on gets its comment, its status, its assignee. At `/start-session`: the commits since the last
session (`git log --since`), and every ticket **En cours** and **À faire** read against the code
(`git log --grep=<ticket>`). A ticket whose work is in the code but whose status says otherwise is moved, with the
evidence in a comment, and said to the dev. I decide what the code settles; **in real doubt I ask**, the question
carrying the ticket's own description.

## The statuses — a ticket matures left to right

**The backlog is a page, not a column** (the dev, 2026-11-20): « Idées » and « Backlog » are the two statuses of the
**Backlog** view; the board shows the four others. The board's tabs are cut to Chronologie · Tableau Kanban · Liste ·
Backlog (a view removed comes back by the « + »).

| status | where | holds | who moves a ticket in |
| --- | --- | --- | --- |
| **Idées** | Backlog page | a raw thought, the *Idée* template | anyone |
| **Backlog** | Backlog page | a shaped ticket, validated as written, unordered. **A new ticket is born here** | the dev, once I shaped it — never me alone |
| **À faire** | board | what he decided to do, **in his order** | the dev |
| **En cours** | board | what we are working on — several subjects in parallel, no cap. **The ten epics live here** | me when I start, and the dev |
| **À valider par le développeur** | board | waiting on his gesture: a look, or a decision | me, the moment the ball is his |
| **Fait** | board | acceptance criteria **and** DoD met; the board hides what is done for more than two weeks | me — see « I test, he does not validate » |

**The dev holds the order**: never pull a ticket from Backlog into À faire, never reorder À faire, never start a
ticket he did not choose. « On passe à la suite » means *propose* the next ticket. **He no longer validates a
feature** (2026-11-20, memory `one-gesture-to-validate`): I test it and close it; only what is judged by eye or
decided goes to **À valider par le développeur**, as one gesture.

## Types, epics, components, labels, priority

| what | in Jira | rule |
| --- | --- | --- |
| **type** | `Story` a feature · `Bug` a proven defect · `Tâche` the rest (debt, doc, decision, usage feedback) · `Epic` | one |
| **epic** | a ticket of type `Epic`; its tickets carry it as **parent** | `parent = EHA-285` lists an epic's tickets; a ticket of two epics has one parent and both `épique-…` labels |
| **scope** | **components**: `atlas` · `Cartographe` · `core` · `CMS` · `données` · `outillage` · `design` | one, rarely two — the same as the title's prefix (a cue seen twice is wanted) |
| **severity** | labels `critique` · `gênant` · `cosmétique` | one at most, only on a ticket that fixes a problem |
| **kind** | labels `dette` · `doc` · `décision` · `retour-d-usage` | with the type `Tâche` |
| **epic's label** | `épique-cms`, `épique-incertitude`, `épique-villes`… | kept beside the parent, so one click filters it |
| **importance** | the **Priority** field: `High` · `Medium` · `Low` (none) | the dev's call |
| **who holds it** | the **assignee** | Claude Coder, Claude Historian or the dev |
| **blocked** | Jira's flag + a link « is blocked by » | never a status: the ticket keeps its stage |

A label takes no space. `archivé` marks a ticket that was archived in Trello (all in « Fait »).

## The two templates

### Idée — light, so a thought is never held back

```
**Quoi** : <one line, his words>
**D'où ça vient** : <the dev / a test / a review / a walk in the app> — <date>
```

### Backlog — a ticket ready to be pulled

```
**Le problème ou le besoin** : <what hurts or what is wanted, his words>
**Le remède** : <what we will do, one or two sentences>
**Critères d'acceptation** :
- <a gesture he makes in the app> → <what he sees>

**Appli** : atlas | Cartographe | CMS | core | plusieurs
**Dépend de** : <CARTO-41 — pourquoi> (sinon : rien)
**Détails** : <known-issues entry, a plan file, H-NN, a scenario sNN, a commit>
```

**A ticket is not mature while its acceptance criteria are empty or untestable.** Each criterion is a gesture and an
observation in the app, never « the code handles X ». When the remedy is a product decision
(`rules/error-handling.md`), the ticket says so and goes to **À valider par le développeur** before anything is
written. **Leave a blank line after a list**: a line right under a list item is swallowed by it.

## The gestures — one MCP tool each

`cloudId` is always the one above. A ticket is named by its key, `EHA-<n>`. **Tried through the MCP on
2026-11-20**: read, create, move, comment, change, assign. **Place and block were done that day through Jira's REST
API**; their MCP inputs below are read from the tools' own descriptions — check the result the first time.

| gesture | tool | how |
| --- | --- | --- |
| **read a status** (the old `list`) | `searchJiraIssuesUsingJql` | `project = EHA AND status = "À faire" ORDER BY Rank ASC` — one status at a time; **never list « Fait »** whole |
| **read a ticket**, its comments | `getJiraIssue` · `listJiraIssueComments` | |
| **create** | `createJiraIssue`, **then** `editJiraIssue` | create with `summary` `[CARTO] Title`, `issueType`, `description` (Markdown), `labels`, `parent` → the answer gives `EHA-<n>` → edit the `summary` to `[CARTO-<n>] Title` and set `components: [{ "name": "Cartographe" }]` |
| **move** | `transitionJiraIssue` with `transitionId` | `11` Backlog · `21` À faire · `31` En cours · `41` Fait · `51` Idées · `61` À valider par le développeur — every status reaches every other |
| **comment** | `addOrEditJiraIssueComment` | Markdown; **first word « codeur — » or « historien — »**: the MCP signs with the dev's name |
| **change** a title, a description, labels, components, the parent, the assignee | `editJiraIssue` | every field is **set, not appended**: send the whole list of labels |
| **assign** | `editJiraIssue` | `fields: { "assignee": { "accountId": "…" } }` |
| **place** a ticket above another | `editJiraIssue` | `rankBeforeIssue: "EHA-12"` — never in À faire unless he asked |
| **block** | `editJiraIssue` + `createJiraIssueLink` | flag: `customfield_10021: [{ "value": "Impediment" }]` (unflag: `null`); link type `Blocks`, the blocker inward |
| **an epic's progress** | `searchJiraIssuesUsingJql` | `parent = EHA-363 ORDER BY status` |

A long answer costs context: `executeWrite({ name: "editJiraIssue", inputs, responseFields: ["key", "fields.status.name"] })`
returns only what is asked. A tool not listed above is found by `discover`.

## The Definition of Done — one for every ticket, written once here

A ticket reaches **Fait** only when its own acceptance criteria hold **and** all of this does:

1. **Tests written** — the 5-level policy (`rules/tests.md`), a guard verified against the plausible naive code.
2. **Checks green** — the type-check, the lint and the tests of the package touched; the whole check at the commit.
3. **Reviewed** — `/review`, the findings table shown to the dev first.
4. **Used by me in the app** when it touches the Cartographer or the atlas — without reloading his page.
5. **Judged by the dev** only when it is a look or a decision — one gesture; a feature is tested and closed by me.
6. **Committed** (`/commit`) — the hash goes in the closing comment.
7. **Written where it lives** — a gesture in its scenario (`/scenarii-to-code`), a closed known-issue archived, a new
   term in `glossaire.md`.

A step that does not apply is said in the closing comment, never skipped in silence.

### The closing comment — how it was done, where, and the key change (the dev's call, 2026-10-29)

> _"When you move a ticket to done, you must systematically explain how you fixed it and say where — the file, the
> line — and give a snippet, before and after, that shows it."_

**Every ticket moved to Fait gets this comment first, then the transition `41`.** In French:

````
codeur — **Ce qui a été fait** : <how it was fixed or built, two sentences at most, his words>
**Où** : `packages/…/file.ts:123` (one line per place that carries the change)
**Avant → après** — <what the change makes different, one line>
```ts
// avant
<the few lines as they were>
// après
<the same lines as they are now>
```
**Commit** : <hash(es)> — **essayé par** : <moi, comment — ou les mots du dev>
````

The key change, not the whole diff: five to fifteen lines. A new feature has no « avant » code: one line saying the
behaviour before. **The line numbers are read from the committed file**, never guessed.

## When to act on the board, unasked

| moment | gesture |
| --- | --- |
| **start-session** | read À valider par le développeur and the top of À faire; tell the dev what waits on him. **His moves are the state** — never propose to revert them. Deduce from the work done which ticket has moved on |
| I start a ticket he chose | transition `31`, assignee the role |
| a look or a decision is his | transition `61` + a comment saying exactly what he has to look at or decide |
| he reports a fault | comment his words, transition `31` |
| done, DoD met | the closing comment, then transition `41` |
| he mentions a thought in passing | create it in Idées (transition `51`) from the template, tell him in one line |
| a review or a test surfaces a new problem | Idées — never straight into Backlog |
| **end-session** | every ticket I touched carries a comment saying where it stands |

Never: create a ticket in À faire, reorder it, delete a ticket. Those are his. A subject written in a plan he decided
may enter Backlog directly; what comes from me goes to Idées. **His dictated feature goes to À faire** (memory
`his-dictated-feature-is-to-do`).

## Gotchas

- **`createJiraIssue` is called as its own tool** — through `executeWrite` it answers `{}` and creates nothing.
- **A type is named in the dev's Jira language**: `Tâche` while his account is in French, `Task` once in English.
  A refused type → `executeRead({ name: "listJiraProjectIssueTypesMetadata" })`.
- **`components` is refused at creation** (« not found in the issue type metadata »): set it by the edit that
  writes the number in the title.
- **A failed creation can burn a number**: a hole in the keys is harmless; a number is never given twice.
- **The MCP is signed in as the dev**: every comment and every change carries his name. The server is added by
  `claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp`, signed in by `/mcp`; « needs
  authentication » → he signs in again, nobody else can.
- **Deleting a ticket is switched off** in the MCP, and is his anyway: a duplicate of mine is closed with the label
  `archivé` and a comment saying why.
- **An interrupted call may already have acted**: read the ticket before repeating it.
- **Guiding the dev through Jira's pages**: look at the page first (his screenshot, or my own tab, closed
  afterwards). A narrow window folds the board's tabs into « More ».
- **The Trello board no longer exists**: the dev deleted it on 2026-11-20, once the move was checked. Its copy is
  `files/resources/jira-migration/snapshot/` on his machine (git-ignored, not backed up elsewhere); every
  ticket's description starts with its Trello number and its dates. The fifteen archived cards from before the
  counter never had a number: they are in that copy only.
