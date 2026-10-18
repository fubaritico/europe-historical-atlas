/**
 * Homage as a level of detail (ATLAS-253): from afar a vassal wears its suzerain's colour and no border
 * parts them; closer, its own colour and the border fade in — the rivers' reveal by rank, applied to
 * homage (`files/plans/atlas/vassal-lod.md`).
 *
 * One group of the dev-panel declaration table, declared like `river.ts`. Every field is read on each
 * frame (`scene/homageReveal`), so none of them needs a rebuild.
 */

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/** How the zoom reveals the levels of homage. */
export interface VassalDevParams {
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
 * The zoom is linear in the camera's distance, 6 world units at 0 (the whole sheet, 12 across, which is
 * where the atlas opens) down to 1 at 1. The direct vassals start fading in at 0.25 and are whole at
 * 0.45 — about 3.8 units away, past the 0.35 where a border's light inlay is fully in, so a vassal's border
 * arrives already dressed as a border; the first quarter of the zoom reads as realms only. The deepest
 * level lands at 0.8, where the rivers' smallest tributaries do: the finest political grain arrives with
 * the finest physical one. 1100 has one level of vassals today, so `revealEnd` waits for a sub-vassal.
 */
export const DEFAULT_VASSAL_PARAMS: VassalDevParams = {
  enabled: true,
  revealStart: 0.45,
  revealEnd: 0.8,
  fade: 0.2,
}

/** Range, step and label of every {@link VassalDevParams} field. */
export const VASSAL_CONTROLS: ControlTable<VassalDevParams> = {
  enabled: { kind: 'boolean', label: 'reveal vassals by zoom' },
  revealStart: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'vassals visible from' },
  revealEnd: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'deepest visible from' },
  // Above zero: a zero span would switch a level on in one frame, which is what the fade is for.
  fade: { kind: 'number', min: 0.05, max: 1, step: 0.05, label: 'fade-in span' },
}

/** Display order of the vassal controls. */
export const VASSAL_CONTROL_ORDER: (keyof VassalDevParams)[] = [
  'enabled',
  'revealStart',
  'revealEnd',
  'fade',
]
