---
name: trello
description: Track the project's work as tickets on the europe-historical-atlas Trello board — list the board, add an idea or a backlog card from its template, move it, comment on it, mark it done against the Definition of Done. Use when the dev says Trello, ticket, carte, tableau, idée, backlog, "mets-le dans Trello", "c'est fait", "on en est où", and at every start-session and end-session, or when a task starts, finishes, waits on him or is tested.
allowed-tools: Bash(/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/.claude/skills/trello/scripts/trello:*)
metadata:
  author: europe-map
  version: "2.0"
---

# Trello — the board of record for the work

Since 2026-10-17 (the dev's call, 16/10 evening), **the list of tasks is the board**
`europe-historical-atlas`: https://trello.com/b/UJFwGl6E/europe-historical-atlas. `next.md` keeps the
session pointer and the context, never a second list. The account is a dedicated one, so its token
reaches this board only.

## Sync — one home per fact, the others link (the dev's call, 2026-10-17)

The board and the markdown files are **not copies of each other**. Each fact lives in one place; every
other place carries a pointer to it (`#N` for a card, a path for a file). A fact written in two places
drifts, and nothing fails when it does ([[distribute-notes-dont-pile-them]]).

| home | what lives there | what no longer does |
| --- | --- | --- |
| **the board** | the list of tasks and the state of each — what, its stage, blocked or not, who has the ball | — |
| `files/plans/*.md` | a chantier's design: why, how, the trade-offs. Its card links the file in **Détails**; the plan's steps become a **checklist on the card** (`checklist`, `check`) | progress — ticked on the card, not in the file |
| `.claude/known-issues.md` (+ `known-issues-atlas.md`) | a problem's mechanism: measure, cause, why the remedy. An entry **that asks for an action** gets a card naming it; an entry *« à savoir »* stays in the file with no card | the to-do — on the card |
| `.claude/next.md` | the resume point: where we stopped, what is mid-flight and in what state, context that is not a task. Points to the cards in À toi / En cours | **any list of tasks** |
| `.claude/completed.md` | a short account of each session: time spans, the dev's own words, my faults — citing tickets (`CARTO-41`) | the detail of what shipped — in the Fait cards (description: what, commits, date) |
| Basic Memory, `main` project, `patterns/` | what holds **across** projects — a tooling trap, a code pattern, a method (the dev's call, 2026-10-17); linked from `Cross-project engineering patterns — index` | anything specific to this project |

**Every gesture keeps both sides in step, in the same breath:**

- a card created from a known-issue or a plan → its **Détails** names the entry or the file, and the
  entry or the file gets ` — CARTO-41` (the ticket) after its title;
- a plan written or changed → its card's checklist matches the plan's steps;
- a known-issue closed → archived (`archive/known-issues-closed.md`) **and** its card `done`, with the
  commit in a comment;
- a card done → the session's `completed.md` account cites the ticket, never re-describes it.

**The sync check — run it at every `/end-session`, and at `/start-session` before proposing work:**

1. `list`. Every card in **En cours** or **À toi**: is `next.md` saying where it stands? Every card I
   touched this session: does it carry a comment saying where it stands?
2. Every file of `files/plans/`, `known-issues.md` and `next.md` changed this session
   (`git diff --stat` + `git status`): does what it asks for have a card? Does every ticket it
   cites (` — CARTO-41`) name a card that exists, in a coherent column?
3. Anything found out of step is fixed **then**, both sides — or said to the dev in one line if fixing it
   is his call (a card to move between Idées, Backlog and À faire is always his).

## The columns — a card matures left to right (the dev's call, 2026-10-17)

| column | holds | who moves a card in | to leave it |
| --- | --- | --- | --- |
| **Idées** | a raw thought, the *Idée* template | anyone, the dev mostly | I shape it into the *Backlog* template, **he validates the wording** |
| **Backlog** | a shaped ticket, validated as written, **unordered** | the dev, once I shaped it — **never me alone** | he decides to do it now |
| **À faire** | what he decided to do, **in his order** | the dev | I start the top card, unless he names another |
| **En cours** | what I am working on, **one or two cards at most** | me, when I start | the DoD's steps 1–4 are done → À toi |
| **À toi** | waiting on his gesture: test it in the app, or decide a question | me, the moment the ball is his | he tested it → Fait; he found a fault → back to En cours with a comment |
| **Fait** | acceptance criteria **and** DoD met | me, after **his** test or decision | — |

**The dev holds the order** ([[do-not-start-unasked-work]]): never pull a card from Backlog into À faire,
never reorder À faire, never start a card he did not choose. "On passe à la suite" means *propose* the
next card, not start it.

## The two templates

**Every card has a ticket: `[CARTO-41] Title`** (the dev's call, 2026-10-17). **One counter for the whole
board**, 1 to infinity, never reused (archived cards count) and **never changed** — not even when the
card changes scope: `prefix CARTO-41 atlas` gives `[ATLAS-41]`. The script gives the number: `add` takes
`"[CARTO] Title"` and refuses a number written by hand. Two scopes: `[ATLAS-12 · CARTO]`, the number on
the first. Numbered on 2026-10-17 in true chronology — `REPO-1` is the first thing ever delivered (the
quality gate, 12/09), Fait oldest first, then the columns left to right; from now on, creation order.
**Files cite the ticket** (`known-issues.md`, `next.md`, plans: `— CARTO-41`), never Trello's `#41`; every
verb takes either (`move CARTO-41 "En cours"` or `move 41 …`).

Every title **starts with its scope in brackets** (the dev's call, 2026-10-17), so the board reads at a
glance — **in capitals, it must jump out** (the dev, 2026-10-17): `[ATLAS]` · `[CARTO]` · `[CORE]` ·
`[CONTRIB]` (places & events, Payload) · `[REPO]` (CI, lint, Trello, skills — none of the four). Two
scopes: `[ATLAS · CARTO]`. `prefix` upper-cases whatever it is given. The scope labels stay as well — a cue
seen twice is wanted ([[redundant-cues-help-him-remember]]). `prefix N carto` sets or replaces it.

Card **titles are French, in the dev's words**, short: what is wrong or what is wanted — never an id,
a path or a function name (`Gêne : ‹P› muet sur un pays vide`, not `Fix selectTool guard`). The
description is French too, the dev reads it alone.

### Idée — light, so a thought is never held back

```
**Quoi** : <one line, his words>
**D'où ça vient** : <the dev / a test / a review / a walk in the app> — <date>
```

### Backlog — a card ready to be pulled

```
**Le problème ou le besoin** : <what hurts or what is wanted, his words>
**Le remède** : <what we will do, one or two sentences>
**Critères d'acceptation** :
- <a gesture he makes in the app> → <what he sees>
- …
**Appli** : atlas | Cartographe | les deux | core
**Dépend de** : <#N — pourquoi> (sinon : rien)
**Détails** : <known-issues.md entry, a plan file, H-NN, a scenario sNN, a commit>
```

**A card is not mature while its acceptance criteria are empty or untestable.** Each criterion is a
gesture and an observation in the app ("je presse ‹P› sur un pays vide → la plume s'active"), never
"the code handles X". When a card comes from a known-issue or an `H-NN`, its severity label matches the one
the entry already gives. When the remedy is a product decision (`rules/error-handling.md`, a fallback, a refusal),
the card says so in **Le remède** and goes to **À toi** before anything is written.

## Labels — one home for severity, scope and type (the dev's call, 2026-10-17)

A label shows on the closed card and filters the board; a line in a description does neither. So the
**severity is a label and only a label** — the Backlog template no longer has a Gravité line.

| family | labels | rule |
| --- | --- | --- |
| **Gravité** | `critique` · `gênant` · `cosmétique` | one at most, only on a card that fixes a problem; a new feature carries none. `critique` = blocks the work (CLAUDE.md's *blocking*) — renamed so it never reads like the status `Bloqué` |
| **Périmètre** | `atlas` · `Cartographe` · `core` · `données` (years/, relief, sources) · `outillage` (CI, lint, Trello, skills) | one, rarely two |
| **Type** | `retour d'usage` (what the dev felt using the app) · `défaut` (a proven bug) · `fonction` · `dette` · `décision` (a question to settle) · `doc` | one |
| **Statut** | `Bloqué` | through `block` / `unblock` only |

Every card I create gets its labels **in the same breath** (`tag`); the list lives in the script's
`LABELS`, and `tag` refuses a name outside it. A new label is the dev's call: add it to `LABELS`, run
`setup`. Trello's six unnamed default labels are left alone.

## Blocked, and how cards relate (the dev's call, 2026-10-17)

- **Blocked is a red label `Bloqué`, never a column**: the card keeps its stage (blocked *en cours*,
  blocked *à faire*), so nobody has to remember where to put it back. Jira's *Flagged*, not a status.
- **Not the same wait as À toi**: À toi waits on the dev's gesture; Bloqué waits on another card.
- **One direction only, "depends on"**: the template's **Dépend de** line, plus `block`, which labels the
  card, attaches a link to the blocking card (Trello previews it) and comments on both. `unblock` removes
  the label and those links and says « Débloqué ». No two-way *blocks / is blocked by* as in Jira.
- When the blocking card reaches Fait, `unblock` the cards that depended on it, in the same breath.

## The Definition of Done — one for every card, written once here

A card reaches **Fait** only when its own acceptance criteria hold **and** all of this does:

1. **Tests written** — the 5-level policy (`rules/tests.md`), and a guard verified against the plausible
   naive code ([[verify-a-test-with-the-plausible-naive-code]]).
2. **Gate green** — `pnpm type-check && pnpm lint && pnpm test`.
3. **Reviewed** — `/review`, the findings table shown to the dev first ([[show-the-review-table-first]]).
4. **Used by me in the app** when it touches the Cartographer ([[test-it-yourself-in-the-app]]) —
   without reloading his page ([[never-reload-the-devs-page]]).
5. **Tested by the dev** in the app, or the decision taken by him → only then `done`.
6. **Committed** (`/commit`) — after his test, never before; the commit hash goes in a comment.
7. **Written where it lives** — a closed known-issue archived, a new term in `glossaire.md`, a walk in
   its scenario ([[every-walk-becomes-scenarios]]).

A step that does not apply is said in the closing comment ("pas de rendu touché : pas de test dans
l'appli"), never skipped in silence.

## The verbs — one command per gesture

A card is named by its **number** on the board (`#7` → `7`). Always the absolute path:

```bash
S=/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/.claude/skills/trello/scripts/trello
$S list                                    # every column and its cards
$S add "Idées" "[CARTO] Title" "description" fonction Cartographe   # description = a filled template; labels optional
$S edit 7 $'**Le problème…** : …\n…'     # replace the description (shape an Idée)
$S rename 7 "New title"
$S prefix CARTO-41 "atlas · carto"           # change the scope; the number stays
$S above CARTO-41 ATLAS-12                  # place a card just above another
$S move 7 "En cours"
$S comment 7 "commit 5c96eaf — testé par le dev : « c'est bon »"
$S done 7                                  # → Fait
$S tag 7 Cartographe défaut gênant          # labels from LABELS only
$S untag 7 gênant
$S block 7 4 "attend la soudure"           # 7 depends on 4: label, link, comment on both
$S unblock 7
$S archive 7 "doublon de #9"               # my own mistakes only — undone from Trello's archive
$S checklist 9 "Plan" "étape 1" "étape 2"   # a plan's steps on its card
$S check 9 "étape 1"                        # ticks the one item containing the text
$S show 7                                  # title, column, description, comments
$S setup                                   # creates the missing columns and the two template cards, restores order
```

Announce each like any command (cause / reason / action) — the verb *is* the action, which is the
point: the dev reads `move 7 "En cours"`, not a curl. A multi-line description is passed with
`$'…\n…'` quoting.

## When to act on the board, unasked

| moment | gesture |
| --- | --- |
| **start-session** | `list`, then tell the dev what is in **À toi** (it waits on him) and the top of **À faire** |
| I start a card he chose | `move N "En cours"` |
| a question or a test is his | `move N "À toi"` + a comment saying exactly what he has to do or decide |
| he reports a fault on a card in À toi | `comment` his words, `move N "En cours"` |
| he tested it, DoD met | `comment` the commit and his verdict, `done N` |
| he mentions a thought in passing | `add "Idées"` from the template, and tell him in one line |
| a review or a test surfaces a new problem | `add "Idées"` — never straight into Backlog |
| **end-session** | `list`, and every card I touched carries a comment saying where it stands |

Never: create a card in À faire, reorder, delete, or archive a card that is not my own mistake. Those
are his. A subject written in a plan he decided may enter Backlog directly (his call, 2026-10-17);
what comes from me goes to Idées.

## Gotchas

- **An interrupted command may already have acted.** Three times on 2026-10-17 the dev rejected or
  interrupted a batch and part of it had already reached Trello (3 cards, then 14 duplicates in Fait).
  After any interruption or rejection: `list` first, compare with what the batch meant to do, and only
  then re-run — never re-run blind. A batch script should be idempotent where it can (skip a title that
  exists).
- **`archive` is for my own mistakes only** — a duplicate, a card created on a stale note — with the
  reason as its argument (it becomes a comment). It is undone from Trello's archive. Any other card:
  ask the dev.
- **Secrets**: `TRELLO_API_KEY` and `TRELLO_TOKEN` live in `.env.local` (git-ignored by `**/.env*`).
  Never read them into the conversation; to inspect the file, mask the values
  (`sed -E 's/=.*/=<…>/' .env.local`). `TRELLO_SECRET_KEY` is in there too and is unused.
- **Output goes to stderr** (`console.warn`, the repository forbids `console.log`) — read both streams.
- **A refusal exits 1 with Trello's status**, no retry. 401 means the token was revoked or mistyped:
  ask the dev to regenerate it — the page is in French and has **no menu path**, only the address:
  `trello.com/power-ups/admin` → *atlas-claude* → left column *Authentification Trello* → the blue
  link « jeton » in the text beside the key → *Autoriser*. He was lost there once; give him exactly this.
- **The two template cards** (`Modèle — Idée`, `Modèle — Backlog`) sit at the top of their columns and
  are Trello card templates: the dev uses them from the UI (*Ajouter une carte* → template icon). `list`
  marks them `(modèle)`; never move or `done` them.
- **Guiding the dev through any web UI**: his browser is in French; look at the page (a screenshot of
  his, or my own tab, closed afterwards) before naming a button. Guessing English labels cost an
  angry quarter of an hour on 2026-10-17.
