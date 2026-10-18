# The Cartographer's working format — H-12

> **Rewritten 2026-09-27**, on the dev's decision, and it is a simplification: **one year, one folder, three
> files.** Nothing is shared between years. Any date works — 1100, 1101, 2390 — with no change to the shape.
>
> The previous version factored identity into a registry shared by all twenty-one centuries. That
> factoring was **mine, not the dev's**, and it is what made the format hard: dated names, existence
> intervals, dated relations and a cross-century grouping problem all existed only to serve it. They are
> gone.
>
> The dev, 2026-09-27: _"ce qu'on veut, c'est la forme des données qui sera utilisée tout au long des
> siècles et qui peut assurer de pouvoir représenter chaque date, quelle qu'elle soit."_

## The principle underneath all of it — the link is made by the reader

**The dev, 2026-09-27**, and it is the reason every other decision in this file holds:

> _"Le lien, c'est l'esprit de l'usager qui le fait. Le lien entre les dates, ce sont les personnes qui s'y
> connaissent en histoire. L'application est une visionneuse, avec une quantité d'informations que l'on peut
> consulter au clic. Le lien, c'est l'expertise de la personne qui se sert de l'application."_

**So there is no model of continuity across time, anywhere.** Not a lesser version of one, not a deferred
one — none. Nothing in the data says "this is the same polity as that one, two centuries later", because
that connection is a reader's act of judgement, and it is the one thing a reader of a historical atlas is
better at than the tool.

**What follows, and it is most of the format:**

| this exists / does not | because                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| no shared registry     | nothing needs to be one thing across years                                      |
| no dated names         | a name is the name that year; two years are two facts                           |
| no derivation tree, no copy-on-write | H-11 — every drawn year is independent                            |
| **repetition is free** | reloading a year reloads everything anyway. A fact repeated in 21 files is 21 true facts, not one fact stored badly |
| **the registry is rich** | anything that helps an author validate a polity belongs in it: dates, Wikidata id, aliases, notes, sources. Carry it from year to year and do not think about the duplication |

**The one refinement this forces, rather than an objection**: if the reader makes the link, the data must be
legible enough for them to make it. So the same polity should keep the same **id** and the same **colour**
from year to year — not because any machine resolves them, but because a reader following France across
twenty-one maps needs the cue. Deriving a year copies both, so it happens on its own.

## One year, one folder

```
years/
├── 1100/
│   ├── registry.json    who exists that year
│   ├── polities.json    what they hold — the anchors and the rings
│   └── borders.json     the border table — types, strokes, sources
├── 1101/
└── 2390/
```

**Why three files and not one.** They are written by three different gestures and they are three different
sizes: `polities.json` carries every anchor and is the big one, while the other two are a few kilobytes.
Restyling a border should not rewrite a megabyte of geometry, and a diff should stay readable.

**Why nothing is shared.** H-11 — every drawn year is independent. Applied without exception this time.
Deriving 1110 from 1100 is **copying the folder** ([s05](scenarii/s05-derive-a-year.md)), which is also what
[s04](scenarii/s04-save-and-reopen.md)'s "save as" does.

## What the per-year decision removes

| gone                                | because                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| dated names (`names[{text, from}]`) | the file is one year, so a name is a string                       |
| dated relations (`{from, to}`)      | the file is one instant; a suzerainty either holds or it does not |
| cross-century identity grouping     | a polity appears once per year, so there is nothing to merge      |

**`existsFrom` / `existsTo` stay**, and the distinction is the one that matters: they are **facts about the
polity**, written in this year's own file, not a lookup into another. Nothing resolves them against anything
— they are read once, against the year in the same file, which is what powers the warning
"this polity did not exist in 1110" ([s05](scenarii/s05-derive-a-year.md)). A date is not the problem; a
reference between files was.

**That last row is measured, not argued.** The `build-registry` spike (2026-09-27) tried to group the 2 059
cached OHM relations into polities and split the Kingdom of France into **four**, because OHM gives each
period its own Wikidata id. Per year, the question does not arise: 52 relations are alive at 1100, each once.

## `<year>/registry.json` — who exists that year

```jsonc
{
  "version": 1,
  "year": 1100,
  "polities": [
    {
      "id": "fr-couronne", // ours, readable, unique within this year. Never a display name. See below.
      "name": "Reaume de France", // the name that year, as it was written
      "rank": "kingdom", // empire · kingdom · duchy · county … (OHM's border_type)
      "status": "country", // country · personal_union · condominium … (OHM's place)
      "suzerain": null, // an id in this same file, or null
      "existsFrom": 987, // a fact about the polity, not a reference to another file
      "existsTo": null, // null = it outlives this year as far as we know
      "colour": null, // null = palette by adjacency; a hex pins it
      "wikidata": "Q237131", // null where there is none. For checking, never for identity.
    },
  ],
}
```

**`suzerain` is a plain field.** In 1100 Aquitaine owes France, so the 1100 registry says so. In 1260 it
does not, so the 1260 registry does not. A fact true in two years is written in both files. A rear-vassal is
a chain of these fields ([s08](scenarii/s08-vassalage.md)).

**Ids should be kept the same from year to year** when it is the same polity — deriving a year copies them,
so it happens by itself. Nothing enforces it, and nothing breaks if it drifts: no file refers to another.

**Where an id comes from — the dev's call, 2026-10-08** (`H-31`, and it had never been written down). The
creation form **proposes** one, slugged from the name, and the author may rewrite it: that is the only one
of the three candidate rules under which `fr-couronne` above is reachable from *"Reaume de France"*. A
frozen slug could only ever produce `reaume-de-france`; an opaque counter would put `"between":
["polity-1", "polity-7"]` in `borders.json`, which is the unreadable key ids exist to retire.

**The name is read once, at creation, and never again** — which is what makes [s07](scenarii/s07-manage-the-registry.md)'s
rename possible: three places name an id (this file's `suzerain`, `borders.json`'s `between`, a colour
override), and re-deriving it from the name would break all three at once. The proposal lives in
`core/editor/polityId.ts`; a name in a non-latin script yields **no** proposal rather than a transliteration,
and the only ids refused are the empty one and one already taken.

## `<year>/polities.json` — what they hold

```jsonc
{
  "version": 1,
  "year": 1100,
  // "editorialZone" — removed 2026-10-18, the dev's call (an invented constraint, s12); the reader refuses it
  "sources": [
    { "id": 0, "name": "Natural Earth 10m coastline", "licence": "public domain" },
    { "id": 1, "name": "reported by eye — Duby (reference)", "licence": "fact" },
    { "id": 2, "name": "OpenHistoricalMap", "licence": "CC0" },
  ],

  // Every point of the year, once. An anchor's id IS its index in this array.
  "anchors": [
    [2.35, 48.85],
    [2.41, 48.9],
    [2.5, 49.0],
  ],

  // Parallel array: which source each anchor came from. Same length as `anchors`.
  "anchorSource": [0, 0, 1],

  "claims": [
    {
      "polity": "fr-couronne", // an id from this year's registry; no name here, ever
      "rings": [
        [0, 1, 2], // a ring is an ordered list of anchor indices
        [7, 8, 9, 10], // a second ring: a hole or an exclave, by inclusion
      ],
    },
  ],

  // Unclaimed ground the author declared on purpose, so the check stops reporting it.
  "deliberateGaps": [{ "ring": [40, 41, 42, 43], "reason": "no-man's-land between marches" }],
}
```

## `<year>/borders.json` — the border table

```jsonc
{
  "version": 1,
  "year": 1100,
  "borders": [
    // Keyed on a PAIR — dresses the whole boundary between two polities.
    {
      "between": ["fr-couronne", "hre"], // ids from this year's registry; the pair is unordered
      "type": "agreed", // the limit as a FACT: agreed · de-facto · contested · undefined
      "hand": "bold", // the stroke. null = let the derived relation choose it
      "source": 1, // an id from this year's `sources`: where the course was read
      "note": "on the Meuse from Verdun to its confluence",
    },
    // Keyed on a RUN of anchors — dresses that stretch and nothing else, whatever it separates.
    // This is "I selected a line and gave it a style". A run wins over a pair; a pair wins over the rule.
    { "run": [50, 51, 52, 53], "hand": "bold" },
  ],
}
```

**A run indexes into `polities.json`'s `anchors`.** The two files of one year are read together — which is
not a cross-reference between years, and does not touch H-11.

## The one idea in the whole format

**A ring is a list of indices, not a list of coordinates.** That single change is what makes shared anchors
possible, and it is nearly the only difference from today's `RegionPayload`:

- France's ring and the Empire's ring both containing `…, 50, 51, 52, …` **are the same points**. Moving
  anchor 51 moves both fills, in the same pointer move. A sliver cannot appear, because there is nothing to
  drift apart.
- **Duplicating a path is copying that run of indices** into the other ring (reversed, since the two owners
  walk their boundary in opposite directions). The dev's own mechanism: _"on duplique un tracé et on aura
  des tracés concomitants."_ The list is copied; the anchors are not.
- **How many paths hold an anchor** is a count of references — what the status bar reports, and what the
  delete confirmation needs.

No `paths` table, no arc objects, no node table. An earlier sketch had all three and none of them earn their
place: the ring _is_ the path.

## Where the borders come from

**The dev's own derivation, 2026-09-27.** Two paths that run over the same anchors are two owners of one
limit, so the border _is_ that shared run — and finding it is counting how many paths hold each anchor:

| a run of anchors held by | is                                                                                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2 paths**              | the border between those two polities. **The peer case, and it needs no second question** — the pair is named by the run itself                                                                                                                            |
| **1 path**               | **ask what holds the ground on the far side.** Nothing, and wet → the coastline. Nothing, and dry → a frontier against unclaimed ground. **Another polity's claim containing it → the border with that polity** — which is the vassal-inside-suzerain case |
| **3 or more**            | a vassal whose own limit coincides with its suzerain's — Aquitaine, France and the Empire on one stretch of the Rhône. The pair that gets drawn is the deepest one (H-05a)                                                                                  |

**Why this beats deriving from the rasterised fills**: the shared run is the authored geometry itself, so
the line comes out **exact**, at the anchors' own precision. From the raster it lands on cell edges — the
staircase in `known-issues.md`, one cell high, 1.9 km at the 4× grid. It also takes the ~825 ms rasterise
out of the path between closing a ring and seeing its border, which is half of what makes
[H-08](scenarii/s99-holes.md) hard.

**The single-owner row is the one that costs something**, and it was wrong in this section's first version
(corrected the same day, by the dev's vassal case). A duchy drawn strictly inside the kingdom that holds it
shares no anchor with it, so counting owners says "held by one path" and would have drawn a frontier against
nothing across the middle of France. **What answers it is inclusion** — whose claim covers the ground on
the far side, the same question H-05a already answers to decide who paints a cell. A point-in-polygon test
over the rings, exact where the raster is one cell wide.

**The atlas keeps deriving from the raster, and that is not a contradiction**: it receives flat coordinates
through the adapter, so it has no anchors to count. Fills and lines must come out of one grid _there_,
exactly as `extractRegionBorders` does today. The editor has the richer data and uses it.

## A line is selectable, and the style goes on the line

**The dev's requirement, 2026-09-27**: _"il faut que les traits soient sélectionnables. Comme dans
Illustrator."_ And the gesture, settled the same day: **one marquee**. It selects anchors; the segments
between consecutive selected anchors come with them, because a segment _is_ its two endpoints. Dragging
moves points, the style bar dresses segments. No second selection mechanic — [s13](scenarii/s13-overrides.md).

So a hand is keyed on **a run of anchors** as well as on a pair of polities, and the run is the sharper of
the two: half a boundary may be bold and the other half not. **Precedence: a run beats a pair, a pair beats
the derived rule.**

**A run stores anchor indices, so it cannot drift** — it is made of the very points it dresses. Move anchor
51 and the styled stretch moves with it, because it _is_ anchor 51. The same reason a ring is a list of
indices, applied once more.

## What is deliberately absent

| not in the files   | why                                                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| border geometry    | a border is the run of anchors its owners share — derived, and exact. Writing the line down as well would give one limit two geometries, which is the failure that cost a session on 2026-09-16. Everything _else_ about a border **is** data |
| computed colours   | only a _pinned_ colour is data                                                                                                                                                                                                                  |
| the raster         | recomputed on open, ~825 ms in the worker                                                                                                                                                                                                        |
| any reference to another year | H-11, without exception this time                                                                                                                                                                                                    |

## The adapter — the atlas does not change by a line

```
1100/registry.json  ┐
1100/polities.json  ├──► toRegionPayload(1100) ──► RegionPayload ──► the atlas, unchanged
1100/borders.json   ┘
```

- indices are resolved back into `[lon, lat]` pairs;
- the name is written flat, straight from that year's registry — no lookup by date any more;
- shared anchors become duplicated coordinates in each polity's rings — **correct for a consumer that
  modifies nothing**;
- `subjectTo` is the registry's `suzerain` field, copied.

**The lossy direction is deliberate and one-way**: the export is for rendering, the working folder is the
truth. Already stated in [s04](scenarii/s04-save-and-reopen.md).

## What is still open

- ~~**Precision of stored coordinates**~~ — **settled 2026-09-27, three decimals.** Raised by the dev as
  "match the scale", and the scale to match is **not** the 1.9 km raster cell: storing anchors that coarse
  would write the staircase back into the data, which is the whole thing deriving borders from anchors
  escapes. The floor is **a screen pixel at maximum zoom, ~500 m** — the same figure the rivers were
  simplified against. Measured at our latitudes: 3 decimals is **111 m** in latitude and 79 m in longitude
  at 45°N, so about a fifth of a pixel; 2 decimals is 1.1 km, coarser than a pixel and therefore visible;
  6 decimals is 11 cm, sixty times finer than anything anyone can see or aim at. `fetch-ohm` already writes
  4, so rounding imported geometry to 3 on save loses nothing on screen.
- **What happens when `polities.json` names an id `registry.json` does not have.** Within one year, so it is
  a plain consistency failure — it needs the same hand-written reader and declared severity as the atlas's
  four assets (`data/assetError.ts`, taxonomy `transport | schema | consistency | semantic`).
- **`deliberateGaps` and a `run` override both key on anchor indices**, and break if those anchors are later
  deleted. [s13](scenarii/s13-overrides.md) settles the override half — the run keeps what remains and is
  listed as orphaned when nothing remains. `deliberateGaps` has no answer yet.
- **Colour drift between years.** A polity's colour now lives in each year's registry, so nothing keeps
  France blue across twenty-one maps. Deriving a year copies it, which covers the normal path; authoring a
  year from scratch does not.
