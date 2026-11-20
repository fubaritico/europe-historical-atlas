# Moving the board from Trello to Jira — the plan

> The dev's decision, 2026-11-20: the board moves from Trello to Jira — the « Fait » column holds 261 tickets with
> no clean way to archive them while keeping the history, and he needs a clear hierarchy between epic, story, task
> and bugfix. **The plan is the next section** (written 2026-11-20, 16 h 30, to be read by him — ticket REPO-492);
> under it, what it stands on: his rules, what was checked at Atlassian, the board as measured, Gemini's advice.

## The plan

### Done — the tickets are in Jira (2026-11-20, 17 h)

**Site** `europehistoricalatlas.atlassian.net` (a site's name takes no hyphen), **project `EHA`**, company-managed
Kanban, board 3. **492 tickets, `EHA-1` to `EHA-492`, no hole**: each key carries the number of its `[CARTO-67]`;
checked against the import file ticket by ticket — statuses, types, priorities, components, labels, the 676
comments and every creation date, to the second. 121 tickets tied to their epic, the ten blocked ones flagged and
linked « is blocked by », the six files attached, the order of À faire, En cours, Idées and Backlog taken from Trello.

**What the import really asked — none of it in Atlassian's page:**

- **The JSON importer cannot create a project** on this site: it stops at « Retrieving projects » with
  « Unexpected failure », whatever the file. The project is created first (REST, template
  `com.pyxis.greenhopper.jira:gh-simplified-kanban-classic`), then the import finds it by its key.
- **Its field names are the old ones**, `issues` and `issueType` — the page's `work items` and `workType` are a
  renaming of the documentation only.
- **A status is found by its real name, and only if it is global**: the statuses of a team-managed project (the
  « Brouillon » the sign-up creates) are invisible to it, and a translated name (« En cours » shown for
  `In Progress`) is not a name. The six statuses were created or renamed through `/rest/api/3/workflows/update`.
- **A type is named as the site names it**: « Tâche », not `Task`.
- **In wiki markup a plain line after a list item continues the item**: the transform adds a blank line.
- A second import of the same file skips what exists (matched by `externalId`): four tickets sent first as a probe
  stayed, the other 488 followed.

**The dev's calls during the move**: the site's name `europehistoricalatlas`; **the backlog is a page, not a column**
— « Idées » and « Backlog » are two statuses of Jira's backlog page, the board keeps À faire, En cours, À valider par
le développeur, Fait; small probe imports allowed once the first import had failed (_"ok, if it makes you
understand"_).

**Mine, said to him**: the 30 archived tickets go to « Fait » with their label `archivé` — in the backlog they would
look alive. **« Fait » shows all 291 for two weeks**: the board hides what is done for more than two weeks, counted
from the import; nothing to do.

**Two people invited at the dev's request** (17 h 20), role « Membre »: the coder and the historian, on two
variants of his own address, so a ticket can name who holds it. They exist once he accepts the two mails; until then
they cannot be assigned. The MCP still acts under his account: a comment of mine carries his name, so it starts
with « codeur » or « historien ». The board's navigation is cut to four links (Chronologie, Tableau Kanban, Liste,
Backlog) — the Backlog view had to be added to it by hand. The site is on a **Premium trial** he did not ask for
(Atlassian's default); three people are free on the free plan, billed per person on Premium — the plan must be the
free one before the trial ends.

**Step 6 done the same evening** (17 h 40): the skill `/jira` replaces `/trello` — every gesture as the MCP tool
that does it, each tried on the real board (REPO-493 was created, numbered, assigned and moved by it); the board's
script and its skill are removed from the tree; the instruction files, the two roles, `next.md` and the memory name
Jira. The marks `[EPIC]` `[IDEES]` `[BACKLOG]` are taken off the 144 titles. The eleven tickets « En cours » have
their assignee: nine the coder, two the historian (the sources of 1100 and of 1300).

**Left to do** (the dev deleted « Brouillon » and Atlassian's example project himself — `EHA` is the site's only
project): the trees `coder` and `historian` resynced with
`main`; **REPO-493, his**: Trello closed (step 7), and the site on the free plan before the Premium trial ends.

### Changed by the dev the same afternoon (2026-11-20, 16 h 50)

> _"No trial, we do not care; you will work with Atlassian's MCP, and bring your skills and the context engineering
> up to date."_

- **No trial project.** The file is imported straight into `EHA`; if the result is wrong, the project is deleted and
  the import redone — Trello is untouched until then. Step 3 below is struck.
- **The daily work goes through Atlassian's MCP server, not a script of ours**: nothing to rewrite or maintain. The
  board's script (507 lines) is retired with Trello; the skill becomes `/jira` and says which MCP tool does each
  gesture. Step 6 below is rewritten.
- **The one load of the 492 tickets still goes by the import file** (my call, said to him): through the MCP it would
  be some 1 200 calls one after the other, every ticket and every comment dated the day of the move. The file is
  already written (`files/spikes/jira-migration/`, steps 1 and 2 done at 16 h 40).

**What the MCP server gives** (https://developer.atlassian.com/cloud/rovo-mcp/guides/supported-tools/, read
2026-11-20): `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addOrEditJiraIssueComment`,
`searchJiraIssuesUsingJql`, `getJiraIssue`, `createJiraIssueLink`, `uploadAttachmentToJiraIssue`,
`listJiraIssueTransitions`, `getJiraBoardIssueData`. **What it does not**: create a status (the six are made by hand
in Jira's workflow page), reorder a column (the order of « À faire » is his, moved by hand on the board), raise the
flag « Bloqué » unless `editJiraIssue` takes that field — to see at the first use; deleting a ticket is switched off
unless an administrator allows it. **Set-up**, his gesture: `claude mcp add --transport http atlassian
https://mcp.atlassian.com/v2/mcp`, then `/mcp` to sign in through the browser
(https://developer.atlassian.com/cloud/rovo-mcp/guides/getting-started/). **Not stated by Atlassian**: whether the
free plan has it, and what it costs in « Rovo credits » per call — known at the first call; the fallback is the
REST API with a token, which the plan's earlier version used.

### The route: Jira's own JSON import, then the API for what it cannot carry

**This replaces what I proposed in the morning** (a script creating every ticket through the API). Checked since:
the API cannot set a ticket's creation date nor a comment's date — every ticket would be born on the day of the move
and the 689 comments would all carry that day. Jira's **JSON import** (settings → System → External System Import →
JSON, on the « old experience » page) takes, per ticket, its **key**, its **creation date**, its **status**, its
components, and its **comments with their dates**. So:

1. **A script of ours reads all of Trello** (archived tickets included) and writes one JSON file in Jira's format.
2. **Jira imports that file** — a gesture in Jira's admin page, done by me in the browser or by him.
3. **Our script then adds through the API** what the file cannot carry: the six uploaded files (Trello's addresses
   need our token, Jira could not fetch them), the tie of each ticket to its epic, the « Bloqué » flag and its link.

If the trial (step 3 below) shows the JSON import refusing something, the fallback is the morning's route — the API,
tickets created one at a time in the order of their numbers, the true dates written at the top of each description.

### What the dev decides or does — everything else is mine

| # | what | my call if he says nothing | by |
| --- | --- | --- | --- |
| 1 | **Create the Jira site** with his Atlassian account, free plan. **The site's address cannot be changed afterwards on the free plan** — choose it with care (`europe-historical-atlas.atlassian.net` if free) | — his gesture | the dev |
| 2 | **Give a token**: `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_TOKEN` in `.env.local`, beside Trello's (id.atlassian.com → Security → API tokens) | — his gesture | the dev |
| 3 | **The project's key**: one project, key `EHA`. Jira's key is `EHA-67`; ours stays `[CARTO-67]`, **same number** | `EHA` | proposed by me |
| 4 | **Importance and severity are two things on the board today** (the cover's colour: 9 « haute », 19 « moyenne »; the labels `critique` / `gênant` / `cosmétique`: 70 tickets) and Jira has one Priority field | the cover becomes Jira's **Priority** (High / Medium, none = Low); the severity **stays a label**, as today | proposed by me — it changes the morning's proposal, which had not seen the covers |
| 5 | **The 15 archived tickets that never had a number** (from before 17/10) and the two template cards | **not imported** — they stay in the Trello board, kept closed and readable | proposed by me |
| 6 | **The marks `[EPIC]` `[IDEES]` `[BACKLOG]` in the titles** | kept through the move, taken off by the script once the check of step 5 is green | his rule (« decide then ») |

### How each thing of the board lands in Jira

| on the Trello board | in Jira | note |
| --- | --- | --- |
| a ticket `[CARTO-67] Title` | work item `EHA-67`, summary `[CARTO-67] Title` | the number is forced by the import; 1 to 491, no hole (measured) |
| the column **Épiques** (10) | type **Epic**, status « En cours » | the column disappears; an epic is a type |
| label `fonctionnalité` (344) | type **Story** | |
| label `défaut` (40) | type **Bug** | |
| labels `dette`, `doc`, `décision`, `retour d'usage`, or none (9) | type **Task**, the label kept | two type labels on one ticket (7): `défaut` wins, then `fonctionnalité` |
| the scope labels `atlas`, `Cartographe`, `core`, `CMS`, `données`, `outillage`, `design` | **components** — two scopes, two components | the prefix stays in the title as well (a cue seen twice is wanted) |
| the labels `épique · …` | the ticket's **parent** is the epic; the label is kept too (`épique-icônes`) | a ticket in two epics (icons and landmarks) has one parent in Jira — the first epic whose checklist names it — and both labels |
| an epic's checklist (131 items) | its children, by the parent tie; an item with no ticket yet stays a line in the epic's description | |
| another ticket's checklist (23 tickets) | a ticked list at the foot of its description | |
| the columns Idées → Fait | six statuses of the same names, in the same order | created by hand in the workflow **before** the import: an import cannot create a status |
| an archived ticket with a number (30) | imported in its status, with the label `archivé` | Jira's free plan has no archive of its own |
| `Bloqué` (10) + its link | Jira's **flag**, and a link « is blocked by » | |
| descriptions and comments (689) | the same text, their dates kept, converted from Trello's Markdown to Jira's markup | the conversion of code snippets is what the trial must show |
| the 6 uploaded files (8.9 MB) and 11 links | attached by the API; a link to a Trello card becomes a link to its Jira ticket | |
| « Fait », newest on top, 261 | the board hides by itself what is done for more than two weeks; everything stays searchable | the first two weeks may show all 261 if the import dates them all « done today » — to see at the trial |

Label names lose their spaces (Jira refuses them): `retour-d-usage`, `épique-cms`.

### The steps

| # | step | proves or delivers | time |
| --- | --- | --- | --- |
| 1 | **Snapshot of Trello**: `stamp` once more, then the script reads every card, comment, checklist and file into a local folder (**git-ignored** — the board is private and the repository public) | the migration works from a frozen copy; nobody writes the board from then on | 1 h |
| 2 | **Transform** the snapshot into the JSON file, and a report **in French, as text**, of every odd case (two types, two epics, no label) | he reads the report, not the JSON | 3 h |
| 3 | ~~**Trial on a throwaway project `EHT`**~~ — **struck by the dev, 16 h 50**; what it would have proved is read on the real import at step 5. As written: 30 tickets chosen for their cases: an epic and its children, numbers with a hole on purpose (1, 2, 5), the ticket with 22 comments, a closing comment with code, files, a blocked one, an archived one, two scopes | the number is kept · the dates are kept · the six statuses are taken · the markup reads well · the parent tie and the flag pass by the API · what the board shows of « Fait ». **Each proof seen in the browser by me**; `EHT` deleted after | 3 h |
| 4 | **The real import** into `EHA`, then the API pass (parents, files, flags, links) | the 491 tickets in Jira | 1 h |
| 5 | **The check, by script**: 491 keys equal to our numbers, per ticket the status, the type, the components, the count of comments, the parent against the epic's checklist; a report in French | a green report, or the list of what differs — the import is redone (the project deleted, Trello untouched) until it is | 2 h |
| 6 | **The switch** (rewritten, 16 h 50): the skill `/trello` becomes `/jira` — each gesture (`list`, `add`, `move`, `comment`, `done`, `tag`, `block`…) said as the MCP tool that does it, the templates and the closing comment kept; the board's script retired; and the twenty files that name Trello (CLAUDE.md and its rule on vulnerabilities, `next.md`, the two roles, `/start-session`, `/end-session`, `/commit`, the README…) | from then on a ticket is created in Jira: Jira gives the number, the script writes it in the title. A failed creation can burn a number — a hole, never a number used twice | 4 h |
| 7 | **Trello closed, never deleted**, once he has seen the Jira board | the old board stays readable | his gesture |

**One to two hours of work** (the dev challenged « a day and a half », an addition of guesses), plus a second
import if the first is wrong. **Steps 1 and 2 are done** (16 h 40): 492 tickets, 676 comments, 121 tickets tied to
an epic, no text too long for Jira; the report in French is `files/resources/jira-migration/out/rapport.md`
(git-ignored, like the copy of the board).

### What does not change

- **`[CARTO-67]` in commits, plans and messages**, his rule. **commitlint's rule needs no change**: its pattern takes
  any capital prefix and a number (`commitlint.config.js:6`).
- The six columns, the templates of a ticket (they already live in the skill), the closing comment, who moves what.

### What it costs — worth knowing, none blocking

- **Jira will not link a commit to its ticket by itself**: its GitHub integration reads `EHA-67`, not `[CARTO-67]`.
  Remedy if he ever wants it: write both in the commit. Not proposed now — his rule is one reference.
- **The free plan lets no permission be changed**, and everyone invited is an administrator; no public access. For
  him alone, and for the rule on unpublished vulnerabilities, that is what is wanted.
- **Atlassian may switch off a free site left unused.** The board is used daily; and the snapshot of step 1 is kept.
- **Not found in Atlassian's pages, so the trial decides**: whether the JSON import is open on the free plan; whether
  components exist in a « team-managed » project — hence a **company-managed** Kanban project, where they do and where
  the two-week window of « Fait » can be set to one, two or four weeks.

## His rules for it

- **The reference of a ticket stays `[CARTO-67]`** — the application's prefix and the number — in commits, plans and
  messages (the dev, 2026-11-20: _"a practice we will keep, so that you and the historian are not thrown"_). Jira's
  own key comes second.
- **The column is written in the title of every ticket of Épiques, Idées and Backlog** — `[CARTO-41] [BACKLOG] …`,
  `[EPIC]`, `[IDEES]` (the dev, 2026-11-20: _"so that we can restructure them in case there is a problem"_). Done
  that day on 144 tickets by the board's script (`trello stamp`); a ticket that leaves one of the three columns
  loses its mark at the next run — **run `stamp` again just before the move**, and decide then whether the marks are
  taken off in Jira once the epics and the statuses are checked.
- He does not validate features any more: what is built is tested by me (memory `one-gesture-to-validate`).

## What I checked at Atlassian, 2026-11-20

- The free plan is enough: 10 users, unlimited projects and work items, 2 GB of files
  (https://support.atlassian.com/jira-cloud-administration/docs/explore-jira-cloud-plans/,
  https://www.atlassian.com/en/software/jira/pricing).
- A board hides by itself the tickets done for more than two weeks — fixed on a team-managed project, 1, 2 or 4
  weeks on a company-managed one; they all stay in the project, searchable
  (https://community.atlassian.com/forums/Jira-questions/Team-managed-Kanban-how-do-I-hide-older-Done-tickets/qaq-p/1997263).
- **Atlassian's own Trello importer does not import archived cards**, and the reports about comments contradict one
  another (https://support.atlassian.com/jira-software-cloud/docs/import-data-directly-from-trello-into-jira/) — so
  **nothing is archived in Trello before the move**.

Checked the same afternoon, for the plan:

- **The JSON import** sets a work item's `key`, `created`, `updated`, `status`, `components`, its `comments` with
  `author` and `created`, a `history`, attachments by `uri`; reached by External System Import → JSON, « switch to
  the old experience » if hidden (https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-json/).
- **A CSV import with the « Issue Key » column mapped keeps the number**: Atlassian's example imports `XY-22222`
  into project `ABC` as `ABC-22222`
  (https://support.atlassian.com/jira/kb/what-is-the-difference-when-you-import-the-csv-file-with-issue-key-field-mapping-and-without-the-issue-key-field-mapping/).
  Community answers contradict it — one more reason for the trial. An import **cannot create a status**; files are
  fetched from an address Jira can reach (https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/).
- **The API cannot set a creation date** — an open request since years
  (https://jira.atlassian.com/browse/JRACLOUD-38572).
- **A number is never used twice**, even after a deletion, and a failed creation can burn one
  (https://community.atlassian.com/forums/Jira-questions/the-issue-keys-increase-sequentially/qaq-p/2777802,
  https://jira.atlassian.com/browse/JRACLOUD-77334).
- **The hierarchy** epic → story / task / bug → sub-task is fixed, the same in both kinds of project; more levels
  are for the paid plans (https://community.atlassian.com/t5/Jira-articles/Jira-Issue-Type-Hierarchy-Everything-You-Need-to-Know-Jira-Guru/ba-p/2803255).
- **Limits for a script with a token**: 100 creations a second, and on one ticket 20 writes per 2 seconds, 100 per
  30 seconds — far above our need (https://developer.atlassian.com/cloud/jira/platform/rate-limiting/).
- **The free plan**: permissions cannot be changed, everyone invited is an administrator, the site's address cannot
  be changed after creation, an unused site may be switched off
  (https://support.atlassian.com/jira-cloud-administration/docs/what-is-the-free-jira-cloud-plan/).
- **Not read** (the page would not load): the API's page for creating a work item — how the parent is set. From
  memory: the field `parent`, by key. The trial proves it.

## The board as measured, 2026-11-20 (read-only, by the API)

508 cards: 463 open, 45 archived. **491 numbers, 1 to 491, no hole, none twice.** 17 cards without a number: the two
templates and 15 archived from before the counter. By prefix: CARTO 203, ATLAS 157, CMS 55, REPO 47, CORE 26,
DESIGN 2, CONTRIB 1 (retired, read as CMS) — measured before REPO-492, this plan's own ticket, was created: the
snapshot of step 1 recounts, and the plan's « 491 » means « every number at that moment »; 78 titles carry two scopes. 689 comments on 261 cards (22 at most on
one). 17 attachments: 6 uploaded files (8.9 MB), 11 links. 45 checklists on 33 cards, 274 items — 131 of them in the
ten epics. Covers: 9 red, 19 yellow. 9 numbered cards without a type label, 7 with two. One member.

## What I proposed to him in the morning (replaced by the plan above)

One project; a script of ours that reads all of Trello through its API, archived cards included, and creates the
tickets in Jira **in the order of their numbers, so each keeps its number**; the prefix ATLAS / CARTO / CMS / CORE /
REPO / DESIGN becomes a component; the « Épiques » column and its checklists become real epics with their tickets
attached; `fonctionnalité` → story, `défaut` → bug, `dette` and `doc` → task; `critique` / `gênant` / `cosmétique`
→ the priority; the columns, the same statuses; descriptions, closing comments and attachments carried over. Then
the `/trello` skill rewritten and commitlint's ticket rule. One to two days; Trello kept read-only.

## Where Gemini's advice agrees, and where it does not

| point | Gemini | what I found, or propose |
| --- | --- | --- |
| the keys | Jira gives new sequential keys (`EHA-1`, `EHA-2`…); our old references stay in the title only | agreed that Jira numbers by itself — which is why the tickets are created **in our order**, to make the two numbers the same; to verify on a trial project first |
| the epics | the direct import makes « Épiques » a mere status; a CSV import, or a conversion by hand afterwards, makes real epics | agreed; our script creates them as epics from the start |
| the link ticket → epic | from the `épique · …` labels, into the `Parent` column | agreed — the labels and the epics' checklists say the same thing; the checklist names the tickets one by one |
| archived cards | ignored by the import (he advises excluding them, and archiving the two templates before) | **we keep them**: they are part of the history and of the counter; the two template cards are left out |
| the labels | all imported as labels, then turned into components by bulk change | types, components and priority set at creation; the rest stay labels |
| the checklists | kept in the description, or made sub-tasks, by the mode of import | to decide: an epic's checklist becomes its children; another ticket's checklist stays a list in its description |
| the route | CSV (recommended) or the native import with three clean-ups by hand | the API, for the comments, the attachments, the order and the archived cards — the CSV route is the fallback if the API refuses something |
| the Jira Power-Up on the board | links single cards, migrates nothing | nothing to add |

## The conversation with Gemini, as the dev pasted it (2026-11-20)

Votre tableau europe-historical-atlas est très structuré et compte plus de 460 cartes réparties sur 7 colonnes (Épiques, Idées, Backlog, À faire, En cours, À valider par le développeur, Fait). Sa configuration actuelle permet une migration propre, à condition de préparer quelques ajustements.

1. Préparer les colonnes avant l'import

- La colonne Fait (261 cartes) : Comme elle est tout à droite, Jira la marquera automatiquement comme « Terminé » (Done), ce qui correspond exactement à votre flux.
- La colonne Épiques (10 cartes) : Lors de l'importation directe, Jira va la traiter comme un simple statut de workflow (au même titre que Backlog ou En cours). Si vous souhaitez que ces 10 cartes deviennent de véritables Epics Jira auxquels rattacher vos autres tâches ([DESIGN-262], [CMS-285], etc.), il vaudra mieux passer par un import CSV ou les convertir manuellement en type de ticket Epic juste après l'import.
- Les cartes modèles : Les cartes Modèle - Idée et Modèle - Backlog seront importées comme des tickets classiques ; pensez à les supprimer dans Jira après la migration.

2. Gérer vos clés de tickets ([ATLAS-137], [CARTO-336], etc.)

- Jira va automatiquement générer une nouvelle clé séquentielle pour chaque carte importée (ex. EHA-1, EHA-2…).
- Vos anciens identifiants ([ATLAS-137], [CMS-441], [DESIGN-262]) resteront visibles dans le titre (Résumé) du ticket, ce qui facilitera les recherches, mais Jira ne les utilisera pas comme clés natives.

3. Conservation des étiquettes et checklists

- Étiquettes (Labels) : Toutes vos pastilles (fonctionnalité, dette, défaut, Cartographie, CMS, etc.) seront importées en tant que Labels Jira. Vous pourrez ensuite filtrer dessus ou les convertir en Composants (Components) pour Cartographie, CMS, atlas et core.
- Checklists : Les nombreuses sous-tâches visibles sur vos cartes (comme les 2/16 ou 8/26 dans la colonne Épiques) seront conservées dans la description ou converties en sous-tâches selon le mode d'importation choisi.
- Bouton Jira en bas à droite : Vous avez déjà le Power-Up Jira actif sur ce tableau ; il sert uniquement à lier des cartes ponctuelles, et non à migrer l'ensemble des 460+ cartes (l'importation depuis l'interface Jira reste la meilleure option).

### Option 1 : Préparer un fichier CSV (recommandée pour garder les vraies Epics)

Cette méthode permet de convertir votre JSON Trello en un fichier CSV propre où la colonne Épiques crée de vrais tickets de type Epic, et où vos étiquettes sont triées entre Types de tickets, Composants et Labels.

Étape 1 : Exporter le JSON depuis Trello

1. Dans Trello (europe-historical-atlas), cliquez sur le menu ... en haut à droite.
2. Allez dans Plus (ou Imprimer, exporter et partager) > Exporter au format JSON.
3. Enregistrez le fichier (ex. trello-export.json).

Étape 2 : Règles de transformation à donner à Claude

- Exclusions : Ignorer les cartes archivées ("closed": true) et les cartes modèles (Modèle - Idée, Modèle - Backlog).
- Mapping des Colonnes Trello (idList) → Statut Jira (Status) :
  - Épiques → Statut À faire (ou En cours), mais avec Issue Type = Epic.
  - Idées → Statut Idées (ou Backlog).
  - Backlog → Statut Backlog.
  - À faire → Statut À faire.
  - En cours → Statut En cours.
  - À valider par le développeur → Statut À valider par le développeur.
  - Fait → Statut Terminé.
- Mapping des Étiquettes Trello (labels) → Champs Jira :
  - Issue Type (par défaut Task, sauf si liste Épiques → Epic) : étiquette défaut → Bug ; étiquette fonctionnalité → Story (ou Task).
  - Components (Composants techniques) : conserver Cartographie, CMS, atlas, core.
  - Labels (Étiquettes libres) : conserver le reste — dette, cosmétique, gênant, outillage, décision, données, épique-cms, épique-incertitude, etc.
- Liaison automatique Epics ↔ Tickets : utiliser les étiquettes préfixées par épique- (ex. épique-cms sur [CMS-441]) pour remplir la colonne CSV Parent (ou Epic Link) en la reliant à la carte correspondante de la liste Épiques (ex. [CMS-285]).
- Nettoyage du titre et description : Summary = titre de la carte Trello ; Description = description de la carte + conversion des checklists en liste à puces Markdown (- [x] / - [ ]) en bas de description.

Étape 3 : Importer le CSV dans Jira

1. Dans Jira, allez dans Paramètres (roue dentée) > Système > Importation système externe > CSV.
2. Chargez le fichier CSV généré par Claude et sélectionnez votre projet cible.
3. Associez chaque colonne du CSV au champ Jira correspondant (Summary, Description, Status, Issue Type, Components, Labels, Parent) et cochez la case Mapper les valeurs pour les statuts et types de tickets.

### Option 2 : Importation directe native (plus rapide, retouches manuelles)

Étape 1 : Préparer le tableau dans Trello

1. Ne touchez pas à l'ordre des listes : Fait est déjà tout à droite, Jira la reconnaîtra automatiquement comme le statut final Terminé.
2. Archivez temporairement les modèles : Archivez Modèle - Idée et Modèle - Backlog avant l'import (Jira ignore les cartes archivées), puis désarchivez-les après si vous gardez Trello.

Étape 2 : Lancer l'assistant Jira

1. Dans Jira, cliquez sur + (Créer un projet / espace) > Importer des données > Trello.
2. Autorisez l'accès à votre compte Trello et sélectionnez le tableau europe-historical-atlas.
3. Associez les membres Trello à leurs comptes Jira.
4. Validez la création du projet.

Étape 3 : Nettoyage post-import dans Jira

1. Convertir les Epics : Filtrez par Status = Épiques (vos 10 cartes), ouvrez chacune d'elles et cliquez sur l'icône de type de ticket (en haut à gauche) pour changer Task → Epic, puis passez leur statut à En cours ou À faire. Supprimez ensuite la colonne Épiques des paramètres de votre tableau Jira.
2. Rattacher les tickets aux Epics : Filtrez par label (ex. labels = épique-cms), utilisez la Modification en masse (Bulk Change en haut à droite) pour attribuer en une fois le champ Parent vers l'Epic [CMS-285].
3. Transformer les domaines en Composants : Filtrez par labels = Cartographie (puis CMS, atlas, core) et utilisez la modification en masse pour ajouter le Composant correspondant.
