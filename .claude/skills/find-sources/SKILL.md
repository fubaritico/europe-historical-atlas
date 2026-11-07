---
name: find-sources
description: The historian's deep research — for a claim about the past (who held a place at a date, a border, an event), search the open full-text libraries in a fixed order beyond Wikipedia, climb from every page to the work it cites, keep every reading even contradictory, quote each one verified in the text read, and hand the result to /enter-in-cms. Use when the dev gives a theme, a map, a list of towns or a question of holder (« qui tenait », « à qui appartenait », « vérifie », « recherche », « sources », « preuves », « croise »), and whenever a sheet rests only on Wikipedia or has no holder.
metadata:
  author: europe-map
  version: "1.0"
---

# Find sources — the historian's deep research

**Outcome**: for each claim, every source found that speaks to it — agreeing or not — each with the work, the place
in it (page, chapter), the source's own words, and how reliable it is; the most probable answer named; the claims that
rest on Wikipedia alone flagged as fragile. Written 2026-11-06 at the dev's request: *"a machine that goes and finds
sources online other than Wikipedia to support a fact — which polity a place belonged to at a date — so it must reach
texts"*, *"evidence, even contradictory, and bring back the sources."* What it finds is entered by `/enter-in-cms`;
the reasoning goes in the year's file (`files/plans/sources/1100.md`). Concepts: `files/plans/evidence-system.md`.

## The frame — never crossed

- **Nothing from memory.** What a model "knows" is not a source: it cannot be checked. Every fact comes from a text
  read in this session, and its quotation is copied from that text, never retyped from recollection. A name, a first
  name, a title, a publisher included (06/11: four authors and two titles typed from memory, two of them wrong).
- **A quotation is verified before it is kept**: found word for word in the downloaded text, or read by eye on the
  page image when the text is OCR. One that cannot be found is dropped and said — never "nearly" kept.
- **A divergence is kept, never settled.** Two readings are two lines. The most probable holder is named (the rule of
  `/enter-in-cms`), the others stay with their sources. Agreement is computed later, never claimed here.
- **Witnesses, not pages.** Sources that copy one another count once: a Wikipedia page and the book it cites are one
  witness (`copyOf`); the GEC and *Catalunya Romànica* share a publisher and count twice only with different authors.
- **Reading accounts are the dev's, used at a reader's pace** — see « Behind an account ». Never a bulk download,
  never a password in the conversation.

## The order — from the claim to its witnesses

1. **Name the claim and every name of the place.** Its names in each language it had (Latin, Arabic, Castilian,
   Catalan, Aragonese, Occitan, French, German…), the polity's names, the date and the neighbouring years. A search in
   one language misses the literature of the others (Siurana is *Šiurāna*; Lleida is *Lārida*, *Lérida*, *Ilerda*).
2. **Wikipedia is a map to the literature, not a witness to rely on.** Read the page in every language that has one;
   list the works its footnotes cite; those works are what the next steps look for.
3. **The dev's atlases on disk first** — `files/resources/other-historical-atlases-pdf/` (git-ignored; the list, each
   one's status and licence: `files/plans/sources/bibliotheque.md`). Extract their text into the scratchpad once per
   session (`pypdf` in a scratchpad venv; Read cannot render single pages without poppler, so split a scan into
   four-page PDFs and read each whole), search it for every name of the place, read the map's legend and date on the
   page image. Kind `historian-atlas`. **An atlas in copyright is a reference**: its facts are cited, its plates never
   traced (Shepherd 1911 and the 1909 *Atlas of European History* are public domain). Forgotten on 07/11 until the dev
   reminded me — the reason this step stands before the libraries.
4. **Search the open libraries, in this order**, stopping a library when it has given what it has:

   | library | what it holds | how to search it |
   | --- | --- | --- |
   | **Persée** — persee.fr | French journals, full text, free | `https://www.persee.fr/search?q=<words>` |
   | **OpenEdition** — openedition.org | French journals and books, free | `https://search.openedition.org/results?q=<words>` |
   | **Dialnet** — dialnet.unirioja.es | Spanish journals (*Príncipe de Viana*, *Aragón en la Edad Media*…), many in open PDF | `https://dialnet.unirioja.es/buscar/documentos?querysDismax.DOCUMENTAL_TODO=<words>` |
   | **RACO** — raco.cat | Catalan journals, free | in the browser (refuses scripts) |
   | **Institución Fernando el Católico** — ifc.dpz.es | Aragonese history, books in free PDF | `https://ifc.dpz.es/publicaciones` |
   | **Gallica** — gallica.bnf.fr | French books and chronicles, OCR text | in the browser (refuses scripts); its text mode per page |
   | **archive.org** | old books in the public domain: chronicles, nineteenth-century regional histories | `https://archive.org/advancedsearch.php?q=<words>&fl[]=identifier&fl[]=title&rows=50&output=json`, then the text: `https://archive.org/download/<id>/<id>_djvu.txt` |
   | **HathiTrust** — hathitrust.org | full-text search over millions of books, public-domain ones readable | in the browser (refuses scripts) |
   | **Google Books** | full-text search; extracts of recent books | in the browser |
   | **dMGH** — dmgh.de | the *Monumenta Germaniae Historica*, free | for the Empire |
   | **Biblioteca Virtual del Patrimonio Bibliográfico** — bvpb.mcu.es; **Biblioteca Digital Hispánica** — bdh.bne.es | Spanish old books and charters | the BDH in the browser |

   The region chooses the first stop: Spain → Dialnet, IFC, RACO; France → Persée, Gallica; the Empire → dMGH,
   Regesta Imperii (regesta-imperii.de, in the browser).
5. **Read the passage, not the abstract.** Download the text into its own folder of the scratchpad (`<theme>/<lot>/`),
   search it for every name of the place, read the paragraphs around each hit, copy the sentence. A book read by OCR:
   look at the page image before keeping a quotation whose letters are doubtful.
6. **When the sources stop short, climb** — the method is `/enter-in-cms` « When the sources stop short »: the polity
   that ended before the date → who replaced it → who held the place; a neighbouring town of the same district.
7. **Behind an account**, only for what the open libraries lack: JSTOR, then the others the dev opened
   (`references/reading-accounts.md`). In **his** Chrome, where he is logged in, one article at a time, read on screen
   (`get_page_text`, or the page image); the quotation and its page noted as for any other text. Never while he tests
   the Cartographer in the same browser.

## What comes back, per place

One block per place, in the lot's report (`scratchpad/<theme>/reports/<lot>.md`), in English:

```
## <place> — <date>
Most probable holder: <polity> (<QID>) — <one line why: n witnesses against m>
| holder read | work (author, title, year, publisher) | kind | where | quotation | verified |
Fragile: <yes — rests on Wikipedia alone / on one witness> | no
Not found / dropped: <a quotation that could not be checked, a lead that led nowhere>
```

`kind` is the CMS's: `primary`, `historian-atlas`, `scholarly`, `encyclopaedia`, `crowd-database`. Then
`/enter-in-cms`, and the divergences and the reasoning in the year's file.

## Agents, for a long list

A list of more than ten places goes to agents, **one lot per region of ten to fifteen places**, launched together
(never a Workflow without the dev's explicit opt-in). Each brief names this skill's path, the lot's places with their
names in every language, the folder to download into, and the report format above. Their quotations are re-checked by
me against their downloaded texts before anything is entered — an agent's confident line is not a verified one.

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
