# 14 — The History panel

> [Index](s00-index.md) · **the dev's request, 2026-09-29**, after showing Photoshop's History panel:
> _"ce qui est à reprendre, c'est l'affichage en liste avec le nom de l'opération et l'icône de
> l'opération, pas de case à cocher. Ça permet de naviguer plus vite à une opération sans avoir fait 10 fois
> undo."_
>
> [s03](s03-edit-existing-border.md) already has undo and redo as two arrows. This file is what replaces the
> arrows as the **visible reading** of the history: the whole line, listed, and reachable in one click.

## What is taken from Photoshop, and what is not

| | |
| --- | --- |
| **taken** | the list, one row per gesture, oldest first · an icon and a name per row · the current row highlighted · a way to mark a point and come back to it |
| **not taken** | the **checkbox column** — its tooltip is *"Sets the source for the History Brush"* ([Adobe](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/paint-image-states.html)), and there is no painting-from-a-past-state tool here |
| **not taken** | the **trash** — the dev, 2026-09-29: _"je pense que la poubelle est une mauvaise idée"_ |
| **differs** | a **marker holds the run of steps up to it**, not only the state. Photoshop's snapshot is a single image state ([Adobe](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/create-work-snapshots.html)); the dev asked for the run, _"ça permet de charger une pile pour essayer quelque chose"_ |

> **Why the trash goes, and the honest nuance.** The dev's rule: _"le seul moyen d'enlever une action, c'est
> de remonter dans la pile, puis de réessayer quelque chose, cela supprimera les actions se produisant
> après."_ That is already the whole mechanism. What a trash would add is the one thing his rule does not
> do — dropping the rows ahead **without** replacing them — and a second way to do almost one thing is how a
> panel stops being readable.

## Reading the panel

```gherkin
Scenario: the line, listed
  Given I have opened 1100 and moved an anchor, closed a ring and moved another anchor
  Then {History} lists four rows, oldest first
  And the first reads "Ouvrir", because that is the file as it arrived
  And each of the other three carries the icon of the tool that made it and its name
  And the last row is highlighted, because that is where I stand
  And there is no checkbox on any row

Scenario: the row's icon does not come from its name
  Given the interface is in French and a row reads "déplacer une ancre"
  When the interface is switched to English and the same row reads "move anchor"
  Then the row still carries the same icon
```

> **The icon is keyed on the operation, never on its label** — my deduction, 2026-09-29, and it comes
> straight from this project's own scar: a polity **being** its display string is what gave the old payload
> nine colour regexes and an ordering that had to test the United Kingdom before Ireland
> ([s00](s00-index.md)). So a step carries a `kind` (`move-anchor`) beside its `label`, and the icon table is
> a small editorial table indexed on `kind`, exactly as the hands table is for borders
> ([s13](s13-overrides.md)).

## Navigating

```gherkin
Scenario: reach a gesture in one click
  Given {History} lists twelve rows and I stand on the last
  When I click the second row
  Then the map shows the document as it stood after that second gesture
  And that row is highlighted
  And the ten rows below it are still listed, greyed rather than gone
  And the view does not move, and the tool in my hand does not change

Scenario: going back and then forward again
  Given I have clicked the second row
  When I click the ninth
  Then the document is the one from after the ninth gesture
  And nothing has been lost in either direction

Scenario: acting after going back is what removes the rows
  Given I have clicked the second of twelve rows
  When I move an anchor
  Then rows three to twelve are gone
  And the new gesture is the third row, where the third used to be
  And [↷ Redo] is disabled
```

> **This is the only way a row leaves the panel**, and it is the dev's rule stated as a gesture. Note what it
> means for the greying: between clicking back and acting, the rows ahead are **still real** — the panel is
> not showing history, it is showing a line the reader is standing in the middle of.

## Markers

```gherkin
Scenario: mark a point before trying something
  Given I stand on the twelfth row
  When I press [✦ Mark] and name it "avant l'Aquitaine"
  Then {History} lists it above the rows, with its name and how many steps it holds
  And the line itself is unchanged

Scenario: a marker is what survives a truncation
  Given I marked "avant l'Aquitaine" at the twelfth row
  And I then clicked the second row and drew something else, so rows three to twelve went
  When I click the marker
  Then the line is the twelve rows again, and I stand on the twelfth
  And I can step back through them one by one

Scenario: a marker survives the depth limit too
  Given the line keeps fifty steps
  And I marked a point, then made sixty more gestures
  Then the oldest rows have left the panel
  But the marker still holds everything it froze, and clicking it brings it back

Scenario: forget a marker
  When I press [Clear] on a marker
  Then it leaves the list
  And the live line is untouched
```

> **What a marker costs: nothing, and that is a consequence of an earlier decision.** An entry, once
> recorded, is never mutated — the line copies on the way in and on the way out
> ([s03](s03-edit-existing-border.md)) — so a marker holds *references* to the steps it froze, not copies.
> The real cost is the other way round: what a marker holds cannot be freed while the marker lives, so the
> depth limit stops bounding memory. That is the point of a marker, and it is why `[Clear]` exists.

### The one thing still open

Restoring a marker **drops whatever the line held past the marked step**. Three answers, and the code
deliberately takes none of them — the mechanism is in `core`, the policy belongs to the chrome:

| | what it does | what it costs |
| --- | --- | --- |
| **mark first, then restore** (proposed) | nothing is ever lost; the abandoned line becomes a marker of its own | the marker list grows on its own, and a list nobody prunes stops being read |
| **ask** | one dialogue, explicit | a dialogue on a gesture meant to be cheap |
| **just drop it** | simplest | silent loss, which is the shape this project refuses everywhere else |

**Not decided.** It is a product call, not an implementation detail (`rules/error-handling.md`).

## Staying in step with the application

```gherkin
Scenario: the panel is never a second source of truth
  Given anything at all changes the document — a gesture, an undo, a marker restored
  Then {History} reads the line and redraws
  And nothing in {History} holds a copy of what the line already knows
```

> **The dev, 2026-09-29**: _"il faudra que le panneau soit synchronisé avec l'état de l'application. Nous
> parlerons aussi du gestionnaire d'état d'application."_ That conversation has not happened, so the line
> stays **readable and pull-based** for now: it exposes its rows and its markers, and it notifies nobody.
> Putting a subscription in it today would be deciding the application's state manager by accident, from the
> inside of one panel.

## What this panel owes the two arrows

Nothing is removed from [s03](s03-edit-existing-border.md): `[↶ Undo]` and `[↷ Redo]` stay, keep their
shortcuts, and keep naming their step. The panel is the **richer** reading, not the replacement — a keyboard
user never has to open a panel to undo.

> **Accessibility, and this project has already paid for it once.** The arrows, `[✦ Mark]` and `[Clear]` are
> icon-only controls: each needs an accessible name and a hit area clearing 24×24 (WCAG 2.5.8, AA — *not* the
> 44×44 of 2.5.5, which is AAA). Both defects were found on the atlas's dismiss button in 2026-09-17 and are
> guarded by tests there; reuse that pattern rather than rediscover it. The rows themselves are a **list with
> one selected item**, so they need the semantics of one — not a stack of `<div>`s with click handlers.
