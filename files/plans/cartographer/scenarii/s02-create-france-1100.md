# 02 — Create a polity that does not exist: the Kingdom of France, 1100

> [Index](s00-index.md) · **the central case.** OHM carries the Kingdom of France at 1100 as a _label-only_
> relation: it has the name, `border_type=kingdom`, `place=country` and a Wikidata id, and **no geometry
> at all**. Measured 2026-09-22.
>
> Geographically this is the best possible exercise: the royal domain's eastern limit in 1100 runs along
> the Scheldt, the Meuse, the Saône and the Rhône — _les quatre rivières_ — so it is mostly a **snapping**
> job, with free-hand reporting only where it leaves the water.

## Creating the identity

```gherkin
Scenario: create a polity from nothing
  Given "europe-1100.json" is loaded
  When I press [+ New polity]
  Then {Details} opens an empty form
  And the form asks for: name, rank, status, exists from, exists to, suzerain, colour, Wikidata id
  And the polity is created with no territory
  And it appears in {Polities} marked "no territory"
  And it becomes the selected polity
```

```gherkin
Scenario: fill the identity by hand
  Given an empty polity form
  When I type "Kingdom of France" in the name field
  And I choose "kingdom" from the rank list
  And I choose "country" from the status list
  And I type 987 in "exists from"
  And I leave "exists to" empty
  And I leave the suzerain empty
  And I leave the colour on "automatic"
  Then the polity reads "Kingdom of France · kingdom · 987–" in {Polities}
  And it takes a palette colour no neighbour is using
```

> **Colour**: explicit when given, palette-by-adjacency otherwise. Already how `pinnedRegionColor` +
> `assignRegionColors` work. Groundwork §6 quater warns: if _every_ polity is pinned, the anti-collision
> stops working and two neighbours can come out identical.

```gherkin
Scenario: pull the identity from OHM instead of typing it
  Given OHM holds "Kingdom of France" at 1100 with a Wikidata id and no geometry
  When I press [Import identity from OHM…]
  And I search "France"
  And I choose "Kingdom of France (Q…) — kingdom · country · no geometry"
  Then the form is filled: name, rank, status, dates, Wikidata id
  And the French name is taken from `name:fr` when OHM has one
  And the polity is created with no territory
  And its provenance records "identity: OpenHistoricalMap (CC0)"
```

> **This is the find of the measurement.** For 1100 OHM supplies the _identity_ of what it cannot draw —
> and `name:fr` is present on 81 % of relations, in an atlas written in French. Retyping it would be
> waste. **Hole H-01**: does this query OHM live, or read the cached `relations.json` the spike already
> holds?
>
> **The chrome is English, the content is not, and nothing about the 2026-10-08 decision touches this.**
> A polity's name is **data**: *"Reaume de France"* is period spelling, `name:fr` is why it reads in
> French at all, and the atlas publishes it as written. What is English is the interface around it —
> buttons, labels, the status bar, the notices. So the status bar reads `Drawing in Reaume de France`:
> an English verb, and the name verbatim. Translating a polity's name would be editing a historical
> record, which is the one thing this tool must never do.

## Drawing the territory

```gherkin
Scenario: validating the form hands me the Pen
  Given I have filled the form for "Kingdom of France"
  When I press [OK]
  Then the polity is created with no territory
  And it becomes the drawing target
  And ⟨draw⟩ becomes the active tool, without my asking for it
```

```gherkin
Scenario: I always know who I am drawing for
  Given I have selected a polity in {Polities}
  Then a notice announces it — "Drawing: Kingdom of France", with its colour swatch
  And the notice withdraws on its own after about five seconds
  When there is no drawing target
  Then the Pen refuses to place an anchor, and says which polity to select first
```

> **The gap the dev found**, 2026-09-22 — and it is the sharper half of his question. You switch to the Pen
> and place four hundred anchors, and **nothing on screen says which polity they land in**. Drawing an
> entire frontier into the wrong country is a mistake noticed only afterwards, and undoing it is four
> hundred steps or one, depending on nothing useful.
>
> **Revised by the dev, 2026-10-08: the notice is transient, not permanent.** *"C'est un petit peu comme
> une sting bar — lorsque tu sélectionnes, ça apparaît, ça reste 5 secondes et ça s'en va."* It is not
> pinned to the cursor either. **And it is explicitly not a priority** — the state behind it exists (step
> 4d-2 (c1)), the display is whatever reads best.
>
> **The tension worth carrying into that decision, and nobody has settled it.** The paragraph above
> justifies the notice by a mistake that is noticed *afterwards* — so an announcement that withdraws after
> five seconds does not cover the case it was written for: start drawing a minute later and the screen is
> silent again. The dev's own second variant does cover it — *"ça peut apparaître 5 secondes en haut, puis
> ça se met en tout petit, en bas à gauche ou en bas à droite du viewport"* — because something stays.
> Whichever is chosen, the **refusal** is unaffected: with no target the Pen does not place an anchor, and
> that is the guarantee the state actually enforces.
>
```gherkin
Scenario: choose the polity by clicking its fill
  Given ⟨edit⟩ is active
  When I click inside the fill of "Holy Roman Empire", away from any handle
  Then "Holy Roman Empire" becomes the drawing target, and ⟨edit⟩ stays the tool
  When a duchy is drawn inside the kingdom and I click inside the duchy
  Then the duchy becomes the target — the polity painted on top wins
  When I click on unclaimed ground
  Then no polity is the target any more — as in Illustrator, a click on nothing deselects
```

> **A second way to the same choice — the dev's request, 2026-10-11**: *"en cliquant dans le plein
> d'une forme … on puisse la sélectionner, même si on peut le faire avec le panneau."* It adds a route,
> it does not change the rule below: you still pick **who** before you act. Only the white arrow does
> it — under the Pen, a click in a fill places an anchor, since one draws over a neighbour all the time.

> **Selecting the target is a gesture of `{Polities}`, not of the toolbar** (the dev, 2026-10-08): you pick
> **who** first, then you act. That is the deliberate difference from Illustrator, where selecting a point
> selects the object that holds it. Here the question *"whose points am I moving?"* is answered before the
> gesture rather than deduced from it — which is why the target governs ⟨edit⟩ as much as ⟨draw⟩.

## Picking a tool is always allowed — it is the cursor that refuses

```gherkin
Scenario: the Pen is in hand and nobody is selected
  Given a year is open and no polity is selected
  When I choose ⟨draw⟩
  Then ⟨draw⟩ becomes the active tool
  And over the canvas the cursor is `not-allowed`
  And a click places nothing, and says which polity to select first
```

```gherkin
Scenario: reach for a polity with the Pen in hand
  Given ⟨draw⟩ is active and no polity is selected
  When the pointer leaves the canvas and enters {Polities}
  Then the cursor becomes the browser's own default arrow
  When I click a polity in the list
  Then it becomes the drawing target
  And a notice announces it, and withdraws on its own after about five seconds
  When the pointer returns to the canvas
  Then the cursor is the Pen's cross
  And a click places an anchor in that polity
```

```gherkin
Scenario: the arrow waits for the same thing
  Given ⟨edit⟩ is active and no polity is selected
  Then over the canvas the cursor is `not-allowed`
  And a click selects nothing — there is no polity whose points it could select
```

```gherkin
Scenario: the target disappears under an undo
  Given "Kingdom of France" is the drawing target and ⟨draw⟩ is active
  When I press ‹ctrl+z› and the creation is taken back
  Then no polity is selected
  And the cursor becomes `not-allowed` without my touching the tool strip
```

> **Settled 2026-09-22 and re-affirmed by the dev on 2026-10-08**: a tool can always be picked up, and
> the **cursor** carries the refusal. `CURSORS.md` records `not-allowed` as the answer.
>
> **Why the cursor rather than a disabled button.** Both were on the table on 2026-10-08 — the dev first
> said *"la plume et la flèche doivent être désactivées"*, then recognised the earlier decision and kept
> it. The cursor is the better of the two for a reason the canvas makes plain: it answers **where** the
> gesture is refused rather than **whether** the tool exists. The Pen is perfectly usable the moment a
> polity is selected, and nothing about the tool itself is unavailable; what is missing is a subject. A
> greyed button says "this tool is broken"; `not-allowed` under the pointer says "not on this ground,
> not yet", which is true.
>
> **And it applies to ⟨edit⟩ exactly as it does to ⟨draw⟩** — the dev's own argument, and it is the less
> obvious half: selecting points with nobody selected is selecting *whose* points? The arrow has the same
> missing subject, so it gets the same refusal.
>
> **The general rule this scenario establishes, and it belongs to the whole application**: the tool
> cursors are the **canvas's** and nowhere else. The chrome is DOM — a list, a form, a button — and over
> DOM the pointer is whatever the platform says: an arrow over a row, a caret over a field. That is not a
> nicety here, it is load-bearing: **the gesture that chooses the target is a click in `{Polities}`**, so
> the pointer has to be clickable-looking exactly where the canvas refuses it.
>
> **The last scenario is the one no interface produces** — the target is session state and the polity is
> document state, so `ctrl+z` takes the subject away under a tool that was legitimate a second earlier.
> Nothing needs to watch for it: the cursor is derived from whether the target resolves, and after the
> undo it does not.

### The cursor belongs to the zone under the pointer

Dictated by the dev as a walk across the screen, 2026-10-08, and written as the walk rather than as a
table — the sequence is what makes it obvious.

```gherkin
Scenario: a walk from the toolbar to the canvas and back
  Given ⟨draw⟩ is active and no polity is selected
  And the pointer is over the {Tools} strip
  Then the cursor is the browser's own default
  When the pointer enters the canvas
  Then the cursor says the Pen cannot be used: there is no polity to draw in
  When the pointer leaves the canvas for {Polities}
  Then the cursor is the browser's own default again
  And I can see which row I am about to click
  When I click a polity
  Then it becomes the drawing target
  When the pointer returns to the canvas
  Then the cursor is the Pen's cross
  And it adapts to what lies under it — starting an outline, extending one, closing one
  When the pointer leaves the canvas to reach the {Tools} strip
  Then the cursor is the browser's own default
  And I can choose ⟨navigate⟩ or ⟨edit⟩ without a tool cursor in the way
```

```gherkin
Scenario: the tools that need no subject
  Given no polity is selected
  When I choose ⟨navigate⟩
  Then the pointer over the canvas is the open hand
  And panning and zooming work, because they belong to no polity
```

> **The rule in one line**: a **tool** cursor exists only over the **canvas**. Everywhere else the pointer
> is the platform's — an arrow over a row, a caret in a field, whatever a button gives.
>
> **And it costs no code, which is the part worth knowing.** `cursor` is a CSS property of an element, so
> setting it on the canvas node applies it over the canvas and nowhere else; the browser restores the
> surrounding pointer on its own. There is no "pointer left the canvas" handler to write and therefore
> none to forget — the transitions in the walk above are satisfied by construction.
>
> **Why the walk had to be written down**: the gesture that gives the Pen a subject is a **click in the
> chrome**. If a tool cursor leaked outside the canvas, the one pointer the author needs to aim with — on
> the row of the polity they are about to select — would be the one saying "you cannot draw here".

## The status bar names the action and whose it is

```gherkin
Scenario: drawing, and the bar says in whose territory
  Given ⟨draw⟩ is active and "Kingdom of France" is selected
  When I place the first anchor
  Then the status bar reads "Drawing in Kingdom of France"
  And it keeps reading it while I place the rest
```

```gherkin
Scenario: selecting points, and the bar says whose
  Given "Kingdom of France" is selected and ⟨edit⟩ is active
  When I select one or more of its anchors
  Then the status bar reads "Selecting path from Kingdom of France"
  When I start dragging the selected anchors
  Then the status bar reads "Moving path from Kingdom of France"
  When I release
  Then the bar stops naming an action and shows what lies under the pointer again
```

```gherkin
Scenario: the same sentence for every gesture that has a subject
  Given "Kingdom of France" is selected
  When ⟨draw⟩ is active and the pointer enters the snapping radius of the outline's first anchor
  Then the status bar reads "Closing the outline of Kingdom of France"
  When ⟨draw⟩ is active with ⟨snap to coast⟩ and the pointer is within range of the coastline
  Then the status bar reads "Following the coastline for Kingdom of France"
  When ⟨draw⟩ is active with ⟨snap to river⟩ within range of the Meuse
  Then the status bar reads "Following the Maas for Kingdom of France"
  When ⟨edit⟩ is active over a stretch away from any handle
  Then the status bar reads "Inserting a point into Kingdom of France"
  When ⟨draw⟩ hovers an anchor another outline also holds
  Then the status bar reads "Branching from a shared anchor — held by 2 paths"
```

```gherkin
Scenario: no subject, so the bar says what to do about it
  Given no polity is selected
  When ⟨draw⟩ or ⟨edit⟩ is active and the pointer is over the canvas
  Then the status bar reads "Select a polity to draw in"
  And the cursor is `not-allowed`
```

> **The dev's call, 2026-10-08**: *"dans la status bar on a une description de l'action — Drawing in
> Polity · Selecting Path from Polity · Moving Path from Polity"*, with the principle stated and the
> declensions left to be written out.
>
> **And it closes the hole the transient notice left open.** The notice withdraws after about five
> seconds; the status bar does not. So the mistake this whole section exists to prevent — four hundred
> anchors landing in the wrong country unnoticed — is guarded by the **bar**, continuously, while the
> notice only announces the change of subject. That reverses which of the two is load-bearing, and it is
> why the notice being transient costs nothing.
>
> **The pattern, so a new gesture needs no new decision**: a verb for what is happening, and the polity it
> is happening to. Present participle, the polity's name verbatim, never its id. A gesture with no subject
> gets no sentence of this kind.
>
> **Both are shown at once — settled by the dev, 2026-10-08**: *"toutes ces informations doivent être
> affichées à la fois, l'action et le nombre de points insérés. Je ne vois pas pourquoi l'un prendrait la
> place de l'autre."* So the action description and a transient result are **two zones side by side**, not
> one slot taken in turn. That closes a question raised here an hour earlier as an open one, and it closes
> it the right way round: a result that overwrote the action would blank the subject at the exact moment
> four hundred anchors were going down.
>
> ```
> Drawing in Kingdom of France          inserted 412 vertices from the coastline
> ```
>
> **The interface is in English — the dev's call, 2026-10-08**: *"tous les textes seront en anglais."*
> The strings above are therefore shipped as written, not translated. **That is the Cartographer only**;
> the atlas stays French, being the published product whose margin degrees are already written `30°O`.
> One consequence worth naming: the ICU MessageFormat layer decided for the atlas on 2026-09-24 is not
> needed here, so this application carries no translation table at all.
>
> The ⟨edit⟩ gestures here are [s03](s03-edit-existing-border.md)'s subject; they are written beside the
> Pen's because the sentence is the same shape for both, and the subject it names is this scenario's.

```gherkin
Scenario: leave the Pen without having drawn anything
  Given "Kingdom of France" was just created and holds no territory
  When I press ‹A› and select another polity
  Then the Kingdom of France is kept, not discarded
  And it stays in {Polities}, marked "no territory"
  And [Draw territory] on its card hands me the Pen again, with it as the target
```

> **The dev asked whether it should be deleted instead** — _"le fait de sélectionner un autre outil, sans
> avoir fait de tracé, ferait que ce nouveau pays serait effacé"_. **No, and the reason is measured**: at
> 1100 OHM gives the Kingdom of France its name, rank and Wikidata id with **no geometry at all**, and bulk
> identity import ([s07](s07-manage-the-registry.md)) creates dozens of such polities at once. A
> territory-less polity is not an odd transient state, it is the normal starting state of this whole map.
> Discarding one on a tool change would also throw away a filled-in form with no warning — the same loss of
> work refused for file replacement in [s05](s05-derive-a-year.md).
>
> **What keeps the list from filling with ghosts**: the "no territory" marker, the _appears in no year_
> filter already in s07, and the pre-publication check.

```gherkin
Scenario: start an outline
  Given "Kingdom of France" is the drawing target and has no territory
  When I press [Draw territory], or press ‹P›
  Then ⟨draw⟩ becomes the active tool — the Pen
  And the cursor becomes a cross
  And a tool strip offers ⟨free point⟩, ⟨snap to river⟩, ⟨snap to coast⟩
  And ⟨free point⟩ is active by default
  And no Bézier handle is ever offered: a click places a point, a drag does not curve anything
```

> **The modes are the Pen's tool group — the dev's call, 2026-10-11, "copier pas à pas Illustrator".**
> No separate strip: the Pen's button carries Illustrator's corner triangle, and holding it, right-clicking
> it or pressing → opens its hidden tools — *Pen* (P), *Pen — follow the coast*, *Pen — follow a river*.
> The square marks the one in use, the button takes its name, and choosing a row puts the Pen in hand.
>
> **⟨reuse border⟩ is gone**, and nothing replaced it: reusing a neighbour's line is _duplicating a path_,
> which is a command on an existing outline rather than a mode of the Pen. See the section below and
> [s00](s00-index.md).

```gherkin
Scenario: how the outline in progress reads on screen
  Given I have placed eleven anchors and the outline is still open
  Then the eleventh anchor is drawn solid, in selection blue
  And the ten before it are drawn white with a blue outline
  And a rubber band runs from the eleventh anchor to the pointer
  And every handle is about 8 screen pixels across, at any zoom
```

> The dev: _"Les points d'une même ligne en cours de dessin sont blancs à part le dernier qui est bleu."_
> The selection blue is a reserved ink, never a polity colour — see [s00](s00-index.md).

```gherkin
Scenario: follow the coast without placing points by hand
  Given ⟨draw⟩ is active and no point has been placed
  When I choose ⟨snap to coast⟩
  And I click near the mouth of the Somme
  Then a first vertex is placed exactly on the coastline contour
  When I click near the tip of Brittany
  Then the whole coastline sub-path between the two is inserted
  And the status bar reads "inserted 412 vertices from the coastline"
  And those vertices carry provenance "Natural Earth 10m (public domain)"
```

> Two clicks, several hundred exact points. The coastline contour already exists —
> `createMaskCoastlineSource`, marching squares over the land mask.

```gherkin
Scenario: see the stretch before the click that inserts it
  Given ⟨draw⟩ follows the coast and an anchor sits on the coast at the mouth of the Somme
  When the pointer moves along the shore towards Brittany
  Then the stretch from the Somme to the coast vertex under the pointer is drawn, heavier than the outline
  And that vertex is emphasised and the cursor shows the snapping mark
  And the status bar reads "Following the coastline for Kingdom of France"

Scenario: an island or a looping coast is followed the short way round
  Given the two clicks lie on the same closed contour
  Then the stretch inserted is the shorter of the two ways round it

Scenario: a second click on the vertex already placed
  When I click again on the coast vertex the outline already ends on
  Then nothing is placed, and nothing is reported as inserted

Scenario: the coast is out of reach
  Given ⟨draw⟩ follows the coast
  When the pointer is further from any coast than the snapping radius
  Then the status bar reads "Drawing in Kingdom of France — no coastline within reach, placing points freely"
  And a click places an ordinary free point
```

> **Decided with the dev, 2026-10-11.** The preview is his call — *"avec l'aperçu"* — and the reason is
> the cost of being wrong without it: between the Channel and the Atlantic, the difference is thousands
> of anchors, learnt only after the second click. The short way round is mine, taken on the approach he
> approved: the long way from the Somme to Brittany is the coast of the whole continent. The out-of-reach
> line keeps the polity in the sentence, because the bar's rule is that it always names whom the action
> is for. Snapped anchors carry the provenance the land mask declares (`"Natural Earth 10m land minus
> lakes"`, public domain), read from the mask itself.

```gherkin
Scenario: follow a river
  Given the outline is open and its last vertex is on the Scheldt estuary
  When I choose ⟨snap to river⟩
  And I click near the Scheldt
  Then the nearest vertex on the nearest polyline is highlighted, with the river's name
  When I click again further upstream
  Then the sub-path between the two is inserted
  And its provenance is "Natural Earth 10m rivers (public domain)"
```

```gherkin
Scenario: the river I need is not in the dataset
  Given I want to follow the Scheldt
  When I hover near it with ⟨snap to river⟩
  And no polyline lies within the snapping radius
  Then the status bar reads "no river within 12 km — place points freely"
  And clicking places an ordinary free point
```

> **Hole H-02.** We hold **591** Natural Earth polylines, chosen by `scalerank`. The Saône and the Rhône
> are certainly there; the Scheldt and the Meuse are **not verified**. Three of _les quatre rivières_ are
> the 1100 frontier — if one is missing, the headline gesture of this scenario fails on the very case it
> was designed for. **Measure before building.**

```gherkin
Scenario: report a stretch by eye
  Given the border leaves the Saône and crosses the Langres plateau
  And I have the Duby atlas open beside me on paper
  When I choose ⟨free point⟩
  And I click where I read the border to run, using the coastline, the rivers and the cities as landmarks
  Then each click places one vertex
  And its provenance is "reported by eye — Duby (reference)"
  And no image is traced and no control point is placed
```

> Decided 2026-09-22. This is **fact extraction**, which the Duby and Euratlas licences permit, and it is
> what made both usable again. Groundwork §6 quinquies.

```gherkin
Scenario: take back the last point
  Given I have placed eleven vertices
  When I press ‹backspace›
  Then the eleventh vertex is removed and the rubber band follows the tenth
  When I press ‹escape›
  Then the whole outline in progress is abandoned
  And the polity is left with no territory
```

```gherkin
Scenario: close the outline
  Given the outline has 340 anchors and the pointer comes near its first
  When the pointer enters the snapping radius of the first anchor
  Then that anchor is emphasised and the cursor shows the closing mark
  When I click it
  Then the ring closes
  And the fill is painted in the polity's colour
  And {Polities} stops marking it "no territory"

Scenario: close without going back to the first anchor
  Given the outline is open
  When I press ‹enter›
  Then the ring closes on a straight segment from the last anchor to the first
```

> **H-04 settled 2026-09-22.** Closing by proximity to the first anchor, announced before the click, as
> the dev asked: _"arrivé à une certaine proximité, on peut fermer un tracé."_ ‹enter› is kept as the
> keyboard equivalent; double-click is not used, because it is the atlas's fly-to gesture and the two
> would collide.
>
> **The tolerance is in screen pixels, not kilometres** — so at continent scale it is genuinely about
> 50 km wide, and that is correct rather than a defect: nobody can aim finer than a pixel. It is the same
> constant as every other handle: `snapRadius / scale`.

## The neighbour — and the hard part

```gherkin
Scenario: the outline crosses a polity that already exists
  Given the Holy Roman Empire already claims Lorraine
  When I close an outline that overlaps it
  Then the overlap is reported, not silently resolved
  And I am told "Kingdom of France overlaps Holy Roman Empire over 1 840 km²"
  And I am offered: take the ground · leave it · adjust the outline
```

> **H-05b — and only between peers.** `rasteriseRegions` today resolves overlap by "later index wins",
> silently, which in an editor would let the newest polity eat its neighbour with no trace. It stays open
> for two polities with no dependency between them, because contested ground is a _fact_ nobody can guess.
> A vassal inside its suzerain is a different thing entirely — see below.

```gherkin
Scenario: draw a duchy inside the kingdom that holds it
  Given the Kingdom of France is drawn and no duchy exists yet
  When I create "Duchy of Aquitaine" with rank "duchy" and suzerain "Kingdom of France"
  And I draw its outline inside France's territory
  Then no overlap is reported
  And France keeps its whole outline, uncut
  And the duchy paints the cells it covers, because it is the more specific polity
  And the border between them is drawn with the vassal hand, with nothing else declared
```

> **H-05a, settled by the dev's own example**, 2026-09-22: _"c'est un duché qui appartient à la France"_ —
> a vassal inside its suzerain is not an overlap, it is vassalage. Two consequences worth keeping:
>
> **The painting rule becomes hierarchy depth, not file order.** Today "later index wins" means reordering
> the entries in a file would change the map. Depth is deterministic and means something. It is also the
> fix for the recorded `colorBySuzerain` defect, which colours by index and never reads the hierarchy.
>
> **`subjectTo` says the law, not the power.** In 1100 William IX holds more land than Philip I, and fifty
> years later Aquitaine leaves for the Plantagenets. The vassal hand shows a legal tie while the reader
> sees that the vassal is twice the size of its suzerain — both true at once, neither faked.

```gherkin
Scenario: branch a new outline from an anchor that already exists
  Given the Holy Roman Empire's western limit already runs along the Meuse
  And ⟨draw⟩ is active with no outline in progress
  When I hover an anchor of that limit
  Then the anchor is emphasised and the cursor shows the branching mark
  And nothing offers to delete it
  When I click it
  Then a new outline starts from that very anchor — not from a copy of it
  And the status bar reads "branched from a shared anchor — held by 2 paths"
```

```gherkin
Scenario: follow a neighbour's border between two of its anchors
  Given the Holy Roman Empire's western limit runs along the Meuse
  And I have joined one of its anchors with the Pen
  When the pointer comes onto another anchor of the same limit
  Then the run of the limit between the two is previewed, the short way
  When I click it
  Then the outline follows that run over the Empire's own anchors — none is copied
  And the status bar reads "followed 96 anchors of a shared border"
  And moving any of those anchors afterwards moves both polities' borders
```

> **Built 2026-10-11, on the dev's request** — *"le snapping pour les frontières communes"*. An existing
> anchor wins over a free point: the border is already there. Undoing the closing and closing again
> shares the same anchors; only the points the outline created itself are new.
>
> **Corrected the same evening, the dev drawing Spain then Portugal**: an anchor no longer wins over the
> coast. A neighbour drawn along the shore leaves an anchor on every coast vertex, so with the Pen
> following the coast those anchors hijacked the click — *"j'ai la fonctionnalité branching"* — and the
> next click could not follow the shore from there. **Following the coast, the shore wins**, and a
> coast vertex that is already an anchor is **that anchor, reused by its index** — matched exactly,
> since an anchor placed from the coast is its vertex's own coordinates and nothing rounds it at save.
> So the junction stays one shared anchor and the coast is followed from it. Branching still holds in
> free mode, and off the shore. The cost: in coast mode, near the shore, a shared border is not
> followed anchor to anchor — switch to free mode for that.

> The dev, 2026-09-22: _"À partir d'un point sur lequel on clique, on ne le supprime pas comme dans
> Illustrator, mais on fait démarrer un autre tracé car nous aurons des points en commun sur plusieurs
> tracés."_ Illustrator's Pen deletes an anchor it is hovering; here that gesture is worth far more as a
> junction. Deletion lives under ⟨edit⟩ — [s03](s03-edit-existing-border.md).

```gherkin
Scenario: reuse the neighbour's line instead of redrawing it
  Given the Empire's western limit runs along the Meuse over 96 anchors
  When I select that run and press [Duplicate into the selected polity]
  Then the Kingdom of France gains a path running over those same 96 anchors
  And the anchors are NOT copied
  And moving any one of them afterwards moves both outlines
  And the status bar reads "96 anchors · 2 paths"
```

> **H-06 settled 2026-09-22, by the dev's own answer**: _"On duplique un tracé et on aura des tracés
> concomitants, c'est tout."_ The mechanism is in [s00](s00-index.md) and turns on one point: **the list
> is duplicated, the anchors are not.** Copying the anchors would put the two outlines back on independent
> geometry, and the sliver `extractRegionBorders` abolished at render time would reappear at authoring
> time.

## Rings inside rings — H-07, settled by the drawing target

```gherkin
Scenario: the geometry decides whether it is a hole or a second piece
  Given "Kingdom of Poland" is the drawing target and already holds territory
  When I draw a closed outline entirely inside one of its rings
  Then it is a hole — nothing is asked
  When instead I draw a closed outline disjoint from its territory
  Then it is a second piece, an exclave — nothing is asked either
```

> **H-07 settled 2026-09-22.** The hole asked how the _user_ says "this ring is a hole" rather than "a
> second piece of the same country". With a drawing target, the question disappears: **inclusion
> decides**. Contained → hole, disjoint → exclave. That is already what even-odd does at rest, so neither
> the format nor the rasteriser changes.

```gherkin
Scenario: a hole must be given to someone, or declared empty on purpose
  Given "Kingdom of Poland" is the drawing target
  When I close a ring drawn inside its territory
  Then I am asked, once, who holds that ground
  And I am offered: an existing polity · a new polity · nobody
  When I pick an existing polity
  Then the hole and the enclave are created together, as one undo step
  When I pick "a new polity"
  Then the form opens, and the same thing happens on validation
  When I pick "nobody"
  Then the ground is left unclaimed and recorded as deliberate
  And the pre-publication check does not report it as a defect
```

> The dev, 2026-09-22: _"il faut qu'on me dise, tu ne peux pas faire de trou qui n'appartienne à
> personne."_ **Asked rather than forbidden** — a genuine no-man's-land has to remain possible, which is
> the rule stated at the top of [s00](s00-index.md): the tool does not manufacture a defect on its own, and
> does not forbid a fact either.
>
> **Why this moment and no other.** Closing the ring is the only point where everything is known: exactly
> one polity surrounds the ground, so there is no ambiguity about the neighbour, and the author still knows
> why they drew it. Three days later in a check report, that reason is gone. This is
> [H-26](s99-holes.md) — the enclosed hole offered to its surrounding polity — moved to the moment it is
> born.
>
> **And the common case needs no hole at all**: an enclave held by a _vassal_ simply paints over its
> suzerain (H-05a above), with nothing cut out. A hole is only needed when the enclave belongs to a **peer**
> — the Three Bishoprics inside Lorraine — or when the ground really is held by nobody.

## Seeing the result

```gherkin
Scenario: the fills and borders refresh
  Given I have closed the Kingdom of France's outline
  When the outline is committed
  Then the vector outline is drawn immediately
  And the raster fill and the derived borders are recomputed in the background
  And a quiet indicator shows the recompute is running
  And the interface stays usable throughout
```

> **Hole H-08.** Rasterising a year at the 4× grid costs **~825 ms**, measured. A refresh per vertex is
> impossible. So there are two representations on screen at once — the live vector outline and the
> lagging raster fill — and what happens when they disagree has to be designed, not discovered.
