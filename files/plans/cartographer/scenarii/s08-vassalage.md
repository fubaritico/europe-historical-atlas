# s08 — Vassalage, as a sequence of gestures

> [Index](s00-index.md) · decided 2026-09-22: a vassal gets **its own hand of line**, distinct from a
> personal union. The relation is derived from the registry; the hand is an editorial table.
> Background: [`../groundwork.md`](../groundwork.md) §6 bis.

> **Superseded in part on 2026-10-15, by the dev — read this before the scenarios below.**
>
> 1. **A vassal is a neighbour of its suzerain, not drawn on top of it.** A suzerain's **extent** is its own
>    domain plus its vassals' extents, computed from the registry (`core/editor/extent.ts`); a suzerain may
>    have no ring of its own. Overlap stays allowed while the author corrects by hand. So *"a vassal drawn
>    inside its suzerain"* below describes the old way of drawing — the vassal border still comes out, now
>    from shared anchors rather than from inclusion.
> 2. **Co-vassals take the vassal's stroke**: dotted, same weight (`borderHands.ts`). The scenarios *"three
>    limits out of two outlines"* and *"the weight of a line follows the depth"* drew them solid and lighter;
>    the dev: *« le même trait »*. Only a limit against another lineage is solid.
> 3. **Aiming a suzerain** strokes its extent outline, and the white arrow takes the anchors of that outline
>    plus its own anchors not shared with a vassal — the limits with its vassals are theirs to edit.

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

## The tree is the gesture — {Polities} nests, like Illustrator's layers

> **The dev, 2026-09-27**: _"si une polity a des suzerains, pouvoir faire un genre de calque sous-calque
> comme dans Illustrator. Ce qui voudra dire que si l'on veut faire un vassal, ce n'est pas le chevauchement
> du tracé qui provoque le vassal, c'est la création de la sous-polity dans une polity."_
>
> **Taken, and it closes a hole rather than adding a feature.** The vulnerability in the derived hand was the
> `suzerain` field left empty — the limit came out sovereign, silently, and a duchy inside a kingdom it does
> not owe is a legitimate fact so nothing could warn. Creating the vassal **inside its lord in the tree**
> removes the field from the path: there is nothing left to forget. And it makes **depth** visible, which is
> what decides who paints (H-05a) and how heavy a line is drawn.

```gherkin
Scenario: create a vassal by creating it inside its lord
  Given "Kingdom of France" is in {Polities}
  When I select it and press [+ New polity inside]
  Then the form opens with its suzerain already set to "Kingdom of France", not editable as a blank
  And on validation the new polity appears nested under France in the list
  And the branch reads "owes Kingdom of France"
  When I then draw its outline, anywhere
  Then the vassal hand is already in force, whatever the geometry turned out to be
```

```gherkin
Scenario: geometry does not declare the relation, and never did
  Given "Duchy of Brittany" is at the root of the list, owing nobody
  When I draw it entirely inside France's territory
  Then no vassalage is created and nothing is inferred
  And the limit between them is drawn sovereign
  And no overlap is reported either, because inclusion with a non-vassal is a fact
```

```gherkin
Scenario: a vassal drawn outside its lord stays a vassal
  Given "County of Flanders" was created inside France in the list
  When I draw it disjoint from France's territory
  Then it is still a vassal, and its limit against France — where they touch — keeps the vassal hand
  And where they do not touch, there is simply no line between them
```

> **Inclusion keeps a smaller job, and losing sight of that is the trap.** The tree says **that** two
> polities are lord and vassal. Inclusion still answers **where** their shared limit runs, which is what
> the single-owner run needs ([`format.md`](../format.md)). The dev's point stands exactly as stated: overlap
> no longer *causes* vassalage — and a vassal holding ground away from its lord is ordinary medieval
> geography, so requiring inclusion would forbid a fact.

```gherkin
Scenario: moving a polity in the tree is a change of homage, and says so
  Given "Duchy of Aquitaine" is nested under France
  When I drag it onto "Kingdom of England"
  Then I am asked to confirm, naming what changes:
    "Aquitaine would owe England instead of France — 1 border redrawn"
  And cancelling moves nothing
  When I drag it to the root instead
  Then I am asked the same way, and it becomes sovereign
```

> **This is where Illustrator's vocabulary stops being free.** There, nesting controls stacking and
> visibility; here it declares a legal tie. The two gestures look identical, so a silent reparent would turn
> a tidy-up into a change of history. Hence: the branch is **labelled** with the relation, and every move
> asks. The confirmation names the consequence, not the action — the same reason the overwrite warning counts
> polities and anchors instead of saying "a file exists" ([s05](s05-derive-a-year.md)).

```gherkin
Scenario: what the tree cannot express
  Given "Castile" and "Aragon" are two crowns on one head, with no subordination
  Then they are NOT nested — neither is under the other
  And they sit at the root, joined by a personal-union marker on both rows
  And a condominium is not expressible in the tree either, and is not faked
```

> **The tree covers vassalage and nothing else**, and that has to be written down before someone forces the
> rest into it. A node has one parent, so it can carry homage — which is one-directional — and cannot carry a
> **personal union**, which is a link between peers, nor a **condominium**, which the glossary already
> records as inexpressible today. Both stay flat, marked on the row rather than in the nesting.

```gherkin
Scenario: the five hands
  Given the editorial table maps relations to hands
  Then a border between two sovereigns is solid
  And a border between a vassal and its suzerain is dotted
  And a border between two crowns in personal union is dashed
  And a contested limit is doubled
  And a limit against ground nobody claims takes the frontier hand
  And nothing else in the tool derives a border's appearance
  But a hand set by hand on one border overrides every row of this table
```

> **Two corrections, 2026-09-27.** A fifth row — the limit against unclaimed ground, which the atlas already
> computes (`regionBorders.ts`) rather than taking from a table.
>
> And **"nothing else decides" was too strong**: an authored hand always wins, as
> [s04](s04-save-and-reopen.md) says. The table is the **default**, the gesture is the law. The dev,
> 2026-09-27: _"tu sélectionnes un trait, tu lui donnes un style, comme dans Illustrator."_ What the table
> buys is the dates — homage over Aquitaine ends in 1204 without an anchor moving.

```gherkin
Scenario: the hand is a table, not code
  When I open [Border hands]
  Then I see five rows: sovereign · vassal · union · contested · unclaimed
  And each row carries a pattern, a dash cadence and a width
  And changing a row redraws every border of that relation at once
  And the "unclaimed" row is marked "computed — never declared per border"
```

## The two cases, named by the dev

> 2026-09-27: _"une frontière entre un pays et un no-man's-land … un vassal dessiné dans le territoire d'un
> suzerain doit avoir un certain type aussi."_ Both come out of the drawing; neither asks anything.

```gherkin
Scenario: a limit against ground nobody claims — derived from the drawing alone
  Given the Kingdom of France is drawn
  And the ground east of its Saône limit is claimed by nobody
  When the outline closes
  Then that run is drawn with the frontier hand
  And I declared nothing at all for it
  And the same run against open sea is drawn as coastline instead, not as a frontier
```

> Read off the drawing and the land mask, with nothing to declare. `regionBorders.ts` already does exactly
> this in the atlas.

```gherkin
Scenario: a vassal drawn inside its suzerain
  Given "Duchy of Aquitaine" is declared a vassal of "Kingdom of France"
  And I draw its outline inside France's territory
  When the outline closes
  Then the border between them is the vassal border
  And nothing else is asked
```

> **The dev's own words, 2026-09-27, and they are the whole rule**: _"quand tu dessines un vassal dans un
> suzerain, si tu as déterminé qu'il était vassal d'un suzerain et que le tracé est dans le suzerain, ça
> fait une frontière vassal-suzerain. C'est tout."_
>
> Declared vassal + outline inside the suzerain = the vassal border. No overlap reported, no question put to
> the author. The nesting is read by the tool, never entered by hand.

## A new vassal carves its ground out of its suzerain

> **The dev, 2026-10-15** — the scenario that replaces drawing on top: *« je crée un vassal dans un suzerain,
> je dessine la forme du vassal dans le suzerain ; si le vassal n'existait pas avant, il va creuser dans la
> surface non vassalisée du suzerain »*. Every outline closed from then on carves; what is already drawn keeps
> its overlap, which the author corrects by hand.

```gherkin
Scenario: the outline of a new vassal carves its suzerain's own domain
  Given "Kingdom of France" holds its own domain
  And I create "Duchy of Aquitaine" inside France in {Polities}, with no territory yet
  When I draw Aquitaine's outline over France's own domain and close it
  Then the ground under Aquitaine is no longer France's own domain
  And France and Aquitaine share the anchors of their new common limit
  And that limit is drawn with the vassal hand
  And France's extent outline is unchanged
  And the status bar reads "carved out of Kingdom of France's own domain"
  And one undo takes back both the outline and the carving

Scenario: a vassal drawn wholly inside its suzerain leaves a hole in its domain
  Given France holds its own domain
  When I close a new vassal's outline that touches none of France's limits
  Then France's own domain holds a hole exactly where the vassal is, by the same anchors

Scenario: a new vassal's outline crossing its suzerain's limit
  Given France holds its own domain
  When I close a new vassal's outline that crosses France's limit between two anchors
  Then an anchor is placed at each crossing, shared by both outlines
  And only the part inside France's own domain is carved
  And the part outside stays the vassal's, adding to France's extent
  And the status bar reads "carved out of Kingdom of France's own domain, 2 anchors placed where the limits cross"

Scenario: a carving that cannot be done leaves the overlap, and says so in the console
  Given France holds its own domain
  When I close a new vassal's outline and the carving fails
  Then the outline is closed and kept
  And France's own domain is exactly as it was — any crossing anchor already placed is taken back out
  And the two overlap, for the author to correct by hand
  And the console logs an error: the outline "was closed but not carved out of" France, with the reason, "they overlap"
  And the status bar says nothing of a carving

Scenario: every outline closed for a vassal carves, and nothing already drawn is recomputed
  Given "Duchy of Normandy" is a vassal of France and already holds an outline overlapping France's domain
  When I close another outline for Normandy — an island, an exclave — over France's own domain
  Then France's own domain is carved under the new outline
  And Normandy's first outline keeps its overlap, for the author to correct by hand

Scenario: a new vassal's outline over a co-vassal overlaps it, carves nothing of it
  Given "Duchy of Aquitaine" and "County of Poitou" are both vassals of France
  When I close an outline for Poitou that overlaps Aquitaine
  Then Aquitaine is not touched — the two overlap, and the author corrects the outline
  And only France's own domain is carved
```

> **Settled by the dev, 2026-10-15**: the carving takes from the **suzerain's own domain only**, never from a
> co-vassal (*« il ne le creuse pas, il se chevauche »*); and **every** outline closed for a vassal carves,
> not only its first (*« ça permettra de gérer les enclaves et les exclaves entre vassaux et suzerains »*).
> What is already drawn is never recomputed, so the overlaps being corrected by hand stay as they are.
>
> **Built 2026-10-15 (`0003896`)**: `core/editor/carve.ts`, atomic — a fault puts the suzerain's domain back
> as it was and is said loudly; the Pen's close says what was carved. No walk written down: the fifteen
> vassals recarved in `years/1100` that night were drawn before the Pen knew how, and recarved outside the
> tool (`completed` archive, 15/10). Recarving an existing vassal from the tool is not possible yet
> (`known-issues.md`, CARTO-189).

## Aiming at a suzerain — built 2026-10-15 (`186d017`)

```gherkin
Scenario: aiming at a suzerain strokes its extent and hands over its outline's anchors
  Given "Kingdom of France" holds its own domain, and Aquitaine and Normandy, its vassals, theirs
  When I aim at France with ⟨edit⟩
  Then one outline is stroked around France's own domain and its vassals' together, twice the width of the edit outlines
  And the limits between France and its vassals are not part of it
  And the white arrow takes the anchors of that outline, and France's own anchors not shared with a vassal
  But an anchor France shares with Aquitaine is not offered — that limit is Aquitaine's to edit
  And a ring of France's own still lying under a vassal, sharing nothing with it, is offered, for the author to remove

Scenario: a suzerain with no ring of its own
  Given "Kingdom of France" holds no ring, and its vassals hold theirs
  When I aim at France
  Then its extent outline is stroked around its vassals
  And it is not marked "no territory"
```

> **The dev, 2026-10-15** — point 3 of the note at the top of this file, now a contract: a vassal's limit
> against a foreign polity is its suzerain's limit too, so it is edited from the suzerain; the limits with
> its vassals are theirs (*same evening*). The extent is computed (`core/editor/extent.ts`), cached per
> version. No walk written down.

## Two vassals side by side in one suzerain

> **The dev's test case, 2026-09-27.** It is the normal shape of 11th-century France, and it breaks the
> hands table — which is why it is worth writing down before anything is built.

```gherkin
Scenario: three limits out of two outlines
  Given "Aquitaine" and "Normandy" are both declared vassals of "Kingdom of France"
  And both are drawn inside France, touching each other over 40 shared anchors
  When both outlines close
  Then the Aquitaine–France limit is drawn with the vassal hand
  And the Normandy–France limit is drawn with the vassal hand
  And the Aquitaine–Normandy limit is drawn with the vassal hand too — dotted, at the same weight
  And only a limit against another lineage, like France–Empire, is drawn solid
```

> **Rewritten 2026-10-15, on the dev's call** (*« le même trait »*, `69f3035`, `core/editor/borderHands.ts`).
> Until then the scenario read: ~~*"And the Aquitaine–Normandy limit is drawn with neither / And it is not
> drawn like the France–Empire limit either"*~~.

> ~~**The finding, and it is the point of this case**: the hands table is keyed on _the relation between the
> two parties_, and between two co-vassals **there is no relation**. Neither owes the other. What they
> share is a relation to a **third** party. So no row applies, and the two wrong answers are both
> available: solid says they are sovereigns, dotted says one owes the other.~~ — superseded 2026-10-15: the
> dev chose dotted, the vassal's stroke; the co-vassal row exists (`borderRelation.ts`) and draws as the
> vassal row does.

```gherkin
Scenario: every limit inside one lordship takes the vassal's stroke, at the same weight
  Given France owes nobody, Aquitaine and Normandy owe France, and Poitou and Saintonge owe Aquitaine
  Then the France–Empire limit has no common suzerain, so it is drawn solid, at full weight
  And the Aquitaine–Normandy limit is dotted, at full weight
  And a Poitou–Saintonge limit is dotted, at full weight
  And the Aquitaine–France limit is dotted, at full weight
```

> **Rewritten 2026-10-15, same call** — the co-vassal stroke is `{ dotted, weight 1 }`. The depth of the
> lowest common suzerain is still computed (`borderRelation.ts`, `degree`) but no stroke reads it. Until then
> the scenario was *"the weight of a line follows the depth of the lowest common suzerain"* and read:
> ~~*"And the Aquitaine–Normandy limit shares France at the first degree, so it is drawn lighter / And a
> Poitou–Saintonge limit shares Aquitaine at the second degree, so it is lighter still / And the
> Aquitaine–France limit is the vassal hand, which is a different axis and not a weight"*~~. The blockquote
> below is the 2026-09-27 reasoning, kept for the record; its *"lighter"* no longer holds.

> **One rule, two holes closed.** Depth of the lowest common suzerain also answers **H-23** — _"does the hand
> weaken by degree, or is any link drawn the same?"_ — with the same arithmetic instead of a second
> convention. And it matches what a printed atlas does: a subdivision line gets lighter as it goes deeper.
>
> **Two axes, never mixed.** _Across_ the hierarchy (a vassal to its own suzerain) is the **hand** — dotted.
> _Within_ one lordship (two things at the same depth under one crown) is the **weight**. Aquitaine has both
> at once, on different stretches of its own outline, which is already what this file's opening says: solid
> against the Empire, dotted against France, in the same ring.
>
> **It corrects the "colour by suzerain" scenario below**, which promises the borders between co-vassals
> "stay drawn, with the vassal hand". They must stay drawn — that is exactly what keeps Aquitaine and
> Normandy legible once both take the French colour — but not with the vassal hand, which would claim
> Normandy owes Aquitaine.
>
> **What it costs**: `ComposedStroke.dashed` is a boolean and the dash cadence is global to the layer, so a
> per-depth weight needs the per-pass cadence already validated on 2026-09-22 (option (c), groundwork). No
> new machinery.
>
> **Two vassals of different suzerains — settled by the dev, 2026-09-27**: _"ils ne sont pas dans le même
> pays donc frontière normale."_ Flanders under France beside a bishopric under the Empire have no common
> suzerain at any depth, so the line is drawn at full weight. Which is what the rule already produced — the
> decision confirms it rather than changing it, and closes the conjecture.

## Rear-vassals

```gherkin
Scenario: a vassal of a vassal
  Given the County of Poitou owes Aquitaine, and Aquitaine owes France
  When I look at the Poitou–France border, where they touch
  Then it is drawn with the vassal hand at the second degree
  And the second degree is visually lighter than the first
```

> **H-23 answered above, 2026-09-27** — the weight follows the depth of the lowest common suzerain, which
> settles this scenario's "second degree lighter than the first" with the same arithmetic that settles two
> co-vassals. The original question, kept for the record: does the hand weaken by degree, or is any link in
> the chain drawn the same? In
> 11th–15th century France the rear-vassal is the normal case, not an exception, and the map will be full
> of them.
>
> **What the code does since 2026-10-15** (`borderHands.ts`): every vassal row is dotted at weight 1, so the
> second degree is drawn **like** the first — *"visually lighter"* above is not built. Whether the dev's
> *« le même trait »* also settles rear-vassals is not written down; open, not decided here.

## The empires view

```gherkin
Scenario: colour by crown instead of by polity
  Given Aquitaine, Normandy and Poitou all owe France
  When I enable "colour by suzerain"
  Then all four take the French colour
  And every limit inside the group stays drawn
  And a vassal's limit against France keeps the vassal hand
  And a limit between two co-vassals keeps its depth weight, not the vassal hand
  And the border around the whole group is the only sovereign line
```

> **This is what the vassal hand is for.** With the fills merged, the line is the *only* thing left saying
> the structure exists — so it must read over two identical colours, not just over a contrast.
>
> **Corrected 2026-09-27**: this scenario used to give the vassal hand to *every* border inside the group,
> which would claim Normandy owes Aquitaine. Inside the group there are two different lines, and merging the
> colours is precisely when confusing them costs the most — the ink is all the reader has left.
>
> **Out of step since 2026-10-15**: co-vassals now take the vassal's stroke (the note at the top of this
> file), so ~~*"a limit between two co-vassals keeps its depth weight, not the vassal hand"*~~ no longer
> holds. The view itself is not built.

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
