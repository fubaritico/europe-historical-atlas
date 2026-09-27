# 05 — Derive a new year from an existing one: 1100 → 1110

> [Index](s00-index.md) · chapter 06's _"seed from year T−1 and paint only the delta"_ — the thing that
> makes a decade-stepped atlas tractable at all.
>
> **Rewritten 2026-09-22.** This file used to be built entirely on stretches shared between years, with
> copy-on-write on every change. The dev settled it the other way: _"pour être tranquille, chaque année
> dessinée est indépendante"_ (H-11), and gave the mechanism that replaces all of it — a plain
> **Save as** ([s04](s04-save-and-reopen.md)).

## Creating the year

```gherkin
Scenario: derive a new year
  Given "1100" is open with 52 polities
  When I press [Save as…] and type the year 1110
  Then "1110" is written as a full, independent copy of 1100
  And "1100" is closed and left untouched on disk
  And "1110" is loaded in its place
  And it holds the same 52 polities and the same territory
  And the title bar reads "Cartographer — 1110"
```

```gherkin
Scenario: the copy is complete, and nothing is referenced
  Given "1110" was saved from "1100"
  Then every anchor, path and ring was copied into it
  And it holds no reference of any kind back to 1100
  And 1100 can be deleted, moved or renamed without affecting 1110
```

```gherkin
Scenario: the registry is copied with everything else
  Given "1110" was saved from "1100"
  Then 1110 has its own registry, copied from 1100's
  And it carries the same polity ids, names, ranks, suzerains and colours
  And renaming a polity in 1110 changes nothing in 1100
```

> **Deriving a year is copying the folder** — registry, territory and borders together
> ([s07](s07-manage-the-registry.md), [`format.md`](../format.md)). Corrected 2026-09-27: this scenario used
> to assert a registry shared by every year, which was **my** factoring rather than the dev's decision. H-11
> applies without exception — _"une année c'est une année"_.
>
> **What it costs, stated**: renaming a polity across twenty-one centuries is one edit per century. What it
> buys is that no file depends on another, and that a name is simply the name that year — no dated-name
> machinery, no dated relations, no cross-century identity to reconcile. The `build-registry` spike
> measured the alternative: grouping OHM by Wikidata id split the Kingdom of France into four.

> **Independent by decision, not by accident.** Sharing stays _inside_ a year — France and the Empire run
> over the same anchors along the Meuse at 1100, which is [H-06](s99-holes.md) and is untouched. Across
> years, nothing is shared.

## What it costs, stated once

```gherkin
Scenario: a line that was always wrong
  Given the Empire's limit along the Meuse was digitised crudely
  And 1100, 1110 and 1120 each hold their own copy of it
  When I improve it in 1110
  Then only 1110 improves
  And nothing tells me the other two still carry the old line
```

> **This is the accepted price**, and it is written down rather than hidden: a correction has to be redone
> in each year holding it. The dev took the call knowingly — the alternative was copy-on-write, which asks
> _"was the line drawn badly, or did the border move?"_ at every single vertex, and only the author knows.
> Buying simplicity here costs repetition later, and there is one contributed year today.
>
> **Worth keeping in view**: a lint that spots an identical-looking stretch differing between two years
> would soften this without reintroducing sharing. Not designed, not blocking.

## Changing the year's content

```gherkin
Scenario: a border that moved between the two dates
  Given France pushed east between 1100 and 1110
  When I move the anchors along that stretch in 1110
  Then 1110 changes
  And 1100 is untouched, because it is a different file
```

```gherkin
Scenario: a polity ceases to exist
  Given the Kingdom of Dublin is in 1110 and ended in 1104
  When I select it and press [Remove from this year]
  Then it leaves 1110's territory
  And it stays in the registry, with its dates intact
  And its ground becomes unclaimed unless I reassign it
```

```gherkin
Scenario: hand a vanished polity's ground to its successor
  Given I am removing the Kingdom of Dublin from 1110
  When I choose [Reassign its territory to…] and pick "Kingdom of Leinster"
  Then every ring it held passes to Leinster
  And no unclaimed land is created
```

```gherkin
Scenario: the registry warns before I do
  Given 1110 was derived from 1100, which held the Kingdom of Dublin
  And its entry says it ended in 1104
  When I open 1110
  Then it is flagged "did not exist in 1110 — ended 1104"
  And any polity whose "exists from" is after 1110 is flagged the same way
  And nothing is deleted for me
```

> **`existsFrom` / `existsTo` are kept on every entry**, and the dev's point, 2026-09-27, is why: keeping two
> dates is not the same as sharing a file. They are **facts about the polity**, sitting in that year's own
> registry, compared against that same file's `year`. No lookup, no interval arithmetic, no reference to
> another folder — and it catches the commonest authoring slip, a polity carried into a year it did not live
> in. Deriving a year copies them along with everything else, so the flag appears the moment 1110 opens.
>
> **It warns and never deletes**: a polity outliving its recorded end date is often the record being wrong,
> not the map. OHM supplies both dates — the `build-registry` spike measured **zero** relations without a
> start date.

```gherkin
Scenario: a polity appears
  Given the County of Portugal becomes a kingdom in 1139
  When I press [+ New polity] in year 1140
  Then it exists in that file, and in no other
```

## The authoring pass, end to end — the dev's own sequence, 2026-09-27

> _"Je vais ouvrir l'année 1100 et faire enregistrer sous… puis je supprime des États car j'obtiens des
> warnings… puis je m'occupe des pays qui viennent juste de commencer à exister… puis j'ajuste les traits…
> je peux appliquer des couleurs ou pas… je peux aussi créer certaines polities qui ne sont pas présentes
> dans le registre."_
>
> What follows is that pass, in order, with one thing settled first because the rest depends on it.

### Is a registry generated on opening a year? — no, and the two cases are different

```gherkin
Scenario: a year derived from one that exists
  Given "1100" is open
  When I press [Save as…] and type 1110
  Then 1110's registry is a COPY of 1100's — nothing is generated
  And every polity arrives with its name, rank, suzerain, colour and dates
  And no identity was invented, so nothing has to be checked
```

```gherkin
Scenario: a year with nothing to copy from
  Given no authored year exists near 1110
  When I create 1110 from nothing
  Then its registry is EMPTY — nothing is generated on the fly
  And [Import identities from the catalogue…] is offered, and never run for me
```

> **Nothing is ever generated silently**, and that is the decision: filling a new year with fifty-two
> polities nobody asked for would be an import disguised as an opening, and the author would then have to
> audit a list they did not write. Copying is safe because the author already validated the source year;
> importing is a gesture.

### The catalogue — what "not in the registry" means

**The dev's step 9 needs a second object, and this names it.** With one registry per year, a polity you
create is in that year's registry by definition — there is nothing for it to be absent from. So what step 9
is talking about is a **catalogue**: the pool of polities the project knows about, which exists to *fill in
forms*.

```
catalogue.json        every polity ever named in this project, plus what OHM supplied
                      ↓ prefills a form. Never read to draw anything.
years/1110/registry.json   who exists in 1110 — the only thing the map reads
```

| | catalogue | a year's registry |
| --- | --- | --- |
| scope | the whole project | one year |
| read when | filling a form, importing identities | drawing the map |
| if it is lost | autocompletion stops; every year still opens and renders | that year loses every name |
| is it a source of truth | **no** | **yes, for its year** |

> **Why this does not reintroduce the shared registry.** The catalogue is an **input aid**, exactly like
> `fetch-ohm`'s cache: you pull an identity out of it, the values land in the year, and from that moment the
> year is self-sufficient. Nothing resolves against it at render time, and deleting it breaks no map. That is
> the line — a catalogue you read *while typing* is not a file another file depends on
> ([`format.md`](../format.md), _the link is made by the reader_).

### The list is a synthesis — pre-existing, began, ended

```gherkin
Scenario: what {Polities} shows the moment 1110 opens
  Given 1110 was derived from 1100 and its year is 1110
  Then every polity is listed in one list, each carrying one of three marks:
    "carried over"  — its dates span 1110, nothing to do
    "ended 1104"    — its "exists to" is before 1110
    "begins 1115"   — its "exists from" is after 1110
  And the counts are shown: "49 carried over · 2 ended · 1 not yet"
  And I can filter the list down to each mark
```

```gherkin
Scenario: where the polities that BEGAN between the two years come from
  Given the County of Portugal begins in 1109 and is in no year I have authored
  Then it is NOT in the list, because nothing in 1100's folder could know about it
  When I press [Find polities beginning by 1110…]
  Then the catalogue and the OHM cache are searched for that window
  And I am offered them one by one, with their dates and Wikidata ids
  And each one I accept is created with no territory
```

> **The gap worth naming.** "Carried over" and "ended" are both computable from the copied file. **"Began"
> is not** — a year derived from 1100 cannot know what appeared after 1100. That column is the one reason
> the catalogue has to exist, and it is why the dev's step 6 needs a source rather than a filter.

### Ended polities are visible but not drawn

```gherkin
Scenario: an ended polity holds ground until I decide
  Given the Kingdom of Dublin is marked "ended 1104"
  Then its fill is NOT painted and its borders are NOT drawn
  And its outline is shown as a thin dashed ghost, in the editor only
  And its ground reads as unclaimed underneath
  And its row in {Polities} is dimmed
```

> **Shown, and not rendered** — the dev's own rule, and the reason it must be *shown* anyway: deleting
> something you cannot see is deleting blind. The ghost is editor chrome; it is in no export.

### Deleting them — and the one dangerous step in the whole pass

```gherkin
Scenario: remove an ended polity
  Given the Kingdom of Dublin is marked "ended 1104" and holds 3 rings
  When I press [Remove from this year]
  Then its claim is deleted — the rings, which are lists of indices
  And its ANCHORS ARE NOT DELETED
  And any anchor now held by no path at all is removed, and only those
  And the neighbours' outlines have not moved by one point
  And the status bar reads "removed 3 rings · 412 anchors kept, shared · 96 anchors dropped"
```

```gherkin
Scenario: remove several at once
  Given 2 polities are marked "ended"
  When I select both and press [Remove from this year]
  Then I am told what it touches before it runs
  And it is ONE undo step
```

> **This is where the pass can silently break the map, and it is worth stating hard.** Dublin's coastline
> anchors are shared with whoever is next to it. Deleting *the polity's points* would move a neighbour's
> border without the neighbour being touched — the sliver, arriving from the one gesture nobody would suspect.
> **What is deleted is the claim; anchors go only when their reference count reaches zero** ([H-06](s99-holes.md),
> [s03](s03-edit-existing-border.md)). The count already exists for the delete confirmation, so this costs
> nothing new.

### Then the rest of the pass, in the dev's order

```gherkin
Scenario: the polities that have just begun
  Given I accepted the County of Portugal from the catalogue
  Then it is in the registry with no territory
  When I press [Draw territory]
  Then the Pen is handed to me with it as the target
```

```gherkin
Scenario: adjust the lines
  When I marquee anchors along the eastern limit and drag them
  Then every path holding them moves together
  And no fill and no border can come apart from the other
```

```gherkin
Scenario: colours are optional
  Given I have changed nothing about colour
  Then every polity keeps the colour copied from 1100
  When I pin a new one on any of them
  Then only 1110 changes
```

```gherkin
Scenario: create a polity the catalogue has never heard of
  Given no catalogue entry matches "Lordship of the Isles"
  When I create it by hand and validate the form
  Then it is in 1110's registry
  And the catalogue learns it, so the next year can offer it
  And nothing about 1110 depends on the catalogue having learnt it
```

### Saving — one gesture, three files

```gherkin
Scenario: save writes the whole year
  Given I have removed 2 polities, added 1, moved 40 anchors and pinned a colour
  When I press [Save]
  Then registry.json, polities.json and borders.json are ALL written
  And they are written together, or none of them is
  And the catalogue is written too, if it learnt anything
```

> **There is no "save just the registry", and refusing it is the point.** The dev's step 11 offers it as an
> optimisation — save the registry only if a new polity was created. It buys nothing measurable and it can
> leave a folder where `polities.json` names an id `registry.json` does not have, which is precisely the
> consistency failure `format.md` lists as needing a declared severity. Three small files written together
> cost a millisecond; a year that half-saved costs an evening.

## Vulnerabilities in the pass above

> Asked for by the dev, 2026-09-27. Ranked by what they cost, each with its remedy.

| # | what breaks | severity | the way out |
| --- | --- | --- | --- |
| **1** | **Deleting an ended polity deletes anchors its neighbours share**, moving a border nobody touched. The sliver, from the least suspicious gesture in the pass | **blocking** — it corrupts the map and looks fine on screen | delete the *claim*, never the points; drop an anchor only when its reference count hits zero. Test it by breaking it on purpose |
| **2** | **"The registry" means two different things** — the year's file and the project's pool. Left ambiguous, both get built and they disagree | **blocking, and cheap now** | name them apart, as above: **catalogue** (input aid, never rendered) vs **registry** (the year, the truth). Decided in this file |
| **3** | **A partial save** leaves `polities.json` naming an id `registry.json` lacks | worth knowing | one [Save] writes all three, atomically. No per-file save |
| **4** | **"Began by 1110" has no source** in a derived year — nothing in 1100's folder knows what appeared after 1100 | worth knowing; it silently truncates the pass | the catalogue and the OHM cache, searched on an explicit gesture |
| **5** | **Ended polities not drawn are also not findable** — you delete what you cannot see | worth knowing | the dashed ghost above, editor-only |
| **6** | **The warnings are computed against the year inside the file.** If [Save as] takes a wrong year, every warning is wrong and plausible | worth knowing | already covered: [Save as] **asks** for the year and writes it inside the file ([s04](s04-save-and-reopen.md)) |
| **7** | **The undo history is emptied by [Save as]**, so the deletions in this pass cannot be undone past the save | cosmetic, and deliberate | the backup-on-replace above; the history belongs to the file that was closed |

## Seeing the delta

```gherkin
Scenario: what changed
  Given "1110" and "1100" are both on disk
  When I press [Compare with…] and pick 1100
  Then ground that changed hands is hatched in the new owner's colour
  And polities added are outlined in green, removed in red
  And a list reads: "gained 2 · lost 1 · area changed 11 400 km²"
  And the pairs whose limit moved are named: "France–Empire · Empire–Bohemia"
```

> **Cheap, because the raster already exists.** Two grids, one cell per 1.9 km, each holding its owner's
> index: the diff is `a[i] !== b[i]`. No polygon intersection — which is the operation that breaks in every
> GIS — and no new geometry.
>
> **Two things not to get wrong:**
>
> 1. **A cell is not the same area everywhere.** In Mercator a cell at 60°N covers far less ground than one
>    at 40°N; the surface has to be weighted by the latitude's cosine, or Scandinavia is counted at roughly
>    twice its size.
> 2. **"Borders moved: 4" was meaningless and has been replaced.** The raster knows that 3 000 cells
>    changed hands; grouping them into a number of _borders_ requires deciding what one moving border is,
>    and three disjoint gains against the same neighbour have no non-arbitrary answer. **Naming the pairs
>    whose limit changed** is exactly defined, computable, and more useful to read.
>
> **Cost**: two rasters held at once is ~91 MB against a known peak of 136 MB, so the diff runs in the
> worker and at the 2× grid — 3.8 km cells are ample for a visual comparison.

> **The diff survives independence, and it is worth more now than before.** It is computed by reading two
> finished files and comparing them, with no shared object and no parent link needed. It is also the only
> thing that can tell the contributor whether a change in 1110 was deliberate — which used to be the
> copy-on-write question, now answered by looking rather than by being asked.
>
> **What it cannot do**: tell a moved border apart from a corrected one. The diff sees a difference; the
> reason lives in the author's head. Accepted, as the price above.

```gherkin
Scenario: compare against any year
  When I choose [Compare with…] and pick 1000
  Then the diff is computed against 1000 instead
  And any authored year can be compared with any other
```

## The chain

```gherkin
Scenario: see the years that exist
  When I open the timeline
  Then every authored year is marked
  And a year is just a file — there is no parent, and no derivation tree
```

> **H-22 is closed with the sharing that created it.** It asked what happens when a derived year is
> re-parented onto another. With independent years there is no parent to change: 1105 saved from 1100 and
> 1105 saved from 1110 are the same kind of object, and re-parenting has no meaning.

```gherkin
Scenario: insert a year between two that exist
  Given 1100 and 1110 both exist
  When I open whichever of the two is closer to what 1105 should look like
  And I press [Save as…] and type 1105
  Then 1105 exists, independent of both
```

## Saving over a year that already exists

```gherkin
Scenario: the year I am saving to already exists
  Given I have "1100" open
  And "1110" already exists, holding work of its own
  When I press [Save as…] and type 1110
  Then I am warned before anything is written
  And the warning says what would be lost, not merely that a file exists:
    "1110 already exists — 52 polities, 17 104 anchors, last modified 3 days ago"
  And I am offered: replace · choose another year · cancel
  And cancelling writes nothing at all
```

```gherkin
Scenario: replacing keeps the old one anyway
  Given I confirm the replacement
  Then the existing file is renamed "1110.backup-2026-09-22.json"
  And the new copy is written as "1110.json"
  And the status bar names the backup it kept
```

> The dev, 2026-09-22: _"s'il y a déjà un fichier qui existe, il faut pouvoir me dire attention, tu vas le
> remplacer."_
>
> **Why the warning has to be specific.** Since H-11 every year is independent, so a replaced year is
> unrecoverable — nothing is shared with any other file, and the undo history was just emptied by this very
> save ([s04](s04-save-and-reopen.md)). "A file exists, overwrite?" is not enough to decide with; the
> polity count, the anchor count and the date are.
>
> **Why the backup rather than a stronger dialogue.** A confirmation only reduces how often the mistake
> happens; renaming the old file removes the consequence. It costs one line and turns an irreversible
> gesture into a recoverable one — which is the same reasoning that keeps the OHM spike's output
> byte-identical rather than trusting nobody will overwrite it.
