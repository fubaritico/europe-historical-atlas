# The Cartographer's working format — H-12

> Written 2026-09-22, at the end of the session that settled the gestures. **This is the last lock before
> code.** Everything here follows from decisions already taken in
> [`scenarii/s99-holes.md`](scenarii/s99-holes.md); nothing is invented here.
>
> Two files. `registry.json` holds **who exists**, once. `<year>.json` holds **what was held, that year**,
> independently of every other year.

## Why it is small

The format came out simpler than the earlier notes feared, and it is worth saying why — three decisions
each removed a layer:

| decision                                             | what it removed                                           |
| ---------------------------------------------------- | --------------------------------------------------------- |
| **every drawn year is independent** (H-11)           | cross-year references, copy-on-write, the derivation tree |
| **a path is a list of references to anchors** (H-06) | a whole topology model — no arc objects, no node table    |
| **the registry is shared** (s07)                     | names, ranks and dates repeated in all 21 year files      |

## `registry.json` — identity, shared by every year

```jsonc
{
  "version": 1,
  "polities": [
    {
      "id": "fr-couronne", // ours, stable, readable. Never a display name.
      "wikidata": "Q70972", // null where there is none. 94 % of OHM polities have one.
      "rank": "kingdom", // OHM's border_type: empire · kingdom · duchy · county …
      "status": "country", // OHM's place: country · personal_union · condominium …
      "existsFrom": 843,
      "existsTo": null, // null = still running at the last authored year
      "names": [
        { "text": "Royaume des Francs", "from": 843, "lang": "fr" },
        { "text": "Royaume de France", "from": 1190, "lang": "fr" },
      ],
      "aliases": [{ "text": "Kingdom of the Franks", "lang": "en" }],
      "colour": null, // null = palette by adjacency; a hex pins it
    },
  ],
  "relations": [
    {
      "subject": "nor-duche", // Normandy owes …
      "suzerain": "fr-couronne", // … the French crown …
      "from": 911,
      "to": 1204, // … between these dates, and not outside them
    },
  ],
}
```

**Dated names are the point.** _Regnum Francorum_ becomes _regnum Franciae_ around 1190 and it is one
polity throughout, with one id. The year file never stores a name, so renaming once shows in every map.

**Relations are separate and dated**, never a field on the polity: rank and dependency are orthogonal
(the king of England is duke of Aquitaine, hence a vassal), and a suzerainty has a beginning and an end.
A cycle over overlapping intervals is refused ([s07](scenarii/s07-manage-the-registry.md)).

## `<year>.json` — the territory of one year

```jsonc
{
  "version": 1,
  "year": 1100, // the year, inside the file — not only in its name
  "editorialZone": { "west": -45, "south": 20, "east": 60, "north": 76 },
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
      "polity": "fr-couronne", // an id from the registry; no name here, ever
      "rings": [
        [0, 1, 2], // a ring is an ordered list of anchor indices
        [7, 8, 9, 10], // a second ring: a hole or an exclave, by containment
      ],
    },
  ],

  // Editorial dress. No geometry — the line itself is always derived from the fills.
  "hands": [{ "between": ["fr-couronne", "hre"], "hand": "bold" }],

  // Unclaimed ground the author declared on purpose, so the check stops reporting it.
  "deliberateGaps": [{ "ring": [40, 41, 42, 43], "reason": "no-man's-land between marches" }],
}
```

### The one idea in the whole file

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

No `paths` table, no arc objects, no node table. The earlier sketch had all three and none of them earn
their place: the ring _is_ the path.

### What is deliberately absent

| not in the file               | why                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| border geometry               | a border is the edge of the fills, derived. Writing it down recreates the two-sources-of-truth failure that cost a session on 2026-09-16 |
| computed colours              | only a _pinned_ colour is data                                                                                                           |
| the raster                    | recomputed on open, ~825 ms in the worker                                                                                                |
| names, ranks, dates           | they live in the registry, once                                                                                                          |
| any reference to another year | H-11                                                                                                                                     |

## The adapter — the atlas does not change by a line

```
registry.json  ┐
               ├──► toRegionPayload(year) ──► RegionPayload ──► the atlas, unchanged
1100.json      ┘
```

- indices are resolved back into `[lon, lat]` pairs;
- the name valid **in that year** is looked up in the registry and written flat;
- shared anchors become duplicated coordinates in each polity's rings — **correct for a consumer that
  modifies nothing**;
- `subjectTo` is filled from the relation valid that year.

**The lossy direction is deliberate and one-way**: the export is for rendering, the working file is the
truth. Already stated in [s04](scenarii/s04-save-and-reopen.md).

## What is still open

- **Precision of stored coordinates.** Six decimals is about 10 cm at our latitudes, which is far beyond a
  1.9 km cell. Fewer decimals means smaller files and no visible loss. Not measured.
- **Where `registry.json` lives relative to the year files**, and what happens when a year references an id
  the registry does not have. A missing registry loses every name — it needs the same hand-written reader
  and the same declared severity as the atlas's four assets (`data/assetError.ts`, taxonomy
  `transport | schema | consistency | semantic`).
- **`deliberateGaps` keyed on a ring of indices** breaks if those anchors are later deleted. Probably wants
  an id of its own.
