# s07 — Manage the registry: identity without geography

> [Index](s00-index.md) · the registry holds _who exists_; the territory files hold _what they held, when_.
> Nothing here touches a single vertex.

## Where the registry lives — decided 2026-09-22

**One `registry.json`, shared by every year. The year files hold geometry and references, never names.**

```
registry.json                          1100.json  (independent, one per map)
  fr-couronne                            claims:
    wikidata : Q70972                      - polity : fr-couronne     ← the id only
    rank     : kingdom                       rings  : [ … points … ]
    exists   : from 843
    names    : "Royaume des Francs"  from 843
               "Royaume de France"   from 1190
```

The 1100 file **does not contain the name.** It carries `fr-couronne`, and the display name is whichever
one the registry says was valid in 1100 — "Royaume des Francs". The same id in 1200 reads "Royaume de
France".

**Why this does not contradict H-11.** What is independent is the _geometry_: the dev said _"chaque année
**dessinée** est indépendante"_, and a name is not drawn. So each fact is written once — identity in the
registry, territory in the year. Rename once, and every map follows.

**What it fixes, measured in the data we ship**: today a polity _is_ its string, which is why the 1700
payload holds **two entries named `Spain`** with no way to say they are one thing, why colours need nine
regular expressions, and why the British rule must be tested before the Irish one. With ids, renaming
breaks neither the colour, nor the border's hand, nor a vassal tie. **The Wikidata id does most of the
work for free** — 94 % of OHM polities carry one; `fr-couronne` is only a readable alias.

**The cost, stated**: two files instead of one, and losing the registry loses every name. It needs its own
validation and its own backup, like any other asset.

## Editing a polity that already exists

```gherkin
Scenario: reopen a polity's form and change it
  Given "europe-1100.json" is loaded
  When I select "Royaume des Francs", on the canvas or in {Polities}
  And I press [Edit properties…]
  Then the same form as creation opens, filled with its current values
  And I can change name, rank, status, dates, suzerain, colour and Wikidata id
  When I validate
  Then the change lands in the registry, not in the year file
  And every year using that polity shows it, without being opened
```

```gherkin
Scenario: rename from the map, mid-century
  Given I am drawing the year 1200
  And the polity is still called "Royaume des Francs"
  When I open its form and press [Add a name…] with "Royaume de France" from 1190
  Then 1200 shows "Royaume de France"
  And 1100 still shows "Royaume des Francs", without being touched
  And it is the same polity, with the same id
```

> **The gap the dev found while reading [s05](s05-derive-a-year.md)**, 2026-09-22: _"je veux changer le nom
> d'un pays, je puisse sélectionner, ravoir le formulaire pour éditer ses propriétés."_ The form existed at
> creation ([s02](s02-create-france-1100.md)) and in the registry's own list below, but **the plainest
> gesture of all — select, edit, validate — was written nowhere.** His example is the textbook case:
> _regnum Francorum_ becomes _regnum Franciae_ under Philip Augustus, around 1190. One polity, two names,
> each with its own date.

```gherkin
Scenario: open the registry
  When I press [Registry]
  Then every polity the project knows is listed, across all years
  And each row shows: name, rank, existence interval, suzerain, colour, and the years it appears in
  And I can filter by name, by rank, and by "appears in no year"
```

## Naming

```gherkin
Scenario: a polity is renamed over time
  Given "Kingdom of France" exists from 987
  When I press [Add a name…]
  And I enter "France" valid from 1500
  Then the registry holds two dated names
  And 1100 shows "Kingdom of France"
  And 1500 shows "France"
  And it is still one polity, with one id
```

> The whole point of ids. Today the atlas matches `Kingdom of France` and `France` with a regex, and has
> to test the British rule before the Irish one because one name contains the other.

```gherkin
Scenario: a name in French
  Given OHM carries name:fr on 81 % of its relations
  When I import an identity
  Then the French name is taken as the display name
  And the English name is kept as an alias
```

## Merging duplicates

```gherkin
Scenario: two entries are the same polity
  Given the 1700 payload contains two separate entries both named "Spain"
  When I select both in the registry
  And I press [Merge…]
  Then I choose which identity survives
  And every claim that referenced either now references the survivor
  And no geometry is moved, deleted or duplicated
  And the merge is one undo step
```

> **A real case, in the data we ship today.** Two entries named `Spain` at 1700, measured 2026-09-22. With
> names as keys there is no way to state they are one thing; with ids, merging is a rewrite of references.

```gherkin
Scenario: the tool proposes merges
  When I press [Find duplicates]
  Then polities sharing a name, or a Wikidata id, or overlapping heavily in the same year are listed
  And each is offered for merge or dismissal
  And a dismissal is remembered, so the same pair is not proposed again
```

## Hierarchy

```gherkin
Scenario: set a suzerain, with dates
  Given "Duchy of Normandy" and "Kingdom of France" both exist
  When I set Normandy's suzerain to France, from 911 to 1204
  Then the registry records a dated relation, not a permanent one
  And in 1100 Normandy owes France
  And in 1250 it does not
```

```gherkin
Scenario: refuse a cycle
  Given Normandy owes France
  When I try to make France owe Normandy over an overlapping interval
  Then it is refused with "that would make a loop"
```

```gherkin
Scenario: see the tree
  When I press [Hierarchy] for a given year
  Then polities are shown as a tree: crowns at the root, their vassals beneath
  And polities owing nobody sit at the root
```

## Removing

```gherkin
Scenario: delete a polity that is used
  Given "Kingdom of Dublin" holds territory in 1100
  When I press [Delete] in the registry
  Then I am told it appears in 1 year and holds 3 rings
  And I choose: reassign its territory to another polity, or leave the ground unclaimed
  And only then is it removed
```

```gherkin
Scenario: delete a polity that is used nowhere
  Given a polity appears in no year
  When I press [Delete]
  Then it is removed with no further question
```

## Import

```gherkin
Scenario: import identities in bulk from OHM
  When I press [Import identities from OHM…] for year 1100
  Then the 52 relations alive that year are listed with name, rank, status and Wikidata id
  And those already in the registry are marked as such, matched on Wikidata id
  And I tick the ones to import
  And none of them brings geometry
```
