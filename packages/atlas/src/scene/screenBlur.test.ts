import {
  Color,
  Group,
  Mesh,
  MultiplyBlending,
  NormalBlending,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createScreenBlur } from './screenBlur'

import type { ShaderMaterial, Texture, WebGLRenderer } from 'three'

/** The layer the tests blur on. */
const BLUR_LAYER = 5

/**
 * Borders of two lines in a group, and their blur beside them in it.
 * @returns the group, its lines and the blur
 */
function blurred(): {
  group: Group
  lines: Mesh[]
  blur: ReturnType<typeof createScreenBlur>
} {
  const group = new Group()
  const lines = [new Mesh(), new Mesh()]
  group.add(...lines)
  const blur = createScreenBlur(group, { layer: BLUR_LAYER, renderOrder: 10, blend: 'normal' })
  group.add(blur.object)
  return { group, lines, blur }
}

/** What the stand-in renderer was asked, in order. */
interface Asked {
  /** The camera's layer mask at each render. */
  readonly masks: number[]
  /** The objects rendered. */
  readonly rendered: object[]
  /** The targets set, in order. */
  readonly targets: unknown[]
  /** The clear colours set: hex and alpha. */
  readonly clears: [number, number][]
}

/**
 * A renderer stand-in mid-way through drawing the map to the screen: an 800 × 600 buffer at a pixel ratio of 2, a white
 * opaque clear.
 * @param camera - the camera, whose layers each render is read with
 * @returns the stand-in and what it was asked
 */
function renderer(camera: PerspectiveCamera): { renderer: WebGLRenderer; asked: Asked } {
  const asked: Asked = { masks: [], rendered: [], targets: [], clears: [] }
  const stand = {
    getDrawingBufferSize: (target: Vector2) => target.set(800, 600),
    getRenderTarget: () => 'the screen',
    getClearColor: (target: Color) => target.set(0xffffff),
    getClearAlpha: () => 1,
    getPixelRatio: () => 2,
    setClearColor: (colour: Color | number, alpha: number) => {
      asked.clears.push([typeof colour === 'number' ? colour : colour.getHex(), alpha])
    },
    setRenderTarget: (target: unknown) => {
      asked.targets.push(target)
    },
    clear: vi.fn(),
    render: (object: object) => {
      asked.masks.push(camera.layers.mask)
      asked.rendered.push(object)
    },
  }
  return { renderer: stand as unknown as WebGLRenderer, asked }
}

describe('createScreenBlur', () => {
  describe('happy path', () => {
    it('lays its quad over the screen at the borders’ rank, under nothing nearer, hidden until a radius is set', () => {
      const { blur } = blurred()
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
      const { lines, blur } = blurred()
      blur.setRadius(1)
      expect(lines.map((line) => line.layers.isEnabled(BLUR_LAYER))).toEqual([true, true])
      expect([blur.object.visible, blur.object.layers.isEnabled(0)]).toEqual([true, true])
      blur.setRadius(0)
      expect(lines.map((line) => line.layers.isEnabled(0))).toEqual([true, true])
      expect(blur.object.visible).toBe(false)
    })
  })

  describe('variants', () => {
    it('draws the borders alone, the camera turned to their layer, then blurs them across and down', () => {
      const { group, blur } = blurred()
      const camera = new PerspectiveCamera()
      const { renderer: stand, asked } = renderer(camera)
      blur.setRadius(1)
      blur.object.onBeforeRender(
        stand,
        new Scene(),
        camera,
        blur.object.geometry,
        blur.object.material as ShaderMaterial,
        new Group()
      )
      // The borders first, on their layer only; then the blur's two passes, which three draws with its own camera.
      expect(asked.rendered[0]).toBe(group)
      expect(asked.masks[0]).toBe(1 << BLUR_LAYER)
      expect(asked.rendered).toHaveLength(3)
    })

    it('hands three back the camera’s layers, the screen and its clear colour', () => {
      const { blur } = blurred()
      const camera = new PerspectiveCamera()
      const { renderer: stand, asked } = renderer(camera)
      blur.setRadius(1)
      blur.object.onBeforeRender(
        stand,
        new Scene(),
        camera,
        blur.object.geometry,
        blur.object.material as ShaderMaterial,
        new Group()
      )
      expect(camera.layers.mask).toBe(1)
      expect(asked.targets.at(-1)).toBe('the screen')
      expect(asked.clears).toEqual([
        [0x000000, 0],
        [0xffffff, 1],
      ])
    })
  })

  describe('the blur itself', () => {
    it('blurs across then down by the radius in device pixels, over the buffer’s size', () => {
      const { blur } = blurred()
      const camera = new PerspectiveCamera()
      const { renderer: stand } = renderer(camera)
      const steps: [number, number][] = []
      const render = stand.render.bind(stand)
      stand.render = (object, eye) => {
        // Read during each pass: the two passes share one uniform.
        // The borders' group carries no material: only the two passes' quads do.
        const { material } = object as { material?: ShaderMaterial }
        const step = material?.uniforms.step?.value as Vector2 | undefined
        if (step !== undefined) steps.push([step.x, step.y])
        render(object, eye)
      }
      blur.setRadius(1.5)
      blur.object.onBeforeRender(
        stand,
        new Scene(),
        camera,
        blur.object.geometry,
        blur.object.material as ShaderMaterial,
        new Group()
      )
      // 1.5 CSS pixels at a pixel ratio of 2 are 3 device pixels, over 800 across and 600 down.
      expect(steps).toEqual([
        [3 / 800, 0],
        [0, 3 / 600],
      ])
    })

    it('sizes its images to the drawing buffer', () => {
      const { blur } = blurred()
      const camera = new PerspectiveCamera()
      const { renderer: stand } = renderer(camera)
      blur.setRadius(1)
      blur.object.onBeforeRender(
        stand,
        new Scene(),
        camera,
        blur.object.geometry,
        blur.object.material as ShaderMaterial,
        new Group()
      )
      const image = ((blur.object.material as ShaderMaterial).uniforms.blurred?.value as Texture)
        .image as {
        width: number
        height: number
      }
      expect([image.width, image.height]).toEqual([800, 600])
    })

    it('lays a multiplying blur back in multiply, a plain one over the map', () => {
      const group = new Group()
      const multiply = createScreenBlur(group, {
        layer: BLUR_LAYER,
        renderOrder: 21,
        blend: 'multiply',
      })
      const normal = createScreenBlur(group, {
        layer: BLUR_LAYER,
        renderOrder: 10,
        blend: 'normal',
      })
      expect([
        (multiply.object.material as ShaderMaterial).blending,
        (normal.object.material as ShaderMaterial).blending,
      ]).toEqual([MultiplyBlending, NormalBlending])
    })
  })

  describe('the whole scene', () => {
    // ATLAS-302: the 3D icons are lit by lights held elsewhere in the scene.
    it('draws the scene it is drawn in, its background left out for that render and given back', () => {
      const scene = new Scene()
      const background = new Color(0xefe6d2)
      scene.background = background
      const source = new Group()
      const blur = createScreenBlur(source, {
        layer: BLUR_LAYER,
        renderOrder: 1000,
        blend: 'normal',
        wholeScene: true,
      })
      const camera = new PerspectiveCamera()
      const { renderer: stand, asked } = renderer(camera)
      const seen: unknown[] = []
      const render = stand.render.bind(stand)
      stand.render = (object, eye) => {
        seen.push((object as Scene).background)
        render(object, eye)
      }
      blur.setRadius(1)
      blur.object.onBeforeRender(
        stand,
        scene,
        camera,
        blur.object.geometry,
        blur.object.material as ShaderMaterial,
        new Group()
      )
      expect([asked.rendered[0], seen[0], scene.background]).toEqual([scene, null, background])
    })
  })

  // L3: N/A — nothing is refused; a radius of nought draws the lines crisp.
  // L4: N/A — the GPU work is three's, judged on the map; jsdom has no WebGL.

  describe('edge cases', () => {
    it('frees its two images, its materials and its quad', () => {
      const { blur } = blurred()
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
  })
})
