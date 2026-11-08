# The decisions taken upstream — read before planning a retouch

Every row is a decision already taken: apply it, do not re-ask it. The numbers live once, in
[`../scripts/lib/thresholds.mjs`](../scripts/lib/thresholds.mjs); change them there and here together, with the date
and who changed them. A row filed by Claude is an argument until the dev confirms it (`by` column).

## Why the borders are retouched at all

> The dev, 2026-11-08: *"geometric is relative — what we have is too coarse."* The competitors took Cliopatria whole,
> geometric lines, and bet on presentation, for a **world** atlas. Ours is **European**: *"less area covered, more
> precision"* — Cliopatria retouched **on sourced, dated research**. The precision comes from the sources (witness
> cities, a river a text names); the hand only draws it. Measured on 1100 that day: 253 shared land segments over 50 km.

## The table

| question | measure | decision | by | date |
| --- | --- | --- | --- | --- |
| A city of the CMS is on the wrong side | `sides.mjs` | **move the border first**; `simulate.mjs` proves no other sourced city flips | dev | 2026-11-07 |
| No border move sets it right | `enclaves.mjs` | opposing witness (any city with another holder, on the map or not) **≥ 5 km** → **enclave**, radius ≤ half that gap and ≤ 8 km | dev | 2026-11-08 |
| …the opposing witness is **< 5 km**, or the city's own sources diverge | `enclaves.mjs`, the sources file | **disputed zone**: the two polities overlap there (the hatching); the measure is written beside it, CORE-337 will compute it | dev | 2026-11-08 |
| …the city rests on one weak witness (« Weak » in `files/plans/sources/<year>.md`) | the sources file | **nothing drawn**; listed to the dev | dev | 2026-11-08 |
| A zone has no witness at all | `sides.mjs` | it is **not disputed, it is unknown** — blur, not hatching; keep Cliopatria's course | Claude, agreed | 2026-11-08 |
| A border runs near a river | `rivers.mjs` (sampled every 5 km; pieces of one name are one river, two unnamed ones never) | on the river when **within 8 km along ≥ 30 km** and no witness flips; show the first candidates of a zone to the dev | dev | 2026-11-08 |
| A border is a straight cut (land borders only: a coast or an edge on unclaimed ground is not listed) | `shape.mjs --stiff` | where a witness or a source places it: draw it, an anchor every 10–15 km on the relief; **no straight run over 25 km** | dev | 2026-11-08 |
| …no witness, no source places it | — | keep Cliopatria's course, break its long segments on the relief within ~10 km of it; never invent a precise line | Claude, agreed | 2026-11-08 |
| Over-drawing | — | no wiggle every kilometre: it claims a knowledge we do not have | dev | 2026-11-08 |
| Spikes | `shape.mjs --against <copy>` | **no angle under 60°** at an anchor added; open it by dragging the anchor or the three-polity junction, or delete it; natural angles (meander, coast) stay | dev | 2026-11-08 |
| Slivers | `shape.mjs --against` (« sliver », under 1.5 km) | a polity keeping a blade between two of its own rings or stretches after a retouch: **weld** the neighbour's anchor onto yours; a river's own meander stays | dev | 2026-11-08 |
| His decision names a few cities | — | the **smallest change** that satisfies it (Alzira and Xàtiva: a border move, never the whole Valencian enclave) | dev | 2026-11-08 |
| A polity the sources attest is not on the map | `sides.mjs` (`absent`) | drawn when the dev says it existed (the Lordship of Valencia, 1094–1102); otherwise listed | dev | 2026-11-08 |
| A polity's Wikidata id is written or corrected | `registry.mjs` | take Wikidata's name and **both dates** in the form, unless our sources contradict a date — then ours, said in the sources file; the zone is not finished while `registry.mjs` lists a polity of it | dev | 2026-11-08 |
| The registry's Wikidata id names something else (a town, a modern comarca, a province) | the form's Wikidata line | correct it: a verifiable fact, not a historical choice (Barcelona was Girona, the Pallars were comarques, Roussillon the French province) | Claude, agreed | 2026-11-08 |
| A city's sources diverge, the dev arbitrated | the sources file | the map shows his arbitration; the other reading stays in the sources file, never on the map | dev | 2026-11-08 |

## How to tell the dev

What moved and why (the measure that decided it), which cities changed side, every historical choice made without a
source (a free stretch between two witnesses, a modern reservoir followed), and what is left with its decision row.
