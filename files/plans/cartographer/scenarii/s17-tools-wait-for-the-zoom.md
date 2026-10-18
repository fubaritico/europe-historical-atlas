# 17 — The tools wait for a close enough view

> [Index](s00-index.md) · `H-34`, raised and decided by the dev on 2026-10-12, built and walked in his
> Chrome the same evening: *"de loin, on a une vue d'ensemble. On voit ce qu'on a fait. Par exemple, au
> chargement, on est de loin, on voit ce qu'on a fait. Et là, on va éditer."* And: *"on peut désactiver les
> outils tant qu'on est trop loin."*
>
> **The rule is a distance on the ground, not a zoom level**: the drawing tools act when the snap radius
> (8 CSS pixels) covers at most `MAX_SNAP_REACH_KM` — 10 km, an estimate to tune by sight — measured at the
> latitude of the view's centre (`viewport/toolReach.ts`). Every line below was seen on screen; screenshots on
> the dev's Desktop, `seuil-1` to `seuil-4`.
>
> **Retuned by the dev on 2026-10-17: 20 km** (CARTO-233) — at 10 km he had to come too close before the
> tools woke up. The figures in the scenarios below (10 km, 10.6 km, 37.4 km) are those of the walk of
> 2026-10-12, at the old threshold; the behaviour is unchanged, only the distance doubled.

```gherkin
Scenario: the overview at opening — the tools wait
  Given I load the Cartographer on the whole continent
  And I choose the Royaume de France in {Polities} and take the Pen
  When the pointer is over the map
  Then the bar reads "Zoom in to draw in Royaume de France"
  And the cursor refuses (not-allowed)
  And the tool rail is unchanged: the Pen is still in hand
```

```gherkin
Scenario: a click from afar is refused, and says by how much
  Given the overview, the Pen in hand
  When I click the map
  Then nothing is placed
  And the result zone reads "too far to draw — zoom in (the snap would reach 37.4 km; the tools act within 10 km)"
  And the console says the same, once
```

> **Corrected 2026-10-13**: the reach is written to one decimal, **rounded up** (`reachLabel`). Rounded to
> the nearest kilometre it read *"would reach 10 km; the tools act within 10 km"* at 10.2 km — a refusal
> contradicting itself. The two figures above were whole numbers until then.

```gherkin
Scenario: zooming in until the tools wake up
  Given the Pen in hand, France aimed at
  When I zoom in on France one wheel notch at a time
  Then one notch short of the threshold a click is refused at "the snap would reach 10.6 km"
  And one notch closer the bar reads "Drawing in Royaume de France" and the Pen places again
  And the bar and the cursor change with the zoom itself, without the pointer moving
```

> **Where it falls in the dev's window**: France from the Channel to the Massif Central over the full
> height, England and the Alps in view — somewhat closer than the scale France was drawn at that evening.

```gherkin
Scenario: from afar, the arrow still chooses a polity by its fill
  Given the overview and the white arrow in hand
  When I click inside a polity's fill
  Then that polity becomes the target
  But a press on an anchor catches nothing, and a drag moves nothing
  And the result zone reads "too far to edit — zoom in (…)"
```

```gherkin
Scenario: from afar, the keys that would change the document are refused too
  Given a selection of anchors made close up, then a zoom out past the threshold
  When I press ‹delete›
  Then no anchor is removed, and the result zone reads "too far to edit — zoom in (…)"
  Given an outline in progress, then a zoom out past the threshold
  When I press ‹enter›
  Then the outline is not closed, and the result zone reads "too far to draw — zoom in (…)"
  But ‹escape› still throws the outline or the selection away, and undo still works
```

> Found in review (QUAL-001, 2026-10-12): a selection survives a zoom out, so ‹delete› removed anchors the
> author could no longer see. **Claude's call under the dev's go, to confirm**: refuse what changes the
> document, keep what throws away or goes back.

```gherkin
Scenario: the hand is never too far
  Given the overview
  When I take the hand, or hold ‹space›, or drag to pan
  Then it pans as always, and the cursor is the hand
```

```gherkin
Scenario: an outline begun close up survives a zoom out
  Given an outline in progress
  When I zoom out past the threshold
  Then the outline stays on screen, clicks are refused
  And zooming back in lets me continue it
```

```gherkin
Scenario: the result of a refused click does not outlive the refusal
  Given a click from afar was refused and its reason is in the result zone
  When I zoom in past the threshold
  Then the reason is cleared, so it no longer sits beside "Drawing in Royaume de France"
```

> **Found while walking it, fixed the same evening** (2026-10-12): the old reason stayed on screen after the
> tools woke up — misleading. The result zone is now cleared whenever the far/near state flips, and left
> alone by a zoom that does not cross the threshold; both guarded by a test that falls against the naive
> code.
