# 15 — Choosing the century

> [Index](s00-index.md) · **the interface over the map** (ATLAS-329, ATLAS-150), written 2026-11-02 for Claude Design.
> **Not built** — the atlas shows one year, 1100. The dev's words: *"I see it at the top — centred, or at the top left with a
> left-right button […] for now we would have only 20 centuries, 20 dates, in our first version, before taking on the
> decades."* He liked the centuries as the label: *"first century, second century — since that is all we'll have at the
> start, it goes down better."*
>
> **Not a timeline.** A frieze along the bottom with several political layers — as GeaCron offers, the dev's reference — is
> a feature as large as the map itself (the dev: *"careful, calm down"*). This scenario is a simple selector, nothing more.
> **Since 2026-11-05 the frieze is decided, as a separate feature** (ATLAS-358, `../interface-scenarios.md`): this
> selector stays what it is.

## The selector

```gherkin
Scenario: the century shown
  Given the atlas open on the map of 1100
  Then at the top of the screen a small piece reads « ‹  XIᵉ siècle  › », and under it, small, « 1100 »

Scenario: the next and the previous century
  When I click the right arrow « › »
  Then the map of the next century comes in, and the label reads « XIIᵉ siècle »
  When I click the left arrow « ‹ »
  Then the previous one comes in

Scenario: the list of the centuries
  When I click the century's name
  Then a simple list of the twenty centuries opens below it
  And I choose one, and its map comes in
```

> **The label is right to the year**: there is no year zero, so the 11th century runs from 1001 to 1100 — the map of 1100 is
> the **XIᵉ** siècle's, not the XIIᵉ's (`core/time/`, the historical date). Each century names its map's year under it, so
> the reader sees which year the century is shown at.

## A century with no map yet

```gherkin
Scenario: a century not drawn yet
  Given only the map of 1100 exists
  Then the arrows are greyed, and the list shows the other centuries greyed, « à venir »
  And clicking a greyed one does nothing
```

> Today that is every century but one — the selector is honest about it from the first day.

## Changing the map

```gherkin
Scenario: the view is kept across centuries
  Given the map at some place and zoom
  When I choose another century
  Then the camera stays where it is, and only the map changes under it
  And the progress shows while the new year loads (s01)
```

> How the change shows — a fade from one map to the other, or the new one simply replacing the old: to the mock-up, with the
> reduced-motion setting respected.

## The keyboard and the screen reader

```gherkin
Scenario: from the keyboard and a screen reader
  Given the selector reached by ‹tab›
  Then the arrows are buttons named « Siècle précédent », « Siècle suivant »
  And the century's name opens the list, the arrows move in it, ‹enter› chooses, ‹escape› closes
  And a screen reader hears « XIᵉ siècle, carte de 1100 », and a greyed century as « non disponible »
```

> Where at the top — centred, or at the top left: [s99](s99-holes.md) A-21.
