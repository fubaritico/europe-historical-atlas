import { PerspectiveCamera, WebGLRenderTarget } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { blurRenderer, blurredLines, drawOnce } from '../testing/blurStandIn'

import { SHARED_BLUR_THRESHOLD, createSharedImagesBlur, sharedBlurShows } from './sharedImages'

import type { ShaderMaterial, Texture } from 'three'

// The lighter method (ATLAS-304, R1), dormant for the lower quality levels: what sets it apart from the standard. What
// both share is in `screenBlur.test.ts`.
describe('createSharedImagesBlur', () => {
  describe('happy path', () => {
    // The borders', the names' and the icons' blurs take turns in one set of images.
    it('lays every blur it makes from the one result', () => {
      const method = createSharedImagesBlur()
      const read = [blurredLines(method).blur, blurredLines(method).blur].map(
        (blur) => (blur.object.material as ShaderMaterial).uniforms.blurred?.value as Texture
      )
      expect(read).toEqual([method.images.result.texture, method.images.result.texture])
    })
  })

  describe('variants', () => {
    it('blurs across into the spare and down into the result, never back into the four-sample capture', () => {
      const method = createSharedImagesBlur()
      const { blur } = blurredLines(method)
      const camera = new PerspectiveCamera()
      const { renderer, asked } = blurRenderer(camera)
      blur.setRadius(1)
      drawOnce(blur, renderer, camera)
      const { capture, spare, result } = method.images
      expect(asked.targets).toEqual([capture, spare, result, 'the screen'])
    })

    it('captures with four samples, resolves its colour alone and throws its depth away', () => {
      const { capture, spare, result } = createSharedImagesBlur().images
      expect([
        capture.samples,
        capture.depthBuffer,
        capture.resolveDepthBuffer,
        capture.storeMultisampledDepthBuffer,
      ]).toEqual([4, true, false, false])
      expect([spare.samples, spare.depthBuffer, result.samples, result.depthBuffer]).toEqual([
        0,
        false,
        0,
        false,
      ])
    })

    it('sizes the capture and the spare with the result', () => {
      const method = createSharedImagesBlur()
      const { blur } = blurredLines(method)
      const camera = new PerspectiveCamera()
      blur.setRadius(1)
      drawOnce(blur, blurRenderer(camera).renderer, camera)
      const { capture, spare, result } = method.images
      expect([capture, spare, result].map(({ width, height }) => [width, height])).toEqual([
        [800, 600],
        [800, 600],
        [800, 600],
      ])
    })
  })

  describe('the threshold', () => {
    // A blur a tenth of a pixel wide costs as much as a wide one and shows nothing.
    it('draws a reach under a quarter of a CSS pixel crisp, its quad hidden', () => {
      const { lines, blur } = blurredLines(createSharedImagesBlur())
      expect(blur.setRadius(0.2)).toBe(false)
      expect([blur.object.visible, ...lines.map((line) => line.layers.isEnabled(0))]).toEqual([
        false,
        true,
        true,
      ])
    })

    it('blurs from a quarter of a CSS pixel up', () => {
      const { blur } = blurredLines(createSharedImagesBlur())
      expect(blur.setRadius(SHARED_BLUR_THRESHOLD)).toBe(true)
      expect(blur.object.visible).toBe(true)
    })

    it('says which reaches are drawn as a blur', () => {
      expect([0, 0.2, 0.25, 1].map(sharedBlurShows)).toEqual([false, false, true, true])
    })
  })

  // L3: N/A — nothing is refused; a reach under the threshold draws the lines crisp.
  // L4: N/A — the GPU work is three's, judged on the map; jsdom has no WebGL.

  describe('edge cases', () => {
    it('leaves the shared images to the method when a blur is freed', () => {
      const { blur } = blurredLines(createSharedImagesBlur())
      const images = vi.spyOn(WebGLRenderTarget.prototype, 'dispose')
      const geometry = vi.spyOn(blur.object.geometry, 'dispose')
      const material = vi.spyOn(blur.object.material as ShaderMaterial, 'dispose')
      blur.dispose()
      expect([
        images.mock.calls.length,
        geometry.mock.calls.length,
        material.mock.calls.length,
      ]).toEqual([0, 1, 1])
      images.mockRestore()
    })

    it('frees its three images, its material and its pass with the method', () => {
      const method = createSharedImagesBlur()
      const images = vi.spyOn(WebGLRenderTarget.prototype, 'dispose')
      const material = vi.spyOn(method.images.material, 'dispose')
      const pass = vi.spyOn(method.images.pass, 'dispose')
      method.dispose()
      expect([
        images.mock.calls.length,
        material.mock.calls.length,
        pass.mock.calls.length,
      ]).toEqual([3, 1, 1])
      images.mockRestore()
    })

    it('keeps the images’ size while the drawing buffer keeps its own', () => {
      const { blur } = blurredLines(createSharedImagesBlur())
      const camera = new PerspectiveCamera()
      const { renderer } = blurRenderer(camera)
      blur.setRadius(1)
      drawOnce(blur, renderer, camera)
      const resize = vi.spyOn(WebGLRenderTarget.prototype, 'setSize')
      drawOnce(blur, renderer, camera)
      expect(resize).not.toHaveBeenCalled()
      resize.mockRestore()
    })
  })
})
