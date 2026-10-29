/**
 * The plain pin: the marker of an event whose type chose no icon (CMS-224) — a steel stem and a coloured head, lit by
 * the markers' lights (`markerLights`) so the stem reads as a cylinder and the head as a sphere. Chosen on the icons'
 * bench, « B », the third of four (the dev, 2026-10-27, ATLAS-298). From afar it fades into its flat drawing
 * (`pinFlats`), as the icons do, at the same zoom.
 */

import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'

import { crossFading, flatIconSize, iconCrossFade } from './icons/crossFade'
import { createHaloSquares } from './icons/light/haloSquares'
import { ICON_DEPTH_PULL, ICON_HALO_SPAN } from './icons/settings'
import { EVENT_RENDER_ORDER } from './markers'
import { createPinFlats } from './pinFlats'

import type { LoadSvgTexture } from './icons/billboardMaterials'
import type { CameraPose, EventMarkers } from './markers'
import type { PinMeasures } from './shadows/shadowFootprint'
import type { WorldPoint } from '../relief/drapeProjection'

/** A pin to stand: where, and the colour its type gives its head (ATLAS-298). */
export interface PlacedPin {
  /** Where it stands, on the relief before exaggeration. */
  ground: WorldPoint
  /** Its head's colour, as its event's type gives it. */
  colour: string
}

/** What the pins look like, in world units — the map is 12 wide. */
export interface EventMarkerStyle {
  /** The stem's colour, as a CSS colour: a steel grey, lit. */
  stemColor: string
  /** The stem's height above the ground. */
  height: number
  /** The head's radius. */
  radius: number
}

/**
 * The default look: a steel stem under a head in its type's colour — vivid ones (the dev, 2026-10-27: « un rouge
 * vraiment rouge plutôt que carmin »), chosen in the contribution — half the first pin's size (same evening: « deux
 * fois plus petite »).
 */
export const EVENT_MARKER_STYLE: EventMarkerStyle = {
  stemColor: '#8a8e96',
  height: 0.06,
  radius: 0.009,
}

/**
 * How much more light each part takes than the icons' rig gives it, as a gain on its colour: the lit side lightens and
 * the shade keeps its depth, so the head shows its colour and the stem reads as a cylinder by contrast alone — with no
 * highlight (the dev, 2026-10-27: « un peu plus de lumière pour avoir la couleur un peu plus claire », « plus de
 * contraste sans qu'il y ait un spéculaire »). Shared with the icons, the rig itself stays as they were tuned.
 */
const LIGHT_GAIN = { stem: 3.6, head: 1.8 }

/**
 * The stem's radius, as a share of the head's: a sixth (the dev, 2026-10-27: « la tige plus fine » — a quarter was).
 */
const STEM_SHARE = 1 / 6

/**
 * A pin's measures, the stem's radius derived from the head's — what its geometry is built from, and its shadow
 * (`shadows/shadowFootprint`).
 * @param style - its look
 * @returns its height, its head's radius and its stem's
 */
export function pinMeasures(style: EventMarkerStyle): PinMeasures {
  return { height: style.height, radius: style.radius, stemRadius: style.radius * STEM_SHARE }
}

/** Sides round the stem and the head — enough for the light to run round them smoothly. */
const SEGMENTS = { stem: 24, headAround: 32, headDown: 24 }

/**
 * A matt lit material in the transparent pass, so the pins are drawn after the borders (`EVENT_RENDER_ORDER`).
 * @param color - its colour
 * @param gain - how much more light it takes (`LIGHT_GAIN`)
 * @returns the material
 */
function matt(color: string, gain: number): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ color, transparent: true })
  material.color.multiplyScalar(gain)
  return material
}

/**
 * The 3D pins: one stem, one head, the stem's material and one head material per colour, shared by every pin; a small
 * group per pin, standing at its place, all in one group.
 * @param placed - where each pin stands, and its head's colour
 * @param style - its look
 * @returns the group, each pin with its ground height, and what fades and frees them
 */
function pinModels(placed: readonly PlacedPin[], style: EventMarkerStyle) {
  const { stemRadius } = pinMeasures(style)
  const stem = new CylinderGeometry(stemRadius, stemRadius, style.height, SEGMENTS.stem)
  stem.translate(0, style.height / 2, 0)
  const head = new SphereGeometry(style.radius, SEGMENTS.headAround, SEGMENTS.headDown)
  head.translate(0, style.height, 0)
  const stemMaterial = matt(style.stemColor, LIGHT_GAIN.stem)
  const headMaterials = new Map<string, MeshLambertMaterial>()
  const headMaterial = (colour: string): MeshLambertMaterial => {
    const known = headMaterials.get(colour)
    if (known !== undefined) return known
    const made = matt(colour, LIGHT_GAIN.head)
    headMaterials.set(colour, made)
    return made
  }
  const near = new Group()
  const pins = placed.map(({ ground: [x, y, z], colour }) => {
    const pin = new Group()
    pin.add(new Mesh(stem, stemMaterial), new Mesh(head, headMaterial(colour)))
    pin.position.set(x, y, z)
    pin.renderOrder = EVENT_RENDER_ORDER
    near.add(pin)
    return { pin, ground: y }
  })
  return {
    near,
    pins,
    setOpacity(opacity: number): void {
      stemMaterial.opacity = opacity
      for (const material of headMaterials.values()) material.opacity = opacity
    },
    dispose(): void {
      stem.dispose()
      head.dispose()
      stemMaterial.dispose()
      for (const material of headMaterials.values()) material.dispose()
    },
  }
}

/**
 * Behind each 3D pin, the icons' halo (ATLAS-306): at its middle, as wide for its height as theirs, pulled toward the
 * camera as the icons' is.
 * @param placed - where each pin stands, on the relief before exaggeration
 * @param style - its look: its height sets the halo's place and size
 * @returns the halos, and what stands them on the scaled ground facing the camera
 */
function pinHalos(placed: readonly PlacedPin[], style: EventMarkerStyle) {
  const halos = createHaloSquares(placed.length, 'marker', {
    value: style.height * ICON_DEPTH_PULL,
  })
  const middles = placed.map(({ ground: [x, y, z] }) => new Vector3(x, y + style.height / 2, z))
  return {
    ...halos,
    /**
     * Fade the halos with the 3D pins, not drawn at all once gone.
     * @param opacity - 0 gone, 1 whole
     */
    fade(opacity: number): void {
      halos.object.visible = opacity > 0
      halos.setOpacity(opacity)
    },
    /**
     * Stand each halo at its pin's middle on the scaled ground, turned to the camera.
     * @param scale - the relief's `scale.y`
     * @param facing - the camera's orientation
     */
    stand(scale: number, facing: Quaternion): void {
      placed.forEach(({ ground: [, y] }, index) =>
        middles[index]?.setY(y * scale + style.height / 2)
      )
      halos.poseAll(middles, facing, style.height * ICON_HALO_SPAN)
    },
  }
}

/**
 * A pin's three forms in one group — close up the 3D pins, from afar the flat drawings hidden until the camera pulls
 * out, the halos behind — and their cross-fade.
 * @param placed - where each pin stands, and its head's colour
 * @param loadTexture - how the flat drawing's SVG becomes a texture
 * @param style - its look
 * @returns the forms, their group and their fade
 */
function pinForms(
  placed: readonly PlacedPin[],
  loadTexture: LoadSvgTexture,
  style: EventMarkerStyle
) {
  const models = pinModels(placed, style)
  const flats = createPinFlats(
    placed.map(({ ground }) => ground),
    style.height,
    loadTexture
  )
  flats.object.visible = false
  const halos = pinHalos(placed, style)
  const object = new Group()
  object.add(models.near, flats.object, halos.object)
  const fading = crossFading((nearShare, farShare) => {
    // The 3D pins fade into their drawings at the icons' zoom, a form fully faded out not drawn at all.
    models.near.visible = nearShare > 0
    flats.object.visible = farShare > 0
    models.setOpacity(nearShare)
    halos.fade(nearShare)
    flats.setOpacity(farShare)
  })
  return { models, flats, halos, object, fading }
}

/**
 * Build one pin per place: close up, a stem and a head in its type's colour, sharing their geometries and materials;
 * from afar, its flat drawing — the zoom fading the one into the other (`setZoom`).
 * @param placed - where each pin stands, on the relief before exaggeration, and its head's colour
 * @param loadTexture - how the flat drawing's SVG becomes a texture
 * @param style - its look
 * @returns the pins
 */
export function createPinMarkers(
  placed: readonly PlacedPin[],
  loadTexture: LoadSvgTexture,
  style: EventMarkerStyle = EVENT_MARKER_STYLE
): EventMarkers {
  const { models, flats, halos, object, fading } = pinForms(placed, loadTexture, style)
  const { pins } = models
  // The camera's orientation, which every drawing takes; how wide a drawing stands, set by the zoom.
  const facing = new Quaternion()
  let flatSize = 0
  // The relief's vertical scale, which the halos stand on.
  let reliefScale = 1
  halos.stand(reliefScale, facing)

  return {
    object,
    setReliefScale(scale: number): void {
      for (const { pin, ground } of pins) pin.position.setY(ground * scale)
      reliefScale = scale
      halos.stand(scale, facing)
      flats.standAt(scale)
    },
    setZoom(zoom: number, pixelsPerUnit: number): void {
      fading.setNear(iconCrossFade(zoom))
      // The drawings keep a legible size on screen, whatever the zoom.
      flatSize = flatIconSize(style.height, pixelsPerUnit)
      flats.pose(facing, flatSize)
    },
    setReveal(share: number): void {
      fading.setReveal(share)
    },
    faceCamera(camera: CameraPose): void {
      // The 3D pin is round and faces every way already; its halo and its drawing turn to the camera.
      facing.copy(camera.quaternion)
      halos.stand(reliefScale, facing)
      flats.pose(facing, flatSize)
    },
    dispose(): void {
      models.dispose()
      halos.dispose()
      flats.dispose()
    },
  }
}
