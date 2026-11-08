# 20 — `{Cities}`: the contribution's cities as guides for the borders

> [Index](s00-index.md) · CARTO-193 · H-15. **The dev, 2026-11-02**: _"I need a panel showing cities. It would be like
> the polities, except there is a little eye, as for the layers, to show the city or not, so that I have a guide to
> place my borders. And when you double-click a city, you know whom it belongs to — on the map. Or not on the map: it
> may be a political entity not declared yet, which would have to be declared."_ And, the same evening: _"the panel
> lists the cities, but none shows by itself: I choose, city by city, the ones I show to set my borders."_
>
> **Decided by the dev, 2026-11-02:**
>
> - the panel lists the contribution's cities of the year open, **an eye per city, none shown at opening**;
> - a city shown is **a point and its name** on the canvas, at its position;
> - **a double-click says who holds it**: the polity the map has under it, and the one the sources give.
>
> **Proposed by Claude, not objected to**: one eye heading the list for every city of the year; the cities read from
> the export the atlas reads (`content/events.json`), so the CMS's server need not run while drawing.
>
> **Built 2026-11-02 (uncommitted, CARTO-193), the holder read from the export since CMS-335 (`ecd33d8`) — not walked
> yet.** The dev, the same evening: _"we need both: if it is not at the right place, say so; if the country does not
> exist on the map yet, say so."_

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

Scenario: the list takes the panel's height — CARTO-385, the dev, 2026-11-07 (walked: « c bon ca fonctionne »)
  When I drag {Cities} taller
  Then the list reaches the bottom of the panel, a city's detail staying under it
  And when I drag it short, the list keeps three rows and the panel scrolls

Scenario: the holder's dot on each row — CARTO-367, the dev, 2026-11-07
  When {Cities} lists the cities of 1100
  Then between the eye and the name, each row has a dot of its holder's colour by the sources, ringed in light ink —
    the colour of its point on the canvas
  And a hollow ring when no holder is entered, when the holder has no Wikidata id, or when no polity of the map carries it

Scenario: the holder's bubble
  When I hover Troyes's dot
  Then a bubble says "Comté de Champagne — suzerain : Royaume de France", the direct suzerain read in the map's registry
  And over a city of Barcelona's: "Comté de Barcelone — pas encore sur la carte"
  And over a city with no holder: "Détenteur pas encore renseigné"

Scenario: who holds a city — at the right place
  Given the sources say Metz was held by the Holy Roman Empire, Q12548, by Duby p. 46
  And the map's polity under Metz carries Q12548
  When I double-click "Metz" in the list
  Then ~~the panel says~~ Metz's information box says (CARTO-384, 2026-11-07) "By the sources: <the holder's name>", "Source: Duby, p. 46", "On the map: <the polity's name>"
  And "At the right place."

Scenario: not at the right place
  Given the map's polity under Metz carries another id, or no polity is under it
  Then ~~the panel~~ the box says "Not at the right place: the sources put it in <the holder>."
  And Metz's name is in yellow in the list — the map to correct, move the border (CARTO-386, the dev, 2026-11-07)

Scenario: a polity to declare
  Given no polity of the map carries the holder's id
  Then ~~the panel~~ the box says "<the holder> is not declared in this map: to declare."
  And the city's name is in yellow in the list — the map to complete (CARTO-386, my proposal, to confirm by the dev)

Scenario: nothing to compare by
  Given the holder has no Wikidata id
  Then ~~the panel~~ the box says "<the holder> has no Wikidata id: nothing to compare by."
  And the city's name is not marked in the list

Scenario: not entered yet
  Given nobody has entered the holder
  Then ~~the panel~~ the box says "By the sources: not entered yet" and "On the map: …", and gives no verdict
  And the city's name is in red in the list — a holder to enter (CARTO-386, the dev, 2026-11-07)
  And [Close] takes the ~~detail~~ box away ~~and gives the hint back~~ — the hint "Double-click a city to see who
    holds it." stays under the list (CARTO-384, 2026-11-07)

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

> **The dev, 2026-11-05**: a search field at the head of {Polities} and {Cities}, _"it saves an enormous amount of
> time"_; filtering the list, his choice of the two ways the ticket named, and a little magnifier in the field.
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
>
> - ~~**the city in red on the canvas** — the alert is in the list and the detail only;~~ — built 2026-11-08 by
>   CARTO-389: as points, the status ring (« The city's status on its point », below);
> - **the comparison is by Wikidata id**: a wrong id in the map's registry reads as a misplaced city — which is how it is
>   found (`files/plans/sources/wikidata-1100.md`, 11 wrong in 1100);
> - ~~**a double-click on the canvas**: the white arrow's double-click there opens the polity's form (CARTO-246), so a
>   city is double-clicked in the list only — how to tell the two apart on the canvas is the dev's call;~~ — settled
>   2026-11-07 by CARTO-384, below: on a city's point it opens the city's box, elsewhere in a fill the polity's form;
> - the check before publishing (s10, _a city on the wrong side of a border_) is not built.

## The advanced filters — by country, by the sources (CARTO-370, the dev, 2026-11-06/07)

> **The dev, 2026-11-06**: the advanced filters do not all fit in the panel (_"one has to be reasonable"_): a funnel
> beside the name filter opens a dialogue of advanced filters, the first of them **by country** — the entities of
> {Polities}, ticked; a city stays when its holder by the sources is ticked. **Proposed by Claude, taken by the dev on
> 2026-11-07** (_"the better we can see things, that is the whole point of this panel"_): a section « Pas encore sur la
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
  And its name reads « Filtres avancés : 2 filtres cochés » — the states ticked count with the countries (CARTO-369)

Scenario: untick them all
  When I click « Tout décocher »
  Then no box is ticked, countries and states, the list shows every city of the year again, and the funnel is at rest

Scenario: the filters kept at a refresh — CARTO-371, the dev, 2026-11-07: « je ne veux pas repartir de zéro »
  Given the Empire and « Pas au bon endroit » ticked
  When I refresh the page
  Then both are still ticked, the funnel says so, and the list shows the same cities
  And « Tout décocher » is the purge: nothing ticked, kept so at the next refresh

Scenario: a suzerain ticks its descent — CARTO-388, the dev, 2026-11-08 (walked: « l'état intermédiaire… ça fonctionne »)
  # The map's « Royaume de France » is the royal domain, its vassals carved out; a city is filtered by who holds it
  # directly. Ticking France asks « under the crown », so its box stands for France and its whole descent.
  When I tick « Royaume de France » in the advanced filters
  Then the boxes of its vassals, and of their vassals, are ticked with it
  And the list keeps the cities of the royal domain and of every vassal — Troyes by Champagne, Rouen by Normandy
  When I untick « Comté de Champagne » alone
  Then the cities of Champagne leave the list, and France's box shows the mixed state, a dash
  When I click France's box again
  Then its whole descent is ticked again
  And unticking France unticks its whole descent

Scenario: the sort — CARTO-382, the dev's icon, 2026-11-07: « l'icône du tri est le bouton qui ouvre un menu déroulant »
  When I click the sort icon, beside the funnel
  Then a menu offers « Ordre de l'export » (ticked at first), « Par nom », « Par vérification », « Par détenteur »
  When I choose « Par nom »
  Then the list is in alphabetical order, accents ignored, and the icon is in the accent
  When I choose « Par vérification »
  Then the map to correct comes first (« Pas au bon endroit », then « Détenteur pas encore sur la carte »), then the
    cities with no holder, then « Comparaison impossible », then « Au bon endroit » — the export's order kept within each
  When I choose « Par détenteur »
  Then the cities are grouped by the holder the sources give, the groups by name, the cities with no holder last
  And under a filter, the cities found are sorted; at a refresh, the order chosen is kept with the filters

Scenario: the browser refuses its storage — the dev, 2026-11-07: « si le navigateur refuse, on ne le fait pas »
  Given site data blocked for the Cartographer in Chrome, or the storage full
  When I tick a filter, or move a panel, and refresh
  Then nothing was kept — the filters as none, the panels as at first — and the Cartographer works as usual
  And the console says it once: "the browser refuses its storage"

Scenario: by state — CARTO-369, the dev, 2026-11-07
  When I open the advanced filters
  Then « Par vérification » (the map checked against the sources; my word, taken by the dev — « état » read as a State) heads
    the dialogue: « Pas au bon endroit (n) », « Détenteur pas encore sur la carte (n) »,
    « Comparaison impossible (n) », « Au bon endroit (n) » — every state, a state with no city counted 0
  And « Sans détenteur » stays with the countries, under « Pas encore sur la carte », where CARTO-370 put it
  When I tick « Pas au bon endroit »
  Then only the cities the map puts elsewhere stay in the list, and « Afficher les N villes trouvées » shows them
  When I tick « Détenteur pas encore sur la carte » too
  Then the cities of either state stay
  And with a country ticked, only its cities in those states stay

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
> beside the box, read as a second box: drawn as a round dot since. **Tried by the dev the same evening** — _"it is much more practical like this"_ once the dialogue's filter was added at his word — **and validated** (_"I validate 370"_). ‹esc› closing the
> dialogue is the browser's `<dialog>`, unobservable in jsdom: to check in the
> app, not tried yet. **What it does not do**: the filters are forgotten at a reload
> (CARTO-371, which awaits the dev's decision on a browser's storage refused); the sort is CARTO-382; the filter by
> state is CARTO-369. Two polities of the map carrying the same Wikidata id are ticked together — a wrong id in the
> registry, which the verdict already shows.

## The cities as points — visual milestones for a border (the dev, 2026-11-05/06)

> _"I need visual milestones"_ — to slalom a border between the cities of two polities. The holder is the one the
> sources give (CMS-335, the historian's testimonies), matched to a polity of the map by its Wikidata id, as the verdict
> is. Built and **walked by the dev** on Sarkel (green, its holder's colour, _"normal colour, no overlay — it works"_);
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

## The city chosen on the map, and its information box (CARTO-384, the dev, 2026-11-07)

> _"A city's point on the map does not lead to the city in the Cities panel, and its sheet opens at the bottom of the
> panel."_ **Decided by the dev**: a click on a city's point selects it in the list and scrolls to it, as a click on a
> polity with the white arrow ‹A› does in {Polities}; a double-click, in the list or on the point, opens its information
> box instead of the sheet under the list — **a modal, like the advanced filters', for now** (_"floating — floating
> where, floating how? To define in a ticket"_: CARTO-387).
>
> **Proposed by Claude, taken by his go**: an anchor of the polity aimed at wins over a city's point under it, as the
> press grabs the anchor first; choosing a city leaves the polity aimed at and the points selected as they were; a click
> on the city's name in the list chooses it too.

```gherkin
Scenario: a click on a city's point chooses it in the list
  Given Troyes is shown on the canvas and {Cities} lists it below the fold
  When I click Troyes' point with the white arrow
  Then Troyes' row is ringed in the list, and the list has scrolled to it
  And the polity aimed at and the points selected are as they were

Scenario: a double-click on a city's point opens its box
  When I double-click Troyes' point with the white arrow
  Then Troyes' information box opens, a modal named "Troyes", with who holds it by the sources and on the map
  And Troyes is chosen in the list
  And no polity's form opens

Scenario: a double-click on a city's name opens the same box
  When I double-click "Troyes" in the list, or press ‹enter› on it
  Then the same box opens

Scenario: ‹enter› opens the box of the city chosen — the dev, 2026-11-07: "double-clicking with the Mac's mouse is a real chore"
  Given Troyes is chosen, by a click on its point or on its name
  When I press ‹enter›
  Then Troyes' information box opens

Scenario: a click off every city drops the city chosen
  Given Troyes is chosen by a click on its point
  When I click in France's fill, away from every city
  Then France becomes the polity aimed at, and no city is chosen

Scenario: close the box
  When I click « Fermer », press ‹esc› or click outside it
  Then the box closes and Troyes stays chosen

Scenario: a city hidden is not there to be clicked
  Given Troyes' eye is off
  When I click where Troyes is, inside France's fill
  Then France becomes the polity aimed at, and no city is chosen

Scenario: an anchor wins over a city's point
  Given France is aimed at and one of its anchors lies on a city's point
  When I double-click there
  Then no box opens, and the console says a point opens no form
```

> **Built 2026-11-07 (CARTO-384). Walked by the dev the same evening** on Huesca: _"it works"_. His walk changed two
> things: ‹enter› on the name did not open the box in his Chrome — the box takes the focus as it opens, and the click
> the browser sends for the key landed on its « Fermer » — so the key keeps that click from following; and **one focus
> ring, round the whole row, never round the name's text**. ‹enter› on the map, and the click that drops the city, are
> his request of the same walk. ‹esc› and the click outside are the design system's `Modal` over
> the browser's `<dialog>`, unobservable in jsdom. **What it does not do**: a city the filters hide is chosen but has no
> row to scroll to; the coordinates in the box are CARTO-368, below.

## Where the city is — its coordinates in the box (CARTO-368, the dev, 2026-11-07)

> *"On a double-click, the city's sheet says whom it belongs to, but not where it is."* **Proposed by Claude**: written
> as the status bar writes the pointer's position (`s01`, `viewport/coordinateLabel`) — degrees and minutes, a
> hemisphere letter, never a minus sign, the letters French (`O` for *ouest*) whatever the language — so the box and
> the bar can be read against each other; the box's first line.

```gherkin
Scenario: the box gives the city's coordinates
  When I open Metz's information box
  Then its first line reads "Coordinates: 6°11′E 49°07′N", then who holds it by the sources and on the map

Scenario: a city west of Greenwich
  When I open Huesca's box
  Then it reads "Coordinates: 0°25′O 42°08′N" — a letter, never a minus sign
```

> **Built 2026-11-07 (CARTO-368). Walked by the dev the same evening** on Huesca: *"we do have the coordinates in the
> little modal"*. **What it does not do**: the hemisphere letters stay French in English (`known-issues/cartographer.md`).

## The city's status on its point (CARTO-389, the dev, 2026-11-08)

> *"To see at first glance the cities that should have a source, and to prioritise the search for sources by zone."*
> **Decided by the dev**: as points, a city with an alert reads its status as the list does. ~~The colour, a white ring, a
> ring of the status's colour, red or yellow, and a white ring again around~~ — tried the same night, *"not very
> readable"*; replaced by **the colour, a white stroke, a thick status stroke, a black stroke**: the edge of a city where
> all is well, the status ring slipped in before it. **A city where all is well does not change its look.**
>
> **Proposed by Claude**: the status ring three strokes wide; the light ring the points' own cream (`cityHalo`), the
> black their dark ink (`cityInk`); the alerts computed once per document version, as the hatches are, not on every pan.

```gherkin
Scenario: a city with no holder entered
  Given the cities are shown as points
  And nobody has entered Caspe's holder
  Then Caspe's point is a hollow ring inside a light ring, a thick red ring and a dark ring

Scenario: a city to correct
  Given the sources give Metz to France and the map has it in the Empire, or the map lacks its holder
  Then Metz's point is its colour inside a light ring, a thick yellow ring and a dark ring

Scenario: a city where all is well keeps its look
  Given the map has Toledo's holder under it
  Then Toledo's point is its colour inside a light ring and a dark one, as before

Scenario: the ring follows the border
  When I move a border so that Metz falls in France
  Then its yellow ring goes, as its name leaves the yellow in the list

Scenario: named cities keep their look
  Given the cities are shown as a dot and its name
  Then no city carries a status ring
```

> **Built 2026-11-08 (CARTO-389) — not walked yet.** Nothing for a city with nothing to compare by (its holder has no
> Wikidata id), as the list marks nothing.
