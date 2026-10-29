/**
 * The standard way to blur (ATLAS-302, the very high quality level of ATLAS-304): each blur has its own images, as it
 * was built on 28/10. The layer is captured with four samples, blurred across into a spare, then down back into the
 * capture, which the quad reads; any reach above nought is drawn as a blur.
 *
 * What it costs, measured on 29/10 (`files/plans/atlas/performance.md`): three sets of images the size of the screen,
 * and two copies a blur a frame. `sharedImages` draws the same picture for less, kept for the lower levels.
 */

import { WebGLRenderTarget } from 'three'

import { blurImages, createLayerBlur, freeBlurImages } from './screenBlur'

import type { BlurMethod, ScreenBlur } from './blurMethod'

/**
 * Whether a reach is drawn as a blur: any reach at all.
 * @param pixels - the reach, in CSS pixels
 * @returns `true` above nought
 */
function anyReach(pixels: number): boolean {
  return pixels > 0
}

/**
 * The standard method: each blur made with images of its own, freed with it.
 * @returns the method, which holds nothing across its blurs
 */
export function createSeparateImagesBlur(): BlurMethod {
  return {
    create(source, options): ScreenBlur {
      // The images at one texel until the first frame sizes them; the blur comes back into the capture.
      const capture = new WebGLRenderTarget(1, 1, { samples: 4 })
      const images = blurImages({ capture, spare: new WebGLRenderTarget(1, 1), result: capture })
      const blur = createLayerBlur(source, options, images, anyReach)
      return {
        ...blur,
        dispose(): void {
          blur.dispose()
          freeBlurImages(images)
        },
      }
    },
    dispose(): void {
      // Nothing held across the blurs: each frees its own images.
    },
  }
}
