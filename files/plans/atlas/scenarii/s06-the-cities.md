# 06 — The cities: a mark, a name, and when each shows

> [Index](s00-index.md) · ATLAS-295 · the plans: [`../cities.md`](../cities.md) (the marks, the importance, the sources),
> [`../detail-levels.md`](../detail-levels.md) (when they show).
>
> The dev, 2026-10-29: *"we're moving on to marking the cities, the key of the points and their names"*, and the
> direction: *"find cartographic rules again that will then let us really add strong signage"*. **A city's importance is political and dated** (« Paris — 1100 », a sheet in the CMS): capital,
> large city, city. The 113 cities of 1100 come from the CMS through the content file, prepared at the export.
>
> **Built 2026-10-31** (`4f099d1` the marks, `8b2fff2` on the map), 2026-11-01 (`d8012aa` the order against the names,
> `9af17e1` a point yielding to a name, `6c23c15` the names larger and sharp). **Walked by the dev** on 31/10 and 01/11 —
> ATLAS-322, 323 and 325 tested by him and passed to *Fait*. The code: `atlas/src/scene/cities/`.

## Which cities the atlas shows

> **Built 2026-11-08** (`038f607`, `ec526a2`, CMS-391), the dev's ask: the historian enters every city a source attests,
> for the Cartographer's borders, and the atlas must not show them all. **Walked by the dev** on 08/11: *"the atlas shows
> the right cities"*. The code: `atlas/src/loading/mapContent.ts`.

```gherkin
Scenario: only the cities whose sheet is ticked
  Given the export holds 341 cities of 1100, 113 of them ticked « Afficher la ville dans l'atlas »
  When the atlas draws 1100
  Then it draws the 113 ticked cities, and none of the others
  And a city entered since is not drawn until its box is ticked in the CMS and the content exported again
```

## The marks

```gherkin
Scenario: three orders, told apart by size, never by colour
  Given the closest level, a capital, a large city and a city in view
  Then the capital is a dark ring around a dark point, 15 px across
  And the large city is the same mark with a smaller point, 11 px across
  And the city is a small dark point, 6 px across
  And between the ring and the point, the country's own colour shows
  And around each mark a parchment rim at 60 % lets the country's colour through
```

> **Chosen on the bench** `/cities.html` (the dev, 31/10: "C4 with the white at 60 %"; *"you put white only around"*;
> the capital's point larger, *"it was better"*) after the value alone, the size alone and a square for the capital.
> **Bertin**: size and value are read as an order without a legend, hue is not (`../cities.md`, its references).

```gherkin
Scenario: a mark keeps its size on screen
  Given a capital in view at zoom 0.5
  When I zoom in to 1
  Then its mark is still 15 px across
```

## The names

```gherkin
Scenario: a city's name, to the right of its mark
  Given a city whose name shows
  Then its name starts 4 px to the right of its mark, centred on it vertically
  And it is set in Fondamento, 17 px for a capital, 16 for a large city, 15 for a city
  And it is never in capitals
  And it has a light parchment edge under it, and every letter reads sharp
```

> **To the right**: Imhof, *« where space allows, it is best to have the name beginning to the right of the symbol »*.
> **Never in capitals** (31/10): capitals' names in capitals fought the countries' names on his screenshot. The countries'
> names are not in capitals either — written as entered, capitals and small letters ([s05](s05-the-countries.md)); the
> JSDoc of `cities/cityLabel.ts` says they are, and is wrong ([s99](s99-holes.md) A-13). **The sizes** were 13 / 12 / 11 until 01/11 — *"we really have to be able to read the letters well"*, and *"brown and white blotches"* through the mipmaps: since `6c23c15` (ATLAS-325) a false bold
> of the ink, drawn at twice the screen's density, no smaller copies.

```gherkin
Scenario: a city's point comes a level before its name
  Given the first level
  Then the capitals show their point, and no name
  When I cross into the second level
  Then the capitals' names come in, and the large cities' points
  When I cross into the third level
  Then the large cities' names come in, and the cities with their point and their name at once
```

> **Claude's reading of the dev's "maybe just the middle-sized cities, but without their name yet"** (31/10), and
> seen by him since. The city's point and name come together because no level is left after the third — a level added
> between would part them, by a row of the table ([s04](s04-levels-of-detail.md)).

```gherkin
Scenario: the names of an English reader are French
  Given a browser whose first language is English
  When the cities' names show
  Then they read « Paris », « Mayence », « Constantinople » — the place's French name
```

> **Not decided** — the content carries `name.fr` and the atlas reads it whatever the language
> (`events/mapEventLayer.ts`). A hole of [s99](s99-holes.md).

## The names' reach — the distance to the camera

```gherkin
Scenario: in a tilted view, the names thin out toward the top of the screen
  Given the third level, the camera tilted over Bohemia
  Then every city near the bottom of the screen shows its name
  And the cities toward the top show their point, and no name
  And the line between the two runs nearly level across the screen
```

> **The rule** (the dev, 31/10, 21:40: *"when it's close, it must be shown […] the further up it goes […] the fewer we see"*): a name shows while its city is **no further from the camera than 1.5 times the camera's distance to the
> point it looks at** — the centre of the screen, where its axis meets the ground. On screen, nearly a level line. A
> circle around the centre came first and cut the cities at the bottom of the screen, the nearest; Constantinople at the
> back of a tilted view, unreadable, started it (his screenshot of 20:49).

```gherkin
Scenario: closing in, the reach tightens
  Given the closest level, zoom 0.8
  When I zoom in to 1
  Then the share goes from 1.45 to 1.25 of the camera's distance, progressively
  And fewer names show toward the top of the screen
```

```gherkin
Scenario: a name enters and leaves in a fade, and never flickers on the line
  Given a city just inside the reach, its name shown
  When I pan so that it crosses the line
  Then its name fades out in 0.6 s, its point stays
  And it fades back in only once the city is back within the reach — leaving is 10 % further out than entering
```

```gherkin
Scenario: seen from straight above, every name of the level shows
  Given the camera looking straight down
  Then every city is about as far from the camera as the centre is
  And every name the level shows is within reach
```

> **Read from the code**, not walked: the camera stands 55° above the horizon afar and 30° close up
> (`tunables/params/camera.ts`), so straight above is not reached in the atlas today — the scenario holds the rule's
> intent, for the day a top-down view comes (the country focus, `../focus-mode.md`). When the camera's axis meets no ground at all, every name counts as within reach (`nameReach.lookedAt`).

## A point and a country's name

```gherkin
Scenario: afar, a capital's point on a country's name is not shown
  Given the first level, the countries' names whole
  And a capital whose point falls on a letter of a country's name
  Then that point is not shown
  And the name reads whole
  When I cross into the second level
  Then the point comes back with its name, in the same fade
```

> **Built 2026-11-01** (`9af17e1`, ATLAS-323), **tested by the dev**. *"it's the country's name that matters most […] hide a capital's point […] if it coincides with a country's name"*: a point with no name says nothing yet. **The
> names' placement is left as it was** — making the names go round the capitals was tried the same night and dropped
> before the commit: *"it's better like this"*. A point counts as on a letter within 0.7 of the name's size around the
> letter's middle (`nameCover.LETTER_REACH`).

> **Read from the code, not decided**: the rule is written for any point *with no name yet*, against the names **seen
> from afar**. At the second level a large city has its point and no name, so a large city whose point falls where an
> afar name stood is hidden there too — under a name now placed differently and at its watermark. A hole of
> [s99](s99-holes.md).

```gherkin
Scenario: afar the cities are under the countries' names, closer over them
  Given the first level
  Then a capital's point that does show is drawn under the countries' names
  When I cross into the second level
  Then every city's point and name are drawn over the names, gone to their watermark
  And the events' markers stay over the cities
```

> ATLAS-322, the dev, 01/11, 00:20 — the switch per level is in [s04](s04-levels-of-detail.md).

## Over the relief

```gherkin
Scenario: a city behind a ridge still shows
  Given a tilted view, a city behind a mountain from the camera
  Then its mark and its name are drawn over the relief
```

> **Drawn with no depth test**, as the countries' names are (the dev, 28/10, for the names: legibility first). Drawn so
> on 31/10 without placing them in the draw order, an event's pin passed behind the cities (one of my faults that
> evening); they sit under the events' markers since (`cityMarkers.CITY_RENDER_ORDER`).

## When a city cannot be drawn

```gherkin
Scenario: a city outside the map's frame
  Given a city of the content file whose place lies outside the map's frame
  Then it is not drawn
  And the console says « [Atlas] city <id> (<its French name>) is outside the map's frame and is not drawn »
```

```gherkin
Scenario: a name that cannot be drawn
  Given the names' face fails to load, or a name's image fails
  Then the city's point still shows, with no name
  And the console says « [Atlas] the name of <the city> could not be drawn », with the error
```

> **The console only, nothing on screen** — a hole of [s99](s99-holes.md), with the countries' names that cannot be placed.

## What this does not do

- **Nothing is clickable**: a city's mark or name answers no click — the click recentres the map, as anywhere else.
- **No city of another year**: only 1100 is published.
- **The event icons collide with cities** (the swords on Tripoli, the trebuchet on Tyr) — noted 31/10, not decided.
- **« Réduire les animations »** does not shorten the names' fade.
