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
  /**
   * Width (km) over which the relief comes down to sea level at the land mask's shore. Zero leaves the
   * DEM's own coast, which stands hundreds of metres above the water along much of Europe.
   */
  shoreRamp: number
  /** Elevations up to this (metres) stay 1:1 — plains keep their relief. */
  plainsCeiling: number
  /** Apparent height (metres) the highest peaks ease toward (e.g. 4441 m → ~700 m). Lower = flatter. */
  peakTarget: number
  /** Render the relief as a wireframe. */
  wireframe: boolean
  /**
   * Subdivisions of the relief mesh along X; Z follows the grid's aspect. The DEM has 1280 columns, so
   * 1280 is one vertex per sample — the sharpest coast and six times the vertices of 512. Weighed live by
   * the dev on 2026-10-16: 60 fps at both ends on his machine, the build 140 → 390 ms, the coasts sharp
   * only at the top — *« plus le chiffre est élevé, mieux c'est »*.
   */
  segments: number
}

/** Tuned relief defaults — a low exaggeration that flattens further as the camera comes in. */
export const DEFAULT_RELIEF_PARAMS: ReliefDevParams = {
  exaggeration: 0.75,
  // The dev's, from the panel, 2026-10-29 (0.35 before): the relief flatter close up.
  exaggZoomIn: 0.2,
  smoothing: 0,
  shoreRamp: 12,
  plainsCeiling: 600,
  peakTarget: 1900,
  wireframe: false,
  segments: 1280,
}

/** Range, step and label of every {@link ReliefDevParams} field. */
export const RELIEF_CONTROLS: ControlTable<ReliefDevParams> = {
  exaggeration: { kind: 'number', min: 0, max: 4, step: 0.05, label: 'exaggeration (zoom-out)' },
  exaggZoomIn: { kind: 'number', min: 0.1, max: 1, step: 0.05, label: 'exaggeration @ zoom-in' },
  smoothing: { kind: 'number', min: 0, max: 8, step: 1, label: 'smoothing (outliers)' },
  shoreRamp: { kind: 'number', min: 0, max: 30, step: 1, label: 'shore ramp (km)' },
  plainsCeiling: { kind: 'number', min: 0, max: 1000, step: 25, label: 'plains ceiling (m)' },
  peakTarget: { kind: 'number', min: 200, max: 3000, step: 25, label: 'peak target (m)' },
  wireframe: { kind: 'boolean', label: 'wireframe' },
  segments: { kind: 'number', min: 256, max: 1280, step: 128, label: 'mesh segments' },
}

/** Display order of the relief controls (a flat list — the relief sits at the panel root). */
export const RELIEF_CONTROL_ORDER: (keyof ReliefDevParams)[] = [
  'exaggeration',
  'exaggZoomIn',
  'smoothing',
  'shoreRamp',
  'plainsCeiling',
  'peakTarget',
  'segments',
  'wireframe',
]
