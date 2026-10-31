/**
 * Homage as a level of detail (ATLAS-253): from afar a vassal wears its suzerain's colour and no border
 * parts them; closer, its own colour and the border fade in (`files/plans/atlas/vassal-lod.md`). **When** is no
 * longer a slider: the levels of detail decide it (`scene/detail/detailLevels`, the dev, 2026-10-31: the direct
 * vassals at the second stop, the deeper ones at the third) — the reveal's start, end and fade went with them.
 *
 * One group of the dev-panel declaration table, declared like `river.ts`. Read on each frame
 * (`scene/layers/frameLayers`), so it needs no rebuild.
 */

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/** Whether the levels of homage are revealed by the levels of detail. */
export interface VassalDevParams {
  /** Off, every polity wears its own colour and every border shows — the look before levels. */
  enabled: boolean
}

/** The vassals revealed by the levels of detail. */
export const DEFAULT_VASSAL_PARAMS: VassalDevParams = {
  enabled: true,
}

/** Range, step and label of every {@link VassalDevParams} field. */
export const VASSAL_CONTROLS: ControlTable<VassalDevParams> = {
  enabled: { kind: 'boolean', label: 'reveal vassals by level of detail' },
}

/** Display order of the vassal controls. */
export const VASSAL_CONTROL_ORDER: (keyof VassalDevParams)[] = ['enabled']
