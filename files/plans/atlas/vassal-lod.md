# Vassals by zoom — ATLAS-253 (2026-10-18)

> The dev's idea and decisions, 2026-10-18: like Europa Universalis, the atlas shows homage as a level of
> detail. From afar a vassal wears its suzerain's colour and no border separates them; closer, its own colour
> and the border fade in, as the rivers do by rank. A sub-vassal goes through its direct suzerain's colour
> first. **Requirement: no frame-rate cost, no heavier code.** The Cartographer does not change.

## Measured before designing

- **1100 has two levels today**: 84 polities with no suzerain, 56 direct vassals, no sub-vassal. The
  mechanism is general (depth N), the cost today is one extra tint per vertex.
- **Every polity has a colour** — pinned, or an automatic palette slot (`core/editor/polityColours`). So
  close up the atlas shows the Cartographer's colour, and "a vassal with no colour of its own" does not
  exist: that criterion, written by Claude, was dropped from the ticket.
- **The fills already carry a tint per vertex** (`atlas/scene/fillLayer`, `Uint8×3`), blended in a
  `ShaderMaterial`; the rivers reveal by rank with a per-layer opacity (`scene/riverLayer`,
  `rankOpacity`). The borders are one composed layer grouped by pattern (`scene/composedLineLayer`), whose
  opacity setter reaches the inlay only.

## The design

- **Level of a polity** — its depth in the homage chain (0 = no suzerain). **Display level L** — what the
  zoom shows: a polity of depth `d` wears the colour of its ancestor at depth `min(L, d)`.
- **Split level of a border** — the first L at which its two sides wear different colours: 0 between two
  independent realms, `k+1` between two polities sharing an ancestor at depth `k`. A border is hidden below
  its split level and fades in at it.
- **Zoom → L**, continuous, from dev-panel thresholds like the rivers' (`revealStart`, `revealEnd`, `fade`):
  level 1 reveals at `revealStart`, the deepest at `revealEnd`.

## Steps

1. **core** — `editor/homageLevels`: each polity's chain of ancestors, the colour id at a level, a border's
   split level, the deepest level. Pure, tested with literals. A homage loop (refused at input, possible in a
   hand-edited file) breaks the chain where it repeats: the polity is read as its own root, said once.
2. **atlas fills** — one tint attribute per level, a `detail` uniform set from the zoom; the shader mixes the
   two levels around it. No triangle is recut, no buffer rewritten while zooming.
3. **atlas borders** — `exactBordersOf` gives each group its split level; one composed layer per level, its
   whole opacity set from the zoom (level 0 always shown).
4. **dev panel** — a `vassals` group: `revealStart`, `revealEnd`, `fade`, and an off switch that shows every
   polity in its own colour (today's look, for comparison).
5. **Parity table** in `.claude/rules/architecture.md`: a difference by design (the atlas only).

**Aside, asked the same day**: rivers always shown, as in the Cartographer — no code, set the dev panel's
"minors visible from" to 0 and judge; if kept, the default moves.
