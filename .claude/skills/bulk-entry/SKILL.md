---
name: bulk-entry
description: The historian's large entry — hundreds or thousands of places of one year and one region put in the CMS by agents, in ten fixed steps (candidates, place data, reading and register, dated extracts, sorting by index, entry files, entry by agents, script check, clean-up), on a disk that is lent and must stay tidy. Use whenever a whole region, a pool or a list of more than ~50 places is to be entered for a year (« plus de villes », « tous les villages », « saisis la région », « vivier », « lots », « agents de saisie »), and before any wave of agents.
when_to_use: For one place or one deep question, use /find-sources then /enter-in-cms instead. This skill wraps them at scale.
metadata:
  author: europe-map
  version: '1.0'
---

# Bulk entry — a region of a year, at scale

**Outcome**: every place a source attests at the year is in the base, each with the page's own sentence as its line and
the holder title of the polity drawn under it; the run is checked by script against the base; what will serve again
(the reading register, the dated extracts, the verdicts, the notes) is kept; the downloaded copies are deleted. Written
2026-11-18 from the night of 17–18/11 (1 389 places of western Germany, two waves of 8 agents) and from the dev's call
that day: _"the disk is lent — it must stay tidy, never cluttered or saturated"_ (`.claude/roles/historian.md`).

The rules of entry are `/enter-in-cms`'s and the rules of reading `/find-sources`'s; this skill only orders them at scale.

## The layout — always the same

```
files/resources/historien/
├── outils/                 local launchers only (start-cms.sh); the method's scripts are this skill's scripts/
├── registre/               reads.jsonl — one line per page or book read: url, q (place), year asked, date read
├── extraits/               <q>.json — every dated sentence read about the place, any year, with its url
└── <year>/<region>/<lot>/  cand.json, meta.json, tri-*.json, verdict-*.json, wave*/enter-*.json, result-*.json
```

Nothing of mine lies flat in `files/resources/`; nothing of the dev's is moved.

## The ten steps

| #   | step                                                                                                                                                                                                                           | output                            | how                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------- |
| 0   | **Before**: write the resume point in `next-historian.md`; ask the dev **the number of agents** (and give the cost: ~150–250 k tokens per agent, ~1 % of his week per million); check the CMS answers (his server)             | a resumable run                   | —                         |
| 1   | **Candidates**: a list from Wikidata (QLever) or a pool; drop a QID already in the base and a point within 1.5 km of a sheet of the year (one sign per place)                                                                  | `cand.json`                       | `cand.py`                 |
| 2   | **Place data**: name (fr, else de/en label — **Wikidata's label is the present name: the name of the time is checked in the sources at step 3**, `/enter-in-cms` « The place »), country, region (the CMS rule: P17, first-level division of P131*), polity drawn under the point (`under.mts`), its holder title of the year (the most used title of that polity) | `meta.json`                       | `meta.py`                 |
| 3   | **Reading**: the **rendered** page, once, through the REST API (`/api/rest_v1/page/html/`, 4 threads); each read appended to `registre/reads.jsonl`                                                                            | `rend/` (temporary)               | `fetch_rest.py`           |
| 4   | **Dated extracts**: every sentence of the page carrying a year about the place, **whatever the year**, into `extraits/<q>.json` — the memory shared by all years                                                               | `extraits/`                       | `extract_backfill.py`     |
| 5   | **Sorting**: agents (Sonnet) read up to 5 dated sentences per place and return **the index** of the one proving the place at the year, never a copied sentence; I read 25 random yes and 8 no per lot before going on          | `verdict-*.json`                  | the sorting prompt below  |
| 6   | **Entry files**: the quotation is the exact rendered sentence, found by script (exact, else difflib ≥ 0.85 and carrying the year); the weak ones I judge myself                                                                | `wave*/enter-*.json`, `weak.json` | `mkv.py`                  |
| 7   | **Entry**: agents (Sonnet), one file each, through the MCP only, in series, a result file each                                                                                                                                 | the base                          | the entry prompt below    |
| 8   | **Check**: the base against the files (quotation, title, line, name, region); fix by `update`; `pnpm cities:alerts --map <year>`; one message to the coder (ids, form, counts)                                                 | `bad.json` empty                  | `verifyv.py`, `fixcut.py` |
| 9   | **Clean-up**: keep `registre/`, `extraits/`, verdicts, entry and result files, notes; **delete `rend/` and every downloaded copy** — asked of the dev each time                                                                | a few MB                          | —                         |

Before any year after the first: read `extraits/` for the places first — what was read for 1100 often already says who
held the place in 1150 or 1200. Go back to a source only for what the extracts lack.

## The prompts

**Sorting** (one agent per lot of ~290): accept a sentence that says the place was mentioned, given, sold, founded, built,
destroyed, or that a church, castle or manor stood there, at a stated year ≤ the cut-off; refuse another place, a district,
a family « von X » alone, a later date, a guess (« vermutlich », « soll », « könnte ») without an attested mention, finds
without a medieval mention, a jubilee, a table, a forgery; in doubt, no. Output `{q: {v, i, year}}`, every place once.

**Entry** (one agent per file): find the source by url, else create it (publisher « Wikipedia (de) », kind encyclopaedia,
licence cc-by-sa); find the place by QID — a sheet of the year already there: skip; else create the place (location as an
object) and the sheet (importance « city », holderTitle, one line subject « importance », the quotation copied exactly);
never delete; a mistyped quotation is **noted, never updated by the agent** (the classifier refuses it — I fix it).

## Gotchas

- **Wikipedia's extracts API answers 429 to bulk reads** (~6 pages a minute, 18/11); the REST API gives the same sentences
  (98 % word for word, measured) at ~15 a minute. Never reuse a previous response after a failed request.
- **Cutting sentences**: « n. Chr. », « a. d. », « u. a. », « 29. Oktober », « 13. Jahrhunderts » are not sentence ends;
  « Chr. » can be one. A single lowercase letter followed by a point never ends a sentence (`mkv.py`, `split`).
- **Never import a script that writes files** (importing `sentences.py` would rewrite the sorting lots): copy the function.
- **Every value copied by hand** — by an agent or by me — passes the script check; two of mine and two of theirs were wrong
  on 18/11. An agent's « created 67 » can be a miscount: the check decides, not the report.
- **A wave's files go in their own folder** (`wave1/`, `wave2/`) before the next build, or the builder overwrites them.
- **The sorting can accept a neighbour**: « Als erste Ohligser Hofschaften wurden 980 n. Chr. Barl … » proves Barl, not
  Ohligs. A wrong sheet of mine I delete myself (sheet, then place, then source — `/enter-in-cms`), never left to the dev.
- **Wikidata keeps a former P131 beside the current one, and `meta.py` takes the first first-level division it meets**
  (19/11: Selezivka entered under « oblast de Kiev », its page and its point say Zhytomyr; Bryn under « oblast de
  Moscou », Kaluga by its page). Read each region against the page's first sentence before entry; a place Wikidata ties
  to no division keeps an empty region, never a guessed one.
- **`extract_backfill.py` splits sentences for German and English only**: on a Russian page it kept one paragraph and lost
  the dated sentence (Vytatchiv, 19/11). For another script, split with that language's rules and write `extraits/` from
  that split, the quotation checked inside each file.
- **Two downloads at once are throttled** by Wikipedia (42 pages in a quarter of an hour, 19/11): one at a time, the
  best-documented candidates first (sitelinks), and stop at the density asked (memory `enough-cities-not-all`).
- **Local wikitext is not a quotation**: it may serve the sorting, never the line — the line is the rendered sentence.
- **The clean-up comes after the last record of the run, never before**: on 18/11 the copies were deleted while 25 weak
  cases and 10 pages were still open, and `mkv.py` rewrote `weak.json` — 35 pages to download again. Before step 9:
  `weak.json` and `pending.json` empty or decided, every wave checked.

## Scripts — `scripts/`, run with `python3 -I`, the lot folder first

| step | command                                                               | reads → writes                                                                                                                                   |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `cand.py <lot> <pool.json> <year>`                                    | a pool (list of `{q, lon, lat, url}`) → `cand.json`                                                                                              |
| 2    | `meta.py <lot> <year>` (calls `under.mts` and `titlemap.py`, Node 24) | `cand.json` → `meta.json`                                                                                                                        |
| 3    | `fetch_rest.py <lot> <list.json>`                                     | QIDs → `rend/<q>.json` (resumes)                                                                                                                 |
| 4    | `extract_backfill.py`                                                 | every `rend/` and `wiki/` under `historien/` → `extraits/`, `registre/reads.jsonl`                                                               |
| 5    | `sentences.py <lot> <year>`                                           | `meta.json` + pages → `tri-a..h.json`                                                                                                            |
| 6    | `mkv.py <lot> <year>`                                                 | verdicts + `rend/` → `enter-va..vh.json`, `pending.json`, `weak.json` — move them to `wave<N>/` at once                                          |
| 8    | `verifyv.py <lot>/wave<N> <year>`, then `fixcut.py <lot> <year>`      | the base (read-only) vs the files → `bad.json`, `fixcut.json`                                                                                    |
| 9    | `inventory.py`                                                        | the disk → `historien/LISEZ-MOI.md`: per folder, what is kept and what is waste, measured; shown to the dev before he agrees to delete the waste |

Tried on 18/11 against the run they come from (`historien/1100/regions/germany-west-1100-research/lot-v/`, its folders
`wave1..3/` and verdicts kept as the worked example). `extract_backfill.py` rebuilds the register and the extracts from every page on disk: run it at the end of each run,
after the entry and **before** the clean-up.
