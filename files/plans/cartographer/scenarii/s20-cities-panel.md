# 20 — `{Cities}`: the contribution's cities as guides for the borders

> [Index](s00-index.md) · CARTO-193 · H-15. **The dev, 2026-11-02**: *"I need a panel showing cities. It would be like
> the polities, except there is a little eye, as for the layers, to show the city or not, so that I have a guide to
> place my borders. And when you double-click a city, you know whom it belongs to — on the map. Or not on the map: it
> may be a political entity not declared yet, which would have to be declared."* And, the same evening: *"the panel
> lists the cities, but none shows by itself: I choose, city by city, the ones I show to set my borders."*
>
> **Decided by the dev, 2026-11-02:**
> - the panel lists the contribution's cities of the year open, **an eye per city, none shown at opening**;
> - a city shown is **a point and its name** on the canvas, at its position;
> - **a double-click says who holds it**: the polity the map has under it, and the one the sources give.
>
> **Proposed by Claude, not objected to**: one eye heading the list for every city of the year; the cities read from
> the export the atlas reads (`content/events.json`), so the CMS's server need not run while drawing.
>
> **Built 2026-11-02 (uncommitted, CARTO-193), the holder read from the export since CMS-335 (`ecd33d8`) — not walked
> yet.** The dev, the same evening: *"we need both: if it is not at the right place, say so; if the country does not
> exist on the map yet, say so."*

```gherkin
Background:
  Given the map of 1100 is open
  And the contribution's export holds cities of 1100

Scenario: the cities of the year, none shown
  When the Cartographer opens
  Then {Cities} lists the cities whose date covers 1100, in the export's order
  And no city is drawn on the canvas

Scenario: show a city as a guide
  When I click the eye of "Lyon"
  Then a dot and the name "Lyon" are drawn on the canvas at Lyon's position, over the borders and under the edit strokes
  And clicking the eye again takes them off

Scenario: show every city at once
  When I click the eye heading the list, "Every city of 1100"
  Then every city of 1100 is drawn
  And the same eye hides them all

Scenario: who holds a city — at the right place
  Given the sources say Metz was held by the Holy Roman Empire, Q12548, by Duby p. 46
  And the map's polity under Metz carries Q12548
  When I double-click "Metz" in the list
  Then the panel says "By the sources: <the holder's name>", "Source: Duby, p. 46", "On the map: <the polity's name>"
  And "At the right place."

Scenario: not at the right place
  Given the map's polity under Metz carries another id, or no polity is under it
  Then the panel says "Not at the right place: the sources put it in <the holder>."
  And Metz's name is in the alert ink in the list

Scenario: a polity to declare
  Given no polity of the map carries the holder's id
  Then the panel says "<the holder> is not declared in this map: to declare."
  And the city's name is in the alert ink in the list

Scenario: nothing to compare by
  Given the holder has no Wikidata id
  Then the panel says "<the holder> has no Wikidata id: nothing to compare by."

Scenario: not entered yet
  Given nobody has entered the holder
  Then the panel says "By the sources: not entered yet" and "On the map: …", and gives no verdict
  And [Close] takes the detail away and gives the hint back: "Double-click a city to see who holds it."

Scenario: the cities could not be read
  Given the export cannot be read
  Then the panel says "The cities could not be read: <the reason>" in place of the list
  And the console says it, with its detail
  And the rest of the Cartographer works as before

Scenario: no city that year
  Given the export holds no city covering the year open
  Then the panel says "No city entered for <year>."
```

## Filtering the list — CARTO-360, built 2026-11-05

> **The dev, 2026-11-05**: a search field at the head of {Polities} and {Cities}, *"it saves an enormous amount of
> time"*; filtering the list, his choice of the two ways the ticket named, and a little magnifier in the field.
> **Proposed by Claude, taken by his « vazy »**: case and accents ignored, a match anywhere in the name; ‹esc› clears;
> the eye heading the list acts on the cities found. **Used by Claude in the app on 2026-11-05, not walked by the dev yet.**

```gherkin
Scenario: filter the cities by a part of their name
  When I type "nov" in the field at the head of {Cities}
  Then the list shows only the cities whose name holds "nov", case and accents ignored
  And the eye heading the list reads "The city found", or "The 2 cities found"

Scenario: the eye acts on the cities found
  Given "nov" is typed in the filter
  When I click the eye heading the list
  Then the cities found are drawn, and no other

Scenario: clear the filter
  Given "nov" is typed in the filter
  When I press ‹esc› in the field
  Then the field is empty, and the list shows every city of the year again

Scenario: nothing answers
  When I type "kiev" and no city of the year holds it
  Then the panel says "No city answers “kiev”." in place of the list, and the field stays
```

> **What it does not do**: what is typed is the panel's own, so it empties when the panel is docked or floated
> (CARTO-342) — the same as the list's scroll.

> **What this rung does not do** (CARTO-193, the ticket's next rungs):
> - **the city in red on the canvas** — the alert is in the list and the detail only;
> - **the comparison is by Wikidata id**: a wrong id in the map's registry reads as a misplaced city — which is how it is
>   found (`files/plans/sources/wikidata-1100.md`, 11 wrong in 1100);
> - **a double-click on the canvas**: the white arrow's double-click there opens the polity's form (CARTO-246), so a
>   city is double-clicked in the list only — how to tell the two apart on the canvas is the dev's call;
> - the check before publishing (s10, *a city on the wrong side of a border*) is not built.

## The advanced filters — by country, by the sources (CARTO-370, the dev, 2026-11-06/07)

> **The dev, 2026-11-06**: the advanced filters do not all fit in the panel (*"one has to be reasonable"*): a funnel
> beside the name filter opens a dialogue of advanced filters, the first of them **by country** — the entities of
> {Polities}, ticked; a city stays when its holder by the sources is ticked. **Proposed by Claude, taken by the dev on
> 2026-11-07** (*"the better we can see things, that is the whole point of this panel"*): a section « Pas encore sur la
> carte » — the holders the sources give that no polity of the map carries, and « Sans détenteur » — so that every
> city, the red ones first, can be reached by the filter. The funnel is the dev's own drawing (`~/Desktop/Icons`).
>
> **Proposed by Claude**: a box applies at once, there is no OK; the countries are matched by **Wikidata id**, as the
> verdict and the points' colour are, so a polity without one is listed greyed and cannot be ticked; the filter lives in
> the store, so it survives the panel docked or floated, and is keyed by Wikidata id, so it means the same in every map;
> a box ticked for a holder the map open does not list filters nothing.

```gherkin
Scenario: the funnel opens the advanced filters
  Given {Cities} open on 1100
  Then a funnel stands at the right of the name filter, named « Filtres avancés »
  When I click it
  Then the dialogue « Filtres avancés » opens

Scenario: the countries of the map, as {Polities} lists them
  Given the dialogue open
  Then under « Par pays, selon les sources » every polity of the map is listed as the tree of {Polities}: a dot of its colour,
    its vassals indented under it, and how many cities of the year the sources give it, « Royaume de France (12) »
  And a polity without a Wikidata id is greyed, « Comté de X — sans identifiant Wikidata », and cannot be ticked

Scenario: the holders not on the map yet
  Given the sources give Almudévar to a holder no polity of the map carries
  Then under « Pas encore sur la carte » that holder is listed with its count, the holders in alphabetical order
  And last « Sans détenteur (<n>) », the cities nobody has entered a holder for

Scenario: tick a country
  When I tick « Royaume de France »
  Then the list keeps only the cities the sources give to the Royaume de France, at once
  And the box heading it reads « Afficher les <n> villes trouvées »

Scenario: two countries
  When I tick « Royaume de France » and « Saint-Empire »
  Then the list keeps the cities of one or the other

Scenario: with the name filter
  Given « Royaume de France » ticked and "sa" typed in the name filter
  Then the list keeps the cities of France whose name holds "sa"

Scenario: the funnel says a filter is on
  Given two countries ticked
  Then the funnel is filled with the accent and carries « 2 »
  And its name reads « Filtres avancés : 2 pays cochés »

Scenario: untick them all
  When I click « Tout décocher »
  Then no box is ticked, the list shows every city of the year again, and the funnel is at rest

Scenario: filter the dialogue's lists — the dev, 2026-11-07, after trying it: « il nous faut le quick filter pour les listes longues »
  Given the dialogue open
  When I type "barc" in the field at its head, « Filtrer les pays »
  Then both sections keep only the boxes whose name holds "barc", case and accents ignored — « Comté de Barcelone (12) »
  And a polity of the map found under its suzerain keeps the suzerain above it, greyed, as in {Polities}
  And a section where nothing answers says « Aucun pays ne répond à « barc ». »
  And ‹esc› in the field empties it; closing the dialogue empties it too

Scenario: nothing answers the filters
  Given ticked countries that hold no city of the year, and nothing typed
  Then the panel says « Aucune ville ne répond aux filtres. » in place of the list
```

> **Built 2026-11-07 (CARTO-370). Used by Claude in the app the same evening** on 1100: « Comté de Barcelone (12) » ticked
> keeps its twelve cities, all in red — a holder to declare — and the funnel turns blue with « 1 ». The swatch, square
> beside the box, read as a second box: drawn as a round dot since. **Not walked by the dev yet.** ‹esc› closing the
> dialogue is the browser's `<dialog>`, unobservable in jsdom: to check in the
> app, not tried yet. **What it does not do**: the filters are forgotten at a reload
> (CARTO-371, which awaits the dev's decision on a browser's storage refused); the sort is CARTO-382; the filter by
> state is CARTO-369. Two polities of the map carrying the same Wikidata id are ticked together — a wrong id in the
> registry, which the verdict already shows.

## The cities as points — visual milestones for a border (the dev, 2026-11-05/06)

> *"I need visual milestones"* — to slalom a border between the cities of two polities. The holder is the one the
> sources give (CMS-335, the historian's testimonies), matched to a polity of the map by its Wikidata id, as the verdict
> is. Built and **walked by the dev** on Sarkel (green, its holder's colour, *"normal colour, no overlay — it works"*);
> the points made smaller at his word.

```gherkin
Scenario: two boxes head the list
  Given {Cities} open on 1100
  Then two boxes head the list: « Afficher toutes les villes de 1100 » — in place of the round eye — and « Afficher
    comme des points »
  And under a filter the first reads « Afficher les <n> villes trouvées »

Scenario: the cities shown as points
  Given cities shown on the canvas
  When I tick « Afficher comme des points »
  Then each city shown is a dot in the colour of the polity holding it by the sources, inside a light ring and a dark
    one, painted as it is — no overlay — and no name
  And a dot of one colour on another polity's ground shows at once that the border passes on the wrong side of it

Scenario: a city whose holder cannot be coloured
  Given a city whose holder is not entered, has no Wikidata id, or is not a polity of the map
  When the cities are shown as points
  Then it is a hollow grey ring: nothing is coloured that the sources do not say
```
