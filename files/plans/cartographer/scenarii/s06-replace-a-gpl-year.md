# 06 — Replace a year we cannot publish: 1500

> [Index](s00-index.md) · `public/borders/europe-1500.json` is `historical-basemaps`, **GPL-3.0**. It is
> complete (~97 % of Europe) and unpublishable. OHM covers 55 % there, measured, and is CC0.

## The two sources, side by side

| | `historical-basemaps` | OpenHistoricalMap |
|---|---|---|
| licence | **GPL-3.0** | **CC0** — public domain dedication |
| may we ship it | **no** — a strict reading puts the whole distributed work under GPL | **yes**, no condition, no attribution required |
| may we edit it | editing is *modifying* under GPL §0 — the result is covered | yes, and corrections can be pushed back upstream |
| coverage at 1500 | ~97 % (built as a complete partition) | **55 %** (measured 2026-09-22) |
| coverage at 1700 | ~97 % | **89 %** |
| coverage at 1100 | present | **45 %**, and **no France at all** |
| provenance | murky — its own README says to verify it against other sources | OSM model, per-feature history, Wikidata ids on 94 % |
| what we may take | **the facts only** | **everything** |

**The rule in one line: a GPL map may be read, never imported.** Where a border ran is a fact and nobody
owns it; the drawn geometry is an expression and copying it is what the licence governs.

## Replacing 1500

```gherkin
Scenario: start from what is free
  Given no CC0 payload exists for 1500 in the project
  When I run the OHM ingest for 1500
  Then a payload of 57 polities is produced, covering 55 % of Europe
  And its source field reads "OpenHistoricalMap (CC0)"
  And it is publishable as it stands
```

```gherkin
Scenario: open the GPL map beside it as a reference
  Given "europe-1500.json" from historical-basemaps
  When I open it with [Open as reference…]
  Then it is drawn as a ghosted underlay in a distinct colour
  And its polities are listed in a separate {Reference} panel
  And no vertex of it can be selected, moved, copied or snapped to
  And the status bar reads "reference: GPL-3.0 — readable, never importable"
```

> **The only safe shape.** A "reference" mode where geometry is inert cannot be violated by accident; a
> rule that merely marks contaminated stretches can. This supersedes hole H-13.

```gherkin
Scenario: take a fact from the reference
  Given the reference shows a polity our CC0 payload lacks
  When I press [Create polity from reference…]
  Then a new empty polity is created
  And its name, rank and dates are copied
  And **no geometry is copied**
  And its provenance reads "identity reported from historical-basemaps (fact)"
  And I draw its territory myself
```

> Names, dates, ranks, who-owed-whom: facts. This is the same status Duby and Euratlas already have.

```gherkin
Scenario: report a border by eye from the reference
  Given the reference shows Burgundy's limit and our payload has none
  When I trace it with ⟨free point⟩, reading the reference as I would a paper atlas
  Then the stretch is mine, reported by eye
  And its provenance reads "reported by eye — historical-basemaps (reference)"
```

> **The line this walks, stated once**: reading a map to learn where a border ran is fact extraction.
> Putting that map *underneath* the canvas and following its pixels is tracing, and a trace is a
> derivative. The tool enforces the difference by never letting reference geometry be snapped to.

```gherkin
Scenario: know when 1500 can be published
  When I open the provenance report for 1500
  Then I see the share of border length by source
  And I see "publishable: yes" only when no stretch derives from a GPL geometry
```

## Retiring the old file

```gherkin
Scenario: swap the year over
  Given a CC0 1500 now exists and covers what we need
  When I export it for the atlas
  Then public/borders/europe-1500.json is replaced
  And the historical-basemaps original stays git-ignored, as a reference only
  And the atlas renders 1500 with no code change
```

> Today **1700 is the only year holding an OHM payload**; the other twenty are still GPL. Every year
> replaced is one fewer blocking publication.

## What is left to draw

```gherkin
Scenario: measure the gap, not guess it
  Given the CC0 1500 payload is loaded
  When I enable the "unclaimed" layer
  Then 45 % of Europe's land is hatched
  And the status bar reads "unclaimed land 45 % · publishable: yes"
```

> Coverage is measured **by surface**, never by counting polities — chapter 06 withdrew two metrics for
> getting that wrong.
