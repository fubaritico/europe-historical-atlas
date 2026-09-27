# 04 — Save, reopen, and render

> [Index](s00-index.md) · _"An editor that only exports is a sketchpad"_ — chapter 06. The round trip is
> the POC's acceptance criterion, not a finishing touch.

## Saving

```gherkin
Scenario: save the work
  Given I have added the Kingdom of France and moved sixty vertices
  When I press ‹ctrl+s›
  Then the file is written
  And the title bar drops its modified marker
  And the status bar reads "saved · 52 polities · 17 104 vertices"
```

```gherkin
Scenario: close with unsaved work
  Given the title bar shows a modified marker
  When I close the window
  Then I am asked to save, discard, or cancel
  And cancelling leaves everything exactly as it was
```

```gherkin
Scenario: save as — and this is how a decade is derived
  Given "1100" is open and saved
  When I press [Save as…]
  And I am asked for the year, and I type 1110
  Then "1110" is written as a full, independent copy
  And "1100" is closed, untouched on disk
  And "1110" is loaded in its place, as the current file
  And the year recorded *inside* the file is 1110, not 1100
  And the undo history is emptied, because it belonged to the file just closed
  And the whole folder is copied, registry included — nothing is shared between years
  And the title bar reads "Cartographer — 1110"
```

> The dev, 2026-09-22: _"on pourrait faire enregistrer sous, ce qui fait qu'on ferme le fichier dont on a
> fait la copie et on charge la copie à la place, pour faire la déclinaison."_
>
> **This is the whole derivation mechanism, and it is a standard Save As.** It follows from H-11 — every
> drawn year is independent — so a copy of the file _is_ the next year. Nothing is shared, nothing is
> referenced, no copy-on-write. See [s05](s05-derive-a-year.md).
>
> **The one thing that must not be forgotten**: asking for the _year_, not just a filename. A file named
> 1110 that still declares 1100 inside would render at the wrong date, and nothing on screen would say so.

```gherkin
Scenario: never overwrite the import in place
  Given I opened "out/europe-1100.json", produced by the OHM spike
  When I save
  Then the result is written to the project's own directory, not over the spike's output
  And the spike's file stays byte-identical, so it can be regenerated and compared against
```

> The spike's output is a _measurement_. Overwriting it destroys the baseline that says how much of the
> map came from OHM and how much we drew.

## The round trip

```gherkin
Scenario: reopen and find it identical
  Given I have saved my work
  When I reopen the file
  Then all 52 polities are present
  And every vertex sits where it sat, to the last decimal
  And every name, rank, status, date, suzerain and colour is unchanged
  And every stretch still carries its provenance
  And stretches shared by two polities are still shared, not duplicated
  And the fills and derived borders are identical to what was on screen before saving
```

> **This single scenario is the POC.** Chapter 06: _"open → paint → save → re-open identical → the 3D
> atlas renders it."_ Everything else is negotiable; this is not.

```gherkin
Scenario: the saved file loses nothing the editor knew
  Given the editor holds: polity ids, ranks, statuses, dated names, suzerains,
    per-stretch provenance, and shared-stretch identity
  When the file is written
  Then all of it is in the file
```

> **Hole H-12, and it is structural.** Today's `RegionPayload` carries `name`, `subjectTo`, `partOf` and
> `rings` — **strings and geometry, nothing else**. It has no id, no rank, no status, no provenance and
> no notion of a shared stretch. Saving into it would throw away most of what the previous three
> scenarios produce. This is exactly why format **B** was decided (groundwork §5); the scenario states
> the requirement the format has to meet.

```gherkin
Scenario: export the shape the atlas consumes today
  Given the working file is in the editor's own format
  When I press [Export for the atlas…]
  Then a RegionPayload is written, with names resolved for the year
  And shared stretches are flattened into each polity's own rings
  And the atlas renders it with no code change
```

> The adapter, from groundwork §5. **The lossy direction is deliberate and one-way**: export is for
> consumption, the working file is the truth.

## Provenance and licence

```gherkin
Scenario: know where every line came from
  Given the Kingdom of France's outline mixes snapped coast, snapped rivers and eye-reported stretches
  When I press [Provenance report]
  Then I see, by length: Natural Earth 62 % · reported by eye 31 % · OpenHistoricalMap 7 %
  And I see the licence attached to each source
  And nothing in the file is marked GPL-3.0
```

> Chapter 06 requires provenance **per feature**, for the same table as "what may we publish". Groundwork
> §6 quinquies makes it operational: at 1100 a GPL payload sits on disk and the tool can read it.

```gherkin
Scenario: a GPL-derived stretch would contaminate the file
  Given a stretch was copied from a GPL-3.0 payload
  When I save
  Then the file is marked as GPL-3.0-derived
  And [Export for the atlas…] warns that publishing it changes the project's licence
```

> **Hole H-13.** Is this even allowed to exist? A cleaner rule is that GPL payloads open **read-only**
> (scenario 01) and no stretch can ever be copied out of one. Weaker rules are easier to violate by
> accident.

## Rendering it in the atlas

```gherkin
Scenario: see the edited year in 3D
  Given I have exported "europe-1100.json" for the atlas
  When I run the atlas and set the year to 1100
  Then the Kingdom of France is painted in its colour
  And its border with the Holy Roman Empire is drawn
  And it is drawn with the vassal hand wherever the registry says a polity owes another
  And nothing in the atlas's source had to change
```

> The atlas already rasterises rings and derives borders from the raster. What it does _not_ yet do is
> read a registry — the vassal hand (groundwork §6 bis) and the rank-driven label typography
> (§6 quater) are both new work on the atlas side, not on the tool's.

## What the tool never writes

```gherkin
Scenario: derived things are not saved as data
  When the file is written
  Then it contains no border geometry
  And it contains no per-polity colour that the palette computed
  And it contains no raster
```

> A border's **geometry** is derived — it is the run of anchors its two owners share, corrected
> 2026-09-27 (see [`format.md`](../format.md)). Writing the line down as well creates the second source of
> truth this whole project spent a session abolishing. Everything else about a border — its kind, its
> stroke, the source its course was read from — **is** data, and lives in the `borders` table. Only
> **pinned** colours are data; computed ones are not.

## A border's hand is data; its geometry is not

```gherkin
Scenario: draw one particular border differently
  Given the derived border between France and the Empire is drawn solid by default
  When I select it and choose [Hand ▸ bold]
  Then it is drawn bold from that moment
  And the file records { between: [france, empire], hand: "bold" }
  And the file records no coordinate for it
  When I reopen the file
  Then the border is derived again from the anchors the two paths share, and drawn bold
```

```gherkin
Scenario: select a line and give it a style
  Given the border between France and the Empire runs over 96 anchors
  When I select a stretch of 20 of them with the white arrow
  And I choose [Hand ▸ bold]
  Then those 20 are drawn bold
  And the other 76 keep the hand their rule derives
  And the file records { run: [...], hand: "bold" }
```

> **The dev's requirement, 2026-09-27**: _"il faut que les traits soient sélectionnables. Comme dans
> Illustrator."_ Keyed on the **run of anchors**, not on the pair of polities — otherwise half a boundary
> cannot be dressed differently from the other half. The run is made of the anchors it dresses, so moving
> one moves the styling with it.

```gherkin
Scenario: an explicit hand beats the rule that would have applied
  Given the registry says Aquitaine owes the Kingdom of France, so the vassal hand applies
  When I set that border's hand to solid explicitly
  Then it is drawn solid
  And it appears in the {Hands} list as an exception to the vassal rule
```

```gherkin
Scenario: nothing recomputes an authored hand away
  Given I have set the Aquitaine–France border to solid by hand
  When I close the file and reopen it
  Then it is still solid
  When I move an anchor of that very border
  Then it is still solid
  When homage over Aquitaine ends in the registry and the vassal rule stops applying
  Then it is still solid, and still listed as an exception
  When I press [Clear hand] on it
  Then it goes back to whatever the rule derives, and leaves the exception list
```

> **The one guarantee of the three that protects something, and the only one that has to be bullet proof.**
> The dev, 2026-09-27: _"tu sélectionnes un trait, tu lui donnes un style, comme dans Illustrator."_ That
> gesture is the law here; the derived hand is only the default underneath it.
>
> **Why this asymmetry and not the other**: a derivation that gets a hand wrong costs one click to override,
> and the override is visible in a list. A recompute that silently restores a derived hand over an authored
> one costs a wrong map nobody looks at twice — plausible, and therefore undetectable, which is the failure
> shape `rules/error-handling.md` singles out. So the derivation may be approximate; **the override may
> not**. [Clear hand] exists so that going back is a decision too, rather than something that happens.

> The dev, 2026-09-22: _"il faudrait quelque chose pour les frontières, comme ça si on a envie de les
> mettre en gros, on les met en gros… vu qu'ils seront toujours synchros."_
>
> **Exactly the right shape, and it costs nothing**: a hand is not a geometry, so recording it introduces
> no second source of truth. The line stays derived from the shared anchors and cannot come apart from the
> territory, because it _is_ the territory's own points; only its dress is authored.
> `data/borderStyles.ts` already does half of this — `solid | dashed | double`, per
> pair of polities — but by matching **names with regular expressions**, which is why
> `Poland-Lithuania` once satisfied both halves of its own rule. Keyed on ids from H-12, that class of bug
> disappears.
>
> **The arbitration is decided**: an explicit hand always beats a derived rule, and every exception is
> listed. Otherwise a border set to bold would silently go back to dashed with nothing to explain it.
