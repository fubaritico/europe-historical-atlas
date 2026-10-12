/**
 * Coastline styling — draped 3D lines over a flat sea.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import { MAP_INK } from '@europe-historical-atlas/core/data/riverDisplay'

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/**
 * Coastline styling exposed through the dev panel (draped 3D lines; opacity is zoom-linked in the loop).
 */
export interface CoastlineDevParams {
  /** Line colour (hex string). */
  color: string
  /** Opacity at full zoom-out (`controls.zoom = 0`). */
  opacity: number
  /** Opacity at full zoom-in (`controls.zoom = 1`); lerped every frame. */
  opacityZoomIn: number
  /** World-space lift above the flat sea (avoids z-fighting). */
  yLift: number
  /** Hand-drawn wobble amplitude in world units (keep light). */
  jitter: number
  /** Number of overlaid strokes (overdraw → soft pencil band). */
  strokes: number
}

/** Soft pencil coastline: a light jitter over a few overlaid strokes at low opacity. */
export const DEFAULT_COASTLINE_PARAMS: CoastlineDevParams = {
  color: MAP_INK,
  opacity: 0.2,
  opacityZoomIn: 0.1,
  yLift: 0.002,
  jitter: 0.002,
  strokes: 5,
}

/** Range, step and label of every {@link CoastlineDevParams} field. */
export const COASTLINE_CONTROLS: ControlTable<CoastlineDevParams> = {
  color: { kind: 'hexColor', label: 'colour' },
  opacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity (zoom-out)' },
  opacityZoomIn: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity @ zoom-in' },
  jitter: { kind: 'number', min: 0, max: 0.02, step: 0.0005, label: 'jitter (light)' },
  strokes: { kind: 'number', min: 1, max: 6, step: 1, label: 'strokes (overdraw)' },
  yLift: { kind: 'number', min: 0, max: 0.02, step: 0.001, label: 'lift' },
}

/** Display order of the coastline controls. */
export const COASTLINE_CONTROL_ORDER: (keyof CoastlineDevParams)[] = [
  'color',
  'opacity',
  'opacityZoomIn',
  'jitter',
  'strokes',
  'yLift',
]
