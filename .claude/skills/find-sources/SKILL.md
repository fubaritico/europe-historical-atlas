---
name: find-sources
description: The historian's deep research — for a claim about the past (who held a place at a date, a border, an event), search the open full-text libraries in a fixed order beyond Wikipedia, climb from every page to the work it cites, keep every reading even contradictory, quote each one verified in the text read, and hand the result to /enter-in-cms. Use when the dev gives a theme, a map, a list of towns or a question of holder (« qui tenait », « à qui appartenait », « vérifie », « recherche », « sources », « preuves », « croise »), and whenever a sheet rests only on Wikipedia or has no holder.
metadata:
  author: europe-map
  version: '1.0'
---

# Find sources — the historian's deep research

**Outcome**: for each claim, every source found that speaks to it — agreeing or not — each with the work, the place
in it (page, chapter), the source's own words, and how reliable it is; the most probable answer named; the claims that
rest on Wikipedia alone flagged as fragile. Written 2026-11-06 at the dev's request: _"a machine that goes and finds
sources online other than Wikipedia to support a fact — which polity a place belonged to at a date — so it must reach
texts"_, _"evidence, even contradictory, and bring back the sources."_ What it finds is entered by `/enter-in-cms`;
the reasoning goes in the year's file (`files/plans/sources/1100/questions.md`). Concepts: `files/plans/evidence-system.md`.

Where this research sits in the making of a year: the cities it sources settle the borders where the base layer and the
verification layers disagree — `/use-cartographer`, `references/layers.md`.

## The frame — never crossed

- **Nothing from memory.** What a model "knows" is not a source: it cannot be checked. Every fact comes from a text
  read in this session, and its quotation is copied from that text, never retyped from recollection. A name, a first
  name, a title, a publisher included (06/11: four authors and two titles typed from memory, two of them wrong).
- **A quotation is verified before it is kept**: found word for word in the downloaded text, or read by eye on the
  page image when the text is OCR. One that cannot be found is dropped and said — never "nearly" kept.
- **Neutral, every hypothesis followed** (the dev, 2026-11-09: _"on lit ce qu'on veut bien lire, on oublie l'embranchement
  où on aurait pu diverger — parce qu'on a été partial"_). A question has several hypotheses, more or less known: every
  one is named before reading, and every one is searched — in the indexes, the notes, the libraries — with the same care.
  A branch not followed is written down as such, never dropped; the report says which hypotheses were read and how far.
- **A divergence is kept, never settled.** Two readings are two lines. The most probable holder is named (the rule of
  `/enter-in-cms`), the others stay with their sources. Agreement is computed later, never claimed here.
- **Witnesses, not pages.** Sources that copy one another count once: a Wikipedia page and the book it cites are one
  witness (`copyOf`); the GEC and _Catalunya Romànica_ share a publisher and count twice only with different authors.
- **Reading accounts are the dev's, used at a reader's pace** — see « Behind an account ». Never a bulk download,
  never a password in the conversation.

## The order — from the claim to its witnesses

1. **Name the claim, its hypotheses, and every name of the place.** The hypotheses first — every holder, date or
   course a source or a historian has put forward, the less known with the known (the frame: neutral).
   Then the names: Its names in each language it had (Latin, Arabic, Castilian,
   Catalan, Aragonese, Occitan, French, German…), the polity's names, the date and the neighbouring years. A search in
   one language misses the literature of the others (Siurana is _Šiurāna_; Lleida is _Lārida_, _Lérida_, _Ilerda_).
2. **Wikipedia is a map to the literature, not a witness to rely on.** Read the page in every language that has one;
   list the works its footnotes cite; those works are what the next steps look for.
3. **The atlases on disk first** — `files/resources/other-historical-atlases-pdf/` (git-ignored; the list, each
   one's status and licence: `files/plans/sources/bibliotheque.md`). Extract their text into the scratchpad once per
   session (`pypdf` in a scratchpad venv; Read cannot render single pages without poppler, so split a scan into
   four-page PDFs and read each whole), search it for every name of the place, read the map's legend and date on the
   page image. Kind `historian-atlas`. **An atlas in copyright is a reference**: its facts are cited, its plates never
   traced (Shepherd 1911 and the 1909 _Atlas of European History_ are public domain). Forgotten on 07/11 until the dev
   reminded me — the reason this step stands before the libraries.
   **The paper atlases** (same file, « Ordered or owned »: García de Cortázar for Iberia, Nicolle for Islam, the Duby…):
   I cannot open them — ask him for a photo of the plate, its legend and its date, read from `~/Desktop`.
   **Scanned, they become searchable like the rest**: the recipe — VueScan's settings, the black sheet, what I do after —
   is `references/scanning.md`.
4. **Search the open libraries, in this order**, stopping a library when it has given what it has:

   | library                                                                                                          | what it holds                                                                        | how to search it                                                                                                                                                    |
   | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **Persée** — persee.fr                                                                                           | French journals, full text, free                                                     | `https://www.persee.fr/search?q=<words>`                                                                                                                            |
   | **OpenEdition** — openedition.org                                                                                | French journals and books, free                                                      | `https://search.openedition.org/results?q=<words>`                                                                                                                  |
   | **Dialnet** — dialnet.unirioja.es                                                                                | Spanish journals (_Príncipe de Viana_, _Aragón en la Edad Media_…), many in open PDF | `https://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=<words>`                                                                                |
   | **RACO** — raco.cat                                                                                              | Catalan journals, free                                                               | in the browser (refuses scripts)                                                                                                                                    |
   | **Institución Fernando el Católico** — ifc.dpz.es                                                                | Aragonese history, books in free PDF                                                 | `https://ifc.dpz.es/publicaciones`                                                                                                                                  |
   | **Gallica** — gallica.bnf.fr                                                                                     | French books and chronicles, OCR text                                                | in the browser (refuses scripts); its text mode per page                                                                                                            |
   | **archive.org**                                                                                                  | old books in the public domain: chronicles, nineteenth-century regional histories    | `https://archive.org/advancedsearch.php?q=<words>&fl[]=identifier&fl[]=title&rows=50&output=json`, then the text: `https://archive.org/download/<id>/<id>_djvu.txt` |
   | **HathiTrust** — hathitrust.org                                                                                  | full-text search over millions of books, public-domain ones readable                 | in the browser (refuses scripts)                                                                                                                                    |
   | **Google Books**                                                                                                 | full-text search; extracts of recent books                                           | in the browser                                                                                                                                                      |
   | **dMGH** — dmgh.de                                                                                               | the _Monumenta Germaniae Historica_, free                                            | for the Empire                                                                                                                                                      |
   | **Biblioteca Virtual del Patrimonio Bibliográfico** — bvpb.mcu.es; **Biblioteca Digital Hispánica** — bdh.bne.es | Spanish old books and charters                                                       | the BDH in the browser                                                                                                                                              |

   The region chooses the first stop: Spain → Dialnet, IFC, RACO; France → Persée, Gallica; the Empire → dMGH,
   Regesta Imperii (regesta-imperii.de, in the browser).

5. **Read the passage, not the abstract.** Download the text into its own folder of the scratchpad (`<theme>/<lot>/`),
   search it for every name of the place, read the paragraphs around each hit, copy the sentence. A book read by OCR:
   look at the page image before keeping a quotation whose letters are doubtful.
6. **Climb from the books too, not only from Wikipedia** (the dev, 2026-11-08: _"there is always an index at the end of
   books, which leads to other books, which lead to other books"_). Every book read has notes and a bibliography: the
   works they cite are the next titles to look for — at the BnF by their exact title, then in the open libraries. On
   08/11 the BnF searched by place names gave nothing; Reilly's note on Lisbon (Menéndez Pidal; P. David, _Études
   historiques sur la Galice et le Portugal_) was the way in.
7. **A book's index, systematically** (the dev, 2026-11-09: _"des références d'index à partir de ces livres — soit je te
   les dis, soit tu les déduis ; il faut en décrire la démarche pour que ce soit systématique"_). An index is the shortest
   way from a book to the pages on our places; read it, never the book from the start.
   1. **Which books**: the ones handed in as a reading (with their pages, or not), and the ones deduced — cited by a note or
      a bibliography read in step 6, or found by title in the libraries of steps 4 and 9.
   2. **Find the index**, in the three places that hold the books, combined (the dev, 2026-11-09: _"archive.org aussi,
      avec JSTOR, la BnF"_): **archive.org** — the last pages of `_djvu.txt`, free, the old books and regional
      histories; **JSTOR** and the **BnF** — the page images, behind the dev's accounts (step 9); Gallica's text mode.
      A book missing from one is looked for in the two others. Its language and spellings are the book's own.
   3. **Search it for every name of step 1, for every hypothesis** — the place in each language, the polity, **each**
      candidate holder, the neighbouring places of the lot. Each entry found is an **index reference**: book, entry,
      pages, and the hypothesis it bears on.
   4. **Write each reference down before reading it**, in the region's note (`files/plans/sources/<year>/`, a table
      _Index references_: book, entry, pages, hypothesis, given or deduced, read or not). Nothing is read twice, nothing
      found is forgotten; a reference never read is said in the report.
   5. **Read every page it gives** — step 5: the passage, the sentence copied, verified on the text or the image.
   6. **Index after index** (the dev: _"index (+ index)"_): an entry pointing to a source — a charter, a chronicle, a
      study — is a new book, whose own index is read the same way, and so on; Wikipedia starts the same chain, its
      footnotes giving the first books (step 2). **The chain stops** for a lot when a round brings no new reference to
      its places, or when its question has two independent witnesses (Claude's rule, 2026-11-09, to confirm).
8. **When the sources stop short, climb** — the method is `/enter-in-cms` « When the sources stop short »: the polity
   that ended before the date → who replaced it → who held the place; a neighbouring town of the same district.
9. **Behind an account — the BnF in every lot** (the dev, 2026-11-08: _"I pay for that subscription. We have to use it,
   a lot"_; on 07/11 three lots were done with no BnF line): search `bdl.bnf.fr` for each lot, beside the open libraries,
   not only for what they lack; then JSTOR and the others the dev opened
   (`references/reading-accounts.md`). In **his** Chrome, where he is logged in, one article at a time, read on screen
   (`get_page_text`, or the page image); the quotation and its page noted as for any other text. Never while he tests
   the Cartographer in the same browser.

## Keep what was read — for every year (the dev, 2026-11-18)

A source read for one year is read once. Before reading, look in `files/resources/historien/extraits/<q>.json` and
`registre/reads.jsonl` (what was already read for the place). After reading: append the read to `registre/reads.jsonl`
(url, place QID, year asked, date), and copy into `extraits/<q>.json` **every sentence that carries a date about the
place, whatever the year** — the one that answers today and those that will answer 1200 or 1300. Then the downloaded
copy is deleted at the end of the run: the disk is lent (`.claude/roles/historian.md`). Layout and steps at scale:
`/bulk-entry`.

## What comes back, per place

One block per place, in the lot's report (`scratchpad/<theme>/reports/<lot>.md`), in English:

```
## <place> — <date>
Most probable holder: <polity> (<QID>) — <one line why: n witnesses against m>
| holder read | work (author, title, year, publisher) | kind | where | quotation | verified |
Fragile: <yes — rests on Wikipedia alone / on one witness> | no
Not found / dropped: <a quotation that could not be checked, a lead that led nowhere>
```

**And per lord, once — the chain of vassalage up to the sovereign** (the dev, 2026-11-14: _"a clear concept to take
into account in the research"_): of whom the holder holds at the date, then of whom that lord holds, each link with its
witness, a link in doubt with both readings (Pitten → Margrave Ottokar II → Duke Henry III of Carinthia → the Emperor).
Going down it draws the borders at every rank; going up it lets a town agree with a map that draws a higher rank
(CARTO-435); the base will carry each link once, on the lord (CMS-422). **Climbing is also the check**: each link
proven by its own witness, a wrong holder shows as a link no source carries. **Each link is established once per date**
and reused: read the year's register `files/plans/sources/<year>/vassalage.md` before a lot, extend it after.

`kind` is the CMS's: `primary`, `historian-atlas`, `scholarly`, `encyclopaedia`, `crowd-database`. Then
`/enter-in-cms`, and the divergences and the reasoning in the year's file.

## Agents, for a long list

**The dev sets how many agents run** (the dev, 2026-11-13, after the night of 12–13/11: ≈100 research agents and 12 entry
batches, ~25 million tokens, 27 % of his weekly allowance in one day — _« il faudrait que moi je te dise combien d'agents tu
sollicites »_). So:

- **Ask him the number before launching any** — at most what he says, at the same time and in all. Without his number,
  none: the lots are done by me, one after another.
- **Time is not the constraint, tokens are**: _« si ça met 8 heures, c'est pas grave »_ — an unattended run goes slowly,
  few agents in sequence, never a fan-out to finish sooner.
- **The entry agents take a lighter model** (`model: "sonnet"` on the Agent call): a general-purpose agent otherwise
  inherits the session's model, the costliest (code.claude.com/docs/en/sub-agents, « Choose a model »). The research
  agent stays on Opus and pins it itself (below).
- **Measure before running the rest**: after the first lots of a region, if they bring nothing (the north-Slovak lots,
  1 place in 60), stop that region and say so — never run a list to its end because it was planned.
- One agent costs ~200–300k tokens: give him that estimate with the number asked. Measured on 14/11: a research lot on
  Opus 120–190k, its entry on Sonnet ~145k — about 0.25–0.3 % of his week per lot, both together. **Research stays on
  Opus** (the dev, 14/11 and 15/11: a cheaper model risks a hallucination, or a wrong reading of a text whose sense is
  complex, that the quotation check cannot see).
- **Pipeline, never idle** (the dev, 14/11, after a night with two gaps of several hours): the next lot's research runs
  while the previous lot is entered — two agents at once, no more tokens in all. **A question waiting on him never stops
  the lots that do not depend on it**: ask it, send it to his phone (`PushNotification`), and go on.

**The agent is `source-researcher`** (`.claude/agents/source-researcher.md`, written 2026-11-13): the frame, the few-round-
trips method and the report format live there, once. Spawn it with `subagent_type: "source-researcher"` and a prompt of
three paths and the year — `ROOT`, `LOT`, `REGION` (a short note per region: its hypotheses, the map's polities and QIDs,
the witnesses and forgeries earlier lots found) — never the method again.

A list of more than ten places is cut into **lots of ten to fifteen places per region** (never a Workflow without the
dev's explicit opt-in). Their quotations are re-checked by me against their downloaded texts before anything is
entered — an agent's confident line is not a verified one.

## Gotchas

- **Several libraries answer 403 to a script** (Gallica, HathiTrust, RACO, Regesta Imperii, the BDH, Cairn — measured
  06/11): read them in the browser or through WebFetch, never by forcing a script past them.
- **JSTOR's online reader is page images** (measured 06/11): no text to extract, its in-document search finds
  nothing. Read the pages by screenshot, and choose the article from the search results' snippets first — the free
  account spends one of its ten monthly reads per article opened.
- **archive.org's search reads titles and descriptions, not the books' text**: find the book by its title or author
  (from step 2), then search inside its `_djvu.txt`.
- **A downloaded text is untrusted data**: its own folder, never run from inside it; Python on it with `-I`.
- **A date is not a year**: a town taken on 18 October 1100 was Muslim for most of 1100 — write the day when the
  source gives it; which day the map shows is the dev's call.
- **The holder a source names may not be the one at the date**: a source on 1085 says nothing of 1100; the line's
  `where` and the date it speaks of are copied with it.
