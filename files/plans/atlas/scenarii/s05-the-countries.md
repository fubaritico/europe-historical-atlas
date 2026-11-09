# 05 — The countries: fills, borders, vassals, tribes and their names

> [Index](s00-index.md) · the plans: [`../vassal-lod.md`](../vassal-lod.md) (vassals by level),
> [`../tribe-feather.md`](../tribe-feather.md) (tribes), [`../country-names.md`](../country-names.md) (names). **What the
> Cartographer draws is what the atlas publishes**: the outlines, the colours, the borders and the paint order come from
> `core`, one implementation read by both (`rules/architecture.md`, « Editor–atlas parity »).
>
> **Built** in steps: the year's exact borders and the Cartographer's colours on 2026-10-13 (`b85714f`), the exact fills
> on 16/10, the vassals by zoom and the tribes' fade on 18/10 (`341a39e`, `d282b32`; ATLAS-253, 258), the countries' names
> on 28–29/10 (ATLAS-301, `f158f73` → `08f83e9`), the borders' parchment afar and the light blur close up on 29/10
> (`5202f7f`, ATLAS-302). **Walked** by the dev at each step; the tribes' inverted names on 29/10: *"now that's perfect"*.
> What the levels of detail change is in [s04](s04-levels-of-detail.md).

## The fills

```gherkin
Scenario: each polity in its colour, over the relief
  Given the closest level
  Then each polity is filled in its own colour — pinned by the dev in the Cartographer, or an automatic one of eight
  And the relief's light and shade read through the colour
  And a fill's edge is the outline's, exact, the same as in the Cartographer
```

> The fills are cut from the outlines into triangles on the relief's own planes and blended in a shader — the edge is
> exact since 16/10 (`pipeline/fillTriangles`, `scene/political/fills/`).

```gherkin
Scenario: an island no polygon claims stays uncoloured
  Given the Balearics or the Aegean islands, claimed by no outline
  Then they show the bare relief
```

## The vassals

```gherkin
Scenario: afar a vassal wears its suzerain's colour
  Given the first level
  Then the Duchy of Normandy is filled in the Kingdom of France's colour
  And no border parts them
  When I cross into the second level
  Then Normandy takes its own colour and its border with France comes in, together, in the level's fade
```

> **A vassal is a neighbour**, carved out of its suzerain, never over it (15/10). A sub-vassal goes through its direct
> suzerain's colour first, at the third level. Its colour and its border arrive together because one number drives both
> (`frameLayers.frameDetail`). **1100 has two levels**: 84 polities with no suzerain, 56 direct vassals, no sub-vassal
> (measured 18/10).

```gherkin
Scenario: a vassal's band
  Given the Duchy of Normandy, a vassal of the Kingdom of France
  When I cross into the second level
  Then from Normandy's outline inwards, a band of half its colour, 10 km wide, even all along, then its full colour deeper
  And the band runs along all its outline: against France, against its other neighbours and along the sea
  And the band comes in with Normandy's own colour, in the level's fade — at the first level Normandy is filled whole
  And its border with France stays the white dotted line, half again as thick as a border between two sovereigns

Scenario: the vassal's band in the Cartographer
  Given the same year open in the Cartographer
  Then Normandy shows the same band, at every zoom, its fill's edge still the outline's own

Scenario: a vassal that is a tribe
  Given a tribe that owes homage
  Then it keeps the tribes' undulating band, and no vassal's band
```

> **Built 2026-11-09 (ATLAS-398), not walked yet.** The dev: *"for vassals I want a regular band, and thinner than the
> tribes'"*, *"that will make the white border stand out"*; the vassal's colour the same as its suzerain's later, set by
> him in the data, not the code. **One width, 10 km, a constant in core** (`core/data/vassalBand`) — no setting in the
> panel, his call the same day (*"we don't do settings like that any more"*). The atlas measures each vassal vertex's
> distance to its outline in the worker beside its cut (`core/pipeline/vassalBands`; on 1200, 13–17 ms over a 181–202 ms
> cut, under Node) and reveals the band by the same `detail` as the colour (`fills/fillShader`). The Cartographer draws
> it as an image clipped by the vector outline (`canvas/paint/vassalBands`). The vassals' dotted border is drawn at
> `VASSAL_HAND_WEIGHT` (1.5) in both applications: 2.25 px wide with 2.25 px dots and 3.75 px gaps in the atlas, before
> 1.5 / 1.5 / 2.5 — taken off the settings panel. **A sub-vassal's suzerain** is banded along the sub-vassal's edge
> from the second level, before the sub-vassal shows apart: no year has a sub-vassal today (1100, 1200 measured 09/11).

## The borders

```gherkin
Scenario: from afar a parchment line, close up the drawn border
  Given the whole sheet in view
  Then the borders are wide parchment lines, at 45 % of their width and 60 % of their opacity
  When I zoom in toward 0.4
  Then they cross into the close-up border: a cream core inside a dark brown casing, at their whole width and opacity
  And close up they take a light blur, 1 px, so they lie in the map rather than over it
```

> **Why a casing** (A11Y-101): no single ink clears 3:1 against a palette that spans a wide lightness range; a light
> core in a dark casing does, whichever fill it crosses. **The crossing by zoom has no plan of its own** — built on
> 29/10 on the dev's screen (ATLAS-302). The borders follow the zoom continuously, not the levels: a slope the levels of
> detail did not take over.

```gherkin
Scenario: a border's hand
  Given two polities whose shared limit the Cartographer draws dashed
  Then the atlas draws it dashed, its dashes sized in screen pixels
```

> **Not drawn yet** (`core/editor/atlasBorders.ts`): a hand's weight from the table — the atlas draws the vassals' border
> at `VASSAL_HAND_WEIGHT` since 09/11 (ATLAS-398), its other hands at one weight — and a dotted hand, drawn dashed
> (`rules/known-issues/atlas.md`).

## The tribes

~~Scenario: a tribe's colour vanishes toward its limit — whole deep inside, fading out over the 30 km before its outline.~~

> **Replaced 2026-11-02, on the dev's word** — the fade cost 5 s for the Kimek-Kipchak on his 1100, and he asked for
> Illustrator's offset path instead: *"the shape drawn, and inside it an inner offset; the full colour, and the offset at
> half"*, then *"make it irregular, sometimes wider, sometimes thicker, to show the variation"*. Seen the same night:
> *"we have created a cartographic language — the notion of uncertainty is well represented"*. The fade stays in the
> settings panel (‹H›) beside the band, to compare.

```gherkin
Scenario: a tribe's band
  Given the Kimek-Kipchak, a tribe
  Then from its outline inwards, a band of half its colour, then its full colour deeper
  And the band is 30 km wide on average, undulating between about 15 and 45 km along the outline
  And the undulation is the same at each opening
  And no stroke runs along the outline, and no colour passes it
  And where a tribe meets a kingdom, the kingdom's frontier stroke shows, never a border between two states

Scenario: the band in the Cartographer
  Given the same tribe open in the Cartographer
  Then its band widens and narrows at the same places as in the atlas (`core/editor/tribeFeather`, `bandWidthKm`)

Scenario: the band tuned
  When I move « band irregularity » or « band wavelength » in the settings panel (‹H›)
  Then the band changes at once, nothing rebuilt
  And choosing the fade outside the limit lays the tribes again, its colour now measured against its neighbours
```

> **Built 2026-11-02 (ATLAS-333's measure, ATLAS-344).** The band costs 0.34 s for the Kimek-Kipchak where the fade cost
> 5.1 s: a colour that stays inside measures nobody else's ground. **Not walked in the Cartographer yet**: whether its
> band widens at the same places as the atlas's (the shader turns the relief's `v`, north at 1, to the frame's).

## The countries' names

```gherkin
Scenario: a name written inside its country, as large as it allows
  Given the first level
  Then each realm's name is written inside the land it holds, bent along its shape, in Fondamento
  And it is written as it is entered, capitals and small letters, never forced to capitals
  And it is its full name where that reaches four cells of the grid, its short name otherwise
  And the short name is the one entered in the Cartographer, else the full name with its title dropped: « France »
```

> After Crusader Kings III, the dev's reference of 27/10 (a layout reference, not a source). Mixed case chosen on the
> bench, 28/10 — capitals alone judged *"not great"*; the dev panel's `capitals` switch, off, forces them. The short name: one rule in
> `core/data/shortName` (CARTO-307); a box in the Cartographer forces it everywhere (CARTO-318). ~~The title cut to its
> initials, « K. of France »~~ — refused by the dev as an abbreviation; struck in `country-names.md` on 2026-11-01.

```gherkin
Scenario: a country too small for its name is named beside it
  Given a coastal polity with no room for its name inside
  Then its short name is written straight on the nearest free ground — the sea, or unclaimed land — near its coast
  And a landlocked one is named on a neighbour's land, never over another name, tied to its own ground by a line of dots
```

> **The offset label** (`étiquette déportée`), 29/10 (`af8692e`, `df6471c`). Without the dots, an enclave's name reads as
> its neighbour's.

```gherkin
Scenario: the names follow the levels
  Given the first level, the realms named
  When I cross into the second level
  Then the realms' names cross-fade into the names of the level: each direct vassal named in its own land
  And every name goes to its watermark, 40 %
  When I cross into the third level
  Then the deeper vassals are named, and the names go to 25 %
```

> **One level in at a time, crossing over**, never a jump (the dev, 27/10: *"everything appears in a fade, everything refreshes in a fade"*). The watermark leaves room for the cities over the names (A11Y-001, his choice).

```gherkin
Scenario: the names' white edge goes as one comes in
  Given the whole sheet in view
  Then each name has a white edge around its ink
  When I zoom in past 0.1
  Then the edge thins, and it is gone by 0.4
  And close up the names take a light blur, 0.6 px, lighter than the borders'
```

```gherkin
Scenario: a tribe's name is inverted
  Given a tribe named on the map
  Then its name is white ink on a thin brown edge — the tribes are told from the states at a glance
  And close up its edge stays, thinner, and it is not blurred
```

```gherkin
Scenario: a name behind a ridge still shows
  Given a steep camera, a name behind a mountain from the camera
  Then it is drawn over the relief, whole
```

> **Chosen for legibility** (the dev, 28/10): a flat sheet at the ground's median height would be cut by the hills under
> it. Cosmetic cost, stated: under a steep camera a name shows through a ridge.

## What this does not do

- **Nothing is clickable** — a country answers no click (ATLAS-147, [s99](s99-holes.md) A-06).
- **The uncertainty is not drawn**: neither the blur of an uncertain limit nor the hatching of an uncertain belonging
  (DESIGN-262) exists yet. Every border and every fill is drawn as certain.
- **A country no level finds room to name** is said in the console only (`e38123d`) — [s99](s99-holes.md) A-10.
- **Close up the names' contrast is about 1.7:1** (computed, not measured): the dev's choice, A11Y-001.
- **Greenland and Iceland are Norwegian** in `years/1100` (historically 1261–1262) — his data, his call, pending.
