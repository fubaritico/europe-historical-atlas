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
- Never start a reading from a city: cross the works; the cities come out of them.
- Never skip a channel. Never enter a holder while the gate refuses. Never delete without his word.
- Never end a research without filing it in the archive; never fetch again what the archive already holds.
- Never settle a divergence: two readings are two lines, each with its work and page.

## The run

**Setup — before any page is opened, Wikipedia included**

0. `archive.py check` — the archive disk is mounted, or **DISQUE ABSENT** and stop. Read `ouvrages/index.md` and,
   when it exists, `<year>/<zone>/fiche.md`: what is already read is not fetched again. `archive.py open` the research.
   The base already has sheets for this region at this date: « A region already researched », step 1, first.
1. Create the region's note `files/plans/sources/<year>/<region>.md` (sections: Axes given, Resources given,
   Context points given, Context — …, Hypotheses, Holders by district, The chain of vassalage, Index references,
   Cities met in the sources, Existence to read, Attempts).
2. **The form** (`AskUserQuestion`, one question per call, in French): « Donne-moi un axe de recherche », again
   until « Je n'ai pas d'autre axe »; then « Donne-moi une référence — un livre, une carte, un PDF, un lien »,
   again until « Je n'ai pas d'autre référence ». What he already gave in his message is not asked again. Write
   each answer in the note at once, in his words. **What he gives are mostly references of books** (from the
   videos he watches, which give him no summary): **they prove nothing** — they help: sources to read, context,
   words, vocabulary, names, dates **to verify**. He gives nothing: start without.
   **Every item given goes to `<year>/<zone>/donne/`, numbered in the order given** (`01-…`, `02-…`): a file
   (screenshot, map, PDF) is copied there — never moved, his original stays where it is; a list or a text is
   written there as a `.md`. Each has its line in the note's « Resources given »: what it is, where it comes
   from, what I read on it (a map: title, date, legend, names), what it gives to verify, its state. I look at
   every image myself; a name I cannot read is written « illegible », never guessed.
3. `log.py say` the research; give him once: `tail -f files/resources/historien/journal.log`.
4. `prepare.py <year> <region> <zone>`: what is at hand (the archive included), the order, what is still to do.
5. **Build the context myself**: the ten years before the date — further back when his points go further — year by
   year, in the note. Every line names **the date, the place, the actors, the work and page**. No generality.
   His points are checked in it; a point that a work contradicts is said with the work's reading.
6. From the context, list **the precise questions**: this city, at this date, held by whom, of whom.
7. Reread « Never ». A rule that contradicts the request is said to him before starting.

**Execution — each step said in the journal before and after; every attempt by `log.py attempt`**

8. Names and hypotheses: every name of each place and actor in each language; every holder ever put forward.
9. Resources he gave — opened first.
10. Wikipedia, every language: priming only. List the works its pages cite (`cited_works.py`).
11. The PDFs on disk (`files/resources/other-historical-atlases-pdf/`): each opened, or ruled out with its reason
    (title, period, index — one test is enough). Text and map legends. `pypdf` with `2>/dev/null`.
12. archive.org: `find_book.py search "<title> <author>"`, then `find_book.py get <identifier> <folder>`.
13. Gallica.
14. The BnF, then JSTOR — in his Chrome, never while he tests an app there. Not logged in or refused:
    write **CONNEXION IMPOSSIBLE**, stop everything, nothing counted.
15. In every work read: the index for every name, the passage, the notes and bibliography → the next works.
    One to two degrees. Each index reference written in the note before it is read.
16. A city named in a work: identify it today (Wikidata), list it under « Cities met in the sources », enter it.
17. The existence of each place at the date: looked for in the works too, as far as possible. None found: the
    place stays on its Wikipedia sentence, listed « Existence to read ».
18. The chain above each holder, each link with its own witness (`files/plans/sources/<year>/vassalage.md`).
19. Write the note: holders by district with work, page, quotation; contrary readings; attempts counted.
20. A question the six channels did not answer, a work that cannot be had, readings that cannot be told apart:
    **J'AI BESOIN DE TOI** — that case stops, the others go on. All blocked cases on one French page,
    `files/resources/historien/<year>/<region>/besoin-de-toi.md`, opened for him: per case, four lines at most
    and one simple question.
21. `region_gate.py <year> <region>`. Refused: back to the missing channel.
22. `/enter-in-cms`, then the message to the coder.

**Archive and tear down — never skipped**

23. File everything in the archive (« The archive ») with `archive.py`: `work` for each work read, `read` for each
    reading, `given` for what he gave, `note`, then `close`. Read each `.md` back.
24. Then empty the internal disk: list what goes, with sizes (`inventory.py`), show it, ask him, delete on his
    word — downloads, lot folders, the environment, the scratchpad. Wikipedia pages are not archived.
    The base, the note in git and the archive stay.

## The archive — `/Volumes/Acer/atlas-historien/`

The external disk the dev lends so that a research serves the next ones. **What can serve again is at the root;
what belongs to one year and one zone is under that year.** French names; what a person reads is a `.md`.

```
atlas-historien/
├── LISEZ-MOI.md              how it is filed, one page
├── ouvrages/                 REUSABLE — one folder per work, once: <author>-<year>-<short-title>/
│   ├── index.md              every work: author, title, what it covers (regions, centuries), the researches it served
│   └── <work>/               fiche.md · texte.txt · livre.pdf · pages/p-<n>.png
└── <year>/<zone>/            ONE RESEARCH
    ├── fiche.md              what was asked, when, where it stands, what is left
    ├── donne/                what the dev gave, numbered
    ├── recherches/           lectures.md · essais.md · journal.log
    └── resultats/            extraits.md · note-de-region.md (a copy; the original is in git)
```

- `<work>/fiche.md`: author, title, publisher, year, kind, in copyright or not, where found and when, its
  contents and index, the pages read and for which research.
- `recherches/lectures.md`: one line per reading — work (its folder), pages, question, result. It never copies a
  work, it points to it; the work's `fiche.md` lists the research in return.
- `recherches/essais.md`: every attempt — channel, words, found or nothing.
- `resultats/extraits.md`: every sentence kept — work, page, quotation, what it bears on.
- A work in copyright is marked so: its facts are read, its plates and images never reused in the atlas.

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

4. **Re-read every old quotation of a work** in its text. Not found word for word: remove the line.
5. **Report in the note**: sheets confirmed, corrected, emptied of their holder, deleted. Then the export,
   `pnpm cities:alerts --map <year>`, the message to the coder.

Region by region, when each is redone — never the whole base at once. Before the first region: ask the coder
what the Cartographer and `cities:alerts` do with a sheet that has no holder.

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

None without his number. Research on Opus (`subagent_type: "source-researcher"`, lots of 10–15 places), entry on
Sonnet. I re-check every quotation an agent brings. Detail and costs: `references/rules-in-full.md`, « Agents ».

## References

| file | holds |
| --- | --- |
| `references/rules-in-full.md` | every rule with its reason and the dev's words; the libraries and their search URLs (« The order », step 4); the gotchas |
| `references/reading-accounts.md` | the BnF, JSTOR and the other accounts: how to read there |
| `references/scanning.md` | scanning a paper atlas |
