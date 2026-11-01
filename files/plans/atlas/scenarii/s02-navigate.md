# 02 — Navigating: the keys, the wheel, the hand, the edges

> [Index](s00-index.md) · the plans: [`../03-camera-ux.md`](../03-camera-ux.md), [`../01-foundations.md`](../01-foundations.md)
> §0.2 (the view kept). The camera is a map's, not a free one: **a target on the ground and a zoom**, north always up, the
> pitch and the distance following the zoom.
>
> **Built** in September (M1, `03-camera-ux`), the drag's click tolerance on 2026-09-18 (`rules/known-issues/atlas.md`),
> the controls split by meaning on 2026-10-27 (`5b75705`). **Walked** by the dev every session since — the navigation
> is how every other scenario was seen; nothing here was walked on purpose. The code: `atlas/src/controls/`,
> `app/viewport.ts`.

## The camera

```gherkin
Scenario: the zoom carries the distance, the pitch and the relief's height
  Given the whole sheet in view, zoom 0
  Then the camera stands 6 units from its target, 55° above the horizon, the relief raised 0.75
  When I zoom in to 1
  Then it stands 1 unit away, 30° above the horizon, the relief raised 0.15
  And north stays up: the map never turns
```

> **No yaw** — `03-camera-ux` planned one, struck there on 2026-11-01. The pitch flattens as one comes in, the
> relief's exaggeration drops so a mountain does not hide the valley behind it.

## The keys

```gherkin
Scenario: the arrows pan, and keep panning while held
  When I hold ‹→›
  Then the map slides east, at a pace that looks the same at every zoom
  And ‹→› and ‹←› held together cancel out
  When I release it
  Then the map glides a little and stops (an inertia of 0.12 s)
```

```gherkin
Scenario: the zoom keys are the wheel's notches
  When I press ‹+›, ‹=› or ‹page up›
  Then the map zooms in by one wheel notch
  When I press ‹-›, ‹_› or ‹page down›
  Then it zooms out by one notch
```

> **The keyboard can do everything the wheel does** (WCAG 2.1.1). The keys are read on the whole window, not the canvas
> — the HTML overlay will scope them (`rules/known-issues/atlas.md`, A11Y backlog). **‹W A S D› do nothing**:
> `03-camera-ux` planned them, struck there on 2026-11-01.

```gherkin
Scenario: a form field keeps its keys
  Given the dev panel open, a number field focused
  When I press ‹↑›
  Then the field's value changes and the map does not move
```

## The wheel and the hand

```gherkin
Scenario: the wheel zooms, ctrl+wheel is the browser's
  When I turn the wheel, or slide two fingers on a trackpad
  Then the map zooms in eased steps, toward the target, not toward the pointer
  When I turn it with ‹ctrl› held
  Then the page itself zooms, as in any page (WCAG 1.4.4)
```

```gherkin
Scenario: a left drag takes the map in hand
  When I press the left button on the map and drag
  Then the map follows the pointer
  And it keeps following when the pointer leaves the canvas, until I release
  And on release it carries on a little with the drag's momentum
```

```gherkin
Scenario: a press that wobbles is still a click
  When I press and release having moved 3 px
  Then it is a click (s03)
  When I press and release having moved 5 px
  Then it is a drag, and no click follows it
```

> **4 px, decided once where the drag lives** (`MapControls.pointerDragged`) — a browser sends a `click` after any drag,
> however far; Leaflet and Mapbox suppress it the same way (`rules/known-issues/atlas.md`).

## The window's edges

```gherkin
Scenario: the pointer near an edge scrolls the map
  When I rest the pointer within 24 px of the window's right edge
  Then the map slides east, at a pace that crosses Europe in about three seconds from afar, slower as I come in
  And in a corner it slides on both axes
```

```gherkin
Scenario: the pointer leaves the window by that edge
  Given the pointer resting against the right edge, the map sliding
  When it leaves the window through that edge
  Then the map stops, after its glide
```

> **Not true today** — the page keeps the last position it saw, so the map goes on sliding. **Decided by the dev on
> 2026-11-01** (*"if it's just a mouseleave and a window blur, let's go"*): ATLAS-326, in *À faire*, with the arrow
> held through a cmd+tab, which stays pressed today. [s99](s99-holes.md) A-08.

## The limits

```gherkin
Scenario: the view never leaves the map
  Given zoom 0.3, the camera over Portugal
  When I hold ‹←›
  Then the map stops once the view's footprint on the ground meets the map's western edge
  And when I come in closer, I can pan further toward that edge
  And along an axis where the view's footprint is wider than the map, the arrows move nothing — the view stays centred
```

> **The footprint is bounded, not the target** (`controls/cameraFraming.clampTarget`): the room to pan grows as one comes
> in, and the view re-centres as one pulls out.

```gherkin
Scenario: a key, the wheel or a press stops a flight
  Given a flight under way after a click (s03)
  When I press an arrow, turn the wheel, press ‹+› or press on the map
  Then the flight stops where it is, and the camera is mine
```

## The view kept

```gherkin
Scenario: a reload keeps the view
  Given the camera at zoom 0.7 over Bohemia
  When I reload the page
  Then the atlas opens at zoom 0.7 over Bohemia, from its first frame, with no transition
  And the level of detail of that zoom is the first one shown (s04)
```

> **What is kept is `{target, zoom}`**, in the tab's session storage, written as the page unloads
> (`controls/mapCameraStore.ts`); the camera is placed from them. ~~`01-foundations §0.2`'s position, quaternion and fov,
> written while moving~~ — struck there on 2026-11-01. A new tab opens on the whole sheet. Under `pnpm dev` a hot reload
> goes the same way, through the module's teardown.

```gherkin
Scenario: a kept view that cannot be read
  Given a kept view that is not valid JSON
  When I reload
  Then the atlas opens on the whole sheet
  And the console warns « MapCameraStore: load failed »
```

> **A kept view of the wrong shape** — valid JSON, missing its zoom — opens on the whole sheet **with nothing said**
> (`isMapCameraState` returns `null` without a word). A silent substitution, by the letter of `rules/error-handling.md`;
> [s99](s99-holes.md) A-12.

## Under « réduire les animations »

```gherkin
Scenario: the map stops the instant the input does
  Given the system's « réduire les animations » on, read when the atlas opens
  When I release an arrow, or end a drag
  Then the map stops at once, with no glide
  And a flight arrives at once (s03)
```

## What this does not do

- **No on-screen buttons** to pan or zoom — ATLAS-149 in Backlog; `03-camera-ux`'s `CameraCommand` seam was never built.
- **No pinch to zoom the map**: a trackpad's pinch reaches the page as a wheel with ‹ctrl›, so it zooms the page, as
  ctrl+wheel does — read from the code, not walked. No touch gesture beyond a one-finger drag.
- **The keys are the window's**: the map has no focus of its own to take or give.
