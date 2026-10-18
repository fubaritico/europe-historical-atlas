/**
 * The tribes' vanishing edge (ATLAS-258): inset or outset, and how wide — the dev's trial, *« Essayons les
 * deux »* (`files/plans/atlas/tribe-feather.md`).
 *
 * One group of the dev-panel declaration table, declared like `vassals.ts`. **The defaults are core's**
 * (`TRIBE_FEATHER`), the Cartographer's too, so the panel starts from the look both applications share and
 * only the trial moves away from it. Every field is read on each frame and written to a uniform
 * (`mapLayers`), so none of them needs a rebuild.
 */

import {
  FEATHER_MODES,
  TRIBE_FEATHER,
  TRIBE_FEATHER_REACH_KM,
} from '@europe-historical-atlas/core/editor/tribeFeather'

import type { TribeFeather } from '@europe-historical-atlas/core/editor/tribeFeather'
import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/** How a tribe's colour vanishes at its limit — core's own shape. */
export type TribeDevParams = TribeFeather

/** Core's default, copied so the live object can be tuned without touching it. */
export const DEFAULT_TRIBE_PARAMS: TribeDevParams = { ...TRIBE_FEATHER }

/**
 * Range, step and label of every {@link TribeDevParams} field. The width stops at the reach the distances
 * are computed to, and the tribes' meshes extend to: wider, an outset fade would end on the patch's edge.
 */
export const TRIBE_CONTROLS: ControlTable<TribeDevParams> = {
  mode: { kind: 'choice', options: FEATHER_MODES, label: 'fade inside / outside the limit' },
  // Above zero: a width of zero is the hard edge the dashed outline was replaced to avoid.
  widthKm: {
    kind: 'number',
    min: 1,
    max: TRIBE_FEATHER_REACH_KM,
    step: 1,
    label: 'fade width (km)',
  },
}

/** Display order of the tribe controls. */
export const TRIBE_CONTROL_ORDER: (keyof TribeDevParams)[] = ['mode', 'widthKm']
