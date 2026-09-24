/**
 * River-network styling and level of detail.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import { DEFAULT_COASTLINE_PARAMS } from './coastline'

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/**
 * River-network styling and level of detail. The reveal thresholds are zoom values: minor tributaries
 * only appear once the camera is close enough for them to read as lines rather than noise.
 */
export interface RiverDevParams {
  /** Line colour (hex string). */
  color: string
  /** Opacity of a fully revealed river. */
  opacity: number
  /** Zoom `[0, 1]` at which the major rivers (rank 1) are fully drawn. */
  revealStart: number
  /** Zoom `[0, 1]` at which the minor rivers (rank 9) are fully drawn. */
  revealEnd: number
  /** Zoom span over which a rank fades in, so ranks appear gradually rather than popping. */
  fade: number
  /** Draw the centrelines traced through lakes, not just the rivers proper. */
  includeLakeCenterlines: boolean
  /** Hand-drawn wobble amplitude in world units (0 = crisp). */
  jitter: number
  /** Stroke width in CSS pixels for a major river (rank 1). */
  widthMajor: number
  /** Stroke width in CSS pixels for the finest tributaries (rank 9). */
  widthMinor: number
}

/** Same sepia ink as the coastline — one hand drew the whole map. Minor tributaries appear on zoom-in. */
export const DEFAULT_RIVER_PARAMS: RiverDevParams = {
  color: DEFAULT_COASTLINE_PARAMS.color,
  opacity: 0.3,
  revealStart: 0,
  revealEnd: 0.8,
  fade: 0.25,
  includeLakeCenterlines: false,
  jitter: 0,
  widthMajor: 1.25,
  widthMinor: 0.95,
}

/** Range, step and label of every {@link RiverDevParams} field. */
export const RIVER_CONTROLS: ControlTable<RiverDevParams> = {
  color: { kind: 'hexColor', label: 'colour' },
  opacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity' },
  revealStart: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'majors visible from' },
  revealEnd: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'minors visible from' },
  fade: { kind: 'number', min: 0.05, max: 1, step: 0.05, label: 'fade-in span' },
  includeLakeCenterlines: { kind: 'boolean', label: 'trace through lakes' },
  jitter: { kind: 'number', min: 0, max: 0.02, step: 0.0005, label: 'jitter (light)' },
  // 0.5..5 at a 0.05 step: the useful band is 1..3 px, and the old 0..8 range put it in a sliver at
  // the far left of the slider — the same mistake the zoom speed had.
  widthMajor: { kind: 'number', min: 0.5, max: 5, step: 0.05, label: 'width — majors (px)' },
  widthMinor: { kind: 'number', min: 0.5, max: 5, step: 0.05, label: 'width — minors (px)' },
}

/** Display order of the river controls. */
export const RIVER_CONTROL_ORDER: (keyof RiverDevParams)[] = [
  'color',
  'opacity',
  'widthMajor',
  'widthMinor',
  'revealStart',
  'revealEnd',
  'fade',
  'includeLakeCenterlines',
  'jitter',
]
