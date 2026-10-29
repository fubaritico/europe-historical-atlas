/**
 * What every kind of event marker answers to — the plain pin (`pin`) and the icons (`icons/eventIconMarkers`) alike —
 * so the layers hold, scale, turn and free them through one handle.
 */

import { Group } from 'three'

import type { Quaternion, Vector3 } from 'three'

/** Where the camera stands and how it is turned, in the world — a camera's own `position` and `quaternion` fit. */
export interface CameraPose {
  /** Where it stands. */
  readonly position: Vector3
  /** How it is turned. */
  readonly quaternion: Quaternion
}

/**
 * The markers' draw order, set on each marker's group. The borders are drawn over the relief with no depth test, in
 * the transparent pass, which three draws after every opaque object — so an opaque pin was painted over by them (the
 * dev, 2026-10-26). In the transparent pass, three sorts by the nearest group's `renderOrder` before anything else
 * (`WebGLRenderLists.js`, `reversePainterSortStable`; a group sets it for its children, `WebGLRenderer.js`
 * `projectObject`), so a group order above every layer's puts the markers last; their depth test stays on, so the
 * relief still hides a marker behind a mountain.
 */
export const EVENT_RENDER_ORDER = 1000

/**
 * The halos' draw order (ATLAS-306): just before the markers they light, so a marker is drawn over its halo, and still
 * above every layer's order, as the markers are.
 */
export const HALO_RENDER_ORDER = EVENT_RENDER_ORDER - 1

/** The events marked on the relief, plus what keeps them on it. */
export interface EventMarkers {
  /** The markers, to add to the scene. */
  readonly object: Group
  /**
   * Follow the relief's live exaggeration: the markers stay planted on the scaled ground, and keep their own height.
   * @param scale - the relief's `scale.y`
   * @returns nothing
   */
  setReliefScale: (scale: number) => void
  /**
   * Choose the markers' form for the camera's zoom: an icon is 3D close up, flat from afar, the one fading into the
   * other; a pin is always a pin.
   * @param zoom - the camera's zoom in `[0, 1]`, zoomed out at zero
   * @param pixelsPerUnit - screen pixels per world unit where the camera looks (`scene/screenScale`)
   * @returns nothing
   */
  setZoom: (zoom: number, pixelsPerUnit: number) => void
  /**
   * Turn the markers to the camera for this frame: an icon faces it, so it always shows its front, from above as
   * from the side, then sways (the dev, 2026-10-26); a pin, round, does nothing.
   * @param camera - where the camera stands and how it is turned
   * @param seconds - the time since the map started
   * @returns nothing
   */
  faceCamera: (camera: CameraPose, seconds: number) => void
  /**
   * Blur the markers a little close up (ATLAS-302), or draw them crisp at a reach the blur's method does not draw (`0` always) — the 3D icons
   * only; a kind without a blur leaves it out.
   * @param pixels - the blur's reach, in CSS pixels
   * @returns nothing
   */
  setBlur?: (pixels: number) => void
  /**
   * How far the markers have come in, `0` hidden to `1` whole — the fade they arrive with at startup, with the
   * countries and their names (the dev, 2026-10-29). Multiplies the zoom's own fade between their forms.
   * @param share - the share of their opacity shown
   */
  setReveal: (share: number) => void
  /** Free the GPU resources. */
  dispose(): void
}

/**
 * One handle over several kinds of markers — the pins and the icons — so the layers hold, scale and dispose them as
 * one.
 * @param parts - the markers to hold together
 * @returns their handle
 */
export function combineEventMarkers(parts: readonly EventMarkers[]): EventMarkers {
  // Each kind's group under one group, and every call passed on to each kind.
  const object = new Group()
  for (const part of parts) object.add(part.object)
  return {
    object,
    setReliefScale(scale: number): void {
      for (const part of parts) part.setReliefScale(scale)
    },
    setZoom(zoom: number, pixelsPerUnit: number): void {
      for (const part of parts) part.setZoom(zoom, pixelsPerUnit)
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      for (const part of parts) part.faceCamera(camera, seconds)
    },
    setReveal(share: number): void {
      for (const part of parts) part.setReveal(share)
    },
    setBlur(pixels: number): void {
      for (const part of parts) part.setBlur?.(pixels)
    },
    dispose(): void {
      for (const part of parts) part.dispose()
    },
  }
}
