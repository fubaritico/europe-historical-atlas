# 05 — Derive a new year from an existing one: 1100 → 1110

> [Index](s00-index.md) · chapter 06's _"seed from year T−1 and paint only the delta"_ — the thing that
> makes a decade-stepped atlas tractable at all.
>
> **Rewritten 2026-09-22.** This file used to be built entirely on stretches shared between years, with
> copy-on-write on every change. The dev settled it the other way: _"pour être tranquille, chaque année
> dessinée est indépendante"_ (H-11), and gave the mechanism that replaces all of it — a plain
> **Save as** ([s04](s04-save-and-reopen.md)).

## Creating the year

```gherkin
Scenario: derive a new year
  Given "1100" is open with 52 polities
  When I press [Save as…] and type the year 1110
  Then "1110" is written as a full, independent copy of 1100
  And "1100" is closed and left untouched on disk
  And "1110" is loaded in its place
  And it holds the same 52 polities and the same territory
  And the title bar reads "Cartographer — 1110"
```

```gherkin
Scenario: the copy is complete, and nothing is referenced
  Given "1110" was saved from "1100"
  Then every anchor, path and ring was copied into it
  And it holds no reference of any kind back to 1100
  And 1100 can be deleted, moved or renamed without affecting 1110
```

```gherkin
Scenario: the registry is not copied
  Given "1110" was saved from "1100"
  Then the registry is untouched — it is shared by every year
  And 1110 references the same polity ids as 1100
  And renaming a polity afterwards shows in both, according to the name's date
```

> **Geometry is duplicated, identity never is** ([s07](s07-manage-the-registry.md)). What H-11 made
> independent is what is _drawn_; a name is not drawn. Otherwise renaming "Royaume des Francs" into
> "Royaume de France" would mean opening every year one by one.

> **Independent by decision, not by accident.** Sharing stays _inside_ a year — France and the Empire run
> over the same anchors along the Meuse at 1100, which is [H-06](s99-holes.md) and is untouched. Across
> years, nothing is shared.

## What it costs, stated once

```gherkin
Scenario: a line that was always wrong
  Given the Empire's limit along the Meuse was digitised crudely
  And 1100, 1110 and 1120 each hold their own copy of it
  When I improve it in 1110
  Then only 1110 improves
  And nothing tells me the other two still carry the old line
```

> **This is the accepted price**, and it is written down rather than hidden: a correction has to be redone
> in each year holding it. The dev took the call knowingly — the alternative was copy-on-write, which asks
> _"was the line drawn badly, or did the border move?"_ at every single vertex, and only the author knows.
> Buying simplicity here costs repetition later, and there is one contributed year today.
>
> **Worth keeping in view**: a lint that spots an identical-looking stretch differing between two years
> would soften this without reintroducing sharing. Not designed, not blocking.

## Changing the year's content

```gherkin
Scenario: a border that moved between the two dates
  Given France pushed east between 1100 and 1110
  When I move the anchors along that stretch in 1110
  Then 1110 changes
  And 1100 is untouched, because it is a different file
```

```gherkin
Scenario: a polity ceases to exist
  Given the Kingdom of Dublin is in 1110 and ended in 1104
  When I select it and press [Remove from this year]
  Then it leaves 1110's territory
  And it stays in the registry, with its dates intact
  And its ground becomes unclaimed unless I reassign it
```

```gherkin
Scenario: hand a vanished polity's ground to its successor
  Given I am removing the Kingdom of Dublin from 1110
  When I choose [Reassign its territory to…] and pick "Kingdom of Leinster"
  Then every ring it held passes to Leinster
  And no unclaimed land is created
```

```gherkin
Scenario: the registry warns before I do
  Given the registry says the Kingdom of Dublin ended in 1104
  When I open 1110
  Then it is flagged "outside its existence interval"
  And the same check flags any polity whose start is after the year
```

> The registry already holds `existsFrom` / `existsTo`. Checking the year against it costs nothing and
> catches the commonest authoring slip. **This is the one check that survives independence**, because it
> compares a year against identities rather than against another year.

```gherkin
Scenario: a polity appears
  Given the County of Portugal becomes a kingdom in 1139
  When I press [+ New polity] in year 1140
  Then it exists in that file, and in no other
```

## Seeing the delta

```gherkin
Scenario: what changed
  Given "1110" and "1100" are both on disk
  When I press [Compare with…] and pick 1100
  Then ground that changed hands is hatched in the new owner's colour
  And polities added are outlined in green, removed in red
  And a list reads: "gained 2 · lost 1 · area changed 11 400 km²"
  And the pairs whose limit moved are named: "France–Empire · Empire–Bohemia"
```

> **Cheap, because the raster already exists.** Two grids, one cell per 1.9 km, each holding its owner's
> index: the diff is `a[i] !== b[i]`. No polygon intersection — which is the operation that breaks in every
> GIS — and no new geometry.
>
> **Two things not to get wrong:**
>
> 1. **A cell is not the same area everywhere.** In Mercator a cell at 60°N covers far less ground than one
>    at 40°N; the surface has to be weighted by the latitude's cosine, or Scandinavia is counted at roughly
>    twice its size.
> 2. **"Borders moved: 4" was meaningless and has been replaced.** The raster knows that 3 000 cells
>    changed hands; grouping them into a number of _borders_ requires deciding what one moving border is,
>    and three disjoint gains against the same neighbour have no non-arbitrary answer. **Naming the pairs
>    whose limit changed** is exactly defined, computable, and more useful to read.
>
> **Cost**: two rasters held at once is ~91 MB against a known peak of 136 MB, so the diff runs in the
> worker and at the 2× grid — 3.8 km cells are ample for a visual comparison.

> **The diff survives independence, and it is worth more now than before.** It is computed by reading two
> finished files and comparing them, with no shared object and no parent link needed. It is also the only
> thing that can tell the contributor whether a change in 1110 was deliberate — which used to be the
> copy-on-write question, now answered by looking rather than by being asked.
>
> **What it cannot do**: tell a moved border apart from a corrected one. The diff sees a difference; the
> reason lives in the author's head. Accepted, as the price above.

```gherkin
Scenario: compare against any year
  When I choose [Compare with…] and pick 1000
  Then the diff is computed against 1000 instead
  And any authored year can be compared with any other
```

## The chain

```gherkin
Scenario: see the years that exist
  When I open the timeline
  Then every authored year is marked
  And a year is just a file — there is no parent, and no derivation tree
```

> **H-22 is closed with the sharing that created it.** It asked what happens when a derived year is
> re-parented onto another. With independent years there is no parent to change: 1105 saved from 1100 and
> 1105 saved from 1110 are the same kind of object, and re-parenting has no meaning.

```gherkin
Scenario: insert a year between two that exist
  Given 1100 and 1110 both exist
  When I open whichever of the two is closer to what 1105 should look like
  And I press [Save as…] and type 1105
  Then 1105 exists, independent of both
```

## Saving over a year that already exists

```gherkin
Scenario: the year I am saving to already exists
  Given I have "1100" open
  And "1110" already exists, holding work of its own
  When I press [Save as…] and type 1110
  Then I am warned before anything is written
  And the warning says what would be lost, not merely that a file exists:
    "1110 already exists — 52 polities, 17 104 anchors, last modified 3 days ago"
  And I am offered: replace · choose another year · cancel
  And cancelling writes nothing at all
```

```gherkin
Scenario: replacing keeps the old one anyway
  Given I confirm the replacement
  Then the existing file is renamed "1110.backup-2026-09-22.json"
  And the new copy is written as "1110.json"
  And the status bar names the backup it kept
```

> The dev, 2026-09-22: _"s'il y a déjà un fichier qui existe, il faut pouvoir me dire attention, tu vas le
> remplacer."_
>
> **Why the warning has to be specific.** Since H-11 every year is independent, so a replaced year is
> unrecoverable — nothing is shared with any other file, and the undo history was just emptied by this very
> save ([s04](s04-save-and-reopen.md)). "A file exists, overwrite?" is not enough to decide with; the
> polity count, the anchor count and the date are.
>
> **Why the backup rather than a stronger dialogue.** A confirmation only reduces how often the mistake
> happens; renaming the old file removes the consequence. It costs one line and turns an irreversible
> gesture into a recoverable one — which is the same reasoning that keeps the OHM spike's output
> byte-identical rather than trusting nobody will overwrite it.
