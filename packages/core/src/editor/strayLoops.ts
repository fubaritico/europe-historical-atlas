/**
 * The loops a retrace leaves in a ring that follows it, and which of them go.
 *
 * A new run may land on anchors the following ring keeps — the run of a polity pushed to the sea follows its
 * neighbour's coast back to the end of the stretch. Spliced in, the neighbour's ring then visits those anchors
 * twice: out along the new run, back along its own coast. The dev, 2026-11-08: *"faut tout autoriser, faut rien
 * interdire"* — the retrace is never refused for it. The ring is cut where it touches itself, and each loop is
 * judged by its area: **a loop that encloses nothing, or that winds the other way from the ring it came from,
 * is the land the aimed polity took** — it leaves the neighbour. A loop that winds the same way is a real
 * pinch, drawn on purpose, and stays.
 */

/** A position, longitude then latitude, in degrees. */
type Position = readonly [number, number]

/** Under this many square degrees (about 0.01 m²) a loop encloses nothing: a run walked out and back. */
const EMPTY_LOOP_AREA = 1e-12

/**
 * Twice the signed area of a ring, by the shoelace formula, in square degrees — positive counter-clockwise.
 * @param ring - the anchors, closure implied
 * @param at - where each anchor lies
 * @returns the signed double area
 */
export function signedDoubleArea(ring: readonly number[], at: (index: number) => Position): number {
  let sum = 0
  for (const [k, anchor] of ring.entries()) {
    const [x0, y0] = at(anchor)
    // (k + 1) % length is always an index of the ring: the `??` only satisfies the type.
    const [x1, y1] = at(ring[(k + 1) % ring.length] ?? anchor)
    sum += x0 * y1 - x1 * y0
  }
  return sum
}

/**
 * A ring with the stray loops a retrace left in it cut out: each loop that encloses nothing or winds against
 * `sense`. A loop winding with `sense` is a pinch and stays, so the ring may still visit an anchor twice.
 * @param ring - the ring as spliced, closure implied
 * @param at - where each anchor lies, the new run's points included
 * @param sense - the sign of the ring's area before the retrace: which way its land winds
 * @returns the ring without its stray loops
 */
export function withoutStrayLoops(
  ring: readonly number[],
  at: (index: number) => Position,
  sense: number
): number[] {
  let kept = [...ring]
  let cut = strayCut(kept, at, sense)
  while (cut !== null) {
    kept = cut
    cut = strayCut(kept, at, sense)
  }
  return kept
}

/**
 * The ring with one stray loop cut out, or `null` when it has none. An anchor visited twice splits the ring in
 * two loops — the one between its two visits and the one round the rest — and either may be the stray one.
 * @param ring - the ring, closure implied
 * @param at - where each anchor lies
 * @param sense - which way the ring's land winds
 * @returns the ring with one loop fewer, or `null`
 */
function strayCut(
  ring: readonly number[],
  at: (index: number) => Position,
  sense: number
): number[] | null {
  const seen = new Map<number, number>()
  for (const [j, anchor] of ring.entries()) {
    const i = seen.get(anchor)
    seen.set(anchor, j)
    if (i === undefined) continue
    const inside = ring.slice(i, j)
    if (isStray(inside, at, sense)) return [...ring.slice(0, i), ...ring.slice(j)]
    if (isStray([...ring.slice(j), ...ring.slice(0, i)], at, sense)) return inside
  }
  return null
}

/**
 * Whether a loop is land the ring does not hold: it encloses nothing, or winds against the ring.
 * @param loop - the loop, closure implied
 * @param at - where each anchor lies
 * @param sense - which way the ring's land winds
 * @returns `true` for a stray loop
 */
function isStray(loop: readonly number[], at: (index: number) => Position, sense: number): boolean {
  const area = signedDoubleArea(loop, at)
  return Math.abs(area) <= EMPTY_LOOP_AREA || Math.sign(area) !== Math.sign(sense)
}
