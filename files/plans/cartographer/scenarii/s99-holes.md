# 99 — Holes in the racket

> [Index](s00-index.md) · **the actual deliverable.** Every place the scenarios could not be written
> without inventing an answer. Ordered by what blocks the most, not by where they appear.
>
> A hole is not a bug: it is a decision nobody has taken yet, found by trying to describe a gesture.

## Blocking — these decide the shape of the tool

### H-06 · Settled 2026-09-22

**Shared topology, reached through a gesture instead of a data model.** The dev read scenarios 01–03,
recognised Illustrator's Pen and white arrow in them, and answered the fork in two sentences:

> _"on fait démarrer un autre tracé car nous aurons des points en commun sur plusieurs tracés"_
> _"On duplique un tracé et on aura des tracés concomitants, c'est tout."_

**The mechanism, and the one thing that must not be got wrong:**

- A **path is an ordered list of references** to anchors. It owns its order, not its points.
- **Duplicating a path copies the list, never the anchors.** Two paths then run over the same points, so
  moving one moves both — concomitant by construction.
- **Copying the anchors is forbidden**, and no gesture in the tool produces such a copy. It would put the
  two outlines on independent geometry, and the sliver `extractRegionBorders` abolished at render time
  would come back at authoring time.
- An anchor knows how many paths hold it. Deleting one removes it from **all** of them, after saying so —
  refusing would make simplifying a shared border impossible, which is the tool's main job.

**What this closes with it**: ⟨reuse border⟩ disappears as a Pen mode — reusing a neighbour's line is
"duplicate this path into the selected polity", a command on an existing outline. Written up in
[s00](s00-index.md), tested in [02](s02-create-france-1100.md) and [03](s03-edit-existing-border.md).

**What it hands to H-12**: the working format must store anchors once, with stable ids, and paths as lists
of those ids. That is no longer a question, it is a consequence.

### H-05 · Split in two 2026-09-22 — most of it was not a problem

The hole was written as "two polities overlap", which lumped together a defect and a fact. The dev's own
example separated them: _"dans la zone de la France, je dessine une zone, je dis que c'est un duché qui
appartient à la France. Cette zone chevauche la France. Mais c'est un duché de la France."_

**H-05a · A vassal inside its suzerain — settled. It is not an overlap, it is vassalage.**

- The duchy declares `subjectTo: France`, so **nothing is reported**. A vassal sitting inside its suzerain
  is the definition of the relation.
- **The suzerain is not re-cut.** France keeps its whole outline, which is legally correct — the duchy is
  _in_ the kingdom. No hole, no clipping, nothing to redraw.
- **The more specific polity paints the cell.** This replaces `rasteriseRegions`'s current rule, which is
  **"later index wins", silently** — meaning reordering the entries in a file would change the map.
  Hierarchy depth is deterministic and means something.
- **The border between them comes out with the vassal hand on its own**, because the registry already
  carries the relation. Nothing extra to declare.
- **Bonus**: this is the fix for the recorded `colorBySuzerain` defect — it colours by _index_ against
  adjacency and never reads the hierarchy, so two vassals under an unpinned crown come out in different
  colours. Painting by depth makes the option do what its label promises.

> **And the hierarchy says the law, not the power.** In 1100 William IX holds more land than Philip I, and
> fifty years later Aquitaine leaves for the Plantagenets by marriage. `subjectTo` must never be read as
> "obeys". That is what makes the vassal hand honest rather than false: it shows a legal tie while the
> reader sees with their own eyes that the vassal is twice the size of its suzerain.

**H-05b · Two peers claiming the same ground — still open, and much smaller.**
France and the Empire both claiming Lorraine, with no dependency between them. That has a historical
meaning — contested ground — and nobody can guess it, so it has to be reported and offered:
take · leave · adjust. Nothing implements it.

### H-12 · Written out 2026-09-22 — [`cartographer/format.md`](../format.md)

The hole was never _whether_ but _what exactly_. The fields are now written down, field by field, with the
adapter back to `RegionPayload`. **Rewritten 2026-09-27**: one folder per year, three files inside it —
`registry.json` (who exists that year), `polities.json` (anchors and rings), `borders.json` (types and
strokes). **Nothing is shared between years**, H-11 without exception. The earlier version shared one
registry across all twenty-one centuries, which was my factoring and not the dev's decision, and it is what
made the format hard: dated names and dated relations existed only to serve it. **`existsFrom` / `existsTo`
are kept** — a date on a polity is a fact in its own file, not a reference to another one, and it is what
warns that a polity was carried into a year it did not live in.

**The one idea in it**: a ring is a **list of anchor indices**, not a list of coordinates. Two rings
containing the same run of indices _are_ the same points — moving one moves both fills, and a sliver
cannot appear. Duplicating a path is copying that run of indices, reversed. **No paths table, no arc
objects, no node table**: the ring _is_ the path.

**Why the format came out small**: H-11 removed cross-year references and copy-on-write, H-06 removed the
topology model, and the shared registry removed names and ranks from all 21 year files.

**Still open, and none of it blocks code**: coordinate precision (6 decimals is 10 cm against a 1.9 km
cell), what a year referencing an unknown polity id should do, and `deliberateGaps` being keyed on
anchor indices that a later deletion could invalidate.

### H-08 · The raster is too slow for live feedback

Rasterising a year at the 4× grid costs **~825 ms**, measured. So during drawing there are two
representations on screen at once: the live vector outline, and a raster fill that lags behind it.
**Options**: raster only on commit · raster at a coarser grid while editing and 4× on save · no raster in
the editor at all, fills drawn as vector polygons.
The third is worth serious thought: the editor does not need the raster, only the _atlas_ does.

## Sharp — these change what the user does

### H-02 · Are the rivers we need actually in the dataset? — **measured 2026-09-22**

566 of the 591 polylines carry a name. Against the 1100 French frontier:

| river     | in the dataset | as        |
| --------- | -------------- | --------- |
| Scheldt   | **yes**        | `Schelde` |
| Meuse     | **yes**        | `Maas`    |
| Rhône     | **yes**        | `Rhône`   |
| **Saône** | **no**         | —         |

Also present: Rhine, Seine, Loire, Garonne, Elbe, Danube, Vistula, Oder. Also absent: the Somme.

**Three findings, and two are new holes:**

1. **The Saône is missing** — a tributary, cut by the `scalerank` threshold. It is one of _les quatre
   rivières_, so a real stretch of the 1100 frontier has nothing to snap to. Either report it by eye, or
   regenerate the river set at a lower rank (`files/spikes/fetch-rivers` exists).
2. **Names are in the local language, not French.** Searching "Meuse" finds nothing; it is `Maas`.
   Searching "Escaut" finds nothing; it is `Schelde`. For a French atlas with a French-speaking
   contributor, naming a river to snap to it is unusable as-is. The _gesture_ is proximity — click near
   the river — so the name is only a label; but showing "Maas" to someone drawing the Meuse is
   misleading. **Needs a French alias table, or the name shown verbatim with no pretence.**
3. Lowering the rank threshold adds tributaries **and** weight: the current set is 537 KB at
   `scalerank` selection and 500 m simplification.

### H-15 · Cities are the measuring instrument, not a convenience

Reopened and raised in priority 2026-09-22 by the dev, who turned the whole question round:

> _"on ne va pas avoir une précision millimétrique au niveau des frontières. Ce qui serait gênant, c'est de
> se retrouver avec une ville qui ne soit pas du bon côté d'une frontière… même si on n'a pas la Saône,
> l'important c'est que les villes soient du bon côté."_

**This is the accuracy criterion for the whole atlas, and it replaces geometric precision.** Nobody sees
20 km of error on a line; everybody sees Lyon in the wrong kingdom. It also settles why the missing Saône
does not matter — the line can be approximate as long as the cities fall correctly. We hold the coast, the
rivers and a graticule, and **no cities at all**.

**Two remedies, in order of cost:**

1. **Show each city with the polity that holds it.** Nearly free: the raster already answers "who owns this
   cell", and that query is already the planned worker API (`regionAt(u, v)`, recorded in known-issues for
   picking). Turn the layer on, read "Lyon · Holy Roman Empire", and the error is obvious with no extra
   data at all. **This is the real fix.**
2. **A list of witness cities** — hand-entered, with the expected holder. Not 500: about twenty locks the
   1100 French frontier. The pre-publication check ([s10](s10-check-before-publishing.md)) compares and
   refuses to pass a disagreement.

**Where the data comes from**: the geography is free (`ne_10m_populated_places`, public domain). The
_historical holder_ exists nowhere in reliable form, so it is hand-entered — twenty lines, which is why
this is cheap. **Still separate from the cities-as-content chantier** the dev placed second in his
sequence: this is authoring instrumentation.

### H-03 · How many vertex handles, and when?

894 handles for the Empire, 2 258 for Byzantium. Drawing them all at continent scale is a smear.
**Options**: only above a zoom threshold · only those in the viewport · a decimated set densifying on
approach. The third risks lying about where the vertices are.

### H-07 · Settled 2026-09-22 — the drawing target answered it

**Inclusion decides, and nothing is asked.** A new ring entirely inside one of the target's rings is a
**hole**; a disjoint ring is a **second piece**. That is already what even-odd does at rest, so neither the
format nor the rasteriser changes. The hole existed only because there was no drawing target: once the tool
knows _who_ is being drawn for, "is this a hole or another country?" stops being a question.

**A hole is then given an owner at the moment it closes** — an existing polity · a new one · nobody,
deliberately. See H-26 below and [s02](s02-create-france-1100.md).

**And most enclaves need no hole at all**: one held by a _vassal_ paints over its suzerain (H-05a). A hole
is only needed for an enclave held by a **peer**, or for ground genuinely held by nobody.

### H-10 · Settled 2026-09-22 — it was not a real question

**One gesture is one step, committed when the gesture ends.** Two clicks with ⟨snap to coast⟩ place 412
anchors; ‹ctrl+z› takes back all 412. Dragging an anchor across the screen is a thousand pointer moves and
one step, posted on release. Nobody wants to press undo 412 times, and there is no second reading worth
writing down.

## Open questions the scenarios surfaced

### H-31 · Where does a polity's id come from? — **settled 2026-10-08, by the dev**

**A hole nobody had recorded**, found by trying to write `s02`'s creation form. Three documents pointed in
three directions and none of them answered it: [`format.md`](../format.md) shows `"fr-couronne"` and says
*"ours, readable, unique within this year. Never a display name"*; `s02`'s form asks for eight fields and
an id is **not** one of them; and [s07](s07-manage-the-registry.md) requires that renaming a polity keep
its id — *"it is the same polity, with the same id"*. So the id is neither typed in nor derivable on
demand, and nothing said who mints one.

**The dev's call: the form proposes one, and the author may rewrite it.** A slug of the name is offered
(`reaume-de-france`), editable on the spot to `fr-couronne`.

**Why the other two were refused, and the argument is `format.md`'s own example.** A *frozen* slug can
never produce `fr-couronne` from *"Reaume de France"* — the id in our own format document would be
unreachable by our own tool. An *opaque counter* (`polity-1`) contradicts the type's "readable" and would
put `{"between": ["polity-1", "polity-7"]}` in `borders.json`, which is the illegible key the ids were
introduced to retire.

**The consequence that makes it safe**: the name is read **once**, at creation. After that the id is a
key — `borders.json` names a pair of them, a vassal tie names one, a colour override names one — and
nothing re-derives it, which is exactly what `s07` demands.

**Built at 4d-2 (c)**: `core/editor/polityId.ts` — `slugifyPolityName` folds latin accents and collapses
everything else into hyphens, `proposePolityId` steps past the ids already in the year, counting from 2 so
a first entry never looks numbered.

**Two sub-decisions worth not re-opening.** A name in a non-latin script (Byzantium, Rus') yields **no
proposal at all** rather than a transliteration: romanising it would be inventing a spelling, and an empty
required field asks the author instead of answering for them. And there is **no character whitelist** —
`yearPolitySchema` asks only for a non-empty string, nothing downstream treats an id as a path or a URL,
and refusing a space would be the tool manufacturing a law where `s00` says every rule here is a default.
What is refused is what genuinely breaks a file: an empty id, and one already taken.

### H-01 · Where does the OHM identity import read from?

Live Overpass query, or the `relations.json` the spike already caches? Live is current and slow; cached
is instant and stale. The cache already holds all 2 059 relations with names, ranks, statuses and
Wikidata ids.

### H-04 · Settled 2026-09-22

**By proximity to the first anchor, announced before the click.** _"comme Illustrator, arrivé à une
certaine proximité, on peut fermer un tracé."_ Entering the snapping radius emphasises the first anchor
and changes the cursor; clicking it closes the ring and paints the fill. ‹enter› closes on a straight
segment as the keyboard equivalent. **Double-click is not used** — it is the atlas's fly-to gesture and
the two would collide.

**The tolerance is in screen pixels, not kilometres**, like every other handle (`snapRadius / scale`). At
continent scale it really is ~50 km wide, and that is right rather than sloppy: nobody aims finer than a
pixel.

### H-09 · Closed 2026-09-22, by deletion

**There is no stretch-dragging tool.** _"Ce que l'on déplacerait, ce serait les points, pas le tracé en
intégralité. On serait toujours dans une démarche d'ajustement."_ Moving a run of border is selecting its
anchors with a marquee and dragging them. The rigid-or-bent question disappears with the operation.

### H-11 · Settled 2026-09-22

**Every drawn year is independent.** The dev: _"pour être tranquille, chaque année dessinée est
indépendante."_ Nothing is shared between years. A ring belongs to its polity, in its year, exactly as the
current format already has it.

**Scope, so this is not misread**: sharing _inside_ a year stays — France and the Empire run over the same
anchors along the Meuse at 1100. That is H-06, untouched. What is refused is sharing _across_ years.

**What it costs, plainly**: correcting a badly drawn border later means correcting it in each year that
holds it. Accepted — there is one contributed year today, and the cost only begins at the second. Nothing
in the format forbids adding sharing later, since anchors are stored once with stable ids.

### H-13 · GPL: read-only, or marked contamination?

Scenario [01](s01-open-and-navigate.md) opens GPL payloads read-only; scenario
[04](s04-save-and-reopen.md) imagines a stretch copied out of one and the file marked derived. **The first
rule is stronger** — a rule that can be violated by accident will be.

### H-14 · Settled 2026-09-22

**A year. One file, one date, independent of every other.** This falls out of H-11 and the Save-as
mechanism: the unit of editing is a snapshot, and intervals are not the working model. The scenarios were
all written against snapshots and now say so deliberately rather than by default.

**Not closed for the atlas side**: OHM's own data is interval-based, and reading it is unaffected — the
import collapses an interval onto the year being authored. The interval idea the dev has carried since
2026-09-14 remains open for how the _atlas_ steps through time, which is a different question from what
the editor writes.

### H-16 · A self-intersecting outline

Even-odd fill gives a figure-of-eight a hole where it crosses itself. Refuse it, repair it, or allow it?

### H-17 · Deleting a polity

What becomes of its territory — unclaimed, or given to a neighbour? And what becomes of the stretches it
shared with others?

### H-18 · Ring winding order

Even-odd does not care, which is why the format never mentions it. But a _shared_ stretch has two owners
who traverse it in opposite directions, and snapping inserts a sub-path that has its own order. Somewhere
this has to be made explicit.

### H-19 · How does the contributor know when a year is done?

The unclaimed-land percentage is the only honest gauge (45 % covered at 1100). But it will never reach
100 %: some land genuinely belonged to nobody. **What is the target?**

### H-20 · Where does the reference map physically live? — **answered 2026-09-22**

**A second monitor, or the Duby atlas open on the desk.** So the Cartographer owns its whole window, no
split view is needed, and `[Load backdrop image…]` is a secondary path.

**But it opened a sharper sub-question, H-21.**

### H-21 · How does a partial loaded plate coincide with an existing trace?

The dev: _"si on charge une partie de carte (juste la France par exemple), comment un tracé existant, qui
pourra être optimisé, viendra coïncider avec cette carte chargée."_

**There is a real tension here.** Reporting by eye needs no coincidence at all — you read the plate and
report what you understand. But _improving an existing trace by comparing it to the plate_ needs the two
to line up at least roughly, or the comparison says nothing.

**The resolution is a middle level nobody has named yet**: not "no registration", not a 15–30-point
thin-plate spline, but **a two- or three-point similarity** — translate, scale, rotate. Two clicks on
recognisable features, and the plate lands within tens of kilometres. Enough to compare; nowhere near a
tracing surface.

**Two things make this work, and both are free:**

1. **Our vector coastline is the measuring instrument.** Draw the plate under it and the disagreement is
   visible instantly — no residual to compute, no report to read.
2. **The smaller the plate, the better a similarity fits.** A conic-to-Mercator difference over France's
   ~10° of latitude is modest; over all of Europe it is not. **So the dev's instinct to load partial
   plates is the one that makes hand placement viable** — a full-Europe plate is the case that would
   need a real warp.

**Open**: two points or three? And does the placement persist with the plate, as a sidecar?

### H-26 · An enclosed unclaimed hole should perhaps go to its neighbour, like an island

Raised by the dev 2026-09-22, closing the session: _"les trous sont un peu comme des îles — mets dans une
nation voisine."_

An unclaimed pocket entirely surrounded by one polity is nearly always a defect, not a fact: nobody drew
a donut on purpose. So it could be offered to the surrounding polity in one gesture, exactly as
[s11](s11-islands.md) offers a whole island.

**Where it stops**: a pocket surrounded by _two or more_ polities is not obvious — and a genuinely
unclaimed inland region (the Ardennes, marshland, a no-man's-land between marches) is a fact that must
survive. The rule can only be _offered_, never applied automatically. See s10's sliver-versus-fact
distinction, which is the same question at a different scale.

**Half settled 2026-09-22 — the offer moves to the moment the hole is born.** The dev: _"il faut qu'on me
dise, tu ne peux pas faire de trou qui n'appartienne à personne."_ When a ring is closed inside the drawing
target, the question is asked once, there and then: an existing polity · a new one · **nobody, deliberately**
— and "nobody" is recorded so the check stops reporting it. Closing the ring is the only moment where
exactly one polity surrounds the ground and the author still knows why they drew it.
[s02](s02-create-france-1100.md).

**Still open**: a pocket _discovered_ later, surrounded by two or more polities. That one has no obvious
neighbour to offer it to, and nobody remembers drawing it.

### H-27 · What tells the editor that a published year is live?

Surfaced by [s15](s15-offline-and-online.md), 2026-10-06. Saving online commits in a second and the site
rebuilds in one or two minutes, so there is an honest intermediate state — **sent, not yet published** —
and no control for it. Claiming the second while only the first is true is the one real lie available
here. Polling the deployed manifest would work and costs a request; a webhook would need somewhere to
receive it.

### H-28 · How does an offline save actually write?

[s04](s04-save-and-reopen.md) says a year is *"written on disk"* and never says how. A browser has two
ways: a **download**, which works everywhere and makes the author move three files by hand, or the **File
System Access API**, which writes straight into a chosen directory and lets ‹ctrl+s› overwrite in place.
The second is far better for the author and is not in every browser. **Does not block drawing 1100.**

### H-29 · Who may write online, and what happens with two authors?

A single shared secret in a Netlify Function is enough for one author and answers nothing beyond that.
Two authors is the ordinary case of tier B — accounts, review, conflicts — and `s15`'s "two saves of the
same year" scenario resolves only the part git resolves by itself: nothing is destroyed. Who is allowed,
and what the second author sees, is unspecified.

### H-30 · Online, does overwriting a year still rename the old one?

[s05](s05-derive-a-year.md) decided that replacing an existing year **renames the old one** rather than
destroying it. Offline that is a file rename. Online, git already keeps every version, so the rename may
be redundant — or may still be wanted, so the previous year stays *listed in the manifest* and remains
reachable from the atlas. Not decided.

## Not holes — settled, recorded here so they are not reopened

- **Every rule in these files is a default, never a law.** The dev, 2026-09-22: _"tes règles, en fait,
  c'est des contraintes."_ They exist to avoid deciding 51 times on one map, and every one is overridable —
  an explicit choice beats a derived rule. The tool never judges whether a shape is plausible. Only two
  constraints are real: **shared anchors** (or the screen shows a sliver nobody drew) and **nothing GPL is
  published** (legal, not editorial). Stated at the top of [s00](s00-index.md).

- **No georeferencing, no control points, no warp.** Reporting by eye, decided 2026-09-22.
- **Points are stored in world coordinates**; stroke widths and handle sizes in screen pixels.
- **A drag must not end in a click** — one tolerance, decided where the drag lives, as `MapControls`
  already does in the atlas.
- **Borders are never authored**, only derived. Nothing writes border geometry to the file.
- **The backdrop is the atlas's own baked texture**, with the political tint cleared.
- **Two tools, and only two** — the Pen ‹P› and the white arrow ‹A›, plus ‹space› to pan. Decided
  2026-09-22 from Illustrator, and written up in [s00](s00-index.md).
- **No Bézier curves.** The Pen only clicks; segments are straight. The format already stores nothing but
  points, and Chaikin rounds the corners at render time.
- **No Selection tool ‹V› and no transform box.** Nothing rotates or scales. Moving a whole outline is
  reachable by marquee, as a consequence rather than a feature.
- **The Pen never deletes an anchor it hovers** — that gesture branches a new outline from it. Deletion
  belongs to the white arrow plus ‹delete›.
- **An anchor is white with a blue outline; selected, it is solid blue** — Illustrator's own code, kept.
  The **selection blue is a reserved ink**, never served to a polity: the palette holds a slate blue
  `#54719b`, and A11Y-101 measured that no single ink reads over fills running from that to gold
  `#d4b24a`. Pairing white with blue means one of the two always separates from the fill underneath.
- **A marquee leaves nothing behind** — no bounding box, no frame, only the anchors now drawn blue.
- **‹delete› and ‹backspace› are the same key under ⟨edit⟩.** Under ⟨draw⟩, ‹backspace› takes back the
  last anchor placed — no conflict, the two states never coexist.
- **A history step holds the document, not the session.** Anchors, paths, who holds what, provenance and
  identities go in; the active tool, the zoom, the pan, the layer visibility and the open panel stay out.
  Undo must never put a tool back in someone's hand, and choosing a tool must never become a step to undo.
  **The selection is the one exception**, carried _by the step_ rather than globally: undoing a deletion
  that gave back twelve anchors without selecting them leaves the contributor unable to see what returned.
- **Undo never moves the view.** On a continent-wide map a step can be undone 500 km off screen, so the
  step reports itself — "undone off screen — [show me]" — instead of stealing the framing.
- **Deriving a year is [Save as…]** — it writes a full independent copy, closes the source, loads the copy,
  and **asks for the year** so the file never declares a date its name contradicts. The dev, 2026-09-22.
  That is the entire mechanism; copy-on-write, shared stretches across years and the derivation tree
  (H-22) all disappear with it. [s04](s04-save-and-reopen.md), [s05](s05-derive-a-year.md).
- **The Pen refuses to place an anchor with no drawing target.** Found by the dev 2026-09-22 while asking
  what becomes of a freshly created polity: nothing on screen said which polity an anchor lands in, so four
  hundred points could go into the wrong country unnoticed.
  **Narrowed 2026-10-08, by the dev**: this line used to open with *"the Pen always shows its drawing
  target"*, and the showing is no longer permanent — the notice is raised on selection and withdraws after
  about five seconds, possibly shrinking into a corner instead. **The refusal is what remains
  non-negotiable**, and it is the half the code enforces. Which display wins is open and not a priority
  ([s02](s02-create-france-1100.md)).
  **And the target is chosen in `{Polities}`, not by picking a tool** — you select *who*, then you act,
  which is the deliberate inversion of Illustrator and the reason the target governs ⟨edit⟩ too.
- **A polity with no territory is kept, never discarded.** Changing tool does not delete it. Measured
  reason: at 1100 OHM gives the Kingdom of France its identity and **no geometry**, and bulk identity
  import creates dozens at once — territory-less is the normal starting state, not a transient one.
  [s02](s02-create-france-1100.md).
- **There is one registry per year, and the territory file carries ids, never names.** Decided
  **2026-09-27**, replacing the shared registry with dated names decided on 09-22 — which was my factoring,
  not the dev's: _"une année c'est une année."_ A polity has a readable id, a name, a rank, a suzerain and a
  colour, all valid for that year and written once in it. The Wikidata id is kept for **checking** that two
  entries mean the same polity, never as the identity — measured by the `build-registry` spike, OHM gives
  each period its own Q-id and grouping by it split the Kingdom of France into four. Ids still retire the two
  `Spain` entries at 1700, the nine colour regexes and the British-before-Irish ordering.
  [s07](s07-manage-the-registry.md), [`format.md`](../format.md).
- **A border's hand is data; its geometry never is.** The dev, 2026-09-22 — any border can be given a hand
  by hand ("that one in bold"), with **no coordinate**. **Widened 2026-09-27** into a `borders` table
  carrying the limit's kind, its stroke, its source and a note: all of that is editorial fact, and none of
  it is a place, so none of it can drift from a fill. The line itself stays derived — from the run of
  anchors the two owners **share**, not from the rasterised fills, which is what makes it exact rather than
  one cell wide, plus one **inclusion** test where the two are nested rather than side by side
  ([`format.md`](../format.md)). **An explicit hand beats a derived rule**, and exceptions
  are listed. Keyed on ids from H-12, which retires the name-matching regexes in `data/borderStyles.ts`.
  [s04](s04-save-and-reopen.md).
- **Roadmap chapter 06 must be corrected**: it says _"seed from year T−1 and paint only the delta"_, which
  is the sharing model now refused. Cosmetic-but-misleading — a document promising a mechanism we decided
  against will be read as the plan.

### H-32 · Hiding a polity — **raised 2026-10-11 by the dev, not decided, not needed yet**

The dev's idea: an eye before each row's swatch in {Polities}, to show or hide a polity — *"mais je
sais pas si vraiment on en a besoin."* No case has shown the need yet. What is recorded, so it is not
re-derived:

- **A hidden polity must keep its outline drawn and snappable.** Hiding its anchors from the Pen would
  let a neighbour be drawn beside it with a second, independent border — the gap or overlap that shared
  anchors exist to prevent. So "hidden" means **fill hidden, outline kept**, not Illustrator's hidden
  object. *(my deduction)*
- **Session state**, like the tool in hand: not in the file, not in the history.
- **The cheaper answer to the likely case** — a fill hiding the relief or a river being traced — is a
  global **outline view**, Illustrator's ‹⌘Y›: one switch rather than 51 eyes. *(my proposal)*

**Trigger**: the first time a fill gets in the way while drawing. Try the outline view first.

### H-33 · Does {Polities} list by name, or in stacking order? — **open, 2026-10-11**

`s01` sorts the list by name; Illustrator's Layers panel lists front-to-back, so the panel *is* the
stack. With [Bring to Front] in the row's menu (`s16`), a name-sorted list shows no change when the
command runs — the change is on the canvas only. **Kept by name for now**; the dev's call when the
stacking commands are in use. *(the question is mine)*

