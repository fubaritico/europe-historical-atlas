# s09 — Place the names on the map

> [Index](s00-index.md) · the dev's point ① — *"comment les noms sont affichés"*. **Nothing exists on
> either side**: no label renderer in the atlas, and no anchor data anywhere. This is new work.

## The label appears on its own

```gherkin
Scenario: a polity with territory gets a label
  Given the Kingdom of France has just been drawn
  Then its name appears on its territory
  And its anchor is computed as the pole of inaccessibility, not the centroid
  And its typography follows its rank
```

> **Pole of inaccessibility, not centroid**: the centroid of a crescent-shaped state falls outside it.
> Chapter 06 already specifies this.

```gherkin
Scenario: typography carries the rank
  Then an empire is set in wide-spaced capitals
  And a kingdom in capitals
  And a duchy or a county in small italics
  And the size follows the rank, not the area
```

> Size by rank rather than by area is the cartographic convention, and it is why **rank had to be a
> field** (groundwork §6 quater): a small duchy must not shout louder than a large one.

## Moving it by hand

```gherkin
Scenario: the computed anchor is wrong
  Given the label for Norway sits in a fjord
  When I select ⟨label⟩ and drag it
  Then the anchor moves with the pointer
  And it is stored as an editorial override, in lon/lat
  And a marker shows it was moved by hand
  When I press [Reset anchor]
  Then it returns to the computed position
```

```gherkin
Scenario: a label follows the shape of its territory
  Given Norway is long and thin
  When I rotate the label with its handle
  Then it is drawn along that angle
  And the angle is stored with the anchor
```

> **Hole H-24**: a straight rotated label or a label curved along a spine? Old atlases curve them. Curved
> text on a canvas is a different piece of work and should not be assumed.

## When it appears

```gherkin
Scenario: labels thin out as I pull back
  Given fifty polities are on screen
  When I zoom out
  Then duchies and counties disappear first
  And kingdoms and empires remain
  And no two labels overlap at any zoom
```

```gherkin
Scenario: force a label to show or hide
  When I set a label's "appears from" zoom by hand
  Then it overrides the rank rule
  And a polity can be hidden entirely without losing its name
```

> **Semantic zoom.** This is the real answer to the Holy Roman Empire: *draw all several hundred
> principalities and choose what is shown*, instead of drawing the Empire as a block and coming back
> later. Groundwork §6 quater.

## Collisions

```gherkin
Scenario: two labels want the same space
  Given Parma and Modena are neighbours and small
  When both labels are drawn
  Then the one of higher rank keeps its place
  And the other is displaced, or hidden, according to the collision rule
  And the rule is visible and adjustable, not buried
```

```gherkin
Scenario: a label longer than its territory
  Given "Monastic State of the Order of Malta" holds an island
  Then the label is drawn beside it with a leader line
  And the leader line does not cross another polity's label
```

## What is stored

```gherkin
Scenario: only the overrides are saved
  When the file is written
  Then computed anchors are not in it
  And hand-moved anchors, angles and zoom thresholds are
```

> Same rule as colours: what the machine computes is not data, what the author decides is.
