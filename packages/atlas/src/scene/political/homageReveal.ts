/**
 * How a vassal's border follows its colour (ATLAS-253, `files/plans/atlas/vassal-lod.md`): the **detail** is a display
 * level made continuous — `0` shows every polity in its root's colour and no border inside a realm, `1` the direct
 * vassals apart, `1.5` halfway to the sub-vassals. **Which detail** is no longer the zoom's: the levels of detail set it,
 * faded in time (`scene/detail`, the dev, 2026-10-31); the reveal by zoom, start, end and fade, went with them.
 */

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

/**
 * How visible a border of a given split level is at a detail — the share of its level the detail has
 * reached, so it fades in exactly as the vassal's colour mixes in.
 * @param detail - the detail, from the level of detail's view (`scene/detail/detailView`)
 * @param level - the border's split level; `0` is shown at every detail
 * @returns a multiplier in `[0, 1]`
 */
export function levelOpacity(detail: number, level: number): number {
  return level <= 0 ? 1 : clamp01(detail - (level - 1))
}
