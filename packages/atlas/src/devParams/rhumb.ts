/**
 * Portolan rhumb-network styling and layout.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '@europe-atlas/core/utils/controlSpec'

/**
 * Portolan rhumb-network styling + layout exposed through the dev panel (opacity is zoom-linked in the
 * loop; the network is regenerated when the layout changes).
 */
export interface RhumbDevParams {
  /** Rose centre — normalized U (west→east). */
  centerU: number
  /** Rose centre — normalized V (north→south). */
  centerV: number
  /** Radius (normalized) of the ring of secondary compass centres. */
  circleRadius: number
  /** Number of secondary centres on the ring. */
  nodeCount: number
  /** Compass directions per centre (unique lines = directions / 2). */
  directions: number
  /** Line colour (hex string). */
  color: string
  /** Opacity at full zoom-out. */
  opacity: number
  /** Opacity at full zoom-in (fades to reduce clutter). */
  opacityZoomIn: number
  /** Sampling step along each line for the sea-clip (smaller = finer at the coast, slower to build). */
  clipStep: number
}

/** Rhumb network centred on open ocean west of Iberia. */
export const DEFAULT_RHUMB_PARAMS: RhumbDevParams = {
  centerU: 0.2,
  centerV: 0.52,
  circleRadius: 0.34,
  nodeCount: 12,
  directions: 32,
  color: '#6a4a2b',
  opacity: 0.16,
  opacityZoomIn: 0.06,
  clipStep: 0.004,
}

/** Range, step and label of every {@link RhumbDevParams} field. */
export const RHUMB_CONTROLS: ControlTable<RhumbDevParams> = {
  color: { kind: 'hexColor', label: 'colour' },
  opacity: { kind: 'number', min: 0, max: 0.6, step: 0.02, label: 'opacity (zoom-out)' },
  opacityZoomIn: { kind: 'number', min: 0, max: 0.6, step: 0.02, label: 'opacity @ zoom-in' },
  centerU: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre U (E–W)' },
  centerV: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre V (N–S)' },
  circleRadius: { kind: 'number', min: 0, max: 0.8, step: 0.01, label: 'ring radius' },
  nodeCount: { kind: 'number', min: 1, max: 32, step: 1, label: 'centres' },
  directions: { kind: 'number', min: 4, max: 32, step: 4, label: 'directions' },
  clipStep: { kind: 'number', min: 0.001, max: 0.02, step: 0.001, label: 'sea-clip step' },
}

/** Display order of the rhumb-network controls. */
export const RHUMB_CONTROL_ORDER: (keyof RhumbDevParams)[] = [
  'color',
  'opacity',
  'opacityZoomIn',
  'centerU',
  'centerV',
  'circleRadius',
  'nodeCount',
  'directions',
  'clipStep',
]
