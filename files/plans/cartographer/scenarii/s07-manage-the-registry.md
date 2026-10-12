# s07 — Manage the registry: identity without geography

> [Index](s00-index.md) · the registry holds _who exists_; the territory files hold _what they held, when_.
> Nothing here touches a single vertex.

## Where the registry lives — **one per year**, decided 2026-09-27

**`years/<year>/registry.json`. Nothing is shared between years.** The territory file holds geometry and
ids, never names.

```
years/1100/registry.json              years/1100/polities.json
  fr-couronne                           claims:
    name     : "Reaume de France"          - polity : fr-couronne     ← the id only
    rank     : kingdom                       rings  : [ … indices … ]
    suzerain : null
    wikidata : Q237131
```

The territory file **does not contain the name.** It carries `fr-couronne`, and the name comes from the same
year's registry. The 1659 folder holds its own registry, where the same id reads "Royaume de France".

**This replaces a shared registry with dated names, and the shared version was mine.** The dev's position,
2026-09-27: _"une année c'est une année… la forme des données doit pouvoir représenter chaque date, quelle
qu'elle soit."_ H-11 applies without exception, and the simplification is real — dated names, existence
intervals and dated relations all existed only to serve the sharing. See
[`format.md`](../format.md).

**Measured, and it is what settled it**: the `build-registry` spike (2026-09-27) grouped the 2 059 cached
OHM relations by Wikidata id and split the **Kingdom of France into four**, because OHM gives each period
its own Q-id. Per year the question does not arise — 52 relations are alive at 1100, each exactly once.

**What ids still fix, measured in the data we ship**: today a polity _is_ its string, which is why the 1700
payload holds **two entries named `Spain`** with no way to say they are one thing, why colours need nine
regular expressions, and why the British rule must be tested before the Irish one. With ids, renaming
breaks neither the colour, nor the border's hand, nor a vassal tie. The Wikidata id is kept **for checking
that two entries mean the same polity** — never as the identity, since it is per period rather than per
polity.

**The cost, stated**: a polity's name, rank and colour are written once per year rather than once in total,
so a rename or a recolour across centuries is one edit per year. Deriving a year copies them
([s05](s05-derive-a-year.md)), which covers the normal path; authoring a year from scratch does not.

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
  Then every polity of the open year is listed
  And each row shows: name, rank, suzerain, colour, and its Wikidata id
  And I can filter by name and by rank
  And a row is marked "no territory" when nothing in the year claims it
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
  Given Normandy owes France in the open year
  When I try to make France owe Normandy
  Then it is refused with "that would make a loop"
```

> **A cycle is now a question about one file.** The chain of `suzerain` fields inside a year either loops or
> it does not — no dates to overlap, nothing to compare across years.

```gherkin
Scenario: see the tree
  When I press [Hierarchy] for a given year
  Then polities are shown as a tree: crowns at the root, their vassals beneath
  And polities owing nobody sit at the root
```

## The panel's action bar — the dev, 2026-10-12

```gherkin
Scenario: the actions sit at the foot of {Polities}
  Given a year is open
  Then {Polities} carries a bar at its foot, holding [New polity] and [Delete polity]
  And the panel's title bar carries no action any more
  When no polity is selected
  Then [Delete polity] is disabled
  When I select "Duchy of Normandy" in the list
  Then [Delete polity] is enabled
```

> **The dev's request, 2026-10-12**: *"pouvoir ajouter ou supprimer une polity à partir d'une petite barre
> localisée en bas du panneau. Supprimez l'icône plus située dans la barre en haut du panneau. Regrouper
> ces manipulations et toutes manipulations ultérieures dans la barre en bas du panneau."* Every later
> action of the panel goes there too. The glyphs are the design's grid (18×18, stroke 1.4); the dev notes
> the standards are 16/1 and 24/1.5, a rescaling recorded in `known-issues`.

## Removing — rewritten 2026-10-12

```gherkin
Scenario: delete a polity
  Given "Duchy of Normandy" is selected, holds 3 rings, and 2 polities owe it homage
  When I press [Delete polity]
  Then a dialogue asks "Delete Duchy of Normandy?"
  And it says its 3 rings go, and its 2 vassals become sovereign
  And [Cancel] has the focus
  When I press [Cancel], or ‹escape›
  Then nothing changes
  When I press [Delete polity] again and then [Delete]
  Then the polity and its outline are gone, in one undo step
  And the anchors it shared with a neighbour stay, so the neighbour's border does not move
  And its vassals owe homage to nobody
  And the ground it held is left unclaimed
  And the result zone reads "deleted Duchy of Normandy"
  And no polity is selected any more, so [Delete polity] is disabled again
  When I press ‹ctrl+z›
  Then the polity comes back with its outline, its vassals and the anchors it shared

Scenario: delete a polity that holds nothing
  Given "Kingdom of Dublin" is selected, with no territory and no vassal
  When I press [Delete polity]
  Then the dialogue asks "Delete Kingdom of Dublin?" and lists nothing else
```

> **Decided by the dev, 2026-10-12**: deleting removes *"la polity et son tracé"*; it is always confirmed
> (*"il vaut mieux demander confirmation"*); it acts on the selected polity, the trash enabled only then.
> **The shared anchors staying is not a new rule** but `s00`'s first real constraint: a neighbour's border
> must never move because someone else was deleted — `removePolity` in `core` already keeps them, and
> what nothing holds any more leaves at save.
>
> **Mine, proposed with the plan**: [Cancel] holds the focus, so ‹enter› on a reflex deletes nothing; the
> ground is left unclaimed, and giving it to a neighbour is a gesture of its own, later.
>
> **What changed from the 2026-09-22 version**: it read *"appears in 1 year"* and offered to reassign the
> territory. The registry became **per year** on 2026-09-27 (P3), so a polity appears in exactly one, and
> the reassignment is set aside. The old *"used nowhere: removed with no further question"* is replaced:
> every deletion asks.

## Import

```gherkin
Scenario: import identities in bulk from OHM
  When I press [Import identities from OHM…] for year 1100
  Then the 52 relations alive that year are listed with name, rank, status and Wikidata id
  And those already in the registry are marked as such, matched on Wikidata id
  And I tick the ones to import
  And none of them brings geometry
```
