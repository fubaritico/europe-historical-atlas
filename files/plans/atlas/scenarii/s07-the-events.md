# 07 — The events: a pin, an icon, its drawing from afar

> [Index](s00-index.md) · **no plan** — built ticket by ticket (ATLAS-156, ATLAS-298, ATLAS-306) with the
> `/make-event-icon` skill: each look was chosen on the benches of the dev's own atlas server (`/icons.html`,
> `/svg-icons.html`), then set on the map. An event comes from the CMS with its type; **the type chooses the icon and the
> colour** (CMS-224), so a new type needs no code.
>
> **Built** 2026-10-26 → 31/10: the swords and their sway (26/10), the tower then the trebuchet for a siege, the plain pin,
> the halos and the lights (27/10, ATLAS-298), the ground and icon shadows, the flat drawings' halos (29/10, ATLAS-306),
> the swords a little smaller (31/10, `ad66b9a`). **Walked**: every look by the dev on the benches and on the map, the day
> it was built. The code: `atlas/src/scene/events/`; the settings tuned on sight in `events/icons/settings.ts`.
>
> **The year 1100 holds 11 events**: 4 battles (swords), 1 siege (the trebuchet), 6 others on a plain pin — two
> coronations, a council, a conquest, an enthronement, a death. The coronation of Henry I has no place and is not pinned.

## Where an event stands

```gherkin
Scenario: an event with a place is pinned there
  Given an event of the content file with a place
  Then its marker stands on the relief at that place
  And an event with no place is not drawn, and is no error (Couronnement d'Henri Ier Beauclerc)
  And an event whose place lies outside the map's frame is not drawn, and the console warns
```

```gherkin
Scenario: the events come with the map, not before
  When the atlas opens
  Then the events come in the year's one fade, after « Pose des événements… » (s01)
  And an event's file that fails leaves the map without them, and says so (s09)

Scenario: a year shows its own events only
  Given the events of 1100, and the map of 1100 on screen
  When I go to 1200
  Then none of 1100's events is pinned on 1200's map
  And going back to 1100 pins them again
  And a change to 1200 that fails leaves 1100's map and its events as they were
```

> **Built 2026-11-02 (`eb15874`), on the dev's word** — *"the events are shown on one year only; there, the events of 1100
> were shown on 1200"*. A date covers its year, an interval each year it covers, circa does not widen
> (`core/time/dateOverlap`, `dateCoversYear`, his rule of 30/10). The cities still show on every year (ATLAS-341).
> **Walked** by the dev, 03/11: *"I did see the events distributed by year; it works."*

## From afar a flat drawing, close up the 3D icon

```gherkin
Scenario: crossing from the drawing to the icon
  Given the whole sheet in view
  Then each event shows its flat drawing on a square facing me, at least 20 px wide, a halo behind it
  When I zoom in between 0.55 and 0.65
  Then the flat drawing fades into the 3D icon, or the 3D pin
  And from 0.65 on only the 3D form shows
```

> **The cross-fade follows the zoom**, not the levels of detail ([s04](s04-levels-of-detail.md)) — set at 0.6 ± 0.05,
> moved in from 0.45 so the drawing holds longer (the dev, 27/10: *"the sprite should survive longer into the zoom"*). The flat drawings' halo, so a battle over a country's name still detaches from it (29/10, ATLAS-306).

```gherkin
Scenario: a plain pin
  Given an event whose type chose no icon — a council, a coronation, a death
  Then from afar it is one dark pin's silhouette, the same for every type
  And close up a steel stem with a head in the type's colour, lit as a cylinder and a sphere
```

> « B », the third of four on the bench (the dev, 27/10, ATLAS-298); *"no need to colour the pin's image"* —
> the colour is the 3D head's alone.

## The icons

```gherkin
Scenario: a battle — crossed swords that float and sway
  Given a battle close up
  Then two crossed swords float 0.6 of their height above the ground
  And they turn to face the camera
  And they sway ±25° about their upright, over 4 s, out of phase with the other battles
```

> Sized on sight: the icon 0.05 world units tall (the map is 12 wide), the swords 0.85 of it since 31/10 (*"make it a little smaller"*). Floating, because the relief swallowed their hilts.

```gherkin
Scenario: a siege — a trebuchet on the ground
  Given the siege of Haifa close up
  Then a trebuchet stands on the ground, 1.4 icon heights tall
  And it does not follow the camera: a slight three-quarter turn toward the reader, facing left
  And its arm throws, over and over
```

> The dev, 27/10: *"set on the ground, not following the camera"*, *"a three-quarter view turned slightly toward the camera"*,
> *"facing left"*. A tower first, cut down, then the trebuchet that replaced it, twice the tower's first size.
> Turned toward its target was the other way he named — no event says where its target stands.

```gherkin
Scenario: an icon stays in front of the slope it stands on
  Given a battle on a hillside, the camera low
  Then the swords and their halo are never cut by the slope under them
  But a massif standing between the camera and the icon still hides it
```

> *"like the borders, whatever happens, always have them in front"* (the dev, 27/10): the markers are pulled
> one height toward the camera along the line of sight, so nothing moves on screen (`ICON_DEPTH_PULL`).

## Light and shadow

```gherkin
Scenario: an icon is lit and casts its shadow
  Given a battle close up
  Then a halo glows behind it, 2.6 of its heights wide
  And its lights turn with the camera — the key on my side, the rim behind
  And its shadow falls on the ground to the south-east, following the slope, in the shape of the posed swords
  And close up the 3D icons take a light blur, 0.75 px, their shadows staying crisp
```

## The order with the rest

```gherkin
Scenario: the events over everything
  Given the closest level, a battle in a city
  Then the event's marker is drawn over the city's mark and name, over the borders and the countries' names
```

> **Not decided** (`../detail-levels.md`): **the icons collide with cities** — the swords on Tripoli, the trebuchet on Tyr.

## What this does not do

- **Nothing is clickable**: an event shows no title, no date, no text on click — the atlas's end goal, not built
  ([s99](s99-holes.md) A-06).
- **The crown** of an accession exists, provisional (a 3D model and a flat drawing, facing the camera), and no type
  chooses it yet: the coronations of 1100 are on a plain pin. Its look is ATLAS-287, in *À faire*; death, council,
  enthronement wait on ATLAS-288.
- **« Réduire les animations »** does not stop the sway nor the trebuchet (ATLAS-300 in Idées; [s99](s99-holes.md) A-02).
- **The icons' shadows are redrawn up to fifteen times a second**, the still ones too (ATLAS-304, `rules/known-issues/atlas.md`).
- **A typo in his data**: the type « Polithique - Accession au trone » — to correct in the CMS's types, his to do.
