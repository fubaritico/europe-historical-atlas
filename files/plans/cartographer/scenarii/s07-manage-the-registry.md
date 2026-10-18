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

### Opening the form from the map — built 2026-10-17 (`7f0b2be`, CARTO-246)

```gherkin
Scenario: double-click a polity on the map with the white arrow
  Given ⟨edit⟩ is in hand
  When I double-click inside the fill of "Royaume de Bourgogne" on the map
  Then the form of Royaume de Bourgogne opens, filled with its current values
  And the first click of the two has already selected it, as a single click does
  Given a vassal painted over its suzerain
  When I double-click inside the vassal's fill
  Then the form that opens is the vassal's — the polity on top, as a click chooses it

Scenario: a double-click on a point, or off every polity, opens nothing
  When I double-click on an anchor
  Then no form opens
  And the console warns "a double-click on a point opens no form: a point may be shared — double-click inside a fill."
  When I double-click in the sea, outside every polity
  Then no form opens
  And the console warns "a double-click outside every polity opens no form."

Scenario: the other tools ignore a double-click
  Given ⟨draw⟩, or any tool but ⟨edit⟩, is in hand — or ‹space› is held
  When I double-click on the map
  Then nothing new happens
  And a double-click on a row of {Polities} still opens that polity's form, whatever the tool
```

> **The dev's request, 2026-10-17** (the ticket): to change a polity's properties while working on the map,
> without finding it in {Polities}. A point opens nothing because it may be held by several polities and
> choosing one would be arbitrary. **Tested by the dev the same day**: *« le double-clic avec l'outil A
> fonctionne, c'est parfait »*; no walk written down. The form whose polity an undo takes away is
> forgotten, so a redo does not reopen it. Amends `H-04` in [s99](s99-holes.md), which said double-click
> was not used.

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

### Choosing the suzerain by typing — built 2026-10-17 (`6c9bde0`, CARTO-241)

```gherkin
Scenario: type a few letters to choose the suzerain
  Given the polity form is open, in a year of about 150 polities
  Then the "Suzerain" field reads "Type a name to choose…"
  And the suzerain held is shown above the field, or "none"
  When I type "ile"
  Then the polities whose name matches are offered from the first letter, the typed part in bold
  And case and accents do not count — "Île-de-France" is offered
  And the names that start with what I typed come first, then those that contain it
  And at most 30 are offered at once
  When I choose one, with the pointer or with ‹↓› ‹↑› and ‹enter›
  Then it is the suzerain held, shown above the field, and the field is cleared

Scenario: nothing matches
  When I type letters no polity's name contains
  Then the list reads "No polity matches"

Scenario: remove the suzerain
  Given "Kingdom of France" is the suzerain held
  When I press the cross beside it — "Remove the suzerain Kingdom of France"
  Then the suzerain held reads "none"
  And the focus is back in the "Suzerain" field

Scenario: a loop of homage is never offered
  Given Normandy owes France
  When I open France's form and type "Nor"
  Then Normandy is not offered — nor any polity owing France, at any depth
```

> **The dev's request, 2026-10-17** (the ticket): the suzerain was chosen in a drop-down of every polity of
> the year, about 150 in 1100. The field is the design system's `Typeahead`, which brings the keyboard and
> the combobox pattern; the search is `components/suzerainSearch.ts`. A suzerain held that the list does
> not offer (a loop already in a file) is shown as its id and warned once in the console. **Tested by the
> dev, 2026-10-17** (the ticket); no walk written down.

```gherkin
Scenario: see the tree
  When I press [Hierarchy] for a given year
  Then polities are shown as a tree: crowns at the root, their vassals beneath
  And polities owing nobody sit at the root
```

## What Wikidata says, in the form — built 2026-10-17 (`8c817fc`, CARTO-243 rung 1; `d85bdb4`, CARTO-248)

```gherkin
Scenario: the item is read a moment after the id is typed
  Given the polity form is open for the County of Tripoli
  When I type "Q272033" in the "Wikidata id" field
  Then 400 ms after the last keystroke, the panel under the field reads "Reading Q272033 on Wikidata…"
  When Wikidata answers
  Then the panel shows the item's name and years, "County of Tripoli · 1102–1289" — a "?" where Wikidata says nothing
  And its Wikipedia links, in English and in French, when it has them
  And one line per field Wikidata can fill: Name, Exists from, Exists to, Suzerain — each only when it has a value

Scenario: nothing is written without a click
  Given the panel proposes "1102" for Exists from
  Then the line's button reads [Use] when the field is empty, [Replace] when I wrote something else,
    and an inert "Agrees" when the field already holds that value
  And no field of the form has changed
  When I press [Use]
  Then Exists from holds "1102", as if I had typed it
  And the button stays where it was, now reading "Agrees", so the focus is not lost

Scenario: the suzerain proposed is the one of the year edited
  Given "Kingdom of France" carries Q70972 in this year's registry
  And Wikidata gives Flanders the country Kingdom of France 864–1529, then the Holy Roman Empire 1529–1556
  When the item of Flanders is read in 1100
  Then the panel proposes "Suzerain · Kingdom of France"
  And in 1540 it would propose the Holy Roman Empire, if a polity of that year carries its Q-id
  And a lord dated in the year comes before an undated one; one dated outside it is never proposed
  And a State of the Holy Roman Empire is proposed the Empire
  And only a polity of the year that carries the lord's Q-id is ever proposed — never a modern state
  And an item that is an instance of a vassal state says " · a vassal state" after its years

Scenario: the year edited is outside the item's dates
  When the item of the County of Tripoli is read in 1100
  Then the panel warns "Wikidata: County of Tripoli 1102–1289 — does not exist yet in 1100"
  And for an item dissolved before the year, "… — no longer exists in <year>"
  And nothing is refused: the form validates as before

Scenario: the id names a Wikipedia page, not a polity
  When the id typed is a Wikipedia category
  Then the panel warns "<id> is a Wikipedia category, not a polity — check the id"
  And it proposes nothing
  And the same for a disambiguation page or a Wikipedia list

Scenario: an unknown id, or no network
  When the id typed is one Wikidata does not know
  Then the panel warns "Wikidata does not know <id>"
  When Wikidata does not answer
  Then the panel reads "Wikidata did not answer (<reason>) — the form works without it"
  And the console warns of it
  And the form validates as before
```

> **Decided by the dev, 2026-10-17** (CARTO-243): names, dates and suzerain — *« le plus d'informations, le
> mieux »*; Wikidata proposes, the author decides. Images (flags, arms) are left out, their licence being per
> file on Commons. **What the code found while building**: Wikidata has no *vassal of*; the lord is read from
> *country* (P17) and *part of* with their start and end qualifiers, from *State of the Holy Roman Empire*,
> and *vassal state* says that it is one, not of whom — five of eight real vassals of 1100 come out right,
> the rest stay empty. Measured on the Emirate of Mosul, whose id was a category. Only ids of the form `Q…`
> are read. **Tested by the dev, 2026-10-17** (the Mosul case) and, for the dated suzerain, *« ça
> fonctionne. Aucun problème. »*; no walk written down. **Rung 2, not built**: checking a whole year
> against Wikidata.

## The panel's action bar — the dev, 2026-10-12

```gherkin
Scenario: the actions sit at the foot of {Polities}
  Given a year is open
  Then {Polities} carries a bar at its foot, holding [New polity] and [Delete polity]
  And the two buttons sit flush right
  And the panel's title bar carries no action any more
  When no polity is selected
  Then [Delete polity] is disabled
  When I select "Duchy of Normandy" in the list
  Then [Delete polity] is enabled
```

> **The dev's request, 2026-10-12**: *"pouvoir ajouter ou supprimer une polity à partir d'une petite barre
> localisée en bas du panneau. Supprimez l'icône plus située dans la barre en haut du panneau. Regrouper
> ces manipulations et toutes manipulations ultérieures dans la barre en bas du panneau."* Every later
> action of the panel goes there too. **The glyphs are the dev's own pixel drawings** (a
> `+` framed in dots, a three-slatted trash), filled shapes on whole pixels — his verdict of 2026-10-12,
> *"ce qui doit être net est net"*, after the tool glyphs' 1.4 stroke was measured blurry.
>
> **Where [New polity] puts the new polity in the stack** — just above the one selected, in its group
> (CARTO-242, 2026-10-17) — is written in [s16](s16-stacking-order.md), *Where a new polity lands*.

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

### Walked for real — 2026-10-12, in the dev's Chrome (×2), on the working year (France + Burgundy)

```gherkin
Scenario: delete a neighbour and take it back from the panel
  Given "Royaume de Bourgogne" shares its western border with "Royaume de France"
  When I select "Royaume de Bourgogne" in {Polities} and press the trash
  Then the dialogue asks "Delete Royaume de Bourgogne? Its 1 ring goes." and [Cancel] has the focus
  When I press [Delete]
  Then Burgundy is gone, France's outline has not moved
  And the result zone reads "deleted Royaume de Bourgogne — 1 ring · ctrl+Z brings it back"
  And the focus is on the {Polities} list, the trash disabled
  When I press ‹ctrl+z› with the focus still in {Polities}
  Then Burgundy comes back with its shared border, selected, and the trash is enabled again
  When I press ‹ctrl+shift+z›
  Then it is gone again

Scenario: ‹ctrl+z› in the panel takes back an outline in progress first
  Given two anchors of an outline are placed with the Pen, the outline still open
  When I click a row of {Polities} and press ‹ctrl+z›
  Then the outline's last anchor is taken back, and no step of the history is undone
```

> **Two surprises of the walk, both invisible to jsdom** — the dev's note: such bugs want Playwright
> end-to-end tests (`next.md`). (1) **The native `<dialog>` gives the focus back to the button that opened
> it** — the trash, disabled by the deletion, so the focus fell to the body. The hand-back to the list now
> runs in an effect after the design system's Modal has closed, and the test stand-in restores focus as
> the browser does. (2) **‹ctrl+z› was the canvas's alone**: from the panel, the promise *"ctrl+Z brings it
> back"* did nothing. The canvas controller now hears the history keys on the whole page — outside text
> fields and open dialogues — and runs **its own** gesture-aware undo, so an outline in progress is taken
> back before the history moves (the review's ARCH-101, which caught a first version calling the store).
> The second scenario is proven by a unit test, not walked: from the opening view the Pen is refused
> (`s17`).
>
> **The bar ignores the zoom**, unlike the tools (`s17`): creating or deleting a whole polity asks for no
> precision on the map, the dialogue says what goes, and undo brings it back. Mine, said to the dev the
> same night, his to overrule.

## A tribe — the rank that draws without a fill (built 2026-10-15, `220ae18`)

```gherkin
Scenario: rank a polity "tribe"
  Given "Obotrites" holds an outline and is ranked "duchy"
  When I open its form and choose the rank "tribe"
  Then its outline is no longer filled
  And it is stroked dashed, in its colour, at a border's width, under the borders layer's setting
  And no derived border touching it is drawn — its dashed outline is the line there
  When I click inside its outline with ⟨edit⟩
  Then it is selected, as a filled polity would be

Scenario: the rank list offers every rank the year uses
  When I open the "Rank" list of any polity
  Then it offers the usual ranks, "tribe" among them, then every other rank the year already uses, in alphabetical order
```

> **The dev, 2026-10-15**: *« quand une policy prend une couleur, c'est qu'elle atteint une certaine
> souveraineté »*, and *« la couleur de remplissage sera plutôt la couleur des traits en pointillés »*. The
> rank is read exactly: `tribe` (`core/editor/tribes.ts`). The rank list offering the year's own ranks is
> his too, 2026-10-16: *« qu'est-ce qui empêche les choses ? »*. **Claude's call, said to the dev the same
> evening**: a derived border touching a tribe is dropped, since two strokes along one stretch would read as
> two limits. The atlas draws tribes the same way since 2026-10-16 (`3ba62ee`). Not walked yet in the
> Cartographer, as the code itself records.

## Import

```gherkin
Scenario: import identities in bulk from OHM
  When I press [Import identities from OHM…] for year 1100
  Then the 52 relations alive that year are listed with name, rank, status and Wikidata id
  And those already in the registry are marked as such, matched on Wikidata id
  And I tick the ones to import
  And none of them brings geometry
```
