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
| 6 | Where does each name live in the base? | _proposed_: the present name on the place (once, per language); the name of the time on the dated sheet (per language), with its source like the holder | the coder, proposed — not decided |
| 7 | What can Wikidata verify? | _proposed_: the present name only — it knows no dated name; a name of the time is verified by its source | the coder, proposed — not decided |
| 8 | The countries | _proposed_: the same rule — the name is contributed on the CMS territory, per language, and the drawn country reads it through its link (`territoryMatch`) instead of bearing its own | the coder, proposed — not decided |
| 9 | A name of the time is missing in the page's language | _open_ — an error-handling decision (`rules/error-handling.md`), to bring to the dev with its alternatives | — |

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
