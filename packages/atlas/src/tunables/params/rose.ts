/**
 * Compass-rose styling.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/**
 * Compass-rose styling exposed through the dev panel (colours + labels are baked into the SVG, so any
 * change regenerates the rose; it is positioned at the rhumb-network centre).
 */
export interface RoseDevParams {
  /** Rose centre — normalized U (west→east). */
  centerU: number
  /** Rose centre — normalized V (north→south). */
  centerV: number
  /** Side length of the rose quad in world units. */
  size: number
  /** Overall opacity `[0, 1]`. */
  opacity: number
  /** Draw the French 8-wind labels. */
  showLabels: boolean
  /** Principal winds / rings / labels colour (sepia ink). */
  ink: string
  /** Half-wind colour (vert anglais). */
  halfWind: string
  /** Quarter-wind colour (rouge bordeaux). */
  quarterWind: string
  /** World-space lift above the sea. */
  lift: number
}

/** Compass rose in the Atlantic, portolan colour code (principal ink, half-winds green, quarters red). */
export const DEFAULT_ROSE_PARAMS: RoseDevParams = {
  centerU: 0.2,
  centerV: 0.64,
  size: 1.9,
  opacity: 0.65,
  showLabels: true,
  ink: '#4a3424',
  halfWind: '#3f5e3a',
  quarterWind: '#7a2230',
  lift: 0.01,
}

/** Range, step and label of every {@link RoseDevParams} field. */
export const ROSE_CONTROLS: ControlTable<RoseDevParams> = {
  centerU: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre U (E–W)' },
  centerV: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'centre V (N–S)' },
  size: { kind: 'number', min: 0.5, max: 6, step: 0.1, label: 'size' },
  opacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity' },
  showLabels: { kind: 'boolean', label: 'labels (N · NE · …)' },
  ink: { kind: 'hexColor', label: 'ink (principal)' },
  halfWind: { kind: 'hexColor', label: 'half-winds (green)' },
  quarterWind: { kind: 'hexColor', label: 'quarter-winds (red)' },
  lift: { kind: 'number', min: 0, max: 0.05, step: 0.002, label: 'lift' },
}

/** Display order of the compass-rose controls. */
export const ROSE_CONTROL_ORDER: (keyof RoseDevParams)[] = [
  'centerU',
  'centerV',
  'size',
  'opacity',
  'showLabels',
  'ink',
  'halfWind',
  'quarterWind',
  'lift',
]
