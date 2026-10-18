# Vassals add to their suzerain — the extent

> Decided by the dev on 2026-10-15. Glossary: **domaine propre**, **étendue**. Memory: `vassal-is-a-neighbour`.
> **Scope reduced the same evening** (the dev: *« on chamboule pas le paradigme »*): no carving operation.

## The rule

- A suzerain's **extent** = its own domain (ground with no vassal assigned) + each vassal's extent,
  recursively, read from the registry. A suzerain with no ring at all is the sum of its vassals.
- **Overlap stays allowed for now**: the dev corrects by hand, retouching the suzerain's own domain where it
  lies under a vassal. The validation will warn of it, never refuse.
- Drawn as neighbours, vassals no longer stack their colour on the suzerain's — the original complaint.

## What already holds, verified 2026-10-15

- **Borders reason by lineage** (`borderRelation.ts`): Aquitaine–Castile is sovereign, Aquitaine–Normandy
  co-vassal, Aquitaine–France vassal. A France made only of its duchies has the right borders today.
- **Retouching France under Aquitaine**: the white arrow picks only the aimed polity's anchors
  (`hitTest.ts:97`), ⟨retrace⟩ too. Friction: a map click over Aquitaine aims Aquitaine — aim France from
  `{Polities}`. A gesture to aim the polity underneath, only if the dev asks.
- **Holes**: even-odd everywhere, nothing to declare.

## The steps

1. **`extentOf`** in `core/editor` — own claim + vassals' extents, recursively; loop-safe; tests at five levels.
2. **The *"no territory"* chip** (`polityRows.ts:70`) reads the extent: a suzerain made of vassals has territory.

Later, on the dev's call: the atlas click (vassal or whole extent?), "colour by suzerain" (`s08`).

## Reopened the same evening — carving at a vassal's birth

The dev, later on 2026-10-15: a **new** vassal (no territory yet) whose first outline is drawn over its
suzerain's own domain **carves** it at close — and so does every later outline of a vassal. Scenarios in `s08`, *"A new vassal carves its ground out of its
suzerain"*. The operation is the one written up earlier and dropped:

- each edge classified at its midpoint, stepped to each side: a suzerain edge outside the vassal is kept, a
  vassal edge inside the suzerain is kept (the new limit), a shared edge dropped when both lie on the same
  side;
- where a vassal edge crosses a suzerain edge between anchors, an anchor is added at the crossing in both
  rings;
- the kept edges chained into rings (`borderGraph`'s pinch rule); an enclave becomes a hole by itself.

Recorded with the closing as **one** history step. **Settled by the dev**: every outline closed for a vassal
carves (islands, exclaves), from the suzerain's own domain only — a co-vassal is overlapped, never carved;
nothing already drawn is recomputed.
