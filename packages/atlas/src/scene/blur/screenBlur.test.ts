import { Color, Group, MultiplyBlending, NormalBlending, PerspectiveCamera, Scene } from 'three'
import { describe, expect, it } from 'vitest'

import { BLUR_LAYER, blurRenderer, blurredLines, drawOnce } from '../testing/blurStandIn'

import { createSeparateImagesBlur } from './separateImages'
import { createSharedImagesBlur } from './sharedImages'

import type { BlurMethod } from './blurMethod'
import type { ShaderMaterial, Texture } from 'three'

// What both methods draw with (ATLAS-302, ATLAS-304): each case makes a fresh method, so the lighter one's shared
// images never carry one case into the next.
const METHODS: [string, () => BlurMethod][] = [
  ['separate images, the standard', createSeparateImagesBlur],
  ['shared images', createSharedImagesBlur],
]

describe.each(METHODS)('a screen blur, %s', (_name, make) => {
  describe('happy path', () => {
    it('lays its quad over the screen at the borders’ rank, under nothing nearer, hidden until a radius is set', () => {
      const { blur } = blurredLines(make())
      const material = blur.object.material as ShaderMaterial
      expect([blur.object.renderOrder, blur.object.frustumCulled, blur.object.visible]).toEqual([
        10,
        false,
        false,
      ])
      expect([material.depthTest, material.transparent, material.premultipliedAlpha]).toEqual([
        false,
        true,
        true,
      ])
    })

    it('moves the lines to its layer once on, so the camera draws them only through the blur, and back once off', () => {
      const { lines, blur } = blurredLines(make())
      expect(blur.setRadius(1)).toBe(true)
      expect(lines.map((line) => line.layers.isEnabled(BLUR_LAYER))).toEqual([true, true])
      expect([blur.object.visible, blur.object.layers.isEnabled(0)]).toEqual([true, true])
      expect(blur.setRadius(0)).toBe(false)
      expect(lines.map((line) => line.layers.isEnabled(0))).toEqual([true, true])
      expect(blur.object.visible).toBe(false)
    })
  })

  describe('variants', () => {
    it('draws the borders alone, the camera turned to their layer, then blurs them across and down', () => {
      const { group, blur } = blurredLines(make())
      const camera = new PerspectiveCamera()
      const { renderer, asked } = blurRenderer(camera)
      blur.setRadius(1)
      drawOnce(blur, renderer, camera)
      // The borders first, on their layer only; then the blur's two passes, which three draws with its own camera.
      expect(asked.rendered[0]).toBe(group)
      expect(asked.masks[0]).toBe(1 << BLUR_LAYER)
      expect(asked.rendered).toHaveLength(3)
    })

    it('hands three back the camera’s layers, the screen and its clear colour', () => {
      const { blur } = blurredLines(make())
      const camera = new PerspectiveCamera()
      const { renderer, asked } = blurRenderer(camera)
      blur.setRadius(1)
      drawOnce(blur, renderer, camera)
      expect(camera.layers.mask).toBe(1)
      expect(asked.targets.at(-1)).toBe('the screen')
      expect(asked.clears).toEqual([
        [0x000000, 0],
        [0xffffff, 1],
      ])
    })

    it('lays a multiplying blur back in multiply, a plain one over the map', () => {
      const method = make()
      const group = new Group()
      const multiply = method.create(group, {
        layer: BLUR_LAYER,
        renderOrder: 21,
        blend: 'multiply',
      })
      const normal = method.create(group, { layer: BLUR_LAYER, renderOrder: 10, blend: 'normal' })
      expect([
        (multiply.object.material as ShaderMaterial).blending,
        (normal.object.material as ShaderMaterial).blending,
      ]).toEqual([MultiplyBlending, NormalBlending])
    })
  })

  describe('the blur itself', () => {
    it('blurs across then down by the radius in device pixels, over the buffer’s size', () => {
      const { blur } = blurredLines(make())
      const camera = new PerspectiveCamera()
      const { renderer } = blurRenderer(camera)
      const steps: [number, number][] = []
      const render = renderer.render.bind(renderer)
      renderer.render = (object, eye) => {
        // Read during each pass: the two passes share one uniform. The borders' group carries no material.
        const { material } = object as { material?: ShaderMaterial }
        const step = material?.uniforms.step?.value as { x: number; y: number } | undefined
        if (step !== undefined) steps.push([step.x, step.y])
        render(object, eye)
      }
      blur.setRadius(1.5)
      drawOnce(blur, renderer, camera)
      // 1.5 CSS pixels at a pixel ratio of 2 are 3 device pixels, over 800 across and 600 down.
      expect(steps).toEqual([
        [3 / 800, 0],
        [0, 3 / 600],
      ])
    })

    it('sizes the image its quad reads to the drawing buffer', () => {
      const { blur } = blurredLines(make())
      const camera = new PerspectiveCamera()
      blur.setRadius(1)
      drawOnce(blur, blurRenderer(camera).renderer, camera)
      const image = ((blur.object.material as ShaderMaterial).uniforms.blurred?.value as Texture)
        .image as { width: number; height: number }
      expect([image.width, image.height]).toEqual([800, 600])
    })
  })

  describe('the whole scene', () => {
    // ATLAS-302: the 3D icons are lit by lights held elsewhere in the scene.
    it('draws the scene it is drawn in, its background left out for that render and given back', () => {
      const scene = new Scene()
      const background = new Color(0xefe6d2)
      scene.background = background
      const blur = make().create(new Group(), {
        layer: BLUR_LAYER,
        renderOrder: 1000,
        blend: 'normal',
        wholeScene: true,
      })
      const camera = new PerspectiveCamera()
      const { renderer, asked } = blurRenderer(camera)
      const seen: unknown[] = []
      const render = renderer.render.bind(renderer)
      renderer.render = (object, eye) => {
        seen.push((object as Scene).background)
        render(object, eye)
      }
      blur.setRadius(1)
      drawOnce(blur, renderer, camera, scene)
      expect([asked.rendered[0], seen[0], scene.background]).toEqual([scene, null, background])
    })
  })

  // L3: N/A — nothing is refused; a radius of nought draws the lines crisp.
  // L4: N/A — the GPU work is three's, judged on the map; jsdom has no WebGL.
  // L5: in each method's own suite — what its images are, and how they are freed.
})
