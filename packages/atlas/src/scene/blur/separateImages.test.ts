import { PerspectiveCamera, ShaderMaterial, WebGLRenderTarget } from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'
import { describe, expect, it, vi } from 'vitest'

import { BLUR_LAYER, blurRenderer, blurredLines, drawOnce } from '../testing/blurStandIn'

import { createSeparateImagesBlur } from './separateImages'

import type { Texture } from 'three'

// The standard method (ATLAS-302, the very high quality level of ATLAS-304): what sets it apart from the lighter one,
// which shares its images and has a threshold. What both share is in `screenBlur.test.ts`.
describe('createSeparateImagesBlur', () => {
  describe('happy path', () => {
    it('gives each blur images of its own', () => {
      const method = createSeparateImagesBlur()
      const read = [blurredLines(method).blur, blurredLines(method).blur].map(
        (blur) => (blur.object.material as ShaderMaterial).uniforms.blurred?.value as Texture
      )
      expect(read[0]).not.toBe(read[1])
    })
  })

  describe('variants', () => {
    it('blurs any reach above nought, a tenth of a pixel included', () => {
      const { lines, blur } = blurredLines(createSeparateImagesBlur())
      expect(blur.setRadius(0.1)).toBe(true)
      expect([
        blur.object.visible,
        lines.every((line) => line.layers.isEnabled(BLUR_LAYER)),
      ]).toEqual([true, true])
    })

    it('blurs across into its spare and down back into its capture, which its quad reads', () => {
      const { blur } = blurredLines(createSeparateImagesBlur())
      const camera = new PerspectiveCamera()
      const { renderer, asked } = blurRenderer(camera)
      blur.setRadius(1)
      drawOnce(blur, renderer, camera)
      const [capture, spare, back, screen] = asked.targets as [
        WebGLRenderTarget,
        WebGLRenderTarget,
        WebGLRenderTarget,
        string,
      ]
      const read = (blur.object.material as ShaderMaterial).uniforms.blurred?.value as Texture
      expect([back === capture, spare === capture, read === capture.texture, screen]).toEqual([
        true,
        false,
        true,
        'the screen',
      ])
    })

    it('captures with four samples, its depth kept and resolved as three does by default', () => {
      const { blur } = blurredLines(createSeparateImagesBlur())
      const camera = new PerspectiveCamera()
      const { renderer, asked } = blurRenderer(camera)
      blur.setRadius(1)
      drawOnce(blur, renderer, camera)
      const capture = asked.targets[0] as WebGLRenderTarget
      expect([
        capture.samples,
        capture.depthBuffer,
        capture.resolveDepthBuffer,
        capture.storeMultisampledDepthBuffer,
      ]).toEqual([4, true, true, true])
    })
  })

  // L3: N/A — nothing is refused; a radius of nought draws the lines crisp.
  // L4: N/A — the GPU work is three's, judged on the map; jsdom has no WebGL.

  describe('edge cases', () => {
    it('frees its two images, its materials and its quad', () => {
      const { blur } = blurredLines(createSeparateImagesBlur())
      const images = vi.spyOn(WebGLRenderTarget.prototype, 'dispose')
      const geometry = vi.spyOn(blur.object.geometry, 'dispose')
      const material = vi.spyOn(blur.object.material as ShaderMaterial, 'dispose')
      blur.dispose()
      expect([
        images.mock.calls.length,
        geometry.mock.calls.length,
        material.mock.calls.length,
      ]).toEqual([2, 1, 1])
      images.mockRestore()
    })

    it('frees its blur material and its pass with its images', () => {
      const { blur } = blurredLines(createSeparateImagesBlur())
      const materials = vi.spyOn(ShaderMaterial.prototype, 'dispose')
      const passes = vi.spyOn(FullScreenQuad.prototype, 'dispose')
      blur.dispose()
      // Two materials: the quad's and the blur pass's.
      expect([materials.mock.calls.length, passes.mock.calls.length]).toEqual([2, 1])
      materials.mockRestore()
      passes.mockRestore()
    })

    it('holds nothing across its blurs', () => {
      const method = createSeparateImagesBlur()
      blurredLines(method)
      const images = vi.spyOn(WebGLRenderTarget.prototype, 'dispose')
      method.dispose()
      expect(images).not.toHaveBeenCalled()
      images.mockRestore()
    })
  })
})
