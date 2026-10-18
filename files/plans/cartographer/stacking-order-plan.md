# Stacking order by groups — plan

> Written 2026-10-11, rewritten the same evening on the dev's model: **a polity and its vassals form a
> group, re-ordered among siblings at every level** — Illustrator's layers and sublayers
> ([`design/references/illustrator-layers-suzerain-vassal.png`](design/references/illustrator-layers-suzerain-vassal.png)).
> Governing scenario: [`scenarii/s16-stacking-order.md`](scenarii/s16-stacking-order.md).
> **Nothing is built until the dev says go.**

## Where the order lives

**In the order of the document's polities list**, read per sibling group — not in `claims`, as the first
version of this plan said: a polity with no territory holds no claim, yet it can head a group, so it
needs a place. Every polity is in the list. The suzerain is already recorded on each polity
(`suzerain`), so **the file format does not change**.

**To verify first, before step 1**: that the polities list is saved and read back **in order** — the
round trip of `s04`. If a reader sorts it, the order is lost at the first save.

## Steps — each verified and committed alone

| | what | where | how we know it works |
| --- | --- | --- | --- |
| **0** | verify the polities list keeps its order through save and reopen | `core/editor/yearDocument` round trip | a round-trip test on a deliberately unsorted list |
| **1** | **`paintOrder(document)`** — the tree walked depth first: groups in list order, each suzerain then its vassals | `core/editor/` | literals: two groups, a vassal of a vassal, a headless group, a cycle in `suzerain` (refused loudly, never looped) |
| **2** | the **atlas** reads `paintOrder` instead of its own sort by depth (`toRegionPayload`) | `core/data/toRegionPayload.ts` | `s16`'s last scenario: the Empire over France also covers France's vassal, in both apps |
| **3** | the Cartographer paints and hit-tests in `paintOrder` | `canvas/paint/scene.ts` (`projectedTerritories`, the fills) | the fill test answers the front polity where two overlap |
| **4** | **`restack(document, polity, move)`** among siblings only, and `availableMoves` for the menu | `core/editor/stacking.ts` — the file written early, **re-scoped to siblings** | a vassal can never go under its suzerain; a group moves with its vassals |
| **5** | the recorded action `restackPolity`, one history step | `state/editionSlice.ts` | ‹ctrl+Z› restores the order |
| **6** | **{Polities} as a tree** — heads, vassals indented, front first within a level — and the context menu on a row | `components/` | the order is visible in the list, and the menu's disabled states follow `availableMoves` |

Steps 0–3 change nothing on screen for a year without vassals, and fix the atlas/Cartographer
disagreement on their own. Steps 4–6 give the author the commands.

## The menu

The design system's `Menu` for the list; it does not place itself, so **a thin shell of ours** opens it
at the right-click and closes it on ‹escape› or a press outside. *(my call)* If the dev prefers, a
`ContextMenu` can be asked of the design system's Claude, as the `ColorField` was.

## Open — the dev's calls

1. **Within a level, the tree lists front first** (Illustrator's order) — mine, not asked.
2. **Illustrator's shortcuts** and **the same menu on the canvas** — proposed, never asked for.
3. **Choosing a group head in {Polities}** aims at that polity only, not its vassals — the target stays
   one polity (`next.md`, decision of 2026-10-08). To confirm when the tree is built.

## Cost

Steps 0–3: one pure function, its tests, and two call sites switched to it. Steps 4–6: the size of the
`ColorField` integration, plus the tree, which step 5 of P4 owed anyway.
