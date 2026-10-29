/**
 * Which form of an icon the zoom shows: the 3D icon close up, its flat drawing from afar, the one fading into the
 * other (the dev, 2026-10-26) — and how big the flat drawing stands. Pure arithmetic, exercised with literals.
 */

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { ICON_CROSS_FADE, ICON_FLAT_MIN_PIXELS, ICON_FLAT_SPAN } from './settings'

/**
 * How far the 3D icon is in, at a zoom: 0 the flat icon alone, 1 the 3D icon alone, linear across the span.
 * @param zoom - the camera's zoom
 * @returns the 3D icon's share, the flat icon's being the rest
 */
export function iconCrossFade(zoom: number): number {
  return clamp01((zoom - ICON_CROSS_FADE.zoom) / ICON_CROSS_FADE.span + 0.5)
}

/**
 * How wide a flat icon stands in the world: the 3D icon's size, so the cross-fade does not jump (the dev,
 * 2026-10-26), and never fewer than its minimum on screen.
 * @param height - how tall the 3D icon stands
 * @param pixelsPerUnit - screen pixels per world unit where the camera looks
 * @returns its width, in world units
 */
export function flatIconSize(height: number, pixelsPerUnit: number): number {
  return Math.max(height * ICON_FLAT_SPAN, ICON_FLAT_MIN_PIXELS / pixelsPerUnit)
}

/** The two forms' shares as the zoom and the startup's fade set them. */
export interface CrossFading {
  /**
   * How far in the 3D form is at the zoom (`iconCrossFade`).
   * @param share - `0` the flat drawing alone, `1` the 3D form alone
   */
  setNear: (share: number) => void
  /**
   * How far the whole has come in at startup (the dev, 2026-10-29: everything fades in together over the relief).
   * @param share - `0` hidden, `1` whole
   */
  setReveal: (share: number) => void
}

/**
 * The cross-fade between a marker's two forms, multiplied by the startup's fade — the two held together, so a form's
 * opacity is never written from one without the other.
 * @param apply - writes the forms' shares: the 3D form's, the flat drawing's
 * @returns the setters
 */
export function crossFading(apply: (near: number, far: number) => void): CrossFading {
  let near3d = 1
  let reveal = 1
  const write = (): void => {
    apply(near3d * reveal, (1 - near3d) * reveal)
  }
  return {
    setNear(share: number): void {
      near3d = share
      write()
    },
    setReveal(share: number): void {
      reveal = share
      write()
    },
  }
}
