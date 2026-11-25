# The historian's oracle — catalogue, index and local RAG of the books on Acer

> Epic **REPO-538**, opened 2026-11-25 at the dev's request: _"catalogue, index and have a RAG for all this volume of
> books, and be able to re-index when a year is finished"_ — in **TypeScript**, so that he can read the code; all of
> it on the external disk, the historian's allocated space. Run by the historian end to end, without him; he is
> notified when it is done.

## 1. Why

- **516 books** filed in `/Volumes/Acer/atlas-historien/ouvrages/` (745 MB of text) and 25 atlases in `bibliotheque/`.
- **The cost**: `/usage` of 25/11 puts the research agents at 42 % of the plan, most of it re-reading long book texts
  in their context. An index returns only the passages that matter.
- **The duplicates**: nothing stops an agent downloading a book already filed under another name.

## 2. Decisions

| decision | why | by |
| --- | --- | --- |
| TypeScript, Node 24, no Python | the dev must read the code | the dev, 25/11 |
| Everything on Acer: code `outils/oracle/` (own local git), data `oracle-data/`, model `outils/ollama-models/` | the disk is the research's allocated space; nothing on the Mac | the dev, 23/11 and 25/11 |
| Structure from `vite-mf-monorepo-rag` (indexer, retriever, MCP `recall()`), its MongoDB Atlas replaced by local SQLite | the books are mostly in copyright: nothing leaves the machine (REPO-501) | the dev's example; the local store mine |
| `node:sqlite` with FTS5 (words) + `sqlite-vec` (meaning), one file | no server; hybrid search is surest for proper names spelt ten ways | mine |
| `bge-m3` (1 024 dims, multilingual) through a dedicated Ollama on port 11435 | the books are in French, German, Latin, English, Turkish; the dev's own Ollama (11434) stays untouched | mine, download agreed by the dev |
| A passage found is never a proof: it says where to read; the quotation is re-read in the book | the evidence system | REPO-501 |

## 3. Measured

- `bge-m3` on the dev's M2: **≈ 6.6 passages of 1 500 characters a second** → ≈ 500 000 passages ≈ **21 hours**,
  machine time only, no plan cost.
- Page marks are rare in the texts (≈ 120 in all, five forms); most passages cite their line, not their page.
- 8 folders without `fiche.md`; the archive.org id written four ways; one probable duplicate (Anderson 1922, t. 2).

## 4. The plan — tickets in order

| # | ticket | what | done when |
| --- | --- | --- | --- |
| 1 | **REPO-510** | `catalog build / has / dupes`; `archive.py work` and `find_book.py` refuse a book already filed | a filed book asked again is found and not downloaded |
| 2 | **REPO-501** | `index build` (FTS5, incremental), `embed` (resumable), `search` (names + Wikidata aliases), `recall` (hybrid, RRF), MCP server | « qui tenait Gibelet vers 1200 ? » returns Du Cange-Rey's passages with their book and line |
| 3 | **REPO-539** | the oracle in the method: MCP registered for the historian and its agents; `catalog has` before any download, `search`/`recall` before opening a filed book; re-index at the end of each zone | the next zone of 1200 searches through it |
| 4 | **REPO-540** | `embed` of the whole corpus in the background, the zones of 1200 first, resumed after every stop | every passage has its embedding |

Build by one Sonnet agent (scripts, not historical judgement); the historian reviews, runs the tests, commits in the
oracle's own git, and moves each ticket with its dates. Steps 1–3 before the night's research resumes; step 4 runs
under it.

## 5. After it

The night's research resumes with one team of at most 3 agents (the dev, 25/11): Scandinavia, Hungary-Poland, Rus',
the Maghreb, then the JSTOR/BnF/Gallica catch-up of Anatolia and the two Empires. **Gallica** refuses scripts
(Cloudflare): the historian searches it through the site's page in the dev's Chrome. The dev is notified at the end
of the plan, and at a ceiling of 25 % of the week.
