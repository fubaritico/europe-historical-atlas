# s08 — Vassalage, as a sequence of gestures

> [Index](s00-index.md) · decided 2026-09-22: a vassal gets **its own hand of line**, distinct from a
> personal union. The relation is derived from the registry; the hand is an editorial table.
> Background: [`../groundwork.md`](../groundwork.md) §6 bis.

## Declaring it

```gherkin
Scenario: make a polity a vassal
  Given "Duchy of Aquitaine" and "Kingdom of France" both hold territory in 1100
  When I select Aquitaine
  And I set its suzerain to "Kingdom of France" in {Details}
  Then the border between the two is redrawn with the vassal hand
  And the border between Aquitaine and any other neighbour stays sovereign
  And nothing else on the map changes
```

> **The pair decides, so inclusion needs no test.** Burgundy owing France is dotted against France and
> solid against the Empire, in the same outline.

```gherkin
Scenario: the four hands
  Given the editorial table maps relations to hands
  Then a border between two sovereigns is solid
  And a border between a vassal and its suzerain is dotted
  And a border between two crowns in personal union is dashed
  And a contested limit is doubled
  And nothing else in the tool decides a border's appearance
```

```gherkin
Scenario: the hand is a table, not code
  When I open [Border hands]
  Then I see four rows: sovereign · vassal · union · contested
  And each row carries a pattern, a dash cadence and a width
  And changing a row redraws every border of that relation at once
```

## Rear-vassals

```gherkin
Scenario: a vassal of a vassal
  Given the County of Poitou owes Aquitaine, and Aquitaine owes France
  When I look at the Poitou–France border, where they touch
  Then it is drawn with the vassal hand at the second degree
  And the second degree is visually lighter than the first
```

> **Hole H-23**: does the hand weaken by degree, or is any link in the chain drawn the same? In
> 11th–15th century France the rear-vassal is the normal case, not an exception, and the map will be full
> of them.

## The empires view

```gherkin
Scenario: colour by crown instead of by polity
  Given Aquitaine, Normandy and Poitou all owe France
  When I enable "colour by suzerain"
  Then all four take the French colour
  And the borders between them stay drawn, with the vassal hand
  And the border around the whole group is the only sovereign line
```

> **This is what the vassal hand is for.** With the fills merged, the dotted line is the *only* thing
> left saying the structure exists — so it must read over two identical colours, not just over a
> contrast.

```gherkin
Scenario: a vassal whose suzerain is not pinned
  Given neither the crown nor its vassals has an editorial colour
  When I enable "colour by suzerain"
  Then they still merge into one colour
```

> Today they do not: `assignRegionColors` colours by index against adjacency and never reads a name, so
> two vassals of an unpinned crown come out differently. **Ids make the real fix possible** — group by
> suzerain id before assigning slots.

## Breaking it

```gherkin
Scenario: a vassal becomes independent
  Given Normandy owes France until 1204
  When I open 1250
  Then Normandy owes nobody
  And its border with France is drawn sovereign
  And no geometry changed
```

> The dated relation does all of it. Homage changes without the territory moving — which is why
> vassalage is a field and never a drawing.
