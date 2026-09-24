# Focus mode — the camera gets a state, not a knob

> Decided 2026-09-18. Supersedes the "fly-to is not right" entry in `next.md`, which named the wrong
> cause: it claimed `flyZoomIn` was a fixed target. It is not — `beginFlight` does
> `clamp(state.zoom + flyZoomIn, 0, 1)`, a **relative step**, so from `initialZoom: 0` three
> double-clicks saturate at 1 and every further flight is a pure pan.

## What the dev asked for

A double-click does not nudge the zoom. It **enters a mode**:

- the flight lands at **maximum zoom** — the grazing close-up you can otherwise only reach by zooming
  all the way in, and where the event text will later be read;
- the trip is an **arc**: pull out until the whole sheet is visible, re-centre, then dive back in;
- while focused, further double-clicks jump from target to target **without leaving the mode**;
- **Escape** returns the camera to where it stood before the mode was entered, and hands back normal
  navigation;
- a **single click** while focused also leaves the mode, but lands on the clicked point **at the zoom
  held before the mode was entered** — you keep the place you pointed at, you give up the close-up;
- hors focus, a single click re-centres on the point without changing the zoom.

Panning, dragging or wheeling **does not leave the mode**: the return position survives a look around.

## The consequence that is not in the description

Once focused, a double-click on another target goes **from zoom 1 to zoom 1**. Without the arc that is a
lateral travelling shot at ground level (distance 1 across a map 12 wide) — unreadable. The arc is what
makes target-to-target legible, not a flourish.

Accepted trade-off, chosen with the drawback stated: the arc is the **same whatever the distance**, so
Paris → Lyon also pulls out to the whole of Europe. `flyArcZoom` is exposed on the dev panel (default 0,
= full pull-out) so it can be softened by eye without re-opening the code.

## Design

### Only one flight arcs (dev, 2026-09-18, after seeing it)

**Entering a focus arcs. Leaving one does not.** The dev's correction, and it is right: leaving a focus
runs from maximum zoom back to wherever the reader was, so **the pull-out is already the trip**. Bending
it as well sent the camera down to zoom 0 and back up to 0.25 — out past its own destination and back,
which reads as a bounce rather than as coming home.

So `peakZoom` is `number | null`, and whether a flight arcs is decided by **whoever orders it**, not by
`beginFlight`: `enterFocus` passes `arcPeak(state, toZoom)`, both exits pass nothing. `null` is not an
absent value — it is the flight going straight, eased in and out, between its two zooms.

The one case that loses something: a single click **outside** any focus re-centres at the current zoom,
so from a hand-zoomed close-up it is a lateral move at ground level. Accepted — it is the same movement
a drag-pan makes, and the reader asked for it by clicking.

### The arc

`advanceFlight` interpolates the ground target as before, and bends the zoom:

```
e    = easeInOut(t)                    // the ground move, unchanged
base = lerp(fromZoom, toZoom, e)       // what a straight flight would do
dip  = sin(PI * t)                     // 0 at both ends, 1 in the middle
zoom = lerp(base, peak, dip)
peak = min(flyArcZoom, fromZoom, toZoom)
```

`peak` is clamped below both ends so the curve always reads as an arc: a `flyArcZoom` above either end
would make the middle of the trip *closer* than its extremities, which is not a flight, it is a bounce.

`clampTarget` locks the target to the extent's centre while the footprint is wider than the extent —
i.e. during the high part of the trip. That is not fought: it *is* "re-centre on the whole sheet", and
the lock relaxes continuously as the zoom comes back, so the descent onto the target is not a jump.
**To be asserted by a test, not assumed.**

### The mode

One new field on `ControlsState`:

```ts
/** Where the camera stood before it entered focus, or `null` when it is not focused. */
focusReturn: { x: number; z: number; zoom: number } | null
```

Three operations, in a new pure module `controls/focusMode.ts`:

| call | when | what it does |
|---|---|---|
| `enterFocus(state, x, z)` | double-click | remembers the return **once** (never overwritten while focused), flies to `(x, z)` at `flyFocusZoom` |
| `leaveFocusTo(state, x, z)` | single click | flies to `(x, z)` at the remembered zoom — or the current one when not focused — and clears the mode |
| `leaveFocus(state)` | Escape | flies back to the remembered position, and clears the mode |

**The return is captured from the flight in progress, not from the live target.** Double-clicking in the
middle of the Escape flight would otherwise remember a point halfway home, and the next Escape would
strand the reader somewhere they never were. When a flight is running, its *destination* is the truthful
answer to "where would this camera have come to rest".

`interrupt()` stays exactly as it is — it ends the flight and says nothing about the mode. That is what
makes "panning does not leave focus" a one-line property rather than a rule to maintain.

### What goes away

`flyZoomIn` is deleted, not re-tuned: a relative step is the wrong shape for a mode that lands at a fixed
depth. Two options replace it:

- `flyFocusZoom` (default **1**) — how close the mode settles;
- `flyArcZoom` (default **0**) — the top of the arc.

`flyDurationMs` goes 700 → **1400**, its slider 2000 → 4000: a three-phase trip in 700 ms is a flicker.

### The pre-existing defect fixed in the same pass

`MapControlsOptions.flyDurationMs` documents that "the composition root collapses it, the same way it
collapses the inertia". **It does not** — `createNavigation` only collapses `smoothingTau`. A full
pull-out and dive is exactly the motion `prefers-reduced-motion` exists to remove, so the flight would
have ignored the setting at the moment it started to matter. Fixed in `viewport.ts`.

### Error handling, declared rather than slipped in

`focusReturn?.zoom ?? state.zoom` in `leaveFocusTo` is **not** a fallback over a failure: both branches
are nominal states (focused / not focused), and neither stands in for a value that failed to arrive. It
is a two-case rule written as one expression. Nothing else in this change swallows anything.

## Wiring

`src/mapInteraction.ts` keeps ownership of the gestures (ARCH-012: this is a rule about the map, not
wiring). It gains a `keyTarget` seam defaulting to `window`, mirroring `createMapControls`, so Escape
works without the canvas being focused and tests can inject an isolated target. `isEditableFocused` is
honoured: Escape inside a lil-gui field cancels the edit, it does not leave the mode.

## What this is the first instance of (dev, 2026-09-18)

The focus mode is **not a camera feature**. It is how the app will show anything in detail — events,
their actors, their consequences — and it lasts for the whole life of the design. What is built here is
one kind of focus with one trigger; neither is the thing itself.

- **Several focus modes are expected.** A *place* focus (this one: a point, a grazing close-up) and a
  *country* focus — a **top-down view of the country, at a zoom derived from its own size**, so that a
  large country and a small one are not framed identically.
- **Double-click is provisional.** The intended entry is a **3D button on the map**, focusing the
  country or the place, whose presence and prominence follow **the importance of the events that
  happened there and nearby**. The triggers become data-driven, not gestural.
- For now, double-click only — but the modes must survive whatever replaces the gesture.

**The constraint that is already load-bearing, and is not a matter of tuning**: a top-down country view
cannot be expressed with the current curve. `pitchForZoom` interpolates `maxPitchDeg` (55°, zoomed out)
down to `minPitchDeg` (30°, zoomed in), so approaching *always* means grazing — the opposite of what a
country focus wants. **Pitch has to become independent of zoom while a focus is active.** Not done here;
`focusOn(x, z)` is deliberately left as one implementation behind a seam rather than the API.

## Order

1. `controls/controlsState.ts` — the field, the two options, `flyZoomIn` out.
2. `controls/cameraFlight.ts` — `beginFlight` takes an explicit target zoom; `advanceFlight` bends.
3. `controls/focusMode.ts` — the three operations.
4. `controls/mapControls.ts` — `focusOn` / `panTo` / `exitFocus` / `focused` replace `flyTo` / `flying`.
5. `devParams/camera.ts` — the sliders.
6. `src/viewport.ts` — reduced motion collapses the duration.
7. `src/mapInteraction.ts` — dblclick / click / Escape.
8. Tests at every step, 5 levels.
