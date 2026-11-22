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
