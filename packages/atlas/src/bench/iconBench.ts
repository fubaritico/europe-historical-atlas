/**
 * The icons' bench (ATLAS-156): the event icons alone on the parchment, under the lights they have on the map, on the atlas's dev
 * server at `/icons.html`, never built. Two rows: the icons large and facing the viewer, to judge their shapes from
 * the front, and small, about the size they will have on the map, turning so every face is seen. Every model that
 * moves, moves — the siege's trebuchet was chosen here among three frames, « C » (the dev, 2026-10-27). At
 * `/icons.html?crowns`, the crown's candidates in place of the kinds (ATLAS-287); at `/icons.html?cathedral`, the
 * cathedral's, at `/icons.html?tomb`, the grave's (ATLAS-288), at `/icons.html?council`, the council's (ATLAS-476).
 * The conquest's oriflamme, chosen here among five, « A » (the dev, 2026-11-20), stands with the kinds, its cloth
 * floating (ATLAS-477).
 */

import { Box3, Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three'

import { createIconLights } from '../scene/events/icons/light/lighting'
import { createEventIcon, iconOf } from '../scene/events/icons/meshes/eventIcons'
import { buildModel } from '../scene/events/icons/meshes/iconModel'
import { EVENT_ICON_PALETTE } from '../scene/events/icons/palette'
import { EVENT_MARKER_STYLE, createPinMarkers } from '../scene/events/pin'
import { svgToTexture } from '../scene/svgTexture'

import { CATHEDRAL_CANDIDATES } from './cathedralCandidates'
import { COUNCIL_CANDIDATES } from './councilCandidates'
import { CROWN_CANDIDATES } from './crownCandidates'
import { TOMB_CANDIDATES } from './tombCandidates'

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

// `?crowns`: the crown's candidates alone, left to right in their letters' order (ATLAS-287); `?cathedral`: the
// cathedral's, `?tomb`: the grave's (ATLAS-288), `?council`: the council's (ATLAS-476) — else the map's kinds. One
// flag at a time: asked together, the first of this list wins.
const asked = new URLSearchParams(window.location.search)
const cathedral = asked.has('cathedral')
const tomb = asked.has('tomb')
const candidates = asked.has('crowns')
  ? CROWN_CANDIDATES
  : asked.has('council')
    ? COUNCIL_CANDIDATES
    : cathedral
      ? CATHEDRAL_CANDIDATES
      : tomb
        ? TOMB_CANDIDATES
        : null
// The candidates are shown at one width.
const crowns = candidates !== null
/** How wide a candidate is shown, large: a crown one unit, the cathedral — alone, and long — more than two. */
const CANDIDATE_WIDTH = cathedral ? 2.4 : 1
const KINDS: EventIconKind[] = ['swords', 'tower', 'crown', 'oriflamme']
const builders = candidates
  ? candidates.map(
      (candidate) => () =>
        iconOf(
          buildModel(
            `candidate ${candidate.letter}`,
            candidate.parts(),
            undefined,
            EVENT_ICON_PALETTE
          )
        )
    )
  : KINDS.map((kind) => () => createEventIcon(kind))
/** How much bigger than on the map's own scale a kind is shown: each at its size beside the others (ATLAS-469). */
const KIND_SCALE = 1.5
const middle = (builders.length - 1) / 2
const icons = builders.map((build, index) => {
  const large = build()
  const small = build()
  const shown = candidates ? 1 : KIND_SCALE
  large.object.scale.setScalar(shown)
  small.object.scale.setScalar(0.25 * shown)
  if (crowns) {
    // A low open crown, fitted one unit high like any icon, is far wider than a closed one: the candidates are shown
    // at one width — crowns made for the same head — so two neighbours never overlap.
    const box = new Box3().setFromObject(large.object)
    const width = box.max.x - box.min.x
    large.object.scale.setScalar(CANDIDATE_WIDTH / width)
    small.object.scale.setScalar((0.34 * CANDIDATE_WIDTH) / width)
  }
  large.object.position.set((index - middle) * 1.3, 0, 0)
  small.object.position.set((index - middle) * 0.5, 0, 1.4)
  scene.add(large.object, small.object)
  return { large, small }
})
if (candidates) {
  // The candidates side by side: the camera stands further back, at the same angle.
  camera.position.set(0, 3.1, 6.6)
  camera.lookAt(0, 0.3, 0.5)
  lights.quaternion.copy(camera.quaternion)
  const caption = document.createElement('p')
  caption.textContent = candidates.map(({ letter, idea }) => `${letter} — ${idea}`).join(' · ')
  caption.style.cssText =
    'position:fixed;top:12px;left:0;right:0;margin:0;text-align:center;font:14px system-ui;color:#3b2a1e'
  document.body.append(caption)
}

// The plain pin (ATLAS-298), behind the icons, as tall as they are: chosen here, « B » (the dev, 2026-10-27). One per
// colour the contribution offers an event type (`cms/src/fields/eventColours`).
const PIN_COLOURS = ['#e3170a', '#ff7a00', '#ffc300', '#1fa33a', '#1565e8', '#8a2be2', '#d4148a']
const pins = (candidates ? [] : PIN_COLOURS).map((colour, index) => {
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
