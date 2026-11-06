# s10 — Check a year before publishing it

> [Index](s00-index.md) · without this there is no way to know when a year is finished. It is a lint for
> a map.

> **Where it stands, 2026-11-06** (CARTO-192, rewritten with the dev): not built. Only the file's own faults are said, in
> the console (`core/editor/documentFaults.ts`). **Proposed, to be validated by him**: one check written once in `core`,
> called by the Cartographer's [Check this year] **and** by a script in the CI before the site is deployed — a year
> « publishable: no » is not deployed. The check is aimed at what the eye cannot see; a hole he sees, he fills (his
> rule of loose coupling). **Nothing blocks, the CI included** — the dev, same day:
> making it blocking is *"a very bad idea"*; a broken ring is seen while drawing and felt through the snap. Everything
> is reported as a warning; a forbidden source (Euratlas, GPL) reads « publishable: no », first, as a fault.

```gherkin
Scenario: run the check
  Given "1100" is open
  When I press [Check this year]
  Then every problem is listed, grouped by kind, worst first
  And each row says what is wrong, where, and what it would take to fix
  And clicking a row frames the problem on the canvas
  And the check takes no longer than a few seconds
```

## What it looks for

```gherkin
Scenario: a polity outside its own dates
  Given the registry says the Kingdom of Dublin ended in 1104
  And it holds territory in 1110
  Then it is reported: "outside its existence interval"
```

```gherkin
Scenario: land nobody claims
  Then the unclaimed share of Europe's land is reported, by surface
  And the largest unclaimed regions are listed, biggest first
  And each can be framed and painted from the list
```

> The contributor's to-do list, ordered by what is worth doing next.

```gherkin
Scenario: a sliver between two neighbours
  Given two polities were drawn independently along the same limit
  And a strip of unclaimed land lies between them
  Then every unclaimed area narrower than two cells is reported as a sliver
  And it is distinguished from genuinely unclaimed territory
```

> A sliver is a _defect_; Brittany unclaimed in 1100 is a _fact_. Confusing the two makes the whole
> report noise.

```gherkin
Scenario: two polities claim the same ground
  Then every overlap is reported, with its area
  And the two polities are named
```

```gherkin
Scenario: broken geometry
  Then a ring with fewer than 4 vertices is reported
  And a ring that crosses itself is reported
  And a ring entirely outside the frame is reported
```

```gherkin
Scenario: a stretch with no provenance
  Then every stretch whose source is unrecorded is reported
  And the total is given as a share of border length
```

```gherkin
Scenario: a polity with no name in French
  Then it is listed, so the atlas never falls back to English silently
```

## The accuracy check that actually matters — witness cities

```gherkin
Scenario: a city on the wrong side of a border
  Given the witness list says Lyon was held by the Holy Roman Empire in 1100
  And the drawn border puts Lyon inside the Kingdom of France
  Then it is reported: "Lyon — expected Holy Roman Empire, drawn in Kingdom of France"
  And clicking the row frames Lyon with both borders visible
```

~~Scenario: see who holds each city while drawing — the "cities" layer on, each city labelled with the polity whose cell
it falls in.~~

> **Struck 2026-11-02, on the dev's word**: no layer labels every city. `{Cities}` lists them, an eye each, none shown at
> opening, and a double-click says who holds one — [s20](s20-cities-panel.md).

> **This is the atlas's accuracy criterion**, decided by the dev on 2026-09-22: _"ce qui serait gênant,
> c'est de se retrouver avec une ville qui ne soit pas du bon côté d'une frontière."_ Nobody sees 20 km of
> error on a line; everybody sees Lyon in the wrong kingdom. It is also what makes the missing Saône
> harmless — an approximate line is fine as long as the cities fall correctly.
>
> The second scenario is the one that costs nothing and catches most of it: the raster already answers
> "who owns this cell". The witness list only automates what the eye would have caught. **H-15.**

## Publishability

```gherkin
Scenario: know whether a year can ship
  When the check finishes
  Then a single line says "publishable: yes" or "publishable: no"
  And "no" always names the reason: a stretch derived from a GPL geometry
  And nothing else can make a year unpublishable
```

## Progress

```gherkin
Scenario: compare against last time
  Given I checked this year yesterday
  When I check it again
  Then each figure shows its movement: "unclaimed 55 % → 41 %"
  And problems fixed since are counted
```

```gherkin
Scenario: accept a problem deliberately
  Given "Brittany unclaimed" is reported and is historically correct
  When I press [Accept] on that row
  Then it is not reported again
  And the reason I typed is stored with it
  And accepted problems stay visible in a separate list
```

> **Hole H-25**: what is the target? Unclaimed land will never reach 0 % — some ground genuinely belonged
> to nobody. Either the check learns which areas are deliberate, as above, or the figure is meaningless
> as a completion gauge.

## Added 2026-11-06 — the dev, rewriting CARTO-192

```gherkin
Scenario: a lake left full
  Given the land mask holds Lake Geneva as water
  And the County of Geneva's outline covers it
  When I check the year
  Then it is reported: "Lake Geneva is not cut out of the County of Geneva"
  And clicking the row frames the lake
  And a lake crossed by a border is reported the same way (CARTO-377)

Scenario: the CI checks before the site is deployed
  Given a year pushed with a stretch traced from Euratlas
  When the CI runs before deploying
  Then the year is deployed all the same — the CI never blocks (the dev, 2026-11-06)
  And its log says first, as a fault: the year, the polity, the stretch, "publishable: no"
  And a ring that crosses itself is reported the same way, as a warning
```
