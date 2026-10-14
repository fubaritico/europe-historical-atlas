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

> **Corrected 2026-10-12, by use**: the Saône **is** in the dataset, spelled `Sane` — this measure searched
> for "Saône". Its lower course, Chalon to Lyon, was followed by the Pen while drawing France (23 vertices,
> `s02`). Whether its upper course is there is not measured yet. Finding 1 below stands only for that part.

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

### H-17 · Deleting a polity — **settled 2026-10-12, by the dev**

What becomes of its territory — unclaimed, or given to a neighbour? And what becomes of the stretches it
shared with others?

**Answered**: the polity and its outline go, the ground is left **unclaimed**, and the anchors it shared
**stay** — the neighbour's border does not move (`s00`'s constraint; `removePolity` already keeps them).
Every deletion is confirmed. Giving the ground to a neighbour is set aside, a gesture of its own if it
is ever needed. [`s07`](s07-manage-the-registry.md), *Removing*.

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

**Settled for local mode, 2026-10-12**: neither — the Cartographer's **dev server** writes the year into
`packages/atlas/public/years/<year>/`, authorised explicitly by the dev; the File System Access API's
native folder dialog could not be driven remotely. The built site cannot save; the download fallback and
the online tier stay open. `s15`, *Local mode*; `files/plans/cartographer/save-open-plan.md`.

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

**Proposed the same evening, with the group model of `s16`**: {Polities} becomes the tree of groups,
front first within a level, which makes the stack visible in the list. Settled if the dev agrees.


### H-34 · Tools only once zoomed in — **raised and decided 2026-10-12 by the dev, built the same evening — [s17](s17-tools-wait-for-the-zoom.md)**

Seen while I drew remotely at continent scale: three of four Pen clicks snapped to rivers, because the snap
radius is in **screen pixels** (H-04) and a few pixels span tens of kilometres there. The dev: *"moi quand
je dessine, je zoome avant. Ça, c'est la vraie expérience utilisateur"* — and, asked whether only the
snapping should wait for the zoom or the tools themselves: *"on peut désactiver les outils tant qu'on est
trop loin, d'accord, pas de problème."*

**Settled**: below a zoom threshold the drawing tools do not act. **Open**: the threshold (to be measured on
the scale he habitually draws at), whether the arrow is held too or only the Pen and Pencil, and how the
refusal is shown — the cursor already refuses where there is no target (2026-10-08), the same `not-allowed`
plus a status-bar line (*"zoom in to draw"*) is the obvious reuse. *(the last two are my questions)*

### H-35 · A river is not followed from one of its stretches to another — **observed, measured and fixed 2026-10-12**

Drawing France, two clicks on the Meuse (Mézières, then near its source) gave a straight segment and no
insertion; the same between Avignon and the Petit Rhône mouth. The Scheldt, the Saône and the Rhône from
Lyon to Avignon were followed. *(Claude's hypothesis: the dataset cuts a river into several polylines and
following stays inside one.)* **Measure first**: count the polylines named `Maas` and see where they meet.
Then the choice is the dev's — join them at load, or follow across a junction. [s02](s02-create-france-1100.md).

**Measured 2026-10-12** (`rivers/europe-rivers.json`, Natural Earth as shipped). Two causes, neither in the
following code:
1. **A stray fragment.** `Maas` is 4 polylines, one of them **2 points** at Charleville-Mézières, 1.3 km from
   the main course. France's Mézières anchor is exactly that fragment's first vertex — the click caught it,
   the next click landed on the main course, another polyline, so nothing was followed. The main course
   itself runs unbroken from the source to Maastricht (152 points).
2. **Rivers cut at confluences and forks.** `Rhône` is 5 polylines: the one from Geneva ends at the Arles
   fork, where the Petit Rhône and the Grand Rhône begin at the very same point (and a 2-point stub lies
   there too). `Loire` is 3 polylines laid end to end, their ends identical.

**Options, the dev's call**: (a) at load, chain polylines of one name whose ends coincide exactly — the
coastline precedent (95 212 segments → 2 029 contours, no epsilon) — which makes the Loire and the Meuse
continuous; (b) ignore 2-point fragments that duplicate a longer course, which removes the Mézières trap;
(c) a fork stays ambiguous for chaining (which arm?) — leave it cut, or build a river graph and follow the
shortest path. *Claude's recommendation: (a) and (b) now, (c) only if a border needs to cross a fork.*

**Fixed the same evening, on the dev's go** (*"si tu vois que ça t'a gêné et que tu as une solution, vas-y"*
— and his own report: *"ça n'a jamais marché d'une seule traite, à part de Dunkerque à Biarritz"*): (a) and
(b), in `core/data/riverChain.ts`, applied when the Cartographer loads the rivers. Measured on the shipped
file: **591 polylines → 398**, 28 fragments dropped, 165 joins; rivers in several pieces 109 → 70; the Loire
in one piece, the Meuse continuous from its source to Maastricht and on to the delta. Ends are joined within
about 25 m (`RIVER_JOIN_TOLERANCE`) — the Loire's pieces meet 11 m apart, rounded two ways. **Forks stay
cut** (the Rhône at Arles), (c) is not built. The atlas is untouched: it only draws the rivers.

### H-36 · On a river border, the shared-border follow never triggers — **observed, then closed by use 2026-10-12**

The Pen weighs the water before an existing anchor (`liveCanvas.ts`, `snapOffer`), so on a neighbour's
outline made of river vertices the hover says *"Following the Rhône"* and the two-anchor follow of
`borderSnap.ts` is never reached. Drawing Burgundy beside France worked by repeating France's river clicks
— the vertices are the same, so the anchors were reused — but it asks the author to know where the
neighbour's stretches began and ended. **Options, not decided**: an anchor of a neighbour wins over the
water when the pointer is on it exactly · a modifier key to choose · keep it and document the replay.

**Closed the same evening, by walking it again once the rivers were mended** (`H-35`): a neighbour drawn
by clicking the Saône and the Rhône only — no anchor aimed at — reused 46 of France's anchors out of 52;
the 4 not shared lie where France itself cut a corner (a straight segment from Lyon to Vienne). The water
keeping priority over an anchor is right: it is what the dev's Spain–Portugal case needs, and with
continuous rivers it shares the border by itself. A rule giving the neighbour's anchor priority was
proposed and **not built** — it would add a rule the author must understand, for a case the mending
solved. [s02](s02-create-france-1100.md).

**Reopened and rectified 2026-10-13, by the general test** (Euratlas 1100 copied into the Cartographer, the
dev: *"ce sont des décisions que l'on a prises alors que l'on ne s'était pas encore servi de
l'application"*). The Empire's eastern border had been placed **by eye** beside the Mur, the Morava and the
Danube. Drawing Hungary, Poland and Bohemia against it, every aim at its anchors said *"Following the
Morava"* and took a river vertex: Hungary shared 15 anchors of a ~50-anchor border, the rest a second line
beside the first. The mending only helps when the neighbour itself followed the river. **The rule now**
(`borderSnap.ts`, `anchorOverWater`): an anchor aimed at within 3 px wins over the water **unless it came
from that water** — the water click reuses those anyway, which keeps the Spain–Portugal case intact (its
tests unchanged and green).

### H-37 · No gesture welds two anchors into one — **observed 2026-10-12, first half built 2026-10-14**

> **Built 2026-10-14, the dev's call** (*« ça donne la frontière, ça fusionne les points »*): the white arrow
> drags an anchor of the target alone; near another polity's anchor it snaps onto it and the release welds
> them (`weldAnchor`), near another polity's stretch it snaps onto it and the release threads it into the
> neighbour's ring (`threadAnchor`). One step, said in the result. **Second half, to come**: snapping a
> whole selection onto a neighbour's border at once.

One click at the Petit Rhône mouth took a river vertex 2.3 km from France's, so the two outlines do not
meet between Avignon and the sea. Moving one onto the other with the arrow makes them coincide without
sharing an index — exactly the second geometry `s00` forbids. A weld (select two anchors, merge them, every
ring following the survivor) is the missing gesture. **Trigger**: the first time a shared border has to be
repaired by hand.

### H-38 · A neighbour's anchors cannot be seen, and only they snap — **observed 2026-10-13, first half fixed**

Walked by the dev, then by Claude: the Holy Roman Empire drawn from the Scheldt mouth down France's and
Burgundy's eastern borders. A neighbour's outline was drawn as one line, so an anchor reported by eye sat on
a bend that could hardly be seen — 20 to 50 px apart at the zoom where the Pen acts — and the Pen snaps to
anchors only, within 8 px. Clicking the visible border between two anchors placed a **free** point beside it
(*"placing points freely"*): a gap or an overlap between the two countries. With the anchors' positions read
from the file, the follow itself was flawless (*"followed 4 anchors"* along France, *"followed 26 anchors"*
along Burgundy's whole eastern border in one click).
**Fixed, first half**: with the Pen in hand and the view close enough, every anchor a neighbour holds is drawn
as a small blue dot (`penSnapAnchors`). **Open, second half**: snapping to the line between two anchors,
which would insert a shared anchor into the neighbour's ring. **Trigger**: the dev still misses anchors once
they are visible.

### H-39 · The Pen switches off while panning south, at the same zoom — **observed 2026-10-13, not decided**

`s17` measures the snap's reach at the latitude of the view's centre. Following a border from Belgium down
to the Alps at 556 %, the Pen went to *"Zoom in to draw"* after a pan, with no zoom change: on this
projection a screen pixel covers more ground further south. One notch brought it back. **The dev's call**:
keep it (the rule is a distance on the ground, and it is honest), or never refuse while an outline is in
progress, or measure once when the outline starts.

### H-40 · The wheel does not refresh what the pointer is over — **observed 2026-10-13**

After wheel notches with the pointer still, the bar went on naming what had been under the pointer *before*
the zoom (*"Following the Mur"* over France, at 56°E), and the rubber band stayed on its old end. A `wheel`
event carries the pointer's position; the controller does not take it. **Cosmetic** — any pointer move
corrects it. Remedy: take the position from the wheel event as from a `pointermove`.

### H-41 · A new polity takes its neighbour's automatic colour — **observed 2026-10-13**

*HRE*, created with no territory, was given the same red as France by the automatic palette — which colours
by adjacency, and a polity with no territory has no neighbour yet. It reads as one country until it is
drawn. **Worth knowing**; remedy to weigh: spread the palette over the registry order for polities with no
ring.

### H-42 · At a river's mouth, the Pen does not pass from the river to the coast — **observed by the dev 2026-10-13, deferred**

The dev, following a river down to the sea: the last point, the mouth shared by the river and the coast,
does not switch the Pen to the coast. He had to click a little before it, then on the coast, for the Pen
to take the coast and go on along it. *"C'est la transition d'un outil à l'autre, ça ne veut pas la faire."*
**Claude's hypothesis, not measured**: at the mouth the river's last vertex and the nearest coast vertex are
two points a few pixels apart; the Pen is following the river, so the click takes the river's vertex and
stays on the river. **To measure first**: the distance, at a real mouth (the Scheldt, the Rhône), between
the river's last vertex and the coast's nearest — then decide whether the mouth vertex should be offered as
the coast too. **Deferred by the dev**: *"largement utilisable"*, to come back to later.
**Where, and what he does instead** (his precision, same day): a river followed down to the **Adriatic**.
The natural gesture is to click the river's end; it does not take. He stops a little before the mouth, then
clicks the coast, and the Pen switches. *"C'est quelque chose auquel tu t'habitues […] mais je sais pas si
c'est très intuitif."* The result is clean — the cost is the gesture to learn. **The intuitive remedy**: the
mouth counts as both the river and the coast, so one click there ends the river and turns the Pen to the coast.

### H-43 · Two rings hold both anchors clicked: the Pen follows one of them, and does not say which — **observed 2026-10-13**

The general test (Euratlas 1100). Besalú sits between Cerdanya and Barcelona, and both their rings hold the
two tripoints (the crest anchor and the southern one). Clicking the first then the second followed
**Barcelona's** ring, where the author wanted Cerdanya's — and the result zone said only *"followed 9 anchors
of a shared border"*. The next aim, an anchor of Barcelona, was then already in the outline and refused
silently: a free point was placed instead (the hover said *"Drawing in"*). **Worked around** by aiming first
at an anchor only Cerdanya holds. **Remedy to decide**: name the ring in the result (*"followed 9 anchors of
Barcelona's border"*), and when two rings tie, preview both or prefer the one the pointer moved along.

### H-44 · A vassal's limit with a foreign sovereign is drawn dotted, as if facing its own lord — **observed by the dev, 2026-10-13**

Seen on the general test: Bohemia, vassal of the Empire, drawn by reusing the Empire's anchors, shows its
limit with **Poland** in the vassal hand (dotted), where it is a limit between Bohemia and a foreign
sovereign. **Cause, read in the code** (`core/editor/derivedBorders.ts`, `borderOfShared`): that stretch is
held by three rings — Bohemia, the Empire whose limit coincides, and Poland — and the three-owner rule keeps
"the two deepest": Bohemia, then whichever of the Empire and Poland comes first (both depth 0). When it is
the Empire, the pair reads vassal–suzerain. **Remedy proposed**: drop from the owners any polity that is a
suzerain of another owner (its limit merely coincides with its vassal's), then pair what is left — Bohemia
and Poland, sovereign. `relationBetween` itself is right for a pair. One fix in `core` fixes the
Cartographer and the atlas alike. **Test to write first**: the three-ring case, which the naive "two
deepest" passes or fails depending on the order of the claims.

**Same cause, second symptom, seen by the dev in the atlas the same evening: vassals' coasts drawn dotted.**
Brittany reuses the Franks' coast anchors, so each coast stretch is held by **two** rings — vassal and lord —
and two owners skip the far-side question: the pair reads vassal–suzerain, dotted along the sea, where the
atlas draws no line but the baked coast. The same remedy fixes it: once the coinciding suzerain is dropped
one owner remains, the far side is asked, it is sea — nothing drawn. **What must stay dotted**: only the
inner limit between a vassal and its own lord.

### H-45 · The vassal's dashes are too long in the atlas — **the dev, 2026-10-13**

Seen on the general test: the dashes of the vassal hand read too coarse. The atlas draws every dashed line
with one dash and one gap length (`borderDashSize`, `borderDashGap`). **Remedy**: a dash cadence per hand —
shorter and tighter for the vassal — carried by the hands table (`core/editor/borderHands.ts`, which `s08`
already describes as *"pattern, dash cadence, width per relation"*), so the Cartographer and the atlas share
it. To settle by eye with the dev at the border-style session.

### H-46 · A stretch drawn wrong cannot be traced again — **the dev, 2026-10-14, from the general test**

The night of the general test is drawn alone, so its errors are found the next morning: they need tools that
correct them, not a redraw. The first case, Lisbon: across the Tagus mouth the coastline is two contours, and a
coast click took a vertex of the estuary's contour, inland on the north bank; the straight line from it to the
south bank left a triangle of land outside the Almoravids. Corrected by hand, the anchor dragged with the white
arrow to the mouth's corner. **The tool asked for**: *retrace a stretch* — choose two anchors of a ring, and
the stretch between them is replaced by the water that joins them (coast or river), the shared anchors kept
shared, so the neighbour follows (same requirement as `H-37`'s weld: never a second geometry). **The night's
defects are logged** in `files/plans/cartographer/general-test-defects.md`, one line per defect with the tool
that would have fixed it in one gesture — the list that orders the correction tools.

**Built 2026-10-14 — ⟨retrace⟩** (`s03`, *Retracing a stretch*): the first of the four correction tools, in
the order the dev took (retrace, then delete or give a ring, then weld and snap to an edge, then carve).
**Still open, the dev's to answer**: may a border shared along the whole stretch be **detached** on purpose —
the aimed polity retraced, the neighbour left where it was? Recommended: no by default (the neighbour
follows, as now), and if the need is shown, an explicit modifier held during the retrace. **Noted for later**:
the maximum zoom raised from 32 to 128 (aiming at coast anchors 4–6 px apart at 3200 %), a separate commit;
lighter coastlines (fewer points), the dev's remark — already in `next.md` (Douglas–Peucker).

**Validating an outline when it is laid — the dev's call, 2026-10-14** (*"lorsqu'un tracé est posé, il
puisse être validé, répondre à certains critères"*; asked before I redraw other sources, Duby's plates).
Checked at a ring's closing, after a retrace and after a deletion. **Refused**: a ring that crosses itself
(the night's Lolland and Euboea), an anchor visited twice (a figure of eight), a degenerate ring (too small,
or a sliver). **Warned, not refused**: an overlap with a neighbour past a threshold — sometimes meant while
work is in progress (Pisa drawn over the Empire until the carve tool exists). The same check over a whole
year lists the faulty rings of its polities: `[Check this year]` (`s10`), placed and unavailable today.
**Not built yet** — next after deleting a ring.
