import type { Point } from '../viewport/viewport'

/**
 * Which way round a ring ⟨retrace⟩ replaces (`H-46`): between two anchors of a closed ring there are two
 * stretches, and the one replaced is **the smaller change** — the one that, closed by the new run, encloses
 * the smaller area.
 *
 * **Not the nearer, which was the first rule and failed at once** (the dev, 2026-10-14, the Duchy of the
 * Rana): adding the mainland to Rügen, joined by two anchors, the run went far from both sides, and the
 * nearer was the whole island — which it was about to replace. The area between a run and a stretch is the
 * ground the gesture adds or takes away; a correction changes little, so the smaller is the one meant. It
 * agrees with the nearer on a correction along the stretch (Formentor), and still refuses "the shorter
 * way" that drew Lori and Damascus along the wrong side (defect 14 of the general test). ‹alt› takes the
 * other one.
 */

/** One of the two ways round: along the ring's stored order, or against it. */
export type RetraceSide = 'forward' | 'backward'

/**
 * The area a run and a stretch enclose between them: the run from its start to its end, then the stretch
 * back — a polygon, by the shoelace formula.
 * @param run - the new run, from the start anchor to the end anchor
 * @param stretch - a stretch between the same two anchors, its two ends included, from the start
 * @returns the area, in the points' unit squared; `0` when they enclose nothing
 */
export function enclosedArea(run: readonly Point[], stretch: readonly Point[]): number {
  // The stretch walked back, its two ends left out: they are the run's own ends.
  const polygon = [...run, ...stretch.slice(1, -1).reverse()]
  let twice = 0
  polygon.forEach((point, at) => {
    const next = polygon[(at + 1) % polygon.length]
    if (next !== undefined) twice += point[0] * next[1] - next[0] * point[1]
  })
  return Math.abs(twice) / 2
}

/**
 * The side the new run replaces: the smaller change. On an exact tie, the stretch with fewer points.
 * @param run - the new run, from the start anchor to the end anchor, in screen pixels
 * @param forward - the stretch along the ring's order, its two ends included
 * @param backward - the stretch against it, its two ends included
 * @returns the side to replace
 */
export function smallerSide(
  run: readonly Point[],
  forward: readonly Point[],
  backward: readonly Point[]
): RetraceSide {
  const ahead = enclosedArea(run, forward)
  const behind = enclosedArea(run, backward)
  if (ahead !== behind) return ahead < behind ? 'forward' : 'backward'
  return forward.length <= backward.length ? 'forward' : 'backward'
}
