/**
 * The contract of the map's blurs (ATLAS-304, the dev, 2026-10-29: *« un contrat d'interface commun, une injection »*):
 * what a layer hands a blur, what it gets back, and the method that makes them. Types only — the layers that blur
 * depend on this file and on nothing that draws. The methods are `separateImages` (the standard) and `sharedImages`
 * (the lighter one, for the lower quality levels); what both draw with is `screenBlur`.
 */

import type { Mesh, Object3D } from 'three'

/** How a blur is set up. */
export interface ScreenBlurOptions {
  /** The layer its objects move to while blurred — one the camera, which sees layer 0, does not. */
  readonly layer: number
  /** The rank the quad is drawn at: the objects' own. */
  readonly renderOrder: number
  /** How the image is laid back: over the map, or multiplied into it. */
  readonly blend: 'normal' | 'multiply'
  /** The objects blurred, read again at each switch on or off; every object under the source but the quad when left out. */
  readonly members?: () => readonly Object3D[]
  /**
   * Draw the whole scene the quad is drawn in, not the source alone — for objects lit by lights held elsewhere in it
   * (the event icons, ATLAS-302). Only the blur's layer is drawn either way; the scene's background is left out.
   */
  readonly wholeScene?: boolean
}

/** A layer's blur, as one thing. */
export interface ScreenBlur {
  /** The quad laid over the screen; added beside the objects blurred, at their rank. */
  readonly object: Mesh
  /**
   * How much to blur, in CSS pixels. A reach the method does not draw as a blur (`0` always) leaves the objects as they
   * are, crisp, and hides the quad.
   * @param pixels - the blur's reach
   * @returns whether the reach is drawn as a blur — what a layer that changes its own look with it (the names' ink)
   *   reads, so the two never disagree
   */
  setRadius: (pixels: number) => boolean
  /** Free the quad, and the images the blur holds alone if its method gave it its own. */
  dispose: () => void
}

/** How the map's blurs are drawn: the contract every method keeps, injected into the layers that blur. */
export interface BlurMethod {
  /**
   * Build a layer's blur, off until a radius is set.
   * @param source - the root of the objects blurred, drawn into the image each frame the blur is on
   * @param options - the blur's layer, its rank, how it is laid back, and which objects it blurs
   * @returns the blur
   */
  create: (source: Object3D, options: ScreenBlurOptions) => ScreenBlur
  /** Free what the method holds across its blurs — nothing for a method whose blurs each hold their own. */
  dispose: () => void
}
