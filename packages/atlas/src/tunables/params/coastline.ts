/**
 * Coastline styling — 3D lines laid on the relief at the shore, pulled toward the camera to stay visible.
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
  /** World-space lift of the flat rhumbs above the sea (avoids z-fighting); the coastline lies on the relief. */
  yLift: number
  /**
   * How far (world units) the coastline is pulled toward the camera along its line of sight, so the
   * relief it lies on never hides it — without the upward slide a lift gives it at an oblique angle.
   */
  depthBias: number
  /**
   * World-space lift of the coastline above the relief it lies on. Seen at an angle a lifted line slides
   * up the screen by about its height, so this is a look — a raised outline — not a visibility fix.
   */
  shoreLift: number
  /** Hand-drawn wobble amplitude in world units (keep light). */
  jitter: number
  /** Number of overlaid strokes (overdraw → soft pencil band). */
  strokes: number
}

/**
 * A single clean ink line on the land's edge, never hidden by it, which stays visible from far away — the
 * dev's tuning of 2026-10-16, once the line ran on the relief: *« un côté dessin et 3D en même temps »*.
 * His lift of 0.009 became the depth bias, the same clearance without the upward slide; a part of it is
 * kept as a lift, for the raised look he asked to keep *« entre les deux »* — 0.0045 at first, lowered to
 * 0.002 on 2026-10-27: seen at an angle the line stood off the land's edge, *« un peu trop haut »*.
 */
export const DEFAULT_COASTLINE_PARAMS: CoastlineDevParams = {
  color: MAP_INK,
  opacity: 0.6,
  opacityZoomIn: 1,
  yLift: 0.002,
  depthBias: 0.009,
  shoreLift: 0.002,
  jitter: 0,
  strokes: 1,
}

/** Range, step and label of every {@link CoastlineDevParams} field. */
export const COASTLINE_CONTROLS: ControlTable<CoastlineDevParams> = {
  color: { kind: 'hexColor', label: 'colour' },
  opacity: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity (zoom-out)' },
  opacityZoomIn: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'opacity @ zoom-in' },
  jitter: { kind: 'number', min: 0, max: 0.02, step: 0.0005, label: 'jitter (light)' },
  strokes: { kind: 'number', min: 1, max: 6, step: 1, label: 'strokes (overdraw)' },
  yLift: { kind: 'number', min: 0, max: 0.02, step: 0.001, label: 'lift (rhumbs)' },
  depthBias: { kind: 'number', min: 0, max: 0.03, step: 0.001, label: 'depth bias' },
  shoreLift: { kind: 'number', min: 0, max: 0.02, step: 0.0005, label: 'lift (coast)' },
}

/** Display order of the coastline controls. */
export const COASTLINE_CONTROL_ORDER: (keyof CoastlineDevParams)[] = [
  'color',
  'opacity',
  'opacityZoomIn',
  'jitter',
  'strokes',
  'shoreLift',
  'depthBias',
  'yLift',
]
