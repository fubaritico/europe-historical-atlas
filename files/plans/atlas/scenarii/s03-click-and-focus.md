# 03 — The click that recentres, the double-click that looks closely

> [Index](s00-index.md) · the plan: [`../focus-mode.md`](../focus-mode.md). The gestures are the dev's, settled on
> 2026-09-18: **a double-click enters a mode** — the camera arcs over and lands at the closest zoom, remembering where it
> came from; **‹escape›** goes back; **a single click** recentres. The focus is a state of the camera, not a move it
> makes, and it is **permanent** — several kinds to come (a place, a country), the double-click only its first trigger
> (`files/plans/atlas/focus-mode.md`; ATLAS-148, ATLAS-157 in Backlog).
>
> **Built** 2026-09-17 (`22cf088`, the flight to a double-clicked place) and 2026-09-18 (`2d0e663`, the mode and the
> arc). **Walked** by the dev on 18/09, the day he settled it; used since in every session. The code:
> `atlas/src/app/mapInteraction.ts`, `controls/focusMode.ts`, `controls/cameraFlight.ts`.

## The single click

```gherkin
Scenario: a click recentres at the same zoom
  Given zoom 0.5, outside the focus
  When I click on Bohemia
  Then after a quarter of a second the camera flies to that point, in 1.4 s, along a straight path
  And it lands at zoom 0.5, Bohemia at the centre of the screen
```

> **The quarter of a second** (`CLICK_SETTLE_MS`, 250 ms) is the wait for a possible second click: acting on the first
> would leave a focus a beat before the double-click entered it, and the way back would be taken at ground level. Paid
> on a gesture that then flies for over a second, so it does not read as lag.

```gherkin
Scenario: the end of a drag is not a click
  When I drag the map and release
  Then no flight follows (s02)
```

```gherkin
Scenario: a click past the map's edge does nothing
  When I click beyond the relief, on the sheet's margin
  Then the camera does not move, and a focus, if any, is kept
```

> **Nothing is clickable**: a click finds *where* on the relief, never *what* is there — a city, an event, a country
> answer nothing (`picking/surfacePicker`; `onSelect` is a seam no one listens to). `04-atlas-data`'s « labels are
> clickable » and `02 §1.4`'s click that « orients toward the point and moves closer » are struck there on 2026-11-01. [s99](s99-holes.md) A-06, ATLAS-147.

## The focus

```gherkin
Scenario: a double-click looks closely
  Given zoom 0.3, outside the focus
  When I double-click on Paris
  Then the camera pulls out until the whole sheet is in view, crosses, and dives in on Paris, in 1.4 s
  And it lands at the closest zoom, 1, Paris at the centre
  And it remembers where it stood: zoom 0.3, and the point it looked at
```

> **The arc is what makes the trip legible**, not a flourish (`focus-mode.md`): from zoom 1 to zoom 1, a straight flight
> would slide across the map at ground level. Accepted trade-off, stated with it: the arc is the same whatever the
> distance, so a neighbouring target is visited like a far one (`flyArcZoom` 0).

```gherkin
Scenario: in the focus, a double-click goes from target to target
  Given the focus on Paris
  When I double-click on Rouen
  Then the camera arcs over to Rouen and lands at zoom 1
  And the way back is still zoom 0.3 and the point before Paris — taken once, never moved
```

```gherkin
Scenario: ‹escape› goes back
  Given the focus on Rouen, entered from zoom 0.3
  When I press ‹escape›
  Then the camera flies straight back to where it stood before the focus, zoom 0.3
  And the focus is left
  When I press ‹escape› again
  Then nothing happens
```

```gherkin
Scenario: a click in the focus keeps the place, gives up the close-up
  Given the focus on Paris, entered from zoom 0.3
  When I click on Chartres
  Then the camera flies straight to Chartres and lands at zoom 0.3
  And the focus is left
```

```gherkin
Scenario: looking around does not cost the way back
  Given the focus on Paris
  When I pan with the arrows, drag the map, or turn the wheel
  Then the focus stays, and ‹escape› still flies back to where I was before it
```

```gherkin
Scenario: ‹escape› in a form field is the field's
  Given the dev panel open, a field being edited, the focus on Paris
  When I press ‹escape›
  Then the field's edit is cancelled and the camera does not move
```

## Under « réduire les animations »

```gherkin
Scenario: a flight arrives at once
  Given the system's « réduire les animations » on
  When I click, double-click or press ‹escape›
  Then the camera is at once where the flight would have landed — no arc, no glide
```

> The reader still lands where they asked to; the arc, a full pull-out and dive, is precisely the motion the setting
> exists to remove (`app/viewport.ts`).

## What this does not do

- **No keyboard way into the focus** (A11Y-301, ATLAS-163 in Backlog) — ‹escape› leaves it, nothing enters it. Left
  open by decision: the real entry will be a 3D button by an event's importance (ATLAS-157), and deciding the key now
  would be deciding it twice.
- **The focus is not announced**: no screen reader learns that the camera changed mode — waits for the HTML overlay.
- **A reload in the focus** brings back the close view and not the mode; ‹escape› then does nothing — [s99](s99-holes.md)
  A-07.
- **One kind of focus only**, on a point; the country's (a view from above, framed on the country) is ATLAS-148.
