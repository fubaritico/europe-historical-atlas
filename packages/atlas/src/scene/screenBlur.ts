/**
 * A light blur over one layer of the map (ATLAS-302): the borders' brown, cream and brown melting a little into one
 * another and into the colours beside them, no thicker, and the countries' names close up — the dev, 2026-10-29:
 * *« un léger flou sur toutes les frontières en mode zoomé d'abord »*, then *« applique le même flou sur les noms »*.
 *
 * **An image blur, not a softened stroke**: the layer's objects alone are drawn into an image the size of the screen,
 * blurred across then down, and laid back where they were — a quad over the whole screen, drawn at their rank, so what
 * lies under them stays under and what is drawn after stays crisp. It all happens as three is about to draw that quad
 * (`onBeforeRender`, the hook three's own `Reflector` renders from), so the render loop knows nothing of it.
 *
 * **Kept off the main drawing by a layer**, not by hiding them: while the blur is on, the objects blurred are on a
 * layer of their own, which the camera does not see; the image is drawn with the camera turned to it for that one
 * render. Their visibility stays whatever fades them.
 *
 * **Two ways to lay it back**: `normal`, the image laid over the map (the borders); `multiply`, the image's colour
 * multiplied into the map as the names' ink is — the objects drawn into the image with the ordinary blend, so their
 * colour and their coverage are kept, then laid as `colour × coverage + (1 − coverage)`, the factor three's multiply
 * leaves (`WebGLState.js`, `MultiplyBlending`).
 */

import {
  Color,
  Mesh,
  MultiplyBlending,
  NoBlending,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three'
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

import type { Camera, Object3D, Scene, Texture, WebGLRenderer } from 'three'

/**
 * How far the outer samples of the blur reach, in steps: the classic five-sample Gaussian read between texels
 * (offsets 1.38 and 3.23, weights 0.227, 0.316, 0.070), scaled so that reach is the radius asked for.
 */
const OUTER_OFFSET = 3.2307692308

/** One direction of the blur: the source read at five places along `step`. */
const BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D source;
uniform vec2 step;
varying vec2 vUv;
void main() {
  vec2 near = step * (1.3846153846 / ${String(OUTER_OFFSET)});
  vec4 sum = texture2D(source, vUv) * 0.2270270270;
  sum += (texture2D(source, vUv + near) + texture2D(source, vUv - near)) * 0.3162162162;
  sum += (texture2D(source, vUv + step) + texture2D(source, vUv - step)) * 0.0702702703;
  gl_FragColor = sum;
}
`

/** The blur's vertex shader: the full-screen quad as three's postprocessing draws it. */
const BLUR_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/** The quad laid over the screen: its corners straight to clip space, whatever the camera. */
const LAY_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * The blurred image laid over the map. It holds premultiplied colour in the working space; it is taken back to plain
 * colour, through the output's colour space, and premultiplied again — the order three's own materials keep.
 */
const LAY_FRAGMENT = /* glsl */ `
uniform sampler2D blurred;
varying vec2 vUv;
void main() {
  vec4 colour = texture2D(blurred, vUv);
  if (colour.a <= 0.0) discard;
  gl_FragColor = vec4(colour.rgb / colour.a, colour.a);
  #include <colorspace_fragment>
  gl_FragColor.rgb *= gl_FragColor.a;
}
`

/**
 * The blurred image multiplied into the map: its colour through the output's colour space, mixed toward white as its
 * coverage falls — the factor the names' ink multiplies the map by.
 */
const MULTIPLY_FRAGMENT = /* glsl */ `
uniform sampler2D blurred;
varying vec2 vUv;
void main() {
  vec4 colour = texture2D(blurred, vUv);
  if (colour.a <= 0.0) discard;
  gl_FragColor = vec4(colour.rgb / colour.a, 1.0);
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * colour.a + (1.0 - colour.a), 1.0);
}
`

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
   * How much to blur, in CSS pixels: `0` draws the objects as they are, crisp, and hides the quad.
   * @param pixels - the blur's reach
   */
  setRadius: (pixels: number) => void
  /** Free the images, the materials and the quad. */
  dispose: () => void
}

/**
 * Every object under a source, the quad excepted.
 * @param source - the source
 * @param quad - the quad, left on the layer the camera sees
 * @returns the objects
 */
function everyBut(source: Object3D, quad: Mesh): Object3D[] {
  const members: Object3D[] = []
  source.traverse((child) => {
    if (child !== quad) members.push(child)
  })
  return members
}

/** The images and the pass the blur draws with, kept for the layer's life. */
interface BlurImages {
  /** The layer's objects drawn alone, with as many samples as the screen's own smoothing; the blurred result ends here. */
  readonly capture: WebGLRenderTarget
  /** The image between the two directions of the blur. */
  readonly spare: WebGLRenderTarget
  /** The blur's material. */
  readonly material: ShaderMaterial
  /** The full-screen pass that draws it. */
  readonly pass: FullScreenQuad
  /** The image the blur reads. */
  readonly read: { value: Texture | null }
  /** Its outer samples' reach, in texture coordinates. */
  readonly reach: { value: Vector2 }
}

/**
 * The images and the pass the blur draws with.
 * @returns them, the images at one texel until the first frame sizes them
 */
function blurImages(): BlurImages {
  const read: { value: Texture | null } = { value: null }
  const reach: { value: Vector2 } = { value: new Vector2() }
  const material = new ShaderMaterial({
    uniforms: { source: read, step: reach },
    vertexShader: BLUR_VERTEX,
    fragmentShader: BLUR_FRAGMENT,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
  })
  return {
    capture: new WebGLRenderTarget(1, 1, { samples: 4 }),
    spare: new WebGLRenderTarget(1, 1),
    material,
    pass: new FullScreenQuad(material),
    read,
    reach,
  }
}

/**
 * Run one direction of the blur from an image into another.
 * @param renderer - the renderer
 * @param images - the blur's images and pass
 * @param route - the image read and the image written
 * @param route.from - the image read
 * @param route.to - the image written
 * @param step - the outer samples' reach, in texture coordinates
 */
function blurPass(
  renderer: WebGLRenderer,
  images: BlurImages,
  route: { readonly from: WebGLRenderTarget; readonly to: WebGLRenderTarget },
  step: Vector2
): void {
  images.read.value = route.from.texture
  images.reach.value.copy(step)
  renderer.setRenderTarget(route.to)
  images.pass.render(renderer)
}

/**
 * Draw the layer alone into the capture, blurred — then hand three back the target and the clear colour it was
 * drawing the map with.
 * @param renderer - the renderer, mid-way through drawing the map
 * @param camera - the map's camera, turned to the blur's layer for this one render
 * @param source - the objects' root
 * @param images - the blur's images and pass
 * @param reach - the blur's layer, and its reach in CSS pixels
 * @param reach.layer - the layer
 * @param reach.radius - the reach
 */
function drawBlurred(
  renderer: WebGLRenderer,
  camera: Camera,
  source: Object3D,
  images: BlurImages,
  reach: { readonly layer: number; readonly radius: number }
): void {
  const { capture, spare } = images
  // The images follow the drawing buffer's size, device pixels included.
  const size = renderer.getDrawingBufferSize(new Vector2())
  if (capture.width !== size.x || capture.height !== size.y) {
    capture.setSize(size.x, size.y)
    spare.setSize(size.x, size.y)
  }
  const target = renderer.getRenderTarget()
  const clearColor = renderer.getClearColor(new Color())
  const clearAlpha = renderer.getClearAlpha()
  // 1. The layer alone, on a clear transparent image, the camera turned to it for this one render.
  renderer.setClearColor(0x000000, 0)
  renderer.setRenderTarget(capture)
  renderer.clear()
  const seen = camera.layers.mask
  camera.layers.set(reach.layer)
  renderer.render(source, camera)
  camera.layers.mask = seen
  // 2. Blurred across, then down, back into the capture — which the quad reads.
  const pixels = reach.radius * renderer.getPixelRatio()
  blurPass(renderer, images, { from: capture, to: spare }, new Vector2(pixels / size.x, 0))
  blurPass(renderer, images, { from: spare, to: capture }, new Vector2(0, pixels / size.y))
  // 3. Back to where three was drawing the map.
  renderer.setRenderTarget(target)
  renderer.setClearColor(clearColor, clearAlpha)
}

/**
 * The quad that lays the blurred image over the screen, at the objects' rank.
 * @param blurred - the blurred image
 * @param renderOrder - the objects' rank
 * @param blend - over the map, or multiplied into it
 * @returns the quad, hidden until the blur is on
 */
function layQuad(
  blurred: Texture,
  renderOrder: number,
  blend: ScreenBlurOptions['blend']
): Mesh<PlaneGeometry, ShaderMaterial> {
  const quad = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      uniforms: { blurred: { value: blurred } },
      vertexShader: LAY_VERTEX,
      fragmentShader: blend === 'multiply' ? MULTIPLY_FRAGMENT : LAY_FRAGMENT,
      transparent: true,
      premultipliedAlpha: true,
      blending: blend === 'multiply' ? MultiplyBlending : NormalBlending,
      depthTest: false,
      depthWrite: false,
    })
  )
  quad.frustumCulled = false
  quad.renderOrder = renderOrder
  quad.visible = false
  return quad
}

/**
 * Build a layer's blur, off until a radius is set.
 * @param source - the root of the objects blurred, drawn into the image each frame the blur is on
 * @param options - the blur's layer, its rank, how it is laid back, and which objects it blurs
 * @returns the blur
 */
export function createScreenBlur(source: Object3D, options: ScreenBlurOptions): ScreenBlur {
  const images = blurImages()
  const quad = layQuad(images.capture.texture, options.renderOrder, options.blend)
  const members = options.members ?? ((): Object3D[] => everyBut(source, quad))
  let radius = 0
  quad.onBeforeRender = (renderer: WebGLRenderer, scene: Object3D, camera: Camera): void => {
    if (options.wholeScene !== true) {
      drawBlurred(renderer, camera, source, images, { layer: options.layer, radius })
      return
    }
    // The scene's background would fill the image the blur needs clear: left out for this one render.
    const held = scene as Scene
    const background = held.background
    held.background = null
    drawBlurred(renderer, camera, scene, images, { layer: options.layer, radius })
    held.background = background
  }
  return {
    object: quad,
    setRadius(pixels: number): void {
      const on = pixels > 0
      if (on !== quad.visible)
        for (const member of members()) member.layers.set(on ? options.layer : 0)
      quad.visible = on
      radius = pixels
    },
    dispose(): void {
      images.capture.dispose()
      images.spare.dispose()
      images.material.dispose()
      images.pass.dispose()
      quad.geometry.dispose()
      quad.material.dispose()
    },
  }
}
