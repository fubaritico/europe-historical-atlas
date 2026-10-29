/**
 * What the blur's tests share (`../blur/`): a renderer stand-in that records what a blur asks of it, two lines and
 * their blur, and the one draw three makes just before the blur's quad. One copy, so the suites of the two methods and
 * of what they share read the same stand-in.
 */

import { Group, Mesh, Scene } from 'three'
import { vi } from 'vitest'

import type { BlurMethod, ScreenBlur } from '../blur/blurMethod'
import type { Color, PerspectiveCamera, ShaderMaterial, Vector2, WebGLRenderer } from 'three'

/** The layer the blur's tests blur on. */
export const BLUR_LAYER = 5

/** What the stand-in renderer was asked, in order. */
export interface Asked {
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
export function blurRenderer(camera: PerspectiveCamera): { renderer: WebGLRenderer; asked: Asked } {
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

/**
 * Borders of two lines in a group, and their blur beside them in it.
 * @param method - the method the blur is made by
 * @returns the group, its lines and the blur
 */
export function blurredLines(method: BlurMethod): {
  group: Group
  lines: Mesh[]
  blur: ScreenBlur
} {
  const group = new Group()
  const lines = [new Mesh(), new Mesh()]
  group.add(...lines)
  const blur = method.create(group, { layer: BLUR_LAYER, renderOrder: 10, blend: 'normal' })
  group.add(blur.object)
  return { group, lines, blur }
}

/**
 * Let a blur draw itself once, as three does just before its quad.
 * @param blur - the blur
 * @param renderer - the renderer stand-in
 * @param camera - the camera
 * @param scene - the scene the quad is drawn in
 */
export function drawOnce(
  blur: ScreenBlur,
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
  scene: Scene = new Scene()
): void {
  blur.object.onBeforeRender(
    renderer,
    scene,
    camera,
    blur.object.geometry,
    blur.object.material as ShaderMaterial,
    new Group()
  )
}
