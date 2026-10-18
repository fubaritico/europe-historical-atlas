# Tribes with a vanishing edge — ATLAS-258 (2026-10-18)

> The dev, 2026-10-18: the dashed, unfilled tribes *« ça fonctionne pas. C'est pas beau »*. Option **A**:
> the colour full at the heart of the territory, dissolving toward its edge, no stroke — a people's limit is
> vague. **The same in the Cartographer and in the atlas.** Then: *« est-ce qu'on pourrait faire ce dégradé
> inset plutôt que outset ? Essayons les deux »*.

## One mechanism, two placements

- **Signed distance** to the tribe's outline, in kilometres on the ground: negative inside, positive outside.
- **The ramp** turns it into an opacity, `0..1`, over a width `w`:
  - **inset** — full at `-w` inside, nothing at the outline: the colour fades out *before* the edge;
  - **outset** — full at the outline, nothing at `+w` outside: the colour spills past the edge and fades.
- **One home, in core**: the ramp function and the default `{ mode, widthKm }`. Both applications read it,
  so they cannot drift. The atlas dev panel overrides it for the trial; the Cartographer follows the default.
  Once the dev has chosen, the default moves and the trial switch stays as a tunable.

## Per application

- **Atlas** — a tribe is covered by a mesh a margin `w` wider than its outline (so outset has somewhere to
  spill), laid on the relief planes as the fills are (`pipeline/fillTriangles` over the enlarged box), each
  vertex carrying its signed distance, computed once when the year loads. The shader reads the ramp — no
  rebuild while zooming. Switching mode or width rewrites a uniform only if the distances do not depend on
  them (they do not: the ramp does).
- **Cartographer** — per tribe, an alpha image at backdrop resolution over the enlarged box, from the same
  signed distance and the same ramp, cached per document version, composited like a fill (`overlay` on the
  backdrop). Never per frame.
- **The dashed outline goes**, in both. `editor/tribes` keeps saying what a tribe is; `atlasBorders` stops
  returning tribe outlines for dashes.

## Steps

1. core — signed distance to a set of rings (km), the ramp, the default; tested with literals.
2. atlas — the tribe mesh and its shader, the dev-panel group (mode, width), dashes removed.
3. Cartographer — the alpha images, cached, dashes removed.
4. Parity table and glossary.
