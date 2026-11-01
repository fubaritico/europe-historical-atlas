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

> **Not drawn yet** (`core/editor/atlasBorders.ts`): a hand's weight — a limit between two vassals of one lord is as heavy
> as a sovereign one — and a dotted hand, drawn dashed (`rules/known-issues/atlas.md`).

## The tribes

```gherkin
Scenario: a tribe's colour vanishes toward its limit
  Given the Curonians, a tribe
  Then their colour is whole deep inside and fades out over the 30 km before their outline
  And no stroke runs along it
  And where a tribe meets a kingdom, the kingdom's frontier stroke shows, never a border between two states
```

> **30 km inset**, the dev's call of 18/10 (*"the blur's gradient should be spread twice as wide"*), twice
> Claude's 15. The two narrowest tribes, the Semigallians and the Curonians, never reach their whole colour at that width.
> The same ramp in the Cartographer (`core/editor/tribeFeather`).

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
