# 17 — The map as a list

> [Index](s00-index.md) · **the interface over the map** (ATLAS-329), written 2026-11-06. **Not built** (ATLAS-140).
>
> **What the code does today** (read 2026-11-06): the map is one `<canvas id="scene">` with no role and no name
> ([s10](s10-language-and-accessibility.md)); a screen reader hears the splash, the progress and the notices
> (`ui/splash.ts`, `ui/progressOverlay.ts`, `ui/notice.ts`), **nothing of the countries, the cities or the events**. The
> keyboard moves and zooms the map ([s02](s02-navigate.md)) but **cannot reach anything on it**: the click that recentres
> and the double-click into focus ([s03](s03-click-and-focus.md)) have no key. The review's A11Y-301 sent this to « M2's
> region list », which no plan described — this scenario is that list.
>
> **Built for the mass** (`files/plans/roadmap.md`, « What makes the difference »): a year will hold thousands of cities and
> events, so the list is a tree to unfold and a filter, never a flat list to scroll.

## The list

```gherkin
Scenario: opening the list
  Given the atlas open on 1100
  When I click the list button in the bar at the bottom right, or press ‹L›
  Then a panel opens on the left: « Ce que montre la carte en 1100 »
  And it holds the sovereign polities, in the order of their importance
  And each one unfolds to its direct vassals, then to its cities, then to its events
  And the keyboard's focus is on the panel's first line

Scenario: going down the list from the keyboard
  Given the list open
  When I press ‹↓› and ‹↑›
  Then the focus goes from line to line
  When I press ‹→› on « Royaume de France »
  Then it unfolds to its vassals and its cities
  When I press ‹←›
  Then it folds again
```

## Choosing a line moves the map

```gherkin
Scenario: a country chosen
  Given the list open on « Royaume de France »
  When I press ‹enter›
  Then the map flies to the kingdom, framed whole, as a click would (s03)
  And the list stays open, the focus where it was

Scenario: a country entered in focus
  When I press ‹shift›‹enter› on a country
  Then the map enters its focus, as a double-click would (s03)

Scenario: a city or an event chosen
  When I press ‹enter› on « Paris » or on « Siège de Jérusalem »
  Then the map flies to it
  And for an event, its panel opens (ATLAS-155)
```

## Thousands of lines

```gherkin
Scenario: the filter
  Given the list open
  When I type « bour » in the filter at its head
  Then only the lines whose name holds « bour » remain — Bourgogne, Bourges, Strasbourg — each under its sovereign, unfolded
  And the count says how many: « 3 résultats »

Scenario: a long list stays fluid
  Given a year holding several thousand cities
  When I unfold a sovereign and go down its cities
  Then the list scrolls without a stutter
```

> The filter overlaps the search of ATLAS-139 (« chercher un lieu ou un événement »): one field may serve both —
> [s99](s99-holes.md) A-24.

## The screen reader

```gherkin
Scenario: what a screen reader hears
  Given VoiceOver on and the list open
  Then it hears the panel as a tree, named « Ce que montre la carte en 1100 »
  And each line with its kind and its depth: « Royaume de France, pays souverain, 12 vassaux, réduit »
  And when the map flies to a line: « Carte centrée sur le royaume de France »

Scenario: the map named
  Given VoiceOver on
  When the focus reaches the map itself
  Then it hears « Carte de l'Europe en 1100 — la liste de ce qu'elle montre : touche L »
```

> **The certainty of what is listed** follows the map's (DESIGN-262): a holder known only roughly is said so in the line,
> as the map hatches or blurs it — never read out as more certain than it is. To write when the marks are drawn.
