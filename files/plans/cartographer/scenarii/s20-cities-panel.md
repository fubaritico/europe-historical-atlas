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
