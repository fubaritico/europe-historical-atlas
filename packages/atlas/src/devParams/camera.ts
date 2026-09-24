/**
 * The map-controls options the camera folder tunes live.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label
 * of every control, and the display order — declared side by side so a default cannot drift outside its
 * own slider without failing type-check.
 */

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

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
  /** How long a fly-to lasts, in milliseconds. Zero arrives at once, which is what reduced motion asks. */
  flyDurationMs: number
  /** The zoom the focus mode settles at — one depth for every flight, not a step. */
  flyFocusZoom: number
  /** The zoom at the top of a flight's arc; zero pulls out to the whole sheet before diving back in. */
  flyArcZoom: number
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
  maxDistance: { kind: 'number', min: 2, max: 24, step: 0.25, label: 'max distance (out)' },
  minPitchDeg: { kind: 'number', min: 20, max: 89, step: 1, label: 'pitch in (oblique)' },
  maxPitchDeg: { kind: 'number', min: 20, max: 89, step: 1, label: 'pitch out (top-down)' },
  flyDurationMs: { kind: 'number', min: 0, max: 4000, step: 50, label: 'fly-to duration (ms)' },
  flyFocusZoom: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'focus zoom (land at)' },
  flyArcZoom: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'arc zoom (top of flight)' },
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
  'flyDurationMs',
  'flyFocusZoom',
  'flyArcZoom',
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
  // The trip has three phases — pull out, cross, dive in — so it needs room the old 700 ms did not
  // give it: at that length the whole arc reads as a flicker rather than a movement.
  flyDurationMs: 1400,
  // Maximum zoom. Entering focus is meant to land at the grazing close-up, the same one every time,
  // and it is the depth the event text will later be read at.
  flyFocusZoom: 1,
  // Fully out: the whole sheet is in view at the top of the arc. The cost is that the arc does not
  // shrink with the distance, so a neighbouring target is visited the same way as a far one — raise
  // this to soften that without touching the code.
  flyArcZoom: 0,
}
