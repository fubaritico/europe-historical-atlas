/**
 * The sheet the map is printed on, and the graduated border that frames it.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '../utils/controlSpec'

/**
 * The paper around the map, and the neatline between the two.
 *
 * There is no paper colour here on purpose: it is the sea's, read from the terrain options. The margin
 * continues the water it abuts, so the sheet reads as one surface with a map drawn on it.
 */
export interface FrameDevParams {
  /** Draw the sheet and its border at all. */
  show: boolean
  /** How far the paper reaches beyond the map, in world units. */
  sheetMargin: number
  /** How strongly the vellum fibre shows on the sheet. */
  grain: number
  /** Spatial scale of that fibre, in baked pixels. Larger is coarser. */
  grainScale: number
  /** Width of the graduated band, in world units. */
  bandWidth: number
  /** Degrees per alternation — one dark segment per this many degrees of longitude or latitude. */
  bandStepDeg: number
  /** The band's dark ink. */
  ink: string
  /** Length of a graduation tick, in world units. Zero draws none. */
  tickLength: number
  /** Degrees between graduation ticks. */
  tickStepDeg: number
  /** How far above the sea the whole frame sits, clear of the terrain it abuts. */
  lift: number
}

/** A sober chart border: a narrow band, one alternation per degree, ticks every five. */
export const DEFAULT_FRAME_PARAMS: FrameDevParams = {
  show: true,
  sheetMargin: 2.5,
  grain: 0.16,
  grainScale: 26,
  bandWidth: 0.16,
  bandStepDeg: 1,
  ink: '#3d2c20',
  tickLength: 0.07,
  tickStepDeg: 5,
  lift: 0.004,
}

/** Range, step and label of every {@link FrameDevParams} field. */
export const FRAME_CONTROLS: ControlTable<FrameDevParams> = {
  show: { kind: 'boolean', label: 'show sheet + border' },
  sheetMargin: { kind: 'number', min: 0, max: 8, step: 0.1, label: 'paper margin' },
  grain: { kind: 'number', min: 0, max: 0.6, step: 0.01, label: 'vellum grain' },
  grainScale: { kind: 'number', min: 4, max: 80, step: 1, label: 'grain scale (px)' },
  bandWidth: { kind: 'number', min: 0.02, max: 0.6, step: 0.01, label: 'band width' },
  bandStepDeg: { kind: 'number', min: 0.5, max: 10, step: 0.5, label: 'degrees per alternation' },
  ink: { kind: 'color', label: 'band ink' },
  tickLength: { kind: 'number', min: 0, max: 0.3, step: 0.01, label: 'tick length' },
  tickStepDeg: { kind: 'number', min: 1, max: 30, step: 1, label: 'degrees per tick' },
  lift: { kind: 'number', min: 0, max: 0.05, step: 0.001, label: 'lift above sea' },
}

/** Display order of the frame controls. */
export const FRAME_CONTROL_ORDER: (keyof FrameDevParams)[] = [
  'show',
  'sheetMargin',
  'grain',
  'grainScale',
  'bandWidth',
  'bandStepDeg',
  'ink',
  'tickLength',
  'tickStepDeg',
  'lift',
]
