# Cartographer — scenarios

> Written 2026-09-22. **These scenarios come first; the interface is derived from them.** The dev's
> words: _"c'est à partir de ça que l'on va vraiment déterminer ce qu'il nous faut dans l'interface."_
>
> Background and decisions: [`../groundwork.md`](../groundwork.md).
> Tool design and sourcing: [`../06-contribution-tooling.md`](../06-contribution-tooling.md).

## How to read these

Every control name below is **provisional**. It names an _intention_, not a decided widget:

| notation         | means                                            |
| ---------------- | ------------------------------------------------ |
| `[Do the thing]` | a button or menu item                            |
| `{Panel}`        | a named region of the screen                     |
| `‹key›`          | a keyboard key                                   |
| `⟨tool⟩`         | a selected tool, which changes what a click does |

**A scenario that cannot be written without inventing a control is a hole**, and it is recorded in
[`99-holes.md`](s99-holes.md) rather than patched over. That file is the actual deliverable.

## The scenarios

| #   | file                                                      | what it covers                                                                      |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 01  | [open and navigate](s01-open-and-navigate.md)             | open an existing OHM payload, read it, move around it                               |
| 02  | [create a polity](s02-create-france-1100.md)              | **the central case** — the Kingdom of France at 1100, which OHM has no geometry for |
| 03  | [edit an existing border](s03-edit-existing-border.md)    | improve what was imported: move, insert, delete vertices                            |
| 04  | [save and reopen](s04-save-and-reopen.md)                 | the round trip — an editor that only exports is a sketchpad                         |
| 05  | [derive a year](s05-derive-a-year.md)                     | 1100 → 1110: seed, add, remove, modify, and the diff                                |
| 06  | [replace a GPL year](s06-replace-a-gpl-year.md)           | 1500: what may be taken from a map we cannot ship                                   |
| 07  | [manage the registry](s07-manage-the-registry.md)         | identity without geography: rename, **merge duplicates**, hierarchy, delete         |
| 08  | [vassalage](s08-vassalage.md)                             | declare a suzerain, the five hands, the weight by depth, the empires view           |
| 09  | [place the names](s09-place-the-names.md)                 | anchors, typography by rank, semantic zoom, collisions                              |
| 10  | [check before publishing](s10-check-before-publishing.md) | a lint for a map — and the only completion gauge                                    |
| 11  | [islands](s11-islands.md)                                 | what the coastal expansion can never reach                                          |
| 12  | [out of frame](s12-out-of-frame.md)                       | ~~the editorial zone~~ — **removed 2026-10-18**, the dev's call                      |
| 13  | [overrides](s13-overrides.md)                             | taking the hand on colours and lines, and the one place they are all visible        |
| 14  | [the History panel](s14-history-panel.md)                 | the line listed, reached in one click, and the markers that survive a truncation    |
| 15  | [offline and online](s15-offline-and-online.md)         | **integration, not interface** — where a saved year goes, and how the atlas reads it |
| 16  | [stacking order](s16-stacking-order.md)                   | which fill is painted over which: Illustrator's four Arrange commands, from {Polities} |
| 17  | [the tools wait for the zoom](s17-tools-wait-for-the-zoom.md) | from afar the overview, close up the tools: a snap reach on the ground decides (`H-34`) |
| 18  | [nothing drawn is lost](s18-autosave.md)                  | the draft after every gesture, its recovery at the opening, the snapshots (CARTO-238) |

## The two tools — decided 2026-09-22

The dev read scenarios 01–03 and named what they were describing: **two Illustrator tools, and only two.**

> _"tu es en train de décrire le comportement, à peu de choses près, de deux outils dans Illustrator : la
> flèche blanche qui permet de sélectionner des points (A), et l'outil plume (P)."_

| our tool   | Illustrator                       | key          | what a click does                                 |
| ---------- | --------------------------------- | ------------ | ------------------------------------------------- |
| ⟨draw⟩     | the Pen                           | ‹P›          | places an anchor, extends the outline being drawn |
| ⟨edit⟩     | Direct Selection, the white arrow | ‹A›          | selects an anchor, drags it, deletes it           |
| ⟨navigate⟩ | the Hand                          | ‹space› held | pans, never touches geometry                      |

**What we take, and what we refuse:**

- **No Bézier curves.** The Pen behaves only as Illustrator's Pen does when clicking rather than dragging:
  straight segments between anchors. Free, because the format already stores nothing but points, and
  Chaikin already rounds the corners at render time.
- **No Selection tool (‹V›), no transform box.** Illustrator's eight transform handles exist to rotate and
  scale a whole path — _"nous ne voulons juste que dessiner. Pas manipuler ou déplacer des tracés."_
  Selecting several anchors and moving them together does, by extension, let a whole path be moved; that
  falls out of the marquee for free and is not a feature we build towards.
- **Clicking an existing anchor with the Pen does not delete it.** Illustrator turns the Pen into
  "delete anchor point" over an existing point. Here that gesture is worth more as **branching**: a new
  outline starts from that anchor, _"car nous aurons des points en commun sur plusieurs tracés."_
  Deleting stays where it belongs — ⟨edit⟩ plus ‹delete›.

> **This is the answer to [H-06](s99-holes.md#h-06--settled-2026-09-22), reached through a gesture rather
> than a data model.** Anchors are shared between outlines, so moving one moves every outline that holds
> it — a sliver between two neighbours cannot appear, because there is nothing to drift apart.

### A path is a list of references, so duplicating one costs nothing

The dev, immediately: _"si quelque chose devient impossible, on le rend possible. On duplique un tracé et
on aura des tracés concomitants, c'est tout."_ That is the whole mechanism, and it removes the need for
any ⟨reuse border⟩ tool:

- **A path is an ordered list of references to anchors.** It owns its order; it does not own its points.
- **Duplicating a path copies the list, never the anchors.** Two paths then run over the same points, so
  moving one moves both. Concomitant by construction.
- **Copying the _anchors_ is the one thing that must never happen** — the two paths would drift apart at
  the first adjustment, and the sliver `extractRegionBorders` was built to abolish comes back at authoring
  time.

An anchor therefore knows how many paths hold it. Dragging one reports "3 paths"; deleting one is refused
while another path still needs it, or removes it from all of them — [s03](s03-edit-existing-border.md)
states which.

### How an anchor reads on screen

Illustrator's own code, kept as is — _"Les vertices sélectionnés sont bleus et les autres restent blancs
avec un bord bleu, comme dans Illustrator."_

| state                                      | drawn as                                  |
| ------------------------------------------ | ----------------------------------------- |
| unselected anchor                          | white square, blue outline                |
| selected anchor                            | solid selection blue                      |
| the anchor just placed, while drawing      | solid blue — the rubber band starts there |
| earlier anchors of the outline being drawn | white, blue outline                       |

**The selection blue is a reserved ink**, never one of the polity palette's colours: the palette holds a
slate blue `#54719b`, and a solid blue anchor sitting on it would vanish. A11Y-101 measured that on this
palette no single ink clears the contrast floor everywhere, which is why the white square keeps its blue
outline — the two inks sit at opposite ends of the lightness scale, so one of them always separates from
whatever fill is underneath.

**A marquee leaves nothing behind.** The rectangle exists only while the pointer is down; once released,
there is no bounding box, no frame, nothing but the anchors now drawn blue. Same decision as the refused
transform box, and for the same reason: nothing here is ever rotated or scaled.

## The application is a viewer, and the link is made by the reader

**The dev, 2026-09-27** — the principle the data shape follows from
([`format.md`](../format.md) states it in full):

> _"Le lien entre les dates, ce sont les personnes qui s'y connaissent en histoire. L'application est une
> visionneuse, avec une quantité d'informations que l'on peut consulter au clic."_

**Nothing models continuity across time.** No entity says "this is the same polity two centuries later" —
that is the reader's judgement, and it is what a reader of a historical atlas is better at than we are.
Hence: a registry per year, no dated names, no derivation tree. And hence, on the other side,
**repetition is free**: reloading a year reloads everything anyway, so anything that helps an author
validate a polity is carried from year to year without a second thought.

## Every rule in these files is a default, not a law

Raised by the dev, 2026-09-22, and worth putting at the top of the index rather than in a footnote:

> *"toi tu veux mettre des règles… mais tes règles, en fait, c'est des contraintes. Parce qu'une fois
> qu'on peut dessiner les points qu'on veut, comme on veut, on peut représenter ce qu'on veut, non ?"*

**Correct, and these scenarios must be read that way.** The vassal hand, the palette-by-adjacency, the
label size following rank, the border patterns — all of them exist so that a contributor does not have to
decide 51 times on one map. **Every one is overridable**, and the arbitration is already settled: an
explicit choice always beats a derived rule ([s04](s04-save-and-reopen.md)). The tool draws whatever it is
told to draw, and never judges whether a shape is historically plausible.

**Two constraints are real, and neither is aesthetic:**

1. **Shared anchors** ([H-06](s99-holes.md)). Not for tidiness: without them the screen shows a white
   sliver nobody drew. A genuine no-man's-land is still perfectly available — it is *drawn*, and it is
   there because someone wanted it. The rule is not "you may not", it is "the tool does not manufacture a
   defect on its own".
2. **Nothing GPL-3.0 is published.** Legal, not editorial. [s01](s01-open-and-navigate.md).

## Shared background

Every scenario starts from this state unless it says otherwise.

```gherkin
Background:
  Given the Cartographer is open
  And the backdrop is the atlas's own baked terrain texture, with no political tint
  And the {Layers} panel lists: backdrop · coastline · rivers · graticule · cities · fills · borders · unclaimed
  And the coastline and rivers are drawn as vectors, sharp at any zoom
  And the {Tools} strip offers ⟨navigate⟩ · ⟨draw⟩ ‹P› · ⟨edit⟩ ‹A›
  And it carries [↶ Undo] and [↷ Redo], both disabled
  And ⟨navigate⟩ is the active tool
  And no file is loaded
  And the {Polities} panel is empty
  And the title bar reads "Cartographer — no file"
```

## Facts these scenarios are written against

Measured 2026-09-22, recorded in the groundwork document:

- `europe-1100.json` holds **51 polities**, assembled from OHM at 98.1 %.
- **The Kingdom of France has no geometry at all** — it exists in OHM as a label-only relation carrying
  its name, `border_type=kingdom` and `place=country`, and produced no ring.
- Median **108 vertices per polity**; the heaviest in frame is the Holy Roman Empire at 894, Byzantium at
  2 258 out of 51.
- Rasterising a year at the 4× grid costs **~825 ms** — so a raster refresh cannot happen per vertex.
- Coverage is **~45 % of Europe**: Castile, Kievan Rus', Denmark, Bohemia, northern Italy and al-Andalus
  are absent too.

## Vocabulary

- **polity** — an entity with an identity: a name, a rank, dates, possibly a suzerain. `Kingdom of
France`, `Duchy of Aquitaine`. One polity per _title_, so a person holding two titles is two polities.
- **claim** — a polity's territory at a date, as closed rings.
- **anchor** — a point of an outline, as Illustrator names it. Same thing as a **vertex**; "anchor" when
  talking about the gesture, "vertex" when talking about the stored data.
- **handle** — the small square drawn on screen for an anchor, so it can be aimed at. **Not** a Bézier
  control arm, and **not** a transform box corner: we have neither.
- **transform box** — Illustrator's eight-handle frame that rotates and scales a whole path.
  **Refused**, explicitly.
- **marquee** — the rectangle dragged over several handles to select them all at once.
- **rubber band** — the provisional segment following the pointer from the last anchor placed, while
  drawing.
- **stretch** — a run of border between two anchors, carrying its own provenance.
- **derived border** — the line between two fills. Never drawn by hand, always computed.
- **unclaimed** — land no polity claims. The thing the contributor is hunting.
