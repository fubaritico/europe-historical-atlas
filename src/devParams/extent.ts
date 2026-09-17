/**
 * The world rectangle the camera view is clamped within.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '../utils/controlSpec'

/**
 * The world rectangle the camera view is clamped within, tuned by centre + half-size.
 */
export interface ExtentDevParams {
  /** Extent centre X. */
  centerX: number
  /** Extent centre Z. */
  centerZ: number
  /** Extent half-width (X). */
  halfWidth: number
  /** Extent half-depth (Z). */
  halfDepth: number
}

/** The framed default extent — the map plane plus a little margin. */
export const DEFAULT_EXTENT_PARAMS: ExtentDevParams = {
  centerX: 0,
  centerZ: 0,
  halfWidth: 5.8,
  halfDepth: 5.2,
}

/** Range, step and label of every {@link ExtentDevParams} field. */
export const EXTENT_CONTROLS: ControlTable<ExtentDevParams> = {
  centerX: { kind: 'number', min: -6, max: 6, step: 0.05, label: 'centre X' },
  centerZ: { kind: 'number', min: -6, max: 6, step: 0.05, label: 'centre Z' },
  halfWidth: { kind: 'number', min: 0.5, max: 6, step: 0.05, label: 'half-width (X)' },
  halfDepth: { kind: 'number', min: 0.5, max: 6, step: 0.05, label: 'half-depth (Z)' },
}

/** Display order of the extent controls. */
export const EXTENT_CONTROL_ORDER: (keyof ExtentDevParams)[] = [
  'centerX',
  'centerZ',
  'halfWidth',
  'halfDepth',
]
