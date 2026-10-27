/**
 * The icons' bench (ATLAS-156): the event icons alone on the parchment, under the lights they have on the map, on the atlas's dev
 * server at `/icons.html`, never built. Two rows: the icons large and facing the viewer, to judge their shapes from
 * the front, and small, about the size they will have on the map, turning so every face is seen. Every model that
 * moves, moves — the siege's trebuchet was chosen here among three frames, « C » (the dev, 2026-10-27).
 */

import { Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three'

import { createIconLights } from '../scene/events/icons/light/lighting'
import { createEventIcon } from '../scene/events/icons/meshes/eventIcons'
import { EVENT_MARKER_STYLE, createPinMarkers } from '../scene/events/pin'
import { svgToTexture } from '../scene/svgTexture'

import type { EventIconKind } from '../scene/events/icons/kinds'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')
if (canvas === null) throw new Error('[Atlas] icons bench: no #scene canvas')

const renderer = new WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
const scene = new Scene()
scene.background = new Color('#efe6d2')
const camera = new PerspectiveCamera(35, 1, 0.1, 100)
camera.position.set(0, 2.2, 4.2)
camera.lookAt(0, 0.35, 0)
// The lights stand in the camera's frame, as on the map.
const lights = createIconLights()
lights.quaternion.copy(camera.quaternion)
scene.add(lights)

const KINDS: EventIconKind[] = ['swords', 'tower', 'crown']
const icons = KINDS.map((kind, index) => {
  const large = createEventIcon(kind)
  large.object.position.set((index - 1) * 1.3, 0, 0)
  const small = createEventIcon(kind)
  small.object.scale.setScalar(0.25)
  small.object.position.set((index - 1) * 0.5, 0, 1.4)
  scene.add(large.object, small.object)
  return { large, small }
})

// The plain pin (ATLAS-298), behind the icons, as tall as they are: chosen here, « B » (the dev, 2026-10-27). One per
// colour the contribution offers an event type (`cms/src/fields/eventColours`).
const PIN_COLOURS = ['#e3170a', '#ff7a00', '#ffc300', '#1fa33a', '#1565e8', '#8a2be2', '#d4148a']
const pins = PIN_COLOURS.map((colour, index) => {
  const pin = createPinMarkers([{ ground: [0, 0, 0], colour }], svgToTexture).object
  pin.scale.setScalar(0.8 / EVENT_MARKER_STYLE.height)
  pin.position.set((index - (PIN_COLOURS.length - 1) / 2) * 0.55, 0.5, -1.6)
  scene.add(pin)
  return pin
})

/**
 * Fit the drawing buffer and the camera to the window.
 * @returns nothing
 */
function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

renderer.setAnimationLoop((time: number) => {
  // The small ones turn so every face is seen; the models that move, move, large and small.
  for (const { large, small } of icons) {
    small.object.rotation.y = time * 0.0004
    large.animate(time / 1000)
    small.animate(time / 1000)
  }
  // The pins turn slowly, so the light is seen running round the stem and the head.
  for (const pin of pins) pin.rotation.y = time * 0.0004
  renderer.render(scene, camera)
})
