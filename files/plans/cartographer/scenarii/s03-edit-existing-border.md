# 03 — Improve a border that was imported

> [Index](s00-index.md) · the dev's other stated case: _"je veux améliorer une frontière"_. The imported
> OHM geometry is right in outline and wrong in detail; this is the gesture that earns its keep.

## Getting to the vertices

```gherkin
Scenario: reveal the handles
  Given "Holy Roman Empire" is selected and holds 894 anchors
  When I press [Edit vertices], or press ‹A›
  Then ⟨edit⟩ becomes the active tool — the white arrow
  And anchors within the viewport are drawn white with a blue outline
  And anchors outside it are not drawn at all
  And the status bar reads "894 anchors · 61 in view"
```

> **Hole H-03.** 894 handles over a continent is a smear, and Byzantium has 2 258. Options: draw handles
> only above a zoom threshold; draw only those in view (above); draw a decimated set and densify on
> approach. The third is the one that risks lying about where the vertices are.

```gherkin
Scenario: handles keep their size as I zoom
  Given ⟨edit⟩ is active
  When I zoom in by a factor of ten
  Then each handle is still about 8 screen pixels across
  And the stroke joining them is still about 1 screen pixel
```

> `handleSize / scale`, `lineWidth / scale`. Groundwork §6 sexies, trap 3.

## Selecting anchors — the white arrow

```gherkin
Scenario: select one anchor
  Given ⟨edit⟩ is active and handles are visible
  When I click a handle
  Then it is drawn solid, in selection blue
  And every other handle stays white with a blue outline
  And {Details} reads its lon/lat, its provenance, and how many paths hold it
```

```gherkin
Scenario: add to the selection
  Given one anchor is selected
  When I shift-click three more
  Then all four are drawn solid blue
  When I shift-click one of them again
  Then it drops out of the selection and goes back to white
```

```gherkin
Scenario: select with a marquee
  Given ⟨edit⟩ is active
  When I press on empty ground and drag a rectangle over twelve handles
  Then a selection rectangle follows the pointer while it is down
  And on release those twelve anchors are drawn solid blue
  And the rectangle disappears, leaving no bounding box and no frame
  And anchors merely crossed by the rectangle's edge count as inside it
```

> The dev, explicitly: _"une fois que les vertices sont sélectionnés, ça ne crée pas de rectangle de
> sélection."_ Same decision as the refused transform box, same reason — nothing here is rotated or
> scaled, so a frame would promise a handle that does not exist.

```gherkin
Scenario: move several anchors at once
  Given twelve anchors are selected
  When I drag any one of them
  Then all twelve move together, keeping their relative positions
  And every path holding any of them follows
  And the move is committed as one undo step
```

> Selecting a whole outline and moving it falls out of this — marquee the lot and drag. The dev does not
> want it as a feature and we do not build towards it, but nothing forbids it either. See
> [s00](s00-index.md).

```gherkin
Scenario: a selected anchor is legible over any fill
  Given an anchor sits on a polity whose fill is the slate blue palette slot `#54719b`
  When I select it
  Then the selection blue it takes is a reserved ink, never served to a polity
  And it still separates from the fill underneath
```

> **A11Y-101 measured this on our own palette**: no single ink clears 3:1 against fills running from gold
> `#d4b24a` to slate blue `#54719b`. Illustrator gets away with a blue selection because its artboard is
> white; ours is parchment under saturated fills. Hence the two rules — the selection blue is reserved,
> and the unselected handle pairs white with that same blue, so one of the two always reads.

## The three point operations

```gherkin
Scenario: move an anchor
  Given ⟨edit⟩ is active and handles are visible
  When I press on a handle and drag it
  Then that vertex follows the pointer
  And the two stretches either side of it follow
  And the status bar reads the vertex's live lon/lat
  When I release
  Then the move is committed as one undo step
```

```gherkin
Scenario: a vertex snaps while being moved
  Given I am dragging a vertex near the Rhine
  When the pointer comes within the snapping radius of a river polyline
  Then the vertex previews as landing exactly on it
  And the river's name is shown
  When I release
  Then the vertex takes the river's own coordinate, not the pointer's
  And its provenance changes to "Natural Earth 10m rivers"
```

```gherkin
Scenario: insert an anchor
  Given ⟨draw⟩ is active with no outline in progress
  When the pointer is over a stretch of the target between two anchors
  Then the cursor shows the Pen's plus
  When I click
  Then a new anchor is created at that point on the stretch
  And every path running over that stretch gains it, so none of them can drift

Scenario: the white arrow does not insert
  Given ⟨edit⟩ is active
  When I click on a stretch between two anchors, away from any handle
  Then no anchor is created, and the cursor is the plain arrow
```

> **Moved to the Pen by the dev, 2026-10-14**: *« c'est beaucoup plus cohérent »* — the white arrow selects,
> as Illustrator's Direct Selection does; adding a point is the Pen's, which already did it over the target's
> stretch since 2026-10-11. The one gesture lost is insert-and-drag in a single press: it is now a Pen click,
> then a drag with ‹A›. It frees the arrow's click on a stretch for selecting that stretch (`{Line}`, `s13`).

```gherkin
Scenario: delete an anchor
  Given ⟨edit⟩ is active
  When I click a handle to select it
  And I press ‹delete› or ‹backspace›
  Then the anchor is removed and its two stretches merge into one
  When the target's ring would be left with fewer than three anchors
  Then the ring is deleted whole, as if all its points had been selected — "removed 1 ring (N anchors)"
  When a neighbour's ring would be left with fewer than three
  Then the neighbour keeps those points, and the result names it — "… kept its points"
```

> **Nothing refuses a deletion — the dev, 2026-10-14**: *« Je devrais pouvoir enlever ce que je veux comme
> point. Y'a rien qui doit m'empêcher d'enlever des points. Rien. »* The refusal below it is superseded: a
> ring under three anchors still never stays in the document (it would vanish on the next open), but the
> gesture resolves it instead of refusing — the target's ring goes, a neighbour's is not the target's to
> delete. One ‹ctrl+Z› puts everything back.

> `projectRegions` already drops rings under 4 vertices on load — so a ring reduced below that would
> silently vanish on the next open. Refusing at the gesture is the honest place.
>
> **Counted the way the file stores a ring** (2026-10-11): a GeoJSON ring repeats its first vertex at
> the end, so its 4 vertices are **3 anchors** in our index lists, where the closure is implied. The
> tool refuses under three anchors and says *"a ring needs at least three anchors"* — the same
> threshold, in the unit the author sees.
>
> **What the first rung does, and does not** (2026-10-11): a click on one of the **target's** stretches
> inserts a point reported by eye into every ring over it, and keeping the pointer down drags it — two
> undo steps, the insertion then the move. ‹delete›/‹backspace› remove the selected anchor from every
> ring. **Not yet**: the confirmation naming both polities before a shared anchor goes (the result zone
> names them after, and one undo puts it back), and deleting several at once, which waits on the
> marquee.

```gherkin
Scenario: delete an anchor two polities stand on
  Given an anchor on the Meuse is held by 2 paths
  When I select it and press ‹delete› or ‹backspace›
  Then I am told "held by 2 paths — France, Holy Roman Empire"
  And on confirming, it is removed from both
  And the two outlines still run over exactly the same remaining anchors
```

> **Decided rather than left open**: a shared anchor is removed from _every_ path holding it. Removing it
> from one only would put the two outlines on different geometry — the sliver, reintroduced by a
> keystroke. And simplifying an over-digitised shared border is precisely the case this scenario exists
> for: refusing the deletion would make the tool useless where it is needed most.

```gherkin
Scenario: delete several at once
  Given ⟨edit⟩ is active
  When I marquee twelve handles
  Then those twelve are selected
  When I press ‹delete› or ‹backspace›
  Then all twelve are removed in one undo step
```

> **‹delete› and ‹backspace› do the same thing under ⟨edit⟩** — as in Illustrator, and because nobody
> should have to remember which of the two a drawing tool chose. No conflict with ⟨draw⟩, where
> ‹backspace› takes back the last anchor placed ([s02](s02-create-france-1100.md)): the two tools never
> have a selection and an outline in progress at the same time.

## Moving more than a point

> **H-09 is closed, by deletion.** "Drag a whole stretch" was written as a hole — rigid, or bent? The dev
> answered by removing the question: _"Ce que l'on déplacerait, ce serait les points, pas le tracé en
> intégralité. On serait toujours dans une démarche d'ajustement."_ Moving a run of border is selecting
> its anchors and dragging them, which the marquee already gives. No stretch-dragging tool is built.

## Retracing a stretch — ⟨retrace⟩ (`H-46`, built 2026-10-14)

> **This replaces the marquee-and-river gesture written here before** (*"marquee the anchors of that
> stretch, choose ⟨snap to river⟩, click the river at each end"*): one gesture, and more general — the new
> run is drawn exactly as the Pen draws, so it follows a coast, a river, a neighbour's border, free points
> or the Pencil. **Its own tool on the rail, under the Pen, on ‹R›**, because it corrects an outline and
> does not draw one (the dev: *"ce n'est plus un outil de traçage, mais un outil de retraçage, de
> correction"*). Its glyph is provisional until the dev draws it.

```gherkin
Scenario: retrace a stretch of the aimed polity
  Given the Emirate of the Balearic Islands is aimed at, and ⟨retrace⟩ is in hand
  When I click one of its anchors
  Then the run starts there, and the bar reads "Retracing … — click one of its anchors to end"
  When I click the coast, a neighbour's anchors, or free points, as with the Pen
  Then the bar says what each click lays — "following the coastline" — as the Pen's does
  When I hover another of its anchors, on the same outline
  Then the stretch the click would replace is drawn dashed in the alert ink
  And the bar reads "Retracing … — replaces 2 anchors · ‹alt› the other side"
  When I click it
  Then the stretch is replaced by the run, in one undo step
  And the result zone reads "Emirate of the Balearic Islands: 2 anchors replaced by 4"

Scenario: the side replaced is the smaller change
  Given a run drawn from one anchor to another of a closed outline
  Then the stretch replaced is the one that, closed by the run, encloses the smaller area — not the shorter
  And with ‹alt› held, the other one
  Given the Duchy of the Rana's island joined to the mainland by two anchors, and a run adding the mainland
  Then the join between the two anchors is replaced, never the island

Scenario: a neighbour on the whole stretch follows, one that only touches it keeps its points
  Given the stretch is a border France shares with the Empire along all its length
  When I retrace it
  Then the Empire takes the new run too, and the result says "· Empire follows"
  Given instead the Pomeranian Lordships hold one anchor of the stretch and nothing more of it
  When I retrace it
  Then the Pomeranian Lordships keep their points, and the bar and the result say "· Pomeranian Lordships keeps its points"

Scenario: following the water to the end
  Given the run's last click snapped onto the coast
  When I click an end anchor placed by eye beside that coast
  Then the coast is followed up to it, and the end joined — never a straight line across the water

Scenario: what is refused, said before the click
  Given the new run would pass again through an anchor a following outline keeps
  Then the bar reads "cannot end here: the new run passes again through an anchor Empire keeps"
  And no stretch is previewed, and a click is refused with the same words
  Given a border dressed by hand runs over the stretch
  Then the click is refused: "clear it in {Overrides} first"
```

> **The dev's call, 2026-10-14 — "c'est les Obotrites qui comptent"**: the first version refused a stretch
> through a junction (a third polity meeting it at one anchor), on the argument that it would open a gap
> there. Walked on the Obotrites, it blocked the correction for a neighbour the author was not editing. Now
> the aimed polity is retraced and the one meeting it keeps its points; what that leaves between them is
> visible, said, and corrected by retracing the neighbour. **A border shared along the whole stretch still
> moves as one** — the sliver `H-06` forbids would come back otherwise. Whether a shared border may ever be
> *detached* on purpose is asked, not decided (`s99`, `H-46`).

> **Walked for real, 2026-10-14**, by the dev in his Chrome on the general test's 1100: Formentor and the
> bay of Palma on Majorca, the west of Minorca, the Holy Roman Empire's limit along the Obotrites, the
> Obotrites' own coast. What the walk changed is written above: the end along the water (Formentor), the
> bar saying what a click lays, the mode named *"Retrace · Pen — follow the coast"* rather than *"Pen"*,
> the junction rule, and **the side replaced** — first the one the run lies closer to, which chose the whole
> island of the Rana when its mainland was added (a third anchor on the join changed nothing); now the
> smaller change. **What it found that is not the tool's**: the cape of Formentor is a contour of
> its own in the coastline data, so no single coast line joins its two sides — the author removes the point
> that strays and joins the two coast anchors. And the derivation of borders cost 5.7 s after every
> gesture on 137 polities: fixed the same day (0.34 s).

## The shared border — settled

```gherkin
Scenario: move an anchor two polities stand on
  Given the Kingdom of France and the Holy Roman Empire both run along the Meuse
  And their two paths reference the same anchors
  When I move one of those anchors
  Then both outlines follow, in the same pointer move
  And both fills follow
  And no gap can appear between them, because there is nothing to drift apart
  And the status bar reads "held by 2 paths"
```

```gherkin
Scenario: what the tool must never do
  Given two polities run along the same stretch
  Then they must never hold two separate copies of those anchors
  And no gesture in the tool produces such a copy
```

> **H-06 settled 2026-09-22.** The second scenario used to be written the other way round, as the cheap
> version's outcome — a sliver appearing at every adjustment. It is now stated as an invariant instead,
> because the dev's mechanism removes the possibility: **a path duplicates its list of references, never
> its anchors** ([s00](s00-index.md)). The sliver `extractRegionBorders` abolished at render time cannot
> come back at authoring time.

## Undo

```gherkin
Scenario: undo the last operation
  When I press ‹ctrl+z›, or press [↶ Undo]
  Then the last committed operation is reversed
  And the fills and derived borders refresh to match

Scenario: redo it
  Given I have just undone an operation
  When I press ‹ctrl+shift+z›, or press [↷ Redo]
  Then the operation is applied again
  When I commit any new operation instead
  Then there is nothing left to redo

Scenario: undoing never changes the tool in my hand
  Given ⟨edit⟩ is active
  And the last committed operation was made while ⟨draw⟩ was active
  When I press ‹ctrl+z›
  Then the operation is reversed
  And ⟨edit⟩ is still the active tool
  And the zoom, the pan and the visible layers are untouched

Scenario: undoing gives me back what the step acted on
  Given I have deleted twelve selected anchors
  When I press ‹ctrl+z›
  Then the twelve anchors are back
  And they are selected again, drawn solid blue

Scenario: the undone step is off screen
  Given the last operation was made 500 km outside the current view
  When I press ‹ctrl+z›
  Then the operation is reversed
  And the view does not move
  And the status bar reads "undone off screen — [show me]"

Scenario: the two arrows say what the stack holds
  Given nothing has been edited since the file was opened
  Then [↶ Undo] and [↷ Redo] are both disabled
  When I move an anchor
  Then [↶ Undo] becomes available and names the step: "Undo — move anchor"
  And [↷ Redo] stays disabled

Scenario: what counts as one operation
  Given I have dragged one vertex across the screen
  Then that is one undo step, not one per pointer move
  Given I have inserted 412 vertices by snapping to the coast
  Then that is one undo step, not 412
```

```gherkin
Scenario: undoing a closing reopens the outline
  Given ⟨draw⟩ is active and I have just closed an outline of 340 anchors
  When I press ‹ctrl+z›
  Then the ring is taken out of the document and its fill disappears
  And its 340 anchors are back in hand as an open outline, the rubber band running from the last
  When I press ‹ctrl+z› again
  Then the last anchor of the open outline is taken back, and only it
  When I press ‹ctrl+shift+z› before changing anything
  Then the ring closes again exactly as it was, and nothing is left in hand

Scenario: the gesture in progress goes first
  Given an outline is open, or an anchor is still under the button
  When I press ‹ctrl+z›
  Then that gesture is dropped, and the step before it is not touched
```

> **The dev's call, 2026-10-11**: *"que ça enlève juste la fermeture de la zone"* — one step at a time,
> as Illustrator does. **The document's history does not change for it**: a ring still enters the
> document closed, in one step, so a saved file never holds an open outline; the reopening happens in
> the session. It only reopens for the polity the Pen is drawing for — under another tool, the undo
> takes the ring back and says, in the console, that nothing was put back. A redo after a reopened
> outline has been changed drops the change first: the author's edit is not overwritten silently.

> **H-10 settled 2026-09-22: one gesture is one step**, committed when the gesture ends. 412 anchors placed
> by two clicks come back in one ‹ctrl+z›. There was no real fork here.

> **Two arrows, not just a shortcut** — the dev, 2026-09-22. They are worth more than convenience: their
> enabled/disabled state is the _only_ visible reading of the undo stack, and the step's name is what tells
> the contributor which of the last four gestures is about to be taken back. On a Mac the shortcut is
> ‹cmd+z›.
>
> **Accessibility, and this project has already paid for it once** — a button whose whole content is an
> arrow glyph carries no accessible name, and the hit area must clear 24×24 (WCAG 2.5.8, AA — _not_ the
> 44×44 of 2.5.5, which is AAA). Both defects were found on the dismiss button in 2026-09-17 and are
> guarded by tests there; these two arrows are the same shape of control.
>
> **These buttons are pure chrome**: they emit an intention and never touch geometry, which is exactly the
> seam the Claude Design chantier has to hold.

## Reassigning ground

```gherkin
Scenario: hand a piece of territory to another polity
  Given Flanders is currently claimed by the Kingdom of France
  When I select the ring
  And I press [Reassign…]
  And I choose "Holy Roman Empire"
  Then the ring leaves France and joins the Empire
  And both fills and the border between them refresh
```

> **H-11 settled 2026-09-22: every drawn year is independent.** A ring belongs to its polity, in its year,
> as the format already has it — so reassigning is moving it from one list to the other. Sharing _inside_ a
> year stays (H-06); sharing across years is refused.
