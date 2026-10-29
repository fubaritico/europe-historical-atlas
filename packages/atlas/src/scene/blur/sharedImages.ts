/**
 * The lighter way to blur (ATLAS-304, remedy R1), kept dormant for the lower quality levels — the dev, 2026-10-29:
 * *« on va laisser ce code dormant pour l'instant, et on pourrait l'appeler si on voulait […] améliorer la
 * performance »*. Same picture as `separateImages`, but:
 *
 * - **one set of images for every blur**: the borders', the names' and the icons' blurs each use the images only
 *   between their own capture and their own quad, which three draws straight after it — so they take turns;
 * - **one copy a blur**: the capture is resolved once, colour only — its depth, needed by the 3D icons' own faces, is
 *   thrown away rather than copied — and the two directions go between two plain images, never back into the capture;
 * - **a threshold**: under {@link SHARED_BLUR_THRESHOLD} a blur is off and costs nothing.
 *
 * Measured on 29/10 at 4.0 Mpx, the three blurs together: 40 → 54–55 fps, three copies a frame instead of six
 * (`files/plans/atlas/performance.md`, « R1, built and measured »).
 */

import { WebGLRenderTarget } from 'three'

import { blurImages, createLayerBlur, freeBlurImages } from './screenBlur'

import type { BlurMethod } from './blurMethod'
import type { BlurImages } from './screenBlur'

/**
 * The smallest reach drawn as a blur, in CSS pixels: under it the objects are drawn crisp. The reach grows with the
 * zoom from nought, so without it the whole machinery ran from the first notch of the wheel for a blur a tenth of a
 * pixel wide.
 */
export const SHARED_BLUR_THRESHOLD = 0.25

/**
 * Whether a reach is drawn as a blur.
 * @param pixels - the reach, in CSS pixels
 * @returns `true` from {@link SHARED_BLUR_THRESHOLD} up
 */
export function sharedBlurShows(pixels: number): boolean {
  return pixels >= SHARED_BLUR_THRESHOLD
}

/** The lighter method, and the one set of images its blurs share. */
export interface SharedImagesBlur extends BlurMethod {
  /** The images every blur draws with in turn; freed by the method's `dispose`, never by a blur's. */
  readonly images: BlurImages
}

/**
 * The lighter method: every blur made on one set of images.
 * @returns the method, holding the images until it is freed
 */
export function createSharedImagesBlur(): SharedImagesBlur {
  // The capture keeps a depth buffer for the 3D icons' own faces, never resolved nor stored past its render.
  const images = blurImages({
    capture: new WebGLRenderTarget(1, 1, {
      samples: 4,
      resolveDepthBuffer: false,
      storeMultisampledDepthBuffer: false,
    }),
    spare: new WebGLRenderTarget(1, 1, { depthBuffer: false }),
    result: new WebGLRenderTarget(1, 1, { depthBuffer: false }),
  })
  return {
    images,
    create(source, options) {
      return createLayerBlur(source, options, images, sharedBlurShows)
    },
    dispose(): void {
      freeBlurImages(images)
    },
  }
}
