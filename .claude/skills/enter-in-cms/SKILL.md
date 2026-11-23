---
name: enter-in-cms
description: Enter what the historian found into the CMS's base through the Payload MCP server « cms » — a source, a place, a city at a date with its holder and its source lines — searching before creating, one source per line, never deleting, then telling the code instance what was entered so it checks the base. Use whenever the dev asks to put something in the base or the CMS (« saisis », « entre-le dans la base », « mets-le dans le CMS », « tenue par », « ville à une date »), and before any MCP call to the cms server.
metadata:
  author: europe-map
  version: "1.0"
---

# Enter in the CMS — the historian's procedure

**Outcome**: what the historian researched is in the dev's base, each fact with the source that says it, no record
created twice, nothing deleted but the historian's own errors, and the code instance told what to check. Written 2026-11-03 at the dev's request: a
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
   `places`, `place-periods`, `sources`, `importance-reasons` and `confessions`; save, copy the key. If his key lacks
   **create** or **update** for one of them, he opens it and ticks them.
3. **The key in his own terminal**, never in the conversation: it sits in `.env.local` (ignored by git); he loads it
   into the shell, then, from the `europe-map` folder:
   `claude mcp add --transport http cms http://localhost:3100/api/mcp --header "Authorization: Bearer $<his variable>"`.
   Done once: Claude Code keeps it in `~/.claude.json` for this folder (another folder, a worktree: `--scope user`).
4. **A new Claude session** in that folder (or `/mcp` to reconnect), and `/mcp` shows `cms` connected.

The key acts as the dev's account: what the historian enters appears in the admin as entered by him.

### When the connection fails — from what is seen to what to do

Lived on 2026-11-03, the first time; the mechanism is in `.claude/rules/known-issues/cms.md` (« Un ajout de champ pur
peut figer le serveur »). The same table is in `packages/cms/README.md`, for a person.

| what is seen | what it means | what to do |
| --- | --- | --- |
| `cms` absent from `/mcp` | the session started before `claude mcp add` — a session never rereads it | a new session; `claude mcp list` in a terminal shows the truth |
| `MCP server cms already exists` | the command was already run for this folder | nothing; `claude mcp list` |
| ✘ *connection timed out after 30000ms* | **the CMS server is stuck, not the key** — a wrong key is refused at once | probe without a key (below); if the admin hangs too, his server's terminal holds the error |
| `index … already exists` in his terminal | a schema push failed halfway after a field change; every request waits behind it | he stops his server; on **a copy** of `cms.db`, Payload's `pushSchema` without `apply` must list nothing; then he restarts — never a push tried on his base |
| `401` on `/api/mcp` with the key | the key is wrong, or the variable was empty when `claude mcp add` ran | he reloads it from `.env.local`, `claude mcp remove cms`, adds it again |
| a refusal on `importance-reasons` or `confessions` | the key's **find**, **create** or **update** box for it is not ticked | admin › MCP › API Keys, tick the three |

**The probe, without a key** (it changes nothing): a `POST` of an MCP `initialize` to `http://localhost:3100/api/mcp`
answers **401 in milliseconds** when the server is healthy; no answer in 20 s means the server is stuck. The same for
`/admin`: 200 healthy, nothing stuck. **His server is his**: I never start, stop or restart it — a stuck one, I tell him.

## The frame — never crossed

- **Since 2026-11-23, `/find-sources` (« Never », « The run ») comes first** (the dev): a holder is entered only from a work
  read — never from Wikipedia alone, never from the polity drawn on the map; a case the research cannot solve goes to
  him (**J'AI BESOIN DE TOI**) instead of being decided. Where a rule below says otherwise — « Then decide », « the
  map's vassal », a point valid by the duchy drawn under it — the obligation wins. A place whose holder is not read yet
  is entered with its line of existence and no holder, and listed in the region's note as _holder to read_: a debt
  to pay, since every place still has a belonging to find.
- **Through the MCP only.** Never the seed (`pnpm seed:cms` once ran on his base), never SQL that writes, never the
  REST API by `curl`, never a script. If the `cms` tools are absent or refused, **stop and tell the dev** — no other way in.
- **I undo my own errors — never the dev** (the dev, 2026-11-18: _"I no longer delete your mistakes"_; CMS-454,
  `77cb1589`). A wrong value is corrected by `update`. A record that should not exist **and that I entered** is deleted
  by me through the MCP — on `place-periods`, `places`, `sources`, `titles`, `vassal-links` only, once the « delete »
  boxes are ticked on my key. Never a record of the dev's, nor one I did not create; never `people`, `territories`,
  `confessions`, `importance-reasons`. Three refusals to expect: one record at a time, by `id` (a `where` is refused);
  a place a sheet or an event cites, a source a line cites, is refused and the message names what cites it — so undo
  **in order: the sheet, then its place, then its source**; nothing until the box is ticked. **There is no bin**: a
  deletion comes back only from a copy of the base, so read the record (find by id) before deleting it, and check after
  that it is gone. Each deletion is said to the code instance with the others of the batch.
- **Every fact with its source.** A value with no source is not entered. A fact *de mémoire* is never entered — it is
  researched first (climb the chain of reference: the quotation, then the work Wikipedia or the page cites).
- **A line speaks of the sheet's date** (the dev, 2026-11-10). A quotation is a line of the 1100 sheet when the holding
  it states runs through 1100: a span (« from 1097 to 1105 »), or a tenure begun earlier and not ended before 1100
  (Muggia given to the patriarch in 931). A single event at another date (consuls in 1179, a fire in 1110, a coronation
  in 1102) is never a line — *« pour l'instant, à moins qu'on trouve d'autres sources ; ça me paraît raisonnable »*.
  **Unless it bears on the sheet's date** (the dev, 2026-11-12): a quotation dated otherwise is kept as a line when it
  proves, supports or corroborates the holding at the sheet's date — *"if it proves, supports or corroborates my claim,
  you keep it"*. Lived on the county of Knin: « Knin joined the Croatian-Hungarian kingdom in 1102 » says Croatia was not
  yet Hungarian in 1100, so it is a line of the 1100 sheet. A date that says nothing of the sheet's (consuls in 1179)
  stays out.
- **A divergence is kept, never settled.** Two sources that disagree are two lines, each with its own value. The dev
  arbitrates; the concordance is computed, never typed (`evidence-system.md`).
- **The sheet shows the most probable holder, with its QID — even where the sources diverge** (the dev, 2026-11-06:
  *« sinon ça ne servirait à rien de faire une assertion sur la probabilité d'un ensemble de sources »*). The lines
  keep every reading, the contrary one included; the sheet's `holderName` + `holderQid` is the reading the sources
  make most probable, and the summary to the code instance says why. A holder with no QID only when there is truly
  none to name (« Aucun — ville abandonnée »), declared as such.
- **The holder is the nearest lord the sources prove, not the level the map draws** (the dev, 2026-11-14: the online
  MVP stops at one level of vassalage for readability, *"but later we will have to send everything"*). Bautzen in 1100
  is held by Wiprecht of Groitzsch, who holds it of the Duke of Bohemia: the sheet names Wiprecht, even though the map
  draws only Bohemia. The Cartographer then says « to declare » until the base knows who that lord holds of — CMS-422
  (a polity entered like a place, with the source of its suzerain) and CARTO-435 (climbing the chain) close it. A
  sovereign or a polity is named only when no lord below it is proven.
- **The holder is the superior, never the owner** (the dev, 2026-11-14: *"it lets us lay our little plots to cut the
  territory — so stop this hypocrisy"*). The holder is the lord the place answers to — count, margrave, duke, a church
  only where it holds the lordship (comital rights, an immunity). An abbey given the village, a bishop drawing a rent or
  a tithe, a noble owning manses is the **owner**: useful, kept as a note or its own line, never the sheet's holder.
  Pitten: the counts of Formbach owned the lands, the place obeyed Margrave Ottokar II — the sheet names Ottokar.
- **Every place carries the tree of vassalage above its holder, up to the sovereign** (the dev, 2026-11-14: *"we must
  have the tree of vassalage per place"* — held by Schmurtz, who answers to the counts of Basel, who answer to the duchy
  of Alsace, which answers to the Holy Roman Empire). **A point in the Cartographer is valid only when this chain climbs
  without a gap to the duchy drawn under it and to that duchy's suzerain.** Climbing it is also the check: each link —
  this vassal really held of that suzerain at the date — is proven by its own witness, so a wrong holder shows up as a
  link no source carries. **Each link is established once for a given date**, then reused by every place under that
  lord: more work once, more reliability everywhere (the dev, same day). They are entered in the base as titles and links of vassalage
  (CMS-422, step 5 below); the year's register `/Volumes/Acer/atlas-historien/<year>/toutes-zones/resultats/vassalage.md` — one line per link: the vassal,
  its suzerain, the witness, the doubt if any — stays the working list every research lot reads first and extends.
- **The map is the dev's.** A fact that changes a border or a suzerain is entered as a source line *and* sent to the
  code instance; nobody touches `years/` — he decides in the Cartographer.
- **His server is his.** If `localhost:3100` does not answer, tell him; never start, stop or restart it.
- **The key never enters the conversation** — not read, not echoed, not written in a file of the repository.

## When the sources stop short — research until there is a name (the dev, 2026-11-06)

> *"You must always insist, insist until you have an answer."* And: *"At some point you have to decide. But you name
> the source."*

- **Every sheet gets an entity, an identity, an identifier**: a holder and its QID. « Musulmane », « chrétienne »,
  « taïfa non établie » are not holders — they are where the research goes on.
- **Climb two or three degrees of separation.** The polity a source names ended before the date → who replaced it
  (Wikidata « replaced by », « followed by », the polity's own page) → who held the place at the date. A neighbouring
  town of the same district whose holder is known at that date is a degree too. Lived on 06/11: the taifa of Tortosa
  ends in 1099 on Wikidata → who took Tortosa → so who held Siurana and Horta in 1100.
- **Where to look, beyond Wikipedia**: `/find-sources` — the libraries in their order, archive.org among them, and the
  reading accounts he opened — the BnF in every lot, JSTOR.
- **Then decide.** When the search ends with no source naming the holder at the date, the most probable one is entered
  anyway, with its QID. **The line names the source it stands on** — the one that names the predecessor's or the
  neighbour's holder — with its quotation. The line does not announce a deduction; the reasoning is written in the
  year's file (`/Volumes/Acer/atlas-historien/1100/toutes-zones/resultats/questions.md`), the home of the questions.
- **A source created is cited by a line of the same batch.** A source attached to nothing is a fault (06/11, « Sos,
  castillo », created and never cited).
- **A QID written in an entry brief is read on Wikidata first, never from memory** (2026-11-14: three Czech regions given
  from memory were a calendar, a national anthem and a TV series — the agent caught them). The brief gives the place's
  QID from the report and lets the agent read the region on Wikidata.
- **A work in copyright is quoted short** (the coder's remark, 2026-11-14, as for the Duby): the lines go out in the public
  export (`content/cartographer.json`), so a quotation from a recent book or article is the one fact — one stretch of its own
  words, under about 200 characters — never a passage. Public-domain editions and CC texts are quoted as needed.
- **Every place has a belonging — climb until there is one** (the dev, 2026-11-14: *"tous les lieux doivent avoir une
  appartenance, c'est ça le jeu, il faut les trouver"*). When no witness names a local lord, the holder is **the vassal
  that holds the district** at the date (the duke, the margrave, the count of the county — the map's vassal when a source
  confirms it), with a line citing a source on that vassal's tenure; the holderName is that vassal's own name, nothing
  added (Kraubath → the duke of Carinthia, Würmla → the margrave of Austria). The sheet names the first link only: the
  chain above it, up to the highest suzerain, is the register's (« Every place carries the tree of vassalage », above),
  each link proven once. « No witness names a lord below the Empire » is never a reason
  to leave a place out: climb one level, not to nothing. Only the Empire itself, when no vassal is between, is the holder.
- **No sheet without a line** (the coder's remark, 2026-11-14, taken by the historian): a sheet with no line asserts the
  place at the date with no source — so the climb above always brings its line. A place is left out only when it did not
  exist at the date (`not-yet`) or its existence is unknown; it is listed in the region's note (`/Volumes/Acer/atlas-historien/<year>/`).

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
   - **The place bears its present name; the name it bore at the date is a record of its own** (the dev, 2026-11-21:
     _"the base should hold its present name, today, and the name it had at the time of the sheet"_ — Ankara is «
     Ancyre » in 1100; `../../../files/plans/contribution/names.md`, CMS-495). The map writes the name of the time
     alone; with none on the sheet, it writes the place's name.
     - `name` (fr) is **today's name**, as Wikidata's French label gives it (« Ankara »); the `en` locale today's
       English name. `wikidata` whenever the place has an item.
     - **Only when the name of the time differs from today's**: a record of `period-names` (« Noms d'époque »),
       searched by `place` before creating — `place` (the place's id), `forms`, one line a language, each
       `{ language, form }` with the language among `fr`, `en`, `es`, `it`, `de` and never twice the same (another
       spelling in one language is another record), and `lines`, each `{ source, where, quotation, asWritten }` —
       the source the name was **read in**, never Wikidata's label. The French form always; the English one whenever
       a source gives it. Then the sheet's `periodName` is that record's id (step 3). A name is entered once and
       reused by the sheets of every year it holds for.
     - Same name then and now (Paris): no record, nothing on the sheet.
     - **A place entered before 2026-11-22 may still bear its name of the time as its name** (132 names differ from
       Wikidata's, `../../../files/plans/contribution/noms-a-trier.md`): never rename one in passing — the map
       reads it — report it in the message to the coder.
   - `location` = **`{ "longitude": …, "latitude": … }`** — the MCP tools take an object and store Payload's
     `[longitude, latitude]` tuple; never send the tuple. Wikidata P625 gives the latitude first: read both by name.
   - `wikidata` = `Q` followed by digits, or nothing.
   - `existsFrom` / `existsTo` only with a source; `existsTo` empty while the place exists.
3. **The city at a date** (`place-periods`). Search by `place` first: **one sheet per place per year** — the server
   refuses a second one, so an existing sheet is **updated** (a line added), never duplicated.
   - `place` (its id), `date.start.year` (required; `date.end` makes it a span), `importance`: `capital`,
     `large-city`, `city`.
   - `periodName` — the id of the place's name of the time, when it differs from today's (step 2); the server
     refuses a name entered for another place.
   - `holderName` + `holderQid` — the polity holding it at that date. **Never the id without the name.**
   - `testimonies`, one line per thing a source says: `source` (its id), `subject` and the one value it names —
     `holder` → `holderName` (+ `holderQid`) · `population` → `population` · `importance` → `importance` ·
     `reason` → `reason` · `community` → `confession` — plus `where` (page, chapter, section) and `quotation` (the
     source's own words). A `holder` line also keeps **`holderAsWritten`**, the name exactly as the source writes it
     (« Mathieu, comte nantais ») — identity is a claim (`../../../files/plans/contribution/vassals/vassal-chain.md`); never normalise it.
   - `communities` (CMS-433), one per religious community a source attests: `confession` (its id, from
     `confessions`), `weight` — `dominant` (the larger part of the city) or `present` (a quarter, a minority) — and
     `weightAttested`, **`true` only when a source's words say that weight**; the presence alone attested, it stays
     `false` and the map shows the weight as supposed. **Each community needs a line** with the subject `community`
     citing the same confession, or the sheet is refused. The holder's confession is never entered: it follows from the
     holder.
   - `title` is written by the server (« Paris — 1100 »): never set it.
4. **A person or a house** (`people`, « Personnes », CMS-422 step 1). Search by `wikidata`, then by `name`: **two
   records for one person is the error this register exists to avoid** — in doubt between two homonyms, create
   nothing and ask. Any person the sources name, lord or not.
   - `name` (localized, French first), `kind` — `person` or `house` (a dynasty, a noble family: Wikidata P31 Q13417114,
     Q8436, Q164950), `wikidata`.
   - A person: `born`, `died` — each `{ year, month, day, circa, margin, calendar }`, **the calendar as Wikidata gives
     it** (Q1985786 = `julian`), never converted; `house` = the id of the house's record, entered first.
   - A house: `founded`, `ended`, `founder` (a person's id).
   - **No rank, no role, no confession** on the record: they are claims (titles, events, communities).
   - Pre-filled from the Wikidata id (P569, P570, P53); a date Wikidata lacks stays empty — never guessed.
   - **`wikidata` is unique** in places, people and territories (b76c62c, 15/11): a create or a correction that
     repeats a QID another record carries is refused (a validation error on « wikidata »). Never retry with an altered
     QID: find the record that carries it and reuse it. An empty `wikidata` is stored as absent.
5. **Titles and links of vassalage** (`titles`, `vassal-links`, CMS-422). A title is a person holding a territory over a
   date; a link, a title answering to another (« no-one » only when a source says so). **One of each per person,
   territory and years — per vassal, suzerain and years** (e3f15e4, 15/11): a second one is refused and the refusal
   names the existing record; a second source saying the same thing is **one more line on it**, never a second record.
   Enter titles and links **in series, never in parallel** (two creates sent together can both pass). A person holding
   several titles is given the one under which the place lies; a family named as holder is the person at its head in
   1100, the family being his `house`. Our own register (`vassalage.md`) is never a source.

## Entry by agents — the dev sets how many

The same rule as `/find-sources` (« Agents »; `references/rules-in-full.md`, the dev, 2026-11-13): an entry batch given to an agent
only with the number of agents he set, one at a time, on a lighter model (`model: "sonnet"`); none set, I enter myself.
Two batches never write the same sheet at once — an update re-sends all its lines.

## After each batch — say it, then let it be checked

1. **Tell the dev, in French, in a few lines**: what was entered (names, not ids), what was reused, what was refused
   and why, what diverges.
2. **Send the code instance one message** (`ListAgents`, then `SendMessage`): the collection and the ids created or
   changed, **every name of the time created** (its id, its place, its forms) and every place met that still bears a
   name of the time as its name. The code instance reads the base **read-only** (`sqlite3 "file:packages/cms/cms.db?mode=ro"`) and reports
   any fault to the dev; the historian then corrects it by `update`.
3. **The year's file stays the home of the questions** (`/Volumes/Acer/atlas-historien/<year>/toutes-zones/resultats/questions.md`): the question, the
   answer, its certainty, its sources — the base holds the facts, the file the reasoning (CMS-338).

## Gotchas

- **A grouped update (`where`) is run in parallel by Payload** (3.92, `operations/update.js`): when the list holds both
  ends of one link (a vassal title and its suzerain title), that link is rewritten twice at once and the refusal names a
  duplicate line id in `vassal_links_lines` (16/11, titles 29 and 11). Nothing is lost, but update such titles one by one.
- **A refusal names every issue** (the sheet is checked by `core/data/citySheet.ts` before it is saved): read them all,
  fix them all, then retry once. Never retry blind.
- **An interrupted or refused call may have acted**: search for the record before creating it again.
- **The importance reasons: find, create, change — never delete** (`importance-reasons`, opened 2026-11-13, CMS-431). A
  `reason` line or the `reasons` field cites one by its id, found with `find` — never guessed. **Search before creating**:
  a reason that exists is reused; one created names its faith when it has one (« évêché orthodoxe », « grande
  mosquée ») — the sign on the map depends on it. One is misspelt in his data (« pelrinage »): use its id, never re-type
  the name, never correct it yourself — it is his.
- **The confessions: find, create, change — never delete** (`confessions`, CMS-433): a community and its line cite one by
  its id, found with `find`; one that exists is reused, never created twice.
- **A change the dev made by hand in the admin is his**: an `update` over it is said to him before it is made.
- **He dictates by voice**: a garbled name is a dictation error — say what you understood before entering it.
- **A city entered is not shown in the atlas** (CMS-391, 2026-11-08): « Afficher la ville dans l'atlas » (`showInAtlas`)
  is unticked by default, and only the dev ticks it — the historian's cities serve the Cartographer's borders. The MCP
  refuses the box (`Invalid input at showInAtlas`, measured 08/11): never try to tick it that way, say it to the dev.
- **Reply in French**, the records' French fields in French, never franglais.
