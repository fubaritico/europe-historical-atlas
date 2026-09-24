# fetch-ohm — can OpenHistoricalMap replace the GPL border source?

> Probes two questions at once: **(1)** can OSM-style boundary relations be assembled into closed rings
> reliably, and **(2)** is OHM's coverage good enough to drop `historical-basemaps` (GPL-3.0)?
> Run on 2026-09-16. See `files/plans/cartographer/06-contribution-tooling.md`.

## Run

```bash
node files/spikes/fetch-ohm/fetch-ohm.mjs --year 1700          # writes out/europe-1700.json
node files/spikes/fetch-ohm/fetch-ohm.mjs --year 1900 --refresh # re-query the catalogue
```

Emits the **same payload shape** as `fetch-borders` (`{source, year, bbox, tolerance, regions[]}`), so the
app consumes it with no code change.

To see it in the 3D map you have to overwrite what the app fetches. **`public/borders/` is git-ignored**
(GPL-3.0 source), so git will not recover the original — back it up first:

```bash
cp -n public/borders/europe-1700.json files/spikes/fetch-ohm/out/europe-1700.hb-backup.json  # once
cp    files/spikes/fetch-ohm/out/europe-1700.json public/borders/europe-1700.json            # swap in
```

Restore the `historical-basemaps` version:

```bash
cp files/spikes/fetch-ohm/out/europe-1700.hb-backup.json public/borders/europe-1700.json
```

Failing that it can be regenerated — `node files/spikes/fetch-borders/fetch-borders.mjs --year 1700` —
but only while `files/spikes/fetch-borders/out/world_1700.geojson` is still on disk, and that too is
git-ignored.

**Currently swapped in: 1700 = OpenHistoricalMap.** The other years are still `historical-basemaps`.

## Answer to (1): ring assembly is a non-problem

| Year | Relations | Assembled ≥1 ring | Unclosed chains |
|---|---|---|---|
| 1500 | 61 | 58 (95.1 %) | **0** |
| 1700 | 84 | 83 (98.8 %) | **0** |

**Zero unclosed chains.** Greedy endpoint-matching over the member ways closes every ring it starts.
The handful of failures are not broken geometry: they are **label-only relations** (a single node with
role `label` — "Kingdom of France", "Holy Roman Empire", "Kingdom of Hungary" at 1500), which are
placeholders, not polygons.

Two caveats found:

- **`out geom` does not expand sub-relations** — 18 relation-members were skipped at 1700. A polity built
  from sub-relations would lose those parts. Not yet observed to matter; would need a recursive fetch.
- A `license=*` tag on a feature usually **restates** the CC0 default (`license=CC0-1.0` on Spain).
  The first version of this script dropped every tagged feature and silently lost Spain — only genuinely
  restrictive values (`ODbL`, from OSM imports) must be dropped.

## Answer to (2): coverage is good from ~1700, not before

**Two metrics were tried and withdrawn.** Counting "polities alive at year Y" counts label-only
placeholders and, over the DEM's very wide frame, Indian sultanates. Counting how many *"major powers"*
are present was worse: that list was **a hand-written editorial judgement, not a property of the data** —
and a polity having neighbours says nothing about whether it matters.

**The objective metric is surface**: what share of the frame's land the polygons actually cover,
rasterised against `public/masks/europe-land` (Natural Earth, public domain) on the DEM grid.

| Year | Source | Polities | DEM frame | Europe proper |
|---|---|---|---|---|
| 1500 | historical-basemaps | 85 | 97.0 % | 96.8 % |
| 1500 | **OHM** | 57 | 41.5 % | **61.8 %** |
| 1700 | historical-basemaps | 93 | 97.8 % | 96.8 % |
| 1700 | **OHM** | 83 | 64.7 % | **93.8 %** |
| 1800 | **OHM** | 76 | 77.7 % | **95.3 %** |
| 1900 | **OHM** | 68 | 89.3 % | **100 %** |
| 2000 | **OHM** | 106 | 100 % | **100 %** |

"Europe proper" = lon −25…45, lat 34…72. The DEM frame reaches E78.75 / S11.18 (India, the Sahel) — decor,
not subject. In Europe proper OHM is **equivalent from 1700** and **better from 1900**; at 1500 it leaves
**38 % of Europe blank**.

**Root cause of the gaps**: OHM models a polity as a `type=chronology` relation grouping *many* dated
`type=boundary` relations, one per border change. "Kingdom of France" exists as ~10 such relations —
987→1050, 1050→1212, then nothing until 1648→1659, 1769→1781, 1787→1791… **The coverage is episodic:
someone mapped the intervals they cared about, and 1500 is in a hole.**

Note this is also **direct evidence for the deferred "interval-based polities" temporal model**
(memory `polity-temporal-model`): the largest open historical GIS in existence uses exactly that model.

## No hierarchy in the data

Tag survey over the 2059 relations: `part_of:empire` on **15**, `part_of` on **2** — 0.7 %. `admin_level`
is constant (we filter on `=2`). So OHM gives **no equivalent of `historical-basemaps`' `SUBJECTO` /
`PARTOF`**, and the "colour by empire" view does not come free with the data; the hierarchy has to be ours.

Two tags that do pay, though:

- **`wikidata` on 1930 of 2059 (94 %)** — stable identity across the chronology fragments, and a route to
  *derive* the hierarchy by query rather than typing it.
- **`start_event` / `end_event` on ~1500** — OHM already names the event that creates and ends a polity,
  which feeds the Studio event model directly.

## Conclusion

- **Ring assembly: solved**, 98.8 % at 1700 with no unclosed geometry. Not a blocker.
- **OHM is adoptable from ~1700 onward**, and is the licence answer (CC0) for that range.
- **Before ~1700 it is not usable as-is**: the polities that cover most of the map's surface are absent.
  Those centuries have to be authored, or sourced elsewhere.
- Corollary: the GPL question is **narrowed, not dissolved** — the earlier "parity from 1500" claim was
  built on the bad metric and is withdrawn.

Status: **done** — conclusions folded into roadmap chapter 06.
