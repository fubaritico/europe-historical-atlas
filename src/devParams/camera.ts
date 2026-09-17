/**
 * The map-controls options the camera folder tunes live.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '../utils/controlSpec'

/** The subset of the map-controls options the camera folder tunes live. */
export interface CameraTuningParams {
  /** Arrow/edge pan speed in world units per second. */
  panSpeed: number
  /** Wheel zoom increment per notch. */
  zoomSpeed: number
  /** Inertia time constant in seconds. */
  smoothingTau: number
  /** Whether dragging the map pans it. */
  enableDrag: boolean
  /** Whether the pointer near a screen edge pans the map. */
  enableEdgeScroll: boolean
  /** Edge-scroll speed in world units per second. */
  edgeScrollSpeed: number
  /** Camera distance at full zoom-in. */
  minDistance: number
  /** Camera distance at full zoom-out. */
  maxDistance: number
  /** Pitch in degrees at full zoom-in (oblique). */
  minPitchDeg: number
  /** Pitch in degrees at full zoom-out (top-down). */
  maxPitchDeg: number
}

/** Range, step and label of every {@link CameraTuningParams} field. */
export const CAMERA_CONTROLS: ControlTable<CameraTuningParams> = {
  panSpeed: { kind: 'number', min: 1, max: 30, step: 0.5, label: 'pan speed' },
  zoomSpeed: { kind: 'number', min: 0.005, max: 0.02, step: 0.001, label: 'zoom speed' },
  smoothingTau: { kind: 'number', min: 0.02, max: 0.5, step: 0.01, label: 'inertia (s)' },
  enableDrag: { kind: 'boolean', label: 'drag-pan' },
  enableEdgeScroll: { kind: 'boolean', label: 'edge-scroll' },
  edgeScrollSpeed: { kind: 'number', min: 1, max: 30, step: 0.5, label: 'edge speed' },
  minDistance: { kind: 'number', min: 0.5, max: 8, step: 0.25, label: 'min distance (in)' },
  maxDistance: { kind: 'number', min: 2, max: 15, step: 0.25, label: 'max distance (out)' },
  minPitchDeg: { kind: 'number', min: 20, max: 89, step: 1, label: 'pitch in (oblique)' },
  maxPitchDeg: { kind: 'number', min: 20, max: 89, step: 1, label: 'pitch out (top-down)' },
}

/** Display order of the camera-feel controls. */
export const CAMERA_CONTROL_ORDER: (keyof CameraTuningParams)[] = [
  'panSpeed',
  'zoomSpeed',
  'smoothingTau',
  'enableDrag',
  'enableEdgeScroll',
  'edgeScrollSpeed',
  'minDistance',
  'maxDistance',
  'minPitchDeg',
  'maxPitchDeg',
]

/** Camera-feel defaults (the inertia is overridden to near-zero under `prefers-reduced-motion`). */
export const DEFAULT_CAMERA_TUNING: CameraTuningParams = {
  panSpeed: 8,
  zoomSpeed: 0.01,
  smoothingTau: 0.12,
  enableDrag: true,
  enableEdgeScroll: true,
  // World units per second at full zoom-out, scaled down as the camera comes in. The map plane is 12
  // across, so 8 crossed the whole of Europe in a second and a half — faster than the eye can follow a
  // coastline. 4 takes three seconds, which is about the pace of a deliberate look around.
  edgeScrollSpeed: 4,
  minDistance: 1,
  maxDistance: 6,
  minPitchDeg: 30,
  maxPitchDeg: 55,
}
