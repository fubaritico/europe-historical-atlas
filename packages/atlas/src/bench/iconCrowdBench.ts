/**
 * The icons' crowd bench (ATLAS-289): a hundred event icons on the parchment, as the map draws them, and what they
 * cost — the draw calls of a frame and its time — on the atlas's dev server at `/icons-crowd.html`, never built.
 * `?n=1000` sets how many; `?zoom=0` shows them from afar, as their flat drawings.
 */

import { Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three'

import { createEventIconMarkers } from '../scene/events/icons/eventIconMarkers'
import { svgToTexture } from '../scene/svgTexture'

import type { EventIconKind } from '../scene/events/icons/kinds'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')
const count = document.querySelector<HTMLElement>('#count')
if (canvas === null || count === null)
  throw new Error('[Atlas] icon crowd bench: no #scene or #count')

// How many icons, and whether they are seen close up (3D) or from afar (flat), from the address.
const params = new URLSearchParams(window.location.search)
const n = Number(params.get('n') ?? 100)
const zoom = Number(params.get('zoom') ?? 1)

const renderer = new WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
const scene = new Scene()
scene.background = new Color('#efe6d2')
const camera = new PerspectiveCamera(35, 1, 0.01, 100)
camera.position.set(0, 1.6, 2.4)
camera.lookAt(0, 0, 0)

// The icons on a square grid, the three kinds in turn, at the map's own icon height.
const KINDS: EventIconKind[] = ['swords', 'tower', 'crown']
const side = Math.ceil(Math.sqrt(n))
const placed = Array.from({ length: n }, (_, i) => ({
  ground: [((i % side) / side - 0.5) * 2, 0, (Math.floor(i / side) / side - 0.5) * 2] as [
    number,
    number,
    number,
  ],
  kind: KINDS[i % KINDS.length] ?? 'swords',
}))
const markers = createEventIconMarkers(placed, svgToTexture)
scene.add(markers.object)
markers.setZoom(zoom, 400)

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

// Each frame: the camera circles slowly, the icons face it and sway, and the frame's cost is shown.
const eye = new Vector3()
let last = performance.now()
renderer.setAnimationLoop((time: number) => {
  eye.set(Math.sin(time * 0.0001) * 2.4, 1.6, Math.cos(time * 0.0001) * 2.4)
  camera.position.copy(eye)
  camera.lookAt(0, 0, 0)
  markers.faceCamera(camera, time / 1000)
  renderer.render(scene, camera)
  const frameMs = time - last
  last = time
  count.textContent = `${String(n)} icons · ${String(renderer.info.render.calls)} draw calls · ${frameMs.toFixed(1)} ms`
})
