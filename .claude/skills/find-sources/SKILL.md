---
name: find-sources
description: Compulsory before ANY historical research, reading or check of a holder, a city, a region or a border — load it first, before opening a single page, Wikipedia included. The historian's research in a fixed order — a preparation (the dev's axes of research, what is at hand, the order), then Wikipedia as priming only, the PDFs on disk, archive.org, Gallica, the BnF, JSTOR, each book's index and bibliography over one to two degrees; every attempt counted and said in a journal; a gate that refuses a region whose books were not read. Use when the dev gives a theme, a map, a region, a list of towns or a question of holder (« qui tenait », « à qui appartenait », « vérifie », « recherche », « cherche », « sources », « preuves », « croise », « refais », « reprends », « ça correspond pas »), before /bulk-entry and /enter-in-cms, and whenever a sheet rests on Wikipedia or has no holder.
metadata:
  author: europe-map
  version: '2.0'
---

# Find sources — the historian's research

The orders only. Why each exists, the dev's words and the detail of every step: `references/rules-in-full.md`
(read the section named when a step is unclear). Scripts: `.claude/skills/bulk-entry/scripts/`, run with `python3 -I`.

## Never

- Never ask the dev to guide the research beyond the form of the setup: what he gives there is help, never proof,
  and the context is mine to build.
- Never a fact from memory. Never a quotation not found word for word in the text read.
- Never a holder from Wikipedia alone, nor from the polity drawn on our map. The map is not an input, not a check.
- **Never weigh Wikipedia like a work** (the dev, 2026-11-24, on Lérida: _"Wikipedia is popularisation; a
  professional's work has more value and credibility"_). Against a work read, a Wikipedia sentence loses. **An
  annotated sentence is climbed** to the work and the page its note cites, and stands only if that work says it there
  (Lérida, 24/11: the page put the tribute to Barcelona on Lladonosa 1974 and Miret i Sans 1904; our line had put it
  on Reilly 1993, who says otherwise). **A sentence the page flags itself** — « citation needed », « référence
  nécessaire », « cita requerida », « Belege fehlen », « kaynak belirtilmeli », a section banner « ne cite pas
  suffisamment ses sources » — **is worth nothing** and is never a line. `follow_links.py` lists both in `flags.md`.
- Never start a reading from a city: cross the works; the cities come out of them.
- Never skip a channel. Never enter a holder while the gate refuses. Never delete without his word.
- Never end a research without filing it in the archive; never fetch again what the archive already holds.
- Never settle a divergence: two readings are two lines, each with its work and page.

## The run

**Setup — before any page is opened, Wikipedia included**

0. **The checks, all before anything else** (the dev, 2026-11-23: _"you checked the disk; what else?"_) — each said in
   the journal, a failure said to him at once with its remedy, never met halfway through:
   - **`python3 -I bulk-entry/scripts/preflight.py`** — everything a script can check, for every step up to the
     export: the disk (mounted, writable, room, its tree, the library), the Python libraries, the scripts, the agent
     loading this method, archive.org, Wikipedia, Wikidata, Commons, OpenEdition, Persée, the base, his CMS server
     (port 3100), Node 24 and pnpm, the Mac not going to sleep. Exit 1 on any failure, each with its remedy;
   - **then by me, with my tools**: one read through the MCP « cms »; the Chrome extension answers; **his logins** —
     JSTOR through the BnF proxy (`www-jstor-org.bnf.idm.oclc.org/action/doBasicSearch?Query=<w>`) shows results, not
     the BnF sign-in page; Gallica's home page opens. Not logged in → **CONNEXION IMPOSSIBLE**, said now, the sign-in tab
     left open for him (I never click « Me connecter »). For a night run, all of it before he goes to bed.
   Read `ouvrages/index.md` and,
   when it exists, `<year>/<zone>/fiche.md`: what is already read is not fetched again. `archive.py open` the research.
   The base already has sheets for this region at this date: « A region already researched », step 1, first.
1. Create the region's note `/Volumes/Acer/atlas-historien/<year>/<zone>/resultats/note-de-region.md` (sections: Axes given, Resources given,
   Context points given, Context — …, Hypotheses, Holders by district, The chain of vassalage, Index references,
   Cities met in the sources, Existence to read, Attempts).
2. **One question, once — the setup is fast** (the dev, 2026-11-23: _"there must not be half an hour of
   preparation"_). His request carries the zone, the year and, if he has them, his axes and references
   (« Castille 1100, axes : …, références : … »). What it lacks is asked **once, in one message**: « Tes axes et tes
   références pour <zone> <year> ? (rien : je pars sans) » — then go, whatever the answer. Never asked again. Write
   each answer in the note at once, in his words. **What he gives are mostly references of books** (from the
   videos he watches, which give him no summary): **they prove nothing** — they help: sources to read, context,
   words, vocabulary, names, dates **to verify**. He gives nothing: start without.
   **Every item given goes to `<year>/<zone>/donne/`, numbered in the order given** (`01-…`, `02-…`): a file
   (screenshot, map, PDF) is copied there — never moved, his original stays where it is; a list or a text is
   written there as a `.md`. Each has its line in the note's « Resources given »: what it is, where it comes
   from, what I read on it (a map: title, date, legend, names), what it gives to verify, its state. I look at
   every image myself; a name I cannot read is written « illegible », never guessed.
3. `research_log.py say` the research; give him once: `pnpm research-log`, one file a day in `/Volumes/Acer/atlas-historien/journal/`.
4. `prepare.py <year> <zone>`: what is at hand (the archive included), the order, what is still to do.
5. **Build the context myself**: the ten years before the date — further back when his points go further — year by
   year, in the note. Every line names **the date, the place, the actors, the work and page**. No generality.
   His points are checked in it; a point that a work contradicts is said with the work's reading.
6. From the context, list **the precise questions**: this city, at this date, held by whom, of whom.
7. Reread « Never ». A rule that contradicts the request is said to him before starting.

**Execution — each step said in the journal before and after; every attempt by `research_log.py attempt`**

8. Names and hypotheses: every name of each place and actor in each language; every holder ever put forward.
9. Resources he gave — opened first.
10. Wikipedia, every language: priming only. List the works its pages cite (`cited_works.py`). **Follow its links,
    as a reader does** (the dev, 2026-11-23: _"I only followed links from Wikipedia pages"_): every map and image of
    the page opened on Commons — author, source, licence, then looked at, its names read; the pages of its actors,
    places, battles and « See also », one to two degrees, each giving its own maps and cited works — **by
    `follow_links.py <out> <lang> "<Title>"`** (`bulk-entry/scripts/`), on every page read: page, maps as images with
    their Commons file pages, the index, and `flags.md` — the page's banners of missing sources and its annotated
    sentences with their notes: every annotated sentence that bears on a holder goes to the next channels as the work
    and page to read; every flagged one is dropped.
11. The PDFs on disk (`/Volumes/Acer/atlas-historien/bibliotheque/`): each opened, or ruled out with its reason
    (title, period, index — one test is enough). Text and map legends. `pypdf` with `2>/dev/null`.
12. archive.org: `find_book.py search "<title> <author>"`, then `find_book.py get <identifier> <folder>`. **Then by
    subject, by myself** (the dev, 2026-11-23): the polities, the actors, the region, the period — never only the
    titles he gave. The free scholarly works filed, the loan-only listed; **to him, only what was not found**.
    **An empty search is never an answer** (the dev, 2026-11-24, on « Sandnes neighbouring farms Roussell », dropped
    after one try): the script shows its reformulations, to judge; then find the book's **exact title** by a web
    search, and search that title on archive.org, Gallica and Google Books; the journal says why it is dropped.
13. Gallica.
14. The BnF, then JSTOR — in his Chrome, never while he tests an app there. Not logged in or refused:
    write **CONNEXION IMPOSSIBLE**, stop everything, nothing counted.
15. In every work read: the index for every name, the passage, the notes and bibliography → the next works.
    One to two degrees. Each index reference written in the note before it is read.
16. A city named in a work: identify it today (Wikidata), list it under « Cities met in the sources », enter it.
17. The existence of each place at the date: looked for in the works too, as far as possible. None found: the
    place stays on its Wikipedia sentence, listed « Existence to read ».
18. The chain above each holder, each link with its own witness (`/Volumes/Acer/atlas-historien/<year>/toutes-zones/resultats/vassalage.md`).
19. Write the note: holders by district with work, page, quotation; contrary readings; attempts counted.
20. A question the six channels did not answer, a work that cannot be had, readings that cannot be told apart:
    **J'AI BESOIN DE TOI** — that case stops, the others go on. All blocked cases on one French page,
    `<year>/<zone>/resultats/besoin-de-toi.md` in the archive, opened for him: per case, four lines at most
    and one simple question.
21. `region_gate.py <year> <zone>`. Refused: back to the missing channel.
22. `/enter-in-cms`, then the message to the coder.

**Archive and tear down — never skipped**

23. File everything with `archive.py`: `work` for each work read, `read` for each reading, `given` for what he
    gave, then `close`. Read each `.md` back.
24. Clean: `inventory.py` lists, with sizes, what `travail/` still holds (Wikipedia pages, lots, copies) and
    anything left on the internal disk; show it, ask him, delete on his word. The base, the note and the archive stay.

## The archive — `/Volumes/Acer/atlas-historien/` — the research's workspace

The external disk the dev allocates — **not given, not mine** — and **the single source of truth of the research**:
everything a research reads, downloads, tries and finds lives there, nothing on the internal disk, nothing in the
scratchpad. **What can serve again is at the root; what belongs to one year and one zone is under that year.**
Being allocated: tidy and readable by a person, every folder with its `fiche.md`; nothing of his touched
(`ATLAS-BOOKS/`; his PDFs gathered in `bibliotheque/` on 2026-11-23, at his word); nothing deleted without his word; never filled for nothing. French names;
what a person reads is a `.md`.

```
atlas-historien/
├── LISEZ-MOI.md              how it is filed, one page
├── journal/                  the journal he follows (pnpm research-log): one file a day, YYYY-MM-DD.log; ancien/ the single file before 24/11
├── registre/attempts.jsonl   every attempt of every research (research_log.py attempt); the gate reads it
├── ouvrages/                 REUSABLE — one folder per work, once: <author>-<year>-<short-title>/
│   ├── index.md              every work: author, title, what it covers (regions, centuries), the researches it served
│   └── <work>/               fiche.md · texte.txt · livre.pdf · pages/p-<n>.png — fetched straight here
├── lieux/                    REUSABLE — per place, the dated sentences read before 2026-11-23 (primings, never proofs)
├── bibliotheque.md           the works on the project's disk and his paper atlases: what each covers, its licence
├── outils/                   py (runs a script with the libraries) · python/ (pypdf, pillow… — pip --target, exFAT has no venv)
├── cartes/<year>/            my copies of a map before I draw on it, kept until his word
└── <year>/<zone>/            ONE RESEARCH
    ├── fiche.md              what was asked, when, where it stands, what is left
    ├── donne/                what the dev gave, numbered
    ├── recherches/           lectures.md · essais.md · journal.log (its part) · avant-2026-11-23/ (quality not assured)
    ├── resultats/            extraits.md · note-de-region.md · besoin-de-toi.md
    └── travail/              the work in progress: Wikipedia pages, lots, copies — emptied at the end, on his word
```

- `<work>/fiche.md`: author, title, publisher, year, kind, in copyright or not, where found and when, its
  contents and index, the pages read and for which research.
- `recherches/lectures.md`: one line per reading — work (its folder), pages, question, result. It never copies a
  work, it points to it; the work's `fiche.md` lists the research in return.
- `recherches/essais.md`: every attempt — channel, words, found or nothing.
- `resultats/extraits.md`: every sentence kept — work, page, quotation, what it bears on.
- A work in copyright is marked so: its facts are read, its plates and images never reused in the atlas.
- **The RAG — REPO-501, top of the Backlog.** A local index of the works, on this disk (code, index, model), to find
  the passages already read under every name of a place. Not a source: a passage it returns is its work's witness,
  re-read in the text. **I tell the dev when it is time to build it** — `prepare.py` says « LE MOMENT DU RAG » from
  30 works filed. Until then every text is filed page by page, its page numbers kept.

## A region already researched

The base already holds sheets for the region at the date: their quality is not assured. The research is done as
new; the old sheets are judged by it, never the reverse.

1. **Before the setup, count**: `count_sheets.py <year> <west> <south> <east> <north>` (the base, read-only) — the
   region's sheets by what carries their holder (none · a holder with no line, copied from the map · Wikipedia
   alone · a work cited, to re-read) and their existence. Write the counts in the note and say them to him.
2. **Run the research whole** (« The run »). The old holders enter step 8 as hypotheses among the others,
   with no more weight.
3. **Confront, sheet by sheet**, once the note has its holders by district:

   | the works read say | do |
   | --- | --- |
   | the same holder | add the work's line; keep the sheet |
   | another holder | the holder becomes the work's; the old reading stays as a contrary line when it had a source, goes when it had none |
   | nothing | remove a holder that had no line; keep a Wikipedia line but no holder on it; list the place « holder to read » |
   | the place did not exist, or is a duplicate | delete it myself (sheet, then place, then source — `/enter-in-cms`) |

   **Removing a holder empties three fields**, « Tenue par » (`holder_title`) **and** the holder written as text
   (`holderName`, `holderQid`) — with the text left, the sheet is judged on it, copied from the map (the coder,
   2026-11-23, read in `cityVerdict.ts`). The sheet stays on the map, with no country, **red in the Cartographer and in
   `pnpm cities:alerts`** until a sourced holder is entered: wanted, nothing else is erased.

4. **Re-read every old quotation of a work** in its text. Not found word for word: remove the line.
5. **Report in the note**: sheets confirmed, corrected, emptied of their holder, deleted. Then the export,
   `pnpm cities:alerts --map <year>`, the message to the coder.

Region by region, when each is redone — never the whole base at once. Before the first region: ask the coder
what the Cartographer and `cities:alerts` do with a sheet that has no holder.

## When the book does not have it — the ladder, before giving up

The place is expected to be found (the dev, 2026-11-23: _"you are supposed to find it — how does the agent cope?"_).
A book that does not name it is one rung, not the end. Climb, each rung an attempt in the journal:

1. **Its other names.** Every name of the place and of its fortress — Greek, Latin, Arabic, Turkish, Armenian,
   Syriac, the crusaders' spellings, the old transliterations (Mamistra / Mopsuestia / Misis) — looked up in the index
   and grepped in the text; an OCR text read with the letters it mangles (`rn` for `m`, a lost accent).
2. **Its district.** The fortress above it, the see it belongs to, the valley, the neighbouring towns: who held the
   district at the date holds the place, said as « par son district » (`holderBasis: district`).
3. **The dates around.** The nearest holding read before the date and the nearest after: the same holder on both
   sides, with nothing between, is a tenure through the date — kept as such, `fragile`, both readings cited; two
   holders, the change is dated or the place stays divided.
4. **Another kind of witness.** A chronicle of the time (the Alexiad, Matthew of Edessa, Ibn al-Athir, Michael the
   Syrian, Albert of Aachen…), a topographical dictionary (the _Tabula Imperii Byzantini_), a list of sees or bishops (a
   bishop proves a town), a survey of castles, coins and seals — the existence of a place is often there, not in the
   political histories.
5. **The next book.** The notes and the bibliography of the book that was silent, one to two degrees; the same
   question in the other languages of Wikipedia and in their sources.
6. **What is behind a door.** Loan-only on archive.org, the BnF, JSTOR, Gallica: listed by exact title and page, read
   by the historian in his Chrome.

Only then, **unknown is an answer**: `holder: null` or `existed1100: unknown`, `fragile: true`, the rungs climbed
written, the books that would answer listed — in « J'AI BESOIN DE TOI » when only he can open them. **Never filled**:
not from memory, not from the map, not from a neighbour's holder without the district's witness.

## A reading is kept only if

- the work is `primary`, `scholarly` or `historian-atlas` for a holder (`encyclopaedia` and `crowd-database` prime, never prove);
- its line carries the work (author, title, year, publisher — copied, never typed from memory), the page, the quotation;
- the quotation was verified on the text, or by eye on the page image when the text is OCR;
- the date it speaks of is copied with it: a source on 1085 says nothing of 1100; a day is written when given;
- a page copying a book is the same witness as the book.

## What comes back, per place

```
## <place> — <date>
Most probable holder: <polity> (<QID>) — <why: n witnesses against m>
| holder read | work (author, title, year, publisher) | kind | where | quotation | verified |
Fragile: yes — one witness / Wikipedia alone | no
Not found / dropped: <quotation not checked, lead that led nowhere>
```

## Agents

**Ten agents by default, decided at the start, then no human step until the end** (the dev, 2026-11-23 evening: _"10
by default… decided at the very start so that there is no more human intervention after"_ — it replaces the scale of
the same afternoon). Another number only if his request names one. Measured cost: ≈ 0.3 % of his week per lot with the
agent of 13/11; the rewritten agent (60 turns) is measured on its first lot and said in the journal. **Unattended**:
the first lot runs alone and **I** check it in its files — it opened the library, looked at maps, followed links, found
books (`worksFound`); if so the others start, ten at a time at most; if not, the run stops and the report says why. A
case it cannot settle goes to « J'AI BESOIN DE TOI » and the others go on; emptying `travail/` waits for his word in
the morning. Research on Opus (`subagent_type: "source-researcher"`, lots of 10–15 places), entry on
Sonnet. I re-check every quotation an agent brings. An agent saves the texts it reads in its lot's folder
(`<year>/<zone>/travail/<lot>/sources/`) and files each work it finds in `ouvrages/` at once (`archive.py work`), so
the lots running beside it find it; I check the filed works at the lot's end.
Detail and costs: `references/rules-in-full.md`, « Agents ».

## The loop — rounds until the questions are answered (the dev, 2026-11-23: _"write the loop… like a review"_)

The pattern of `/review`: rounds, each checked, bounded, and at the end a deliverable — **`resultats/saisie.json` and
`saisie.md`, the data to enter in the CMS** (`build_saisie.py`), never only reports.

- **Round 1 — research.** The lots, ten agents (`source-researcher`). Each report re-checked by me (`recheck.py`), then
  `build_saisie.py`.
- **Between rounds — the state.** `loop_state.py <year> <zone>` lists **the open questions** (a sheet with no holder, an
  existence unknown, a divergence not settled, a holder on one fragile witness) and **the book queue**
  (`travail/a-lire.jsonl`: every book an agent wants read, with the question it answers and where it can be had).
- **Round 2 and after — reading and digging.** For every open question with a book that can be had: a reader
  (`book-reader`) per book, ten at a time; a question with no book left: a researcher on that question alone, the
  ladder from its last rung. A book behind a door (loan, BnF, JSTOR): read by me in his Chrome, when he is logged in.
  Each round ends with `build_saisie.py`: the deliverable grows round by round.
- **Talking while they work.** An agent writes to me (`SendMessage` to `main`) when it is stuck — a rung failed and it
  wants more turns, a book it cannot open, a reading it cannot tell apart — and when it finds a fact that settles
  another district. I answer at once: more turns or a book granted, a pointer to a work already filed, or « stop and
  list it ». A fact that settles another lot is sent to that lot's agent while it runs (as the Danishmend of 1100,
  read in Mélikoff, settles every Danishmendid town).
- **When it stops** — whichever comes first: **no open question left**; **a round that moved no question** (the books
  queued were read and the ladder climbed, nothing more to be had); **three rounds**; **the night's budget** (his share
  of the week, said at the start; ten agents by default). A divergence kept beside a most probable reading is a result,
  not an open question. `loop_state.py <year> <zone> <round>` says which, in the journal.
  The last `build_saisie.py` is the deliverable; what stays open is one French page, « J'AI BESOIN DE TOI », each case
  with the rungs climbed and the books that would answer.

## References

| file | holds |
| --- | --- |
| `references/rules-in-full.md` | every rule with its reason and the dev's words; the libraries and their search URLs (« The order », step 4); the gotchas |
| `references/reading-accounts.md` | the BnF, JSTOR and the other accounts: how to read there |
| `references/scanning.md` | scanning a paper atlas |
