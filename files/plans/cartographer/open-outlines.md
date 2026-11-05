# Open outlines, and copying points — CARTO-345

> Decided by the dev on 2026-11-05 evening, trying to paste the Venice of his backup (about twenty pieces) into his
> 1100. Copy refused the points, because they were not one run of one ring, and the paste that followed pasted the
> Livonians still held from the afternoon. His words, translated: *"It's the points we want. Of course these points
> make one or several outlines, but that's not my business. I want to copy something."* — and, on the model: *"An
> outline must be allowed not to be closed. One must be able to stop it, resume it."* — then *"you refactor
> everywhere"*.

## The rule

| # | decision | by |
| --- | --- | --- |
| 1 | **‹cmd+A›** — Édition › *Tout sélectionner : ‹the polity selected›*: every point of the polity selected, the white arrow taken. Greyed with no polity selected; in a text field it keeps its own meaning | the dev |
| 2 | **‹cmd+C› copies the points selected, whatever they make**: one or several whole outlines, one or several pieces of outline, mixed. Never refused because the points "do not follow one another" | the dev |
| 3 | **‹cmd+V›** onto the polity selected, one step of the history: a whole outline is added (it takes the place when nothing is drawn); a piece **hooks each end onto the nearest point** of the polity's outline and merges into it, as ⟨retracer⟩ does | the dev |
| 4 | a piece pasted onto a polity with nothing drawn becomes an **open outline** of it | Claude, from 5 |
| 5 | **An outline may stay open.** It enters the map **as soon as the author leaves it** — another polity, another tool, ‹escape› — closed or not; until then it lives in the Pen, as today | the dev |
| 6 | an open outline is **filled as if closed** by a straight line between its two ends, as Illustrator does | the dev (*"it should colour, as in Illustrator"*) |
| 7 | that closing line is **not stroked and derives no border** — Illustrator strokes an open path's segments only | Claude |
| 8 | the atlas reads an open outline **like a closed one** for its fill (the dev: *"it is taken into account"*), its closing line drawing no border, as in the Cartographer | Claude, from the dev's words — to confirm |
| 9 | **the Pen resumes an open outline from either end**: a click on an end of an open outline of the polity aimed at continues it; a click on its other end closes it | the dev (*"stop it, resume it"*) |
| 10 | a pasted piece whose ends lie nearest the two ends of an open outline **closes it**, as Illustrator joins two ends, rather than replacing all between them | Claude |
| 11 | a piece ⟨retracer⟩ refuses (a border dressed by hand, a loop) is **left out and named**, the other pieces pasted; every piece left out → nothing recorded | Claude — to confirm |
| 12 | **any way out of the outline keeps it** — another polity, another tool, ‹escape›; only ‹ctrl+Z› / ‹backspace› take points back (the dev, same evening: *"as soon as you leave the outline, for whatever reason, it is saved, and you can resume it"*) | the dev |
| 13 | a selected point with no selected neighbour along any outline is **left out of the copy, and said** | Claude |
| 14 | **a vassal is not closed over a suzerain whose outline is open**: the closing is refused, nothing written, the outline in hand erased, and the **warning dialogue** says why and what to do — close the suzerain first, then draw the vassal again (`AlarmDialog`, under his warning sign, simplified for its size: `ui/icons/warning-small.svg`). A paste that would close such a vassal leaves that piece out, said the same way. First built as « not carved, the two overlap »; the dev, same evening: *"if the situation is invalid, the outline should be erased"* — and the overlap would have stayed for good, the carving running only at a vassal's closing (CARTO-189) | the dev |
| 15 | an open outline's end **welded onto its other end closes it** (Illustrator's *Join*), rather than losing its last segment | Claude, review QUAL-001 |
| 16 | a vassal's open outline **closed by a paste carves its suzerain**, as the Pen's closing does | Claude, review ARCH-003 |

## The model

- **A claim carries `open?: number[]`, the positions of its open rings — the same shape in the open document as on
  disk.** Weighed against a ring turned into `{ anchors, closed }`: that object travels with the ring through every
  splice and the compiler names every reader, but it rewrites 415 lines of 68 test files at the same time as the code
  they guard, and a test rewritten with its code guards nothing. The positions drift only where a ring is removed or
  rebuilt — a handful of writers (`carve`, the anchors' removal, the save, the paste) — so **one helper,
  `editor/outlines.ts`, filters rings and renumbers `open` together**, and `documentFaults` says loudly a position
  naming no ring.
- **The floor**: three anchors closed, two open. A one-anchor outline is nothing.
- **What reads an area** — fill, inclusion, signed distance, the names' poles, carving — reads every outline as closed:
  nothing changes for it but the type.
- **What reads segments** — the derived borders, a point inserted on a segment, a weld threaded into a segment,
  ⟨retracer⟩ between two anchors, a copy's runs — skips an open outline's closing segment: there is one way along it,
  not two.

## On disk

- `polities.json`, a claim: `rings: number[][]` as today, plus **`open: number[]`, the indices of its open rings,
  written only when there is one**. A year with no open outline is written byte for byte as before, so the dev's
  1100 diffs as it always did; a file without `open` reads as every ring closed.
- The schema: a closed ring three indices at least, an open one two.

## The order of work — one block, tried in the app at the end

1. ✅ core: `open` on the claim, its floor (`data/ringFloors.ts`, outside the Zod module so the worker's chunk stays
   unchanged — same hash, measured), open/save, the schema, the helper; the ring writers through it. A carved
   claim's rings are rebuilt as closed loops — carving reads areas, so an open outline it cuts comes out closed.
2. ✅ core: segments skip an open outline's closing line (borders, insert, weld, retrace).
3. ✅ core: copy any points (runs per outline); paste runs (whole → ring; piece → nearest-point merge; nothing drawn →
   open outline).
4. ✅ Cartographer: the Pen commits its outline on a change of polity, resumes from an end, closes on the other; the
   painter strokes an open outline without its closing line.
5. ✅ Cartographer: ‹cmd+A› and its menu line; ‹cmd+C› / ‹cmd+V› through the new copy and paste.
6. The scenarios (`s22`, the Pen's), the glossary (*tracé ouvert*), the gate, the review — then the dev tries Venice.
