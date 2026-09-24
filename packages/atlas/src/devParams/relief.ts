/**
 * Relief geometry and displacement tuning.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/**
 * Relief geometry / displacement tuning, exposed live through the dev panel.
 */
export interface ReliefDevParams {
  /** Vertical exaggeration of the relief at full zoom-out (applied via `mesh.scale.y`). */
  exaggeration: number
  /** Exaggeration multiplier at full zoom-in (relief flattens as you zoom in); 1 = no flattening. */
  exaggZoomIn: number
  /** Box-blur radius (grid cells); kills isolated DEM outliers. Keep low to stay crisp. */
  smoothing: number
  /** Elevations up to this (metres) stay 1:1 — plains keep their relief. */
  plainsCeiling: number
  /** Apparent height (metres) the highest peaks ease toward (e.g. 4441 m → ~700 m). Lower = flatter. */
  peakTarget: number
  /** Render the relief as a wireframe. */
  wireframe: boolean
}

/** Tuned relief defaults — a low exaggeration that flattens further as the camera comes in. */
export const DEFAULT_RELIEF_PARAMS: ReliefDevParams = {
  exaggeration: 0.75,
  exaggZoomIn: 0.35,
  smoothing: 0,
  plainsCeiling: 575,
  peakTarget: 1900,
  wireframe: false,
}

/** Range, step and label of every {@link ReliefDevParams} field. */
export const RELIEF_CONTROLS: ControlTable<ReliefDevParams> = {
  exaggeration: { kind: 'number', min: 0, max: 4, step: 0.05, label: 'exaggeration (zoom-out)' },
  exaggZoomIn: { kind: 'number', min: 0.1, max: 1, step: 0.05, label: 'exaggeration @ zoom-in' },
  smoothing: { kind: 'number', min: 0, max: 8, step: 1, label: 'smoothing (outliers)' },
  plainsCeiling: { kind: 'number', min: 0, max: 1000, step: 25, label: 'plains ceiling (m)' },
  peakTarget: { kind: 'number', min: 200, max: 3000, step: 25, label: 'peak target (m)' },
  wireframe: { kind: 'boolean', label: 'wireframe' },
}

/** Display order of the relief controls (a flat list — the relief sits at the panel root). */
export const RELIEF_CONTROL_ORDER: (keyof ReliefDevParams)[] = [
  'exaggeration',
  'exaggZoomIn',
  'smoothing',
  'plainsCeiling',
  'peakTarget',
  'wireframe',
]
