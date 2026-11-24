> **Since the evening of 2026-11-23 every path of a research is on the archive disk** (`/Volumes/Acer/atlas-historien/`, `SKILL.md`, « The archive »): an older path below to `files/resources/historien/`, `files/plans/sources/` or the scratchpad is read as its place there.
>
> The rules of `/find-sources` in full, as they stood on 2026-11-23 before the skill was cut down to its orders: every rule with its reason and the dev's words. `SKILL.md` gives the orders; this file is read by section when a step is unclear. Where the two differ, `SKILL.md` wins.


# Find sources — the historian's deep research

**Outcome**: for each claim, every source found that speaks to it — agreeing or not — each with the work, the place
in it (page, chapter), the source's own words, and how reliable it is; the most probable answer named; a claim that
rests on Wikipedia alone is not an answer — it is listed as _to read_ (« The obligation », below). Written 2026-11-06 at the dev's request: _"a machine that goes and finds
sources online other than Wikipedia to support a fact — which polity a place belonged to at a date — so it must reach
texts"_, _"evidence, even contradictory, and bring back the sources."_ What it finds is entered by `/enter-in-cms`;
the reasoning goes in the year's file (`/Volumes/Acer/atlas-historien/1100/toutes-zones/resultats/questions.md`). Concepts: `files/plans/evidence-system.md`.

Where this research sits in the making of a year: the cities it sources settle the borders where the base layer and the
verification layers disagree — `/use-cartographer`, `references/layers.md`.

## The run, in order — nothing is read before step 0 is done (the dev, 2026-11-23)

> _"You are asked a task: you respect the constraints listed in the skill and you check that nothing contradicts
> itself. So before you even start on Wikipedia, there is the preparation. What do you have? What will you use, in
> which order? Then you start the task."_ — and: _"I want nothing in the memory. It does not work."_ **This skill is the
> only home of these rules**: never the auto-memory, never a resume point alone.

**Three phases, always** (the dev, 2026-11-23): **the setup** (step 0), **the execution** (steps 1 to 12), **the tear
down** (step 13). **The execution crosses the readings — it never starts from a city** (_"You do not start from the
city to do readings, you must cross your readings"_): the research goes from his axes to the works, and from a work
to the next; what one work says of a holder, a border or a date is set against what the others say of it, each
reading with its work and page. A city is what the crossed readings give — met in them, placed by them — never the
entry point of a reading.

0. **The setup — before any page is opened, Wikipedia included.**
   1. **The form — his axes, then his resources, one at a time** (the dev, 2026-11-23: _"It must really appear as a
      form in the terminal. Give me a resource, I give it. Give me an axis, I give it. Is there another axis? Until I
      tell you: that's it, I have no other axis."_). With the `AskUserQuestion` tool, never a question lost in a
      paragraph, one question per call, in French:
      - « Donne-moi un axe de recherche pour <la région, la date>. » — he writes it in the free field; the two
        options are « Je l'écris » and « Je n'ai pas d'autre axe ». **Asked again after each answer** (« Y a-t-il un
        autre axe ? ») **until he chooses « Je n'ai pas d'autre axe »** — never stopped by me, never two at once.
      - **after each axis, what I lack to follow it** (_"You can even ask me for names when I give you an axis: give
        me names of cities, names of things. Give me things, if you lack things."_): « Donne-moi des noms pour cet
        axe — des villes, des personnes, des lieux, des livres. », the same loop until « Je n'en ai pas d'autre ».
      - then, the same loop: « Donne-moi une ressource — un livre, une carte, un PDF, un lien. » until « Je n'ai pas
        d'autre ressource ».
      Each answer is written at once in the region's note (« Axes given », « Resources given »), in his words, and
      said in the journal. A resource given is opened first, before the six channels.
   2. Run `python3 -I .claude/skills/bulk-entry/scripts/prepare.py <year> <region>`: it says in the journal what is
      at hand (the note, his axes, the context, every PDF on disk, the attempts already made) and the order below.
   - **The context — what happened in the ten years before the date** (the dev, 2026-11-23: _"In the preparation
     of the research, the setup step, you must make yourself a briefing, a context of what happened the four or
     five years before, or even the ten years before."_). Before any question of holder or of existence is
     searched, I write for myself, in the region's note under « Context — the ten years before », the course of
     the region from the date minus ten to the date, year by year: the reigns and their changes, the campaigns and
     sieges, the conquests and losses, the treaties, the deaths and successions, who entered and who left. It is
     made after his axes are given, from what is at hand — Wikipedia as priming, the works on disk — each line
     with where it was read and nothing from memory; it validates nothing. It is what the research is read
     against: every event of it becomes a hypothesis of step 1 (a place taken in 1097 and lost in 1101 has two
     holders to tell apart), and a holder that the context makes impossible is a reading to re-read, not to
     enter. **The context is mine to build, always** (the dev, same day: _"I will not always have dates — the
     context, it is YOU who build it"_): it never waits for him and is never asked of him. When he does give
     points of context, they are leads noted in his words (« Context points given »), each checked in a work
     read inside the context I build — which then starts as far back as his points go.
     **The research is made from that context, and it is precise** (the dev, same day: _"you build the context
     from which you do your research on a date, on precise places, with precise actors, in precise cities"_).
     A line of the context is never a generality (« the Turks advance »): it names **the date** (the day when a
     work gives it), **the place** (the city, the fortress, the river, under the name the work writes), **the
     actors** (who took, who held, who commanded, who lost, each by name and title) and **the work and page**.
     From it the research is drawn as a list of precise questions — this city, at this date, held by this
     person, of whom — each then searched through the channels; a question the context cannot phrase that
     precisely means the context is not finished. `prepare.py` asks for
     the section while the note has no dated lines in it. A research is never
     started on the year alone.
   3. Give him the journal's command: `pnpm research-log`, one file a day in `/Volumes/Acer/atlas-historien/journal/`.
   4. **Check the constraints against the task**: reread « The obligation » and « The frame »; a constraint that
      contradicts the request, another constraint or `/enter-in-cms` is said to him **before** starting, never
      settled alone.
   5. Tell him, in a few lines: what I have, what I will use, in which order. Then start.
1. The names and the hypotheses — « The order », step 1.
2. Wikipedia, **priming only**, and the works its pages cite.
3. The PDFs on disk — each opened, or ruled out with its reason.
4. archive.org. 5. Gallica. 6. The BnF. 7. JSTOR — the last two in his Chrome; unreachable → **CONNEXION IMPOSSIBLE**.
8. In every work found: its index, the passage, its notes and bibliography — one to two degrees.
9. The region's note: holders by district, the chain, contrary readings, index references, attempts counted.
10. The blocked cases → **J'AI BESOIN DE TOI**, one readable French page; the valid cases go on.
11. `region_gate.py <year> <region>` — while it refuses, no holder is entered.
12. `/enter-in-cms`, then the message to the coder.
13. **The tear down — the last step, never skipped** (the dev, 2026-11-23: _"You remove everything that served the
    research. Too bad if you must redo a research that gives you the same elements. You must empty the disk, we
    cannot keep your research material. We do not have enough hard disks."_ — it replaces the rule of 2026-11-18
    that kept the register and the dated extracts). **What stays is the result only**: the base, and the region's
    note in git (holders, chain, contrary readings, index references, cities met, the attempts counted, each work
    with its pages). **Everything else goes**: the downloaded pages, texts and PDFs, the pages cut out of an atlas,
    the lot folders and entry files, the register and extracts of the region, the Python environment — all on the archive since 2026-11-23.
    Before deleting: the note holds every count and reference (read it back), `weak.json` and `pending.json` are empty
    or decided, the blocked cases are on their page. The list of what goes, with its size, is shown to him and **the
    deletion is asked of him each time** — a `rm -rf` is never mine to decide. Nothing of his is touched: his PDFs,
    his atlases, his maps. The journal says the tear down and what the disk gained.

Every step is said in the journal as it happens. The detail of each is below.

## The obligation — a holder is read in a book, and the attempts are counted (the dev, 2026-11-23)

> _"You must read. It is an obligation."_ — _"If there really is only one source, fine, but other things must have been
> tried. So the attempts may even have to be counted."_ Found that day: 3 529 of the 3 534 reads of the register were
> Wikipedia pages; the bibliographies were never climbed; Anatolia in 1100 contradicted every map he had seen.

- **Wikipedia is only the first layer, the one that primes a research — never a point of validation** (the dev,
  2026-11-23: _"It is only the first layer. It is not a point of validation. It is the priming of a research."_). It
  gives names, dates to check and works to read; nothing is validated by it, whatever the number of its pages that agree.
- **Our map is never a base to verify against** (the dev, 2026-11-23: _"We do not care whether the city is in the
  country drawn. What do you verify, on what base — on what we did, or on what the whole world did?"_). The reference
  is what the world wrote: the works read. The polity drawn under a place is neither an input of the research, nor a
  holder by default, nor a test of its result. The map is measured against the base afterwards
  (`pnpm cities:alerts`), never the base against the map.
- **Steps 2 to 9 of « The order » are all done, for every question of holder.** Stopping at Wikipedia is not a
  shorter research, it is no research.
- **A holder is never kept on Wikipedia alone, and never taken from the polity drawn on our map.** It needs a line from
  a work read in this session — `primary`, `scholarly` or `historian-atlas` — the passage read,
  not a footnote copied from a page. Until then the place has no holder line; it is listed as _holder to read_.
- **The existence of a place at the date is verified in a work too, as far as possible** (the dev, 2026-11-23, asked
  whether the existence needs a book as the holder does: _"yes, it must be verified as much as possible"_). For every
  place of a research, its existence at the date is looked for in the works read — the index, the passage, a map's
  legend — through the same channels as the holder, each attempt logged with the hypothesis « existence ». The
  sentence of a Wikipedia page is the priming here too. **Claude's reading of « as far as possible »** (not asked of
  him again): a place whose existence no work read attests is still entered on its dated Wikipedia sentence, listed
  in the region's note as _existence to read_ with its attempts counted — it is not refused, unlike a holder.
- **Every attempt is written down, the empty ones too**: one line per try in
  `/Volumes/Acer/atlas-historien/registre/attempts.jsonl` — the date, the place or district, the hypothesis, the library or
  the book (title, index entry, pages), its `degree` (0, 1 or 2 — step 7), the words searched, the result (`found`,
  `nothing`, `refused`, `not available`, `not relevant` with its `reason`). The fields are `region_gate.py`'s.
- **A holder with a single witness is accepted only with its attempts beside it**: the works the Wikipedia pages cite,
  the atlases on disk, the open libraries of the region, the BnF, and the notes and index of every book read — each
  tried and logged. Their count goes in the report and in the region's note. Which count is enough is not decided: the
  log is shown, he judges.
- **Everything is said in the journal as it happens** (the dev, 2026-11-23: _"I want logs — I am checking, I found
  this, I do that, the date"_): `/Volumes/Acer/atlas-historien/journal/<YYYY-MM-DD>.log`, which he follows with `pnpm research-log`. One dated
  French line before each source opened, after each thing found, at each decision —
  `python3 -I .claude/skills/bulk-entry/scripts/research_log.py say "…"`; an attempt is recorded **only** by
  `research_log.py attempt '<json>'`, which writes the register and the journal together. A script that fetches or reads logs
  the same way. Give him the `tail -f` command at the start of every research.
- **Ask him for his axes of research before starting** (the dev, 2026-11-23: _"I can give you a list of axes of
  research, which can change your way of searching. You can ask for it when I ask you to research something. You leave
  with a baggage, a list of clues."_). When he asks for a research, the first message back asks one thing: his axes —
  a campaign, a reign, a book, a map, a name, a doubt. They open the region's note, under « Axes given », as he said
  them; each becomes a hypothesis of step 1 and is searched through the six channels, its attempts logged with the
  axis named. An axis is a lead given, never a reading attributed to him; one that brings nothing is said. He has none:
  the research starts from step 1 alone.
- **A city named in a source read is a city to add** (the dev, 2026-11-23: _"In a source, reading, you will meet a
  reference to a city. See whether it exists today and what it is called, to be able to add it; then add it at the
  date asked in the research. It will also serve as a landmark."_). The cities of a year come from the reading, not
  only from a survey of today's towns by population. For each one met: (1) note the name as the source writes it,
  the work and the page; (2) find the place today — Wikidata, its present name, its point; a name not identified
  goes to the blocked cases, never guessed; (3) enter it at the research's date (`/enter-in-cms`: the place under
  today's name, the name of the time as a `period-names` record read in that source, the sheet with the book's line);
  (4) list it in the region's note under « Cities met in the sources » — a landmark for the borders.
- **The works on disk are known, all of them, and used** (the dev, same day: _"You must have the exhaustive list of
  the PDFs on disk. You must know them. They must be used."_): `prepare.py` lists the folder anew at every research —
  a file he added is in it — and `/Volumes/Acer/atlas-historien/bibliotheque.md` says what each is. A file on disk missing from
  that table is added to it before the research starts; a file never opened is opened once, its contents and its
  index of maps noted in the table (region, period), so that the next research knows what it covers.
- **Six channels, all compulsory, for every region** (the dev, 2026-11-23: _"Nothing must make these steps jump"_):
  Wikipedia **and the works its pages cite** (notes, « Sources », « Bibliography »), the PDFs on disk, archive.org,
  Gallica, the BnF, JSTOR. A library is always searched — it may answer `nothing`, it is never « not relevant ».
- **The BnF or JSTOR cannot be reached — stop, in capitals** (the dev, 2026-11-23: _"You stop and you write in block
  capitals, connection impossible. You leave the flow, you tell me, we start again."_). At the first search of a
  research there — in **his** Chrome, never while he tests an application in it, and after reminding him to check he
  is logged in (`references/reading-accounts.md`; I never click « Me connecter ») — check the session is logged in; if
  it is not, or the site refuses: write **CONNEXION IMPOSSIBLE**
  with the library's name — in the journal (`research_log.py say`) and as the first words of the message to him — and **stop the
  research there**. No other channel is carried on meanwhile, nothing is entered, the attempt is not counted
  (`region_gate.py` accepts only a search that really ran, `found` or `nothing`, for these two). He logs in; the
  research starts again at that channel.
- **I cannot find it — stop, in capitals, and ask him** (the dev, 2026-11-23: _"When you cannot find something, the
  same: you stop, in block capitals, I need you. I need suggestions."_). When the six channels have given no work read
  for a question, when a work every source cites cannot be obtained, or when the readings cannot be told apart: write
  **J'AI BESOIN DE TOI** — in the journal and as the first words of the message — then, in a few lines, the question,
  what was tried (the attempts and their count) and what is missing. **That case stops there**: no holder guessed, no
  fallback on Wikipedia or on the map. He suggests a book, a map, a lead; the case starts again from it.
  **The work is by cases, so the valid cases go on** (the dev, same day: _"you have valid cases — bring me back
  something readable, for pity's sake readable, with simple questions, so that I can answer"_). The blocked cases come
  back together in one French page, `/Volumes/Acer/atlas-historien/<year>/<zone>/resultats/besoin-de-toi.md`, opened for him
  (never a JSON, never a path alone): **one block per case, four lines at most** — the place and the date; what is
  not known, in one sentence; what was tried, in one line with the count; **one simple question**, answerable by a
  word, a choice between named readings, or a title to give. No table, no jargon, no second question in a block.
- **Only a single work is ruled out as not relevant, and by these tests alone — proposed by Claude, to be confirmed**:
  (1) its title, table of contents or list of maps does not cover the region; (2) nor the period, the date and the
  fifty years before it; (3) once opened, its index has none of the names of step 1 — place, district, each candidate
  holder. One test met is enough; it is written as the attempt's `reason`. In doubt, the work is opened.
- **The district before the place**: the holder of a region is read once, in the works on the region and its period (a
  reconquest, a campaign, a reign), written in the region's note with its index references, then given to the places.

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
3. **The atlases on disk first** — `/Volumes/Acer/atlas-historien/bibliotheque/` (git-ignored; the list, each
   one's status and licence: `/Volumes/Acer/atlas-historien/bibliotheque.md`). Extract their text into the research's `travail/` on the archive
   (`pypdf`, run by `/Volumes/Acer/atlas-historien/outils/py`; Read cannot render single pages without poppler, so split a scan into
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

5. **Read the passage, not the abstract.** Download the text into the work's folder of the archive (`ouvrages/<work>/`),
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
   4. **Write each reference down before reading it**, in the region's note (`/Volumes/Acer/atlas-historien/<year>/`, a table
      _Index references_: book, entry, pages, hypothesis, given or deduced, read or not). Nothing is read twice, nothing
      found is forgotten; a reference never read is said in the report.
   5. **Read every page it gives** — step 5: the passage, the sentence copied, verified on the text or the image.
   6. **Index after index** (the dev: _"index (+ index)"_): an entry pointing to a source — a charter, a chronicle, a
      study — is a new book, whose own index is read the same way, and so on; Wikipedia starts the same chain, its
      footnotes giving the first books (step 2). **The depth is one to two degrees, when the books can be had** (the
      dev, 2026-11-23 — it replaces Claude's stopping rule of 2026-11-09): degree 0 is a work Wikipedia cites or a
      channel gives; degree 1, a work its notes, bibliography or index point to; degree 2, a work those point to.
      Each attempt carries its degree; a degree not reached is said, with why.
8. **When the sources stop short, climb** — the method is `/enter-in-cms` « When the sources stop short »: the polity
   that ended before the date → who replaced it → who held the place; a neighbouring town of the same district.
9. **Behind an account — the BnF in every lot** (the dev, 2026-11-08: _"I pay for that subscription. We have to use it,
   a lot"_; on 07/11 three lots were done with no BnF line): search `bdl.bnf.fr` for each lot, beside the open libraries,
   not only for what they lack; then JSTOR and the others the dev opened
   (`references/reading-accounts.md`). In **his** Chrome, where he is logged in, one article at a time, read on screen
   (`get_page_text`, or the page image); the quotation and its page noted as for any other text. Never while he tests
   the Cartographer in the same browser.

## Keep what was read — for every year (the dev, 2026-11-18) — **replaced on 2026-11-23 by the tear down (step 13)**

**Since 2026-11-23 nothing of the research material is kept**: what follows describes the register and the extracts
as they were, and holds only until the tear down of the research in progress.

A source read for one year is read once. Before reading, look in `files/resources/historien/extraits/<q>.json` and
`registre/reads.jsonl` (what was already read for the place). After reading: append the read to `registre/reads.jsonl`
(url, place QID, year asked, date), and copy into `extraits/<q>.json` **every sentence that carries a date about the
place, whatever the year** — the one that answers today and those that will answer 1200 or 1300. Then the downloaded
copy is deleted at the end of the run: the disk is lent (`.claude/roles/historian.md`). Layout and steps at scale:
`/bulk-entry`.

## What comes back, per place

One block per place, in the lot's report (`<year>/<zone>/travail/<lot>/report.md` on the archive), in English:

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
and reused: read the year's register `/Volumes/Acer/atlas-historien/<year>/toutes-zones/resultats/vassalage.md` before a lot, extend it after.

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

- **A tool's noise is removed, never read** (the dev, 2026-11-23: _"if the warnings drown the output, you remove them,
  you stay on your research"_): `pypdf` prints a font warning per page on some PDFs (the Palgrave atlas: 9 000
  characters of them before the first useful line) — run every PDF read with `2>/dev/null`, and cap the output.

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
