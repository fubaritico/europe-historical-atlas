# 09 — When something is missing: the notices

> [Index](s00-index.md) · the plan: [`../07-robustness.md`](../07-robustness.md); the rule: `rules/error-handling.md` —
> **no refusal is silent**, and the severity of a failure is **declared per file, never inferred** from how it failed
> (`app/assetMessages.ts`). Two kinds of notice: **blocking** — there is no map; **degraded** — the map does less, and
> says what it lost.
>
> **Built** in September (roadmap 07), the words in French and English with ATLAS-159, the error net for anything no one
> caught with ATLAS-42. **Walked**: not by the dev on purpose — a failure is provoked by hand, and none was for these
> scenarios. The code: `atlas/src/app/assetMessages.ts`, `ui/notice.ts`, `ui/errorNet.ts`, `i18n/fr.json`.
>
> **To be replaced — the dev, 2026-11-08** (`rules/error-handling.md`, « The atlas shows a whole map or an error
> screen »): the toast at the bottom over the relief came from the setting-up time, before the screens of Claude Design.
> **Before the first map is shown**, any failure — the degraded ones too — turns the splash into an error screen saying
> where it broke, never a half-made map (**ATLAS-394**); **after it**, a later map's failure is told in a modal over a
> veil, with « Réessayer » when it is recoverable (**ATLAS-395**). The scenarios below describe the code as it is until
> then; they are rewritten with those tickets.

## A notice says what failed, then what is lost

Every notice reads « {what failed}. {what is lost} », the first part by the kind of failure:

| the file | could not be loaded | unreadable | incomplete | does not match this map |
| --- | --- | --- | --- | --- |
| relief | « Le relief n'a pas pu être chargé » | « … est illisible » | « … est incomplet » | « … ne correspond pas à cette carte » |

The same five endings for every file — « a échoué » for anything else — and under them a technical line, in English,
marked `lang="en"` so a French voice does not read it with French sounds (WCAG 3.1.2).

## Blocking

```gherkin
Scenario: the relief does not come
  Given the relief's file cannot be loaded
  When I open the atlas
  Then the splash stays
  And a notice reads « Le relief n'a pas pu être chargé. La carte ne peut pas être affichée. »
  And it has no close button — there is nothing behind it to go back to
  And a screen reader hears it at once, as an alert
```

```gherkin
Scenario: an error nothing else caught
  Given an error thrown, or a promise rejected, that no code handles
  Then a blocking notice reads « Une erreur inattendue s'est produite. La carte peut être incomplète. »
  And the error's own text under it
```

> **The error net** (ATLAS-42, `ui/errorNet.ts`), **no plan**: always blocking, because an unforeseen error leaves the map
> in a state nobody designed, and a close button would promise something intact behind the panel.

## Degraded

```gherkin
Scenario: the land mask does not come
  Given the land mask's file cannot be loaded
  Then the map shows, its coastline deduced from the elevation
  And a notice reads « Le masque des terres n'a pas pu être chargé. Le trait de côte est déduit de l'altitude : les
      polders néerlandais passent sous l'eau et les lacs fermés apparaissent comme des plaines. »
  And it has a close button, « Fermer », 32 px square
  And a screen reader hears it when the reader is between tasks, as a status
```

> **The declared degraded mode** the rule cites as its model: a blank canvas is not more honest than an approximate
> shoreline, only less useful — argued, decided, declared.

```gherkin
Scenario: the year does not come
  Given the year's files cannot be loaded
  Then the relief shows, without the countries and their borders
  And a notice reads « Les frontières historiques n'ont pas pu être chargées. La carte s'affiche sans les pays ni leurs
      frontières. »
  And the events still show — valid events are not hidden because another file did not come
```

> **The messages for the year's three files** — its registry, its polities, its borders' style — exist, each with what
> it loses (« Les pays s'affichent sans nom, sans rang et sans lien de vassalité… »), **and can never show**: every
> failure of a year is reported as the historical borders' (`loading/stages/political.ts`). [s99](s99-holes.md) A-09.

```gherkin
Scenario: the rivers do not come, or do not match
  Given the rivers' file cannot be loaded, or was drawn for another frame
  Then the map shows without them
  And a notice reads « Les fleuves n'ont pas pu être chargés. La carte s'affiche sans le réseau hydrographique. »
      — or « Les fleuves ne correspondent pas à cette carte. … »
```

```gherkin
Scenario: the events do not come
  Given the content file cannot be loaded
  Then the map shows without its events and its cities
  And a notice reads « Les événements n'ont pas pu être chargés. La carte s'affiche sans ses événements. »
```

> **The cities ride in the events' file** since 30/10, so they go with it — and the notice names the events only. Read
> from the code (`loading/`), not provoked. [s99](s99-holes.md) A-14.

## What this does not do

- **No retry**: a file that did not come stays missing until a reload (`07-robustness`'s « Still to do », ATLAS-154 in
  Backlog).
- **What only the console hears**: names that cannot be placed, a name's face or image that fails, a city or an event
  outside the frame — [s99](s99-holes.md) A-10.
- **The year's frame is never checked against the relief's**: `boundsMatch` exists and is not wired (ATLAS-143); a year
  drawn for another frame would slide off its relief, with no notice.
