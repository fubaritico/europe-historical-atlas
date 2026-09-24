# s11 — Islands

> [Index](s00-index.md) · a known defect: `expandRegionsOverLand` walks **over land only**, so a
> breadth-first expansion can never cross water. Any island no polygon explicitly claims stays uncoloured
> — the Balearics, the Aegean, and at 1100 a good deal more.

```gherkin
Scenario: see the islands nobody claims
  When I enable the "unclaimed" layer
  Then unclaimed islands are distinguished from unclaimed mainland
  And they are listed separately, largest first
  And each one names its nearest claimed neighbour and the distance
```

> They are a different problem from unclaimed mainland — mainland gaps close by growing a neighbour's
> claim, islands never do. Listing them together hides both.

```gherkin
Scenario: give an island to a polity
  Given Majorca is unclaimed
  When I select ⟨eyedropper⟩ on the Kingdom of Aragon
  And I click Majorca
  Then the whole island becomes Aragon's
  And its outline is the coastline, exactly, with no drawing
  And its provenance reads "coastline, Natural Earth"
```

> **The one place clicking a whole landmass is right**: an island's border _is_ its shoreline, which we
> already hold to about a kilometre. There is nothing to trace.

```gherkin
Scenario: an archipelago at once
  Given the Cyclades are forty small islands
  When I marquee them with ⟨eyedropper⟩
  Then every island entirely inside the band is claimed
  And islands partly inside are not
  And it is one undo step
```

```gherkin
Scenario: an island split between two polities
  Given Ireland holds several kingdoms in 1100
  When I draw a border across it with the normal tools
  Then it behaves like any mainland border
```

> Only _whole-island_ assignment is special. A divided island is an ordinary case.

```gherkin
Scenario: an island too small to survive the grid
  Given an islet is smaller than one 1.9 km cell
  Then it is reported in the check as "below grid resolution"
  And it can be claimed, but the claim will not appear in the raster
```

> Honest rather than silent: the claim is recorded in the geometry and is invisible in the render.
> Whoever hits this needs to know why, not to wonder.

```gherkin
Scenario: the expansion must not swallow an island
  Given an island lies within snapToCoast of a mainland claim
  Then the expansion still does not reach it
  And it stays unclaimed until somebody assigns it
```

> Guarding the rule rather than relying on it: the expansion crosses no water **by construction**, and a
> test should say so, because the day it does an island silently joins the nearest power.
