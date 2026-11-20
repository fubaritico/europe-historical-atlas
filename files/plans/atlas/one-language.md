# One language over the whole map — ATLAS-448

> The dev, 2026-11-15: on the atlas, everything must be in one and the same language. Today a French browser shows
> the seas in French and the countries in English. This file is the inventory the ticket asks for first, written
> 2026-11-20 from the code and the data, and the decisions that follow from it. Its steps are the ticket's checklist.

## Where the language comes from

`packages/atlas/src/main.ts:214-218`: `pickLocale(navigator.languages)` gives the page's locale. It sets the page's
`lang`, builds the translator over `atlas/src/i18n/{en,fr}.json`, and is handed to the layers. **Only two things read
it: the translator and the sea names.** The code that writes the countries, the cities and the frame never receives it.

## The inventory — every text the atlas writes, 2026-11-20

| text | where it comes from | follows the page's language? | French browser / English browser |
| --- | --- | --- | --- |
| the seas (8 names) | `core/src/data/seaNames.ts`, both languages required by the type | **yes** | MER DU NORD / NORTH SEA |
| the countries, full names | `years/<year>/registry.json` `name` → `core/data/shortName.fullNameOf` → `atlas/src/loading/namesRequest.ts` | **no** — one language in the file, no locale goes in | English / English |
| the countries, short names | `shortName`, else the name minus its title — a rule that knows English titles only (`shortName.ts:14`) | **no** | English / English |
| the tribes and the peoples | the same registry entries | **no** | English / English |
| the names placed at the build | `years/<year>/names.json`, frozen in the registry's language | **no** | English / English |
| the cities | `content/atlas.json`, read as `place.name.fr` — written so in `scene/events/mapEventLayer.ts:72` | **no** — French by code | French / French |
| the frame's degrees (`30°O`) | `scene/sheet/frameLabels.ts:57-61` | **no** — French letters by choice | `°O` / `°O` |
| the compass rose's winds (N NE … SO O NO) | `scene/decor/rose/compassRoseSvg.ts:205` | **no** — French | French / French |
| the sheet's title, « EUROPE HISTORICAL ATLAS » | `core/src/utils/lettering.ts` → `scene/sheet/mapTitle.ts:27` | **no** — English | English / English |
| the splash, « Europe » / « Historical atlas » | `ui/splash.ts:233-234`, the same lettering | **no** — English | English / English |
| the page's `<title>` | `index.html:6` | **no** — English | English / English |
| the loading captions | the catalogue, through the translator (`loading/stages/startup.ts`) | **yes** | French / English |
| the percentage, `42 %` | `ui/progressOverlay.ts:155` — the space before `%` is French typography | **no** | `42 %` / `42 %` |
| a notice's sentence, « Réessayer », the close button's name | the catalogue (`app/assetMessages.ts`, `app/mapUi.ts`) | **yes** | French / English |
| a notice's technical detail | the error's own words, tagged `lang="en"` on purpose (`ui/notice.ts:129`) | **no, by decision** | English / English |
| the year switch | the years as numbers; its group's name from the catalogue | **yes** | — |

**Written nowhere today**: an event's title or description, a river's name, a year's provenance and licence
(ATLAS-152). Their data is single-language too — an event's fields are French only.

## What the data holds

- **Countries**: 95 in 1000, 158 in 1100, 112 in 1200, 116 in 1300 — **481 names, English, with a few French or
  Catalan ones mixed in** (« Tripoli des Banu Ammar », « Jablé », « County of Pallars Jussà »). The year's format
  (`core/src/data/yearFormat.ts`) has **no field for a second language**.
- **477 of the 481 carry a Wikidata id** (all of 1000, 1200 and 1300; 154 of 158 in 1100), and the Cartographer
  already reads Wikidata's labels in French and English for its form (`wikidata/wikidataFacts.ts`).
- **Cities**: 116 on the atlas, **French only** — 0 with an English name. The content's format already has the two
  languages (`name: { fr, en }`, `en` nullable).
- **Events**: 11, their titles, types and descriptions French only; one type is named « Conquest », in English, in
  its French field.

## The gaps, by size

1. **The countries' names** — the reported symptom, and the largest: a format change (a name per language), the
   Cartographer's form, the short-name rule, the names placed at the build (one file per language), and 481 names to
   write in French.
2. **The cities' names** — small in code (read the page's language, say what is shown when it is missing), 116
   English names to enter in the CMS, most of them the same word.
3. **The fixed letterings** — the degrees, the winds, the title, the splash, the page's title, the percentage: six
   places, each a catalogue entry or a choice to keep (a 17th-century sheet is lettered in one language whatever
   its reader).
4. **Decided, not a gap**: a notice's technical detail stays English.

## Decisions

| # | question | decision | by |
| --- | --- | --- | --- |
| 1 | Which language is « the one language »? | the page's — the browser's, French or English — as the ticket says | the dev, 2026-11-15 |
| 2 | Who writes the 481 French names of the countries? | _open_ — proposed: taken from Wikidata's French label (477 have an id), written into the year's file by a script, corrected by hand in the Cartographer where wrong | — |
| 3 | What does a French page show for a country with no French name? | _open_ — proposed: its English name, and the Cartographer lists the names still missing | — |
| 4 | What does an English page show for a city with no English name? | _open_ — proposed: its French name (most cities bear one name in both) | — |
| 5 | The frame's letterings (degrees, winds, sheet title): the page's language, or the sheet's own? | _open_ | — |

## Steps (to become the ticket's checklist once the decisions are taken)

1. The year's format carries a name per language (`name` kept as the English one; a French one beside it), read by
   both applications; the short-name rule knows French titles.
2. The Cartographer's polity form has a field per language.
3. The French names proposed from Wikidata, written by a script, listed for the dev to read as a French text.
4. The atlas writes each country's name in the page's language; the names placed at the build, one file per language.
5. The cities in the page's language.
6. The fixed letterings, as decided.
