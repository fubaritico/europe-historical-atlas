/**
 * How much of a year's homage the zoom shows — one continuous number, the **detail**, read by the fills
 * and the borders alike so a vassal's colour and its border with its suzerain arrive at the same moment
 * (ATLAS-253, `files/plans/atlas/vassal-lod.md`).
 *
 * The detail is a display level made continuous: `0` shows every polity in its root's colour and no border
 * inside a realm; `1` shows the direct vassals apart; `1.5` is halfway to the sub-vassals. Level 1 is fully
 * in at `revealStart`, the deepest at `revealEnd`, the levels between spread evenly, and each fades in over
 * `fade` before its point — the rivers' reveal by rank (`riverLayer.rankOpacity`), applied to homage.
 */

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

/**
 * The reveal's tunables. Declared structurally rather than as the dev panel's type, so this module stays
 * inside the `scene` layer and can be exercised with a literal.
 */
export interface HomageRevealOptions {
  /** Off, every polity wears its own colour and every border shows — the look before levels. */
  enabled: boolean
  /** Zoom `[0, 1]` at which level 1, the direct vassals, is fully shown. */
  revealStart: number
  /** Zoom `[0, 1]` at which the deepest level is fully shown. */
  revealEnd: number
  /** Zoom span over which each level fades in. */
  fade: number
}

/**
 * The zoom at which a level is fully shown.
 * @param level - the display level, `1` to `deepest`
 * @param deepest - the deepest level of the year
 * @param options - the reveal thresholds
 * @returns `revealStart` for level 1, `revealEnd` for the deepest, evenly between
 */
export function levelRevealZoom(
  level: number,
  deepest: number,
  options: Pick<HomageRevealOptions, 'revealStart' | 'revealEnd'>
): number {
  if (deepest <= 1) return options.revealStart
  const t = (level - 1) / (deepest - 1)
  return options.revealStart + (options.revealEnd - options.revealStart) * t
}

/**
 * How much of a year's homage a zoom shows.
 * @param zoom - the camera zoom, `0` zoomed out and `1` zoomed in
 * @param deepest - the deepest level of the year; `0` for a year with no vassal, or a payload year
 * @param options - the reveal tunables
 * @returns the detail, in `[0, deepest]`
 */
export function homageDetail(zoom: number, deepest: number, options: HomageRevealOptions): number {
  // Levels off, or a year with no vassal: nothing to reveal, the whole detail at once.
  if (!options.enabled || deepest <= 0) return Math.max(0, deepest)
  // A zero span would divide by zero: `NaN` passes `clamp01`, and a `NaN` uniform paints nothing. The
  // slider stops above zero; the floor is for a literal.
  const fade = Math.max(1e-6, options.fade)
  // Each level adds its own eased fade-in: the detail climbs one unit per level the zoom passes.
  let detail = 0
  for (let level = 1; level <= deepest; level += 1) {
    const t = clamp01((zoom - (levelRevealZoom(level, deepest, options) - fade)) / fade)
    detail += t * t * (3 - 2 * t)
  }
  return detail
}

/**
 * How visible a border of a given split level is at a detail — the share of its level the detail has
 * reached, so it fades in exactly as the vassal's colour mixes in.
 * @param detail - the detail, from {@link homageDetail}
 * @param level - the border's split level; `0` is shown at every detail
 * @returns a multiplier in `[0, 1]`
 */
export function levelOpacity(detail: number, level: number): number {
  return level <= 0 ? 1 : clamp01(detail - (level - 1))
}
