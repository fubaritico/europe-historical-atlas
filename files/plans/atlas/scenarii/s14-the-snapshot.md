# 14 — The snapshot

> [Index](s00-index.md) · **the interface over the map** (ATLAS-329), written 2026-11-02 for Claude Design. **Not built.**
> The dev's words: *"we could also have a snapshot button"* — *"frame the snapshot the same way the map is framed, in the
> end, to have a nice picture with the year — a cartouche in the corner, on the left."*

## The button

```gherkin
Scenario: taking a snapshot
  Given the atlas open, the map at some place and zoom
  When I click the camera button in the bar at the bottom right
  Then a PNG image of what I see downloads, at the same framing and the same zoom
  And the map on screen does not move or flicker
```

## What the picture holds

```gherkin
Scenario: the map alone, framed like the sheet
  Then the picture holds the map only — no button bar, no pad, no open window
  And it is framed as the sheet frames the map (s08): the parchment margin, the graduated band, one block every 2°
  And the band's degrees are those of the area photographed, written in the margin: « 10°E », « 45°N »

Scenario: the cartouche
  Then a cartouche sits in the picture's lower-left corner, inside the frame
  And it carries the atlas's lettering, « EUROPE HISTORICAL ATLAS », every A drawn as a Λ (s01, s08)
  And the year shown: « 1100 »
  And the address: « europe-historical-atlas.org »
  And one line of credits for the sources the year's map was drawn from
```

> **The credits are not decoration**: the regions traced from Wikimedia Commons are under CC BY-SA, whose condition is to
> credit any copy that circulates — and a snapshot is that copy. Their wording comes from the year's provenance
> (ATLAS-152), shortened to one line with the address of the full list. The corner — lower left — is my reading of the
> dev's « dans le coin à gauche ».

## Named, and without motion

```gherkin
Scenario: the file's name
  Then the file is named after the atlas, the year and the moment: « europe-historical-atlas-1100-2026-11-02-1432.png »

Scenario: reduced motion
  Given the system's « réduire les animations » on
  Then the snapshot is taken with no flash or animation of the button
```

> A brief visual sign that the picture was taken — a short flash of the button, a toast « Image enregistrée » — is to the
> mock-up.

## The keyboard and the screen reader

```gherkin
Scenario: from the keyboard and a screen reader
  Given the camera button reached by ‹tab›
  When I press ‹enter›
  Then the snapshot is taken
  And a screen reader hears « Image de la carte enregistrée »
```

> The picture's size — the screen's, or larger for printing: [s99](s99-holes.md) A-20. **To verify in three.js's source
> when it is built**: a WebGL canvas is read in the frame it is drawn in (`preserveDrawingBuffer`, or a render to a target
> read back) — never assumed.
