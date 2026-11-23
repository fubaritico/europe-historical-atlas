# Names are contributed — the name of the time and the name of today

> The dev, 2026-11-21, while looking at ATLAS-448 (one language over the map) and watching a documentary on the
> Komnenian reconquest of Anatolia: _"We have a deeper problem with names. […] When a city is declared, the base
> should hold its present name, today, in 2026, and the name it had at the time of the sheet. […] We must find a
> real way to contribute names. […] A first layer of verification based on the Wikidata id, but we must be able to
> contribute it."_ His example: Ankara, « Ancyre » in French and « Ancyra » in English in 1100.
>
> This file is the design; progress is read on the board. It replaces decision 2 of
> `files/plans/atlas/one-language.md` (French country names written into the year's file from Wikidata), which the
> coder proposed and withdrew the same day.

## What the base holds — measured 2026-11-21, read-only

| what | where | state |
| --- | --- | --- |
| a place's name | `places_locales.name`, one per language | 13 684 in French, **4 in English**; the one name is sometimes the name of the time (place 67 is « Ancyre », place 12 « Constantinople »), sometimes today's — nothing says which |
| a dated sheet's name | `place_periods.title`, one language | a label built from the place's name (« Ancyre — 1100 »), not a name |
| a place's present country and region | `places.country_name`, `region_name` | present-day, one language |
| a territory's name | `territories_locales.name` | 378 in French, **0 in English**; 336 territories carry a Wikidata id |
| a drawn country's name | `years/<year>/registry.json` `name` | 481 names, English, 477 with a Wikidata id — a second home for the same fact |
| the link from a drawn country to a CMS territory | `core/data/territoryMatch` (CARTO-450): Wikidata first, else the CMS ID | exists, used for the chains |
| Wikidata's French label | measured over the 290 distinct ids of the four maps | 271 have one, 19 do not; several are wrong for a map (« archidiocèse de Cologne » for the archbishop's lordship, « dynastie Yuan en Chine ») — and the CMS already carries « archidiocèse de Cologne » |

## Decisions

| # | question | decision | by |
| --- | --- | --- | --- |
| 1 | Where is a name written? | in the contribution (the CMS), not in the year's file | the dev, 2026-11-21 |
| 2 | Which names does a city have? | its **present name** (2026) and **the name it had at the time of the sheet** | the dev, 2026-11-21 |
| 3 | What does the map write? | the name of the time, alone: « Ancyre » on the map of 1100 | the dev, 2026-11-21 |
| 4 | What does the city's detail show, on click? | the name of the time stays the title, the present name in parentheses beside it: « Ancyre (Ankara) » | the dev, 2026-11-21 |
| 5 | What is Wikidata's part? | a first layer of verification, by the id; the name itself is contributed | the dev, 2026-11-21 |
| 6 | Where does each name live in the base? | the place bears its **present name** (« Ancyre » becomes « Ankara », so the sheet « Ancyre — 1100 » becomes « Ankara — 1100 »); the dated sheet has a field for the **name of the time**, per language — its French one « Ancyre » | the dev, 2026-11-21 |
| 6b | Is the name of the time a field or a record? | **a record of its own table**, pointed to by one more field of the dated sheet's form, **and created on the fly from that form** — the same process as a vassal that does not exist yet: it is created, its person is created, the person is sourced, the source is added (CMS-422). _"This kind of contribution on the fly […] is fundamental."_ | the dev, 2026-11-21 |
| 6c | How many languages? | a **table of correspondence per language** for each name — French and English today, Spanish, Italian, German tomorrow — never a fixed pair | the dev, 2026-11-21 |
| 6d | How far do we go now? | **the whole of it, now**: _"What we do today we will not have to do tomorrow"_ — no debt left to pay once several years are contributed | the dev, 2026-11-21 |
| 6e | The shape of the record | one record is one name a place bore — the place, the table of its forms (a language, the form; one form a language, another spelling is another record) and its source lines (source, where, quotation, the name as written). **No date on it**: the sheets that point at it say when — the sheets of 1100 and of 1200 point at the same record, as two sheets point at one title. Built so, 2026-11-21 (`cms/src/collections/PeriodNames.ts`) | the coder — to be confirmed by the dev on sight |
| 7 | What can Wikidata verify? | _proposed_: the present name only — it knows no dated name; a name of the time is verified by its source | the coder, proposed — not decided |
| 8 | The countries | **the names of the time and the names by language concern the cities and the territories alike**, and *"for a territory, one name a language is enough"* — no present name against a name of the time (the dev, 2026-11-22). Built so: the territory's French name stays its field « Nom », which the titles and the chains read; its names in the other languages stand in a table under it, one line a language, all seen together (`cms/src/collections/Territories.ts`, `otherNames`); the export carries them (`names`). **Not built yet**: the map reading them — and what it writes for a territory with no name in the reader's language, which is the dev's to say (`rules/error-handling.md`). A name that changes over a territory's life is not modelled | the dev for the rule; the shape by the coder, to be seen by the dev |
| 9 | A sheet has no name of the time | *"We write the place's name as it is today, yes. But it must be possible to control it."* — so the map writes the place's name; a name of the time with no form in the reader's language counts as none for that reader (`core/data/cityName`). The control: the list of the places whose name differs from Wikidata's (`noms-a-trier.md`), run again after each entry | the dev, 2026-11-22; the control's form proposed by the coder |

## Where it stands — 2026-11-21, on the coder's tree, not yet in `main`

| step | state |
| --- | --- |
| the register « Noms d'époque » (`period-names`), its migration (up and hand-written down proved on a copy of the base: 13 684 places, 13 671 sheets and 17 696 source lines before and after), opened to the MCP | done — `672f64b9` |
| the field « Nom d'époque » in the dated sheet's form: the names of the sheet's place only, « + » creates one in a drawer, removing the place empties it | done — `d7700d84`; tried through the API of a CMS of the coder's on the copy, **the drawer itself not seen in a browser** |
| the export carries each city's name of the time (content format 10), and one rule names a city for the atlas and the Cartographer: the name of the time in the reader's language, else the place's name | done, 2026-11-22 |
| the present name on the place and the sort of the 13 684 names | to do |
| the territories' names in the other languages: the table, its migration (the four English names already entered copied into it; proved up and down on a copy), the export | done on the coder's tree, 2026-11-22 — not in `main` while the historian draws there |
| the rule that names a drawn country from the contribution, and the control of what is still to tie or to translate (`core/data/polityName`: the territory's name in the reader's language, else its French one, else the map's own — the origin said) | done on the coder's tree, 2026-11-22 |
| the atlas and the Cartographer writing countries by that rule | to do — see « The countries, measured » |

**Two rules the code holds that the dev did not dictate** (said to him, his to strike): a sheet takes only a name of its
own place; a name sheets cite cannot move to another place. **Known limit**: the drawer « + » opens an empty form — the
place is chosen again in it (Payload's field hands no initial value to its drawer).

## The countries, measured — 2026-11-22

The dev, the same night: *"what is available by default, but everything will have to be translated — there can be no
missing name."* Measured on the three maps of the repository against the CMS's 380 territories:

| map | countries | tied to a territory of the CMS | tied to none |
| --- | --- | --- | --- |
| 1100 | 164 | 117 | 47 |
| 1200 | 112 | 44 | 68 |
| 1300 | 116 | 30 | 86 |
| all | 392 | 191 | 201 |

- **Half the drawn countries are tied to no territory**: the distant ones (40), the tribes (19), and most of 1200 and
  1300, whose territories were never entered — the register was filled from the holders of the cities of 1100. Each
  needs its territory before the contribution can name it; until then the map writes its own name, as today.
- **123 territories can be given an English name from the maps themselves** (the drawn country's own name, by the
  tie); 5 of them bear two different English names from one map to another, to be read.
- **What the wiring still asks**: the short name's rule knows English titles only (`data/shortName`: « Kingdom of » —
  not « royaume de »), a short name entered by hand on a map is in one language, the names placed at the build are
  one file a year (one a language is needed), and the atlas's own file carries no territory yet.

## The Cartographer adds a country to the CMS — the dev, 2026-11-22

> *"If we move that whole feature, careful. […] The advantage is that we have only one source of truth. […] The
> Cliopatria maps save us a lot of time, they carry all this information. […] The case where we create a new
> political entity and it is not in the CMS: the search tool stays in the sheet. If a result is found with a Wikidata
> id, we say « Add to the CMS », and that makes a contribution request to the CMS. And the error cases must be
> handled: if the CMS is not running, « you must start the CMS »."* And: *"The CMS will be online, the Cartographer
> will be online — everything will be online. Cross-domain authorisations will be needed; sub-domains, no doubt."*

| # | what | decision | by |
| --- | --- | --- | --- |
| A | Where is the Wikidata search? | it **stays** in the Cartographer's country sheet (name, start and end dates, as today) | the dev |
| B | A country the CMS does not know | a button **« Ajouter au CMS »** on a Wikidata result: a contribution request that creates the territory; the CMS answers its number, written on the country at once — the tie needs no export | the dev; the answer's use proposed by the coder |
| C | One source of truth | the CMS; the map still carries the information, as an imported Cliopatria map does | the dev |
| D | Who wins when both hold a name and dates? | _proposed_: once a country is tied to a territory, its sheet shows the CMS's values, not editable, with a link to the CMS; an untied country stays editable; the control of the names lists the gaps between the map's copy and the CMS | the coder, proposed — not decided |
| E | The errors | _proposed_: the CMS not reached → a dialog « the CMS is not running: start it, then try again », nothing written on the map; the territory exists already (same Wikidata id) → not an error, the country is tied to the one that exists, and it is said; the session or the rights refused → a dialog saying so; the CMS refuses the record → its own sentence | the dev for « the CMS is not running »; the rest proposed by the coder |
| F | Online | everything will be online, on sub-domains (the Cartographer's, the CMS's). Two sub-domains are two origins: the CMS must list the Cartographer's among its `cors` and `csrf` origins (Payload has both settings — verified in its types, 3.92). So the request is made **as the contributor signed in to the CMS**, never with a key held by the Cartographer's local server: one path for a machine and for the site | the dev for online; the path proposed by the coder |
| G | The 201 countries tied to no territory | _proposed_: a script making the same request in a batch, its list given in French to be read — a click a country is for the new one | the coder, proposed — not decided |

**An export from the CMS's own screen** (the dev, the same night: *"always this principle of on the fly, a chain of
gestures […] a fixed footer with the button « export the base », I do not know"*): a button of the admin runs the
export the script runs. _Proposed place_: the top right of every page of the admin, where Payload lets an application
put its own buttons (`admin.components.actions`, verified in its types) — seen from every screen, with no footer to
build. **Online, the export cannot write the atlas's folder** (no disk is shared with the site): there it serves the
two files, or asks for the site to be built again — to design with the going online (CMS-228). The button does not
commit the files: the coder still does.

## What it asks, in order (to become tickets once 6 to 9 are decided)

1. **The CMS's fields** — a present name on the place, a name of the time on the dated sheet, both per language; a
   migration that adds and removes nothing (`packages/cms/README.md`, proven on a copy).
2. **Sorting the 13 684 existing names** — which are of the time, which are today's: Wikidata's label against the
   entered name gives a first sort (equal → today's; different → to read), the historian settles the rest.
3. **The export** carries both names; its format's version moves.
4. **The atlas** writes the name of the time in the page's language; the detail on click, when it exists
   (ATLAS-155), writes « name of the time (present name) ».
5. **The countries** — the English names of the territories, the drawn countries read through their link; what the
   Cartographer's form shows and edits.
6. **ATLAS-448** closes on this: one language over the map is the page's, read from contributed names.

## Not settled, to keep in sight

- **A name of the time is a claim** (`files/plans/evidence-system.md`): sources may disagree on it (Ancyra, Ankyra,
  Angora), and a city under two cultures has two names at one date. The model must hold several, one chosen, the
  others kept — no side path.
- **Which language's name of the time?** « Ancyre » is the French historians' form of a Greek name; the name its
  inhabitants used is a third thing. The dev's example fixes the rule for now: the form used in the page's language.

## Decided on 2026-11-22, in the afternoon — by the dev

- **A name is found by an id, and several translations answer that id** — a place's or a territory's present name in
  French, in English, in any language added later (_"what is not clear in that?"_). The storage follows it; it is not a
  question to bring back to him.
- **A translation field that exists is never left empty** (_"one must not think of the field being empty, the field
  must be filled; a catch-up is needed — or one does not create a translation field"_). No fallback, no stand-in label
  (one was coded and removed before any commit): the missing names are filled, then the name becomes required in every
  language.
- **The catch-up**: the English name read from Wikidata by each record's id (`files/spikes/english-names/`); what
  Wikidata does not name, and the 58 territories with no Wikidata id, go to the historian once his current work is done.
  Measured that day: 11 places of 13 717 and 8 territories of 396 had an English name.
- **Done on 2026-11-23** (`files/spikes/english-names/write_names.py`, proved on a copy, then on the dev's base after a
  copy in `packages/cms/.backups/`, one transaction, additions only): 14 050 ids read, 13 547 places and 311
  territories given Wikidata's English label — 13 558 places of 13 717 and 319 territories of 396 now have one. Left to
  the historian, in French, `noms-anglais-a-faire.md`: 159 places and 21 territories Wikidata names in no English, 56
  territories with no Wikidata id, 60 English place names carrying a qualifier (« Jesenice, Omiš ») or not in English,
  and the 311 territory names to read — Wikidata sometimes names something else than the polity (« Roman Catholic
  Archdiocese of Cologne »).
- **Required, 2026-11-23**: a territory's table requires a line in every language the site is read in but French
  (`validateOtherNames`, core's `LOCALES`: English today), the others optional (`8f89e26f`). **A place gets the same
  table** — the dev's choice that day, against a control without refusal: the admin shows one language at a time, so a
  required English localized row would have broken the creation of a place, his and the historian's (the MCP's tools
  take one locale a call — plugin-mcp 3.92, `tools/resource/create.js`). One shared field (`fields/otherNames.ts`); the
  migration `place_other_names` copies the 13 558 English rows into it (proved on a copy, up and down, the export
  identical name for name); the export reads a place's English name from the table. « Nom » is French alone since the same evening (the dev: _"finish it"_): the migration `plain_french_names` adds the
  column, copies each French name, then drops the two tables of translations — nothing points at them, nothing
  cascades, their English rows already in the tables of other names; proved on a copy, up and down.
- **By me, to be kept or lifted by him**: the same rule extended to the five other collections whose name is translated
  (people, confessions, event types, importance reasons, siege engines).
- **The people and the four registers, the same evening** (the dev: _"finish it"_): their name French alone, their
  other languages in the shared table, English required — the migration `plain_french_register_names`, written by
  hand over the generator's output, proved on a copy up and down, the export identical. 391 people of 519 have an
  English line; the 128 others are in `noms-anglais-a-faire.md`. **Left**: the events' title and description, still
  translated; the seed (`known-issues/cms.md`).
- **Every name filled, the same evening** (the dev: _"I want it to end"_): the 364 names Wikidata does not give — a
  place keeps its own name, territories and people translated by the coder (`files/spikes/english-names/`
  `translations.json`) — and the eleven events' English title and description; three event types' French labels
  corrected. No English name is empty. The historian rereads.
