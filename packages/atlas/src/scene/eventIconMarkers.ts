import { Group, Matrix4, Quaternion, Sprite, SpriteMaterial, Vector3 } from 'three'

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { createEventIcon, createIconLights } from './eventIcons'
import { eventIconSvg } from './eventIconSvg'
import { EVENT_RENDER_ORDER } from './eventMarkers'
import { createHaloTexture } from './iconHalo'

import type { WorldPoint } from './drapeProjection'
import type { EventIcon, EventIconKind } from './eventIcons'
import type { CameraPose, EventMarkers } from './eventMarkers'
import type { Texture } from 'three'

/** An icon to stand on the relief. */
export interface PlacedEventIcon {
  /** Where it stands, on the relief before exaggeration. */
  ground: WorldPoint
  /** Which shape. */
  kind: EventIconKind
}

/**
 * How tall an icon stands, in world units — the map is 12 wide; a pin is 0.12 to the top of its head. Set on sight
 * (the dev, 2026-10-26): 0.13, halved, then a little smaller again.
 */
export const EVENT_ICON_HEIGHT = 0.05

/**
 * How far each kind of icon floats above its place, in icon heights. The crossed swords turn and sway with nothing
 * under them, so they float clear of the relief, which would otherwise swallow their hilts (the dev, 2026-10-26); a
 * shape with a base would stand on the ground — every kind has its own rule.
 */
export const ICON_LIFT: Record<EventIconKind, number> = { swords: 0.6, tower: 0, crown: 0 }

/** How the icons sway about their own upright, either side of facing the camera (the dev, 2026-10-26). */
export const ICON_SWAY = { amplitudeRad: (25 * Math.PI) / 180, periodSeconds: 4 }

/**
 * How far an icon is swayed about its own upright at a moment: a slow swing either side of facing the camera, so the
 * light runs over its facets. Each icon is a little out of step with the one before, so a group does not move as one.
 * @param seconds - the time since the map started
 * @param index - the icon's rank, for its phase
 * @returns the sway, in radians, never past the swing
 */
export function iconSway(seconds: number, index: number): number {
  const phase = (2 * Math.PI * seconds) / ICON_SWAY.periodSeconds + index * 0.7
  return ICON_SWAY.amplitudeRad * Math.sin(phase)
}

/** The vertical axis an icon sways about, in its own frame; also the camera's up, in the camera's frame. */
const UPRIGHT = new Vector3(0, 1, 0)

/**
 * The camera's up, in the world — computed once a frame and shared by every icon (`facingCamera`).
 * @param camera - how the camera is turned
 * @param into - the vector to write
 * @returns `into`
 */
export function cameraUp(camera: CameraPose, into: Vector3): Vector3 {
  return into.copy(UPRIGHT).applyQuaternion(camera.quaternion)
}

/**
 * Turn an icon to face the camera's position — not its orientation: an icon away from the middle of the screen is
 * seen at an angle, and copying the camera's orientation left it facing past the reader, so its sway looked lopsided
 * (the dev, 2026-10-26). Its up stays the camera's up, so seen from above it leans back toward the reader. Writes
 * into what it is given, so a frame allocates nothing however many icons it turns.
 * @param at - where the icon stands, in the world
 * @param eye - where the camera stands
 * @param up - the camera's up, in the world (`cameraUp`)
 * @param into - the orientation to write
 * @param scratch - a matrix to work in
 * @returns `into`
 */
export function facingCamera(
  at: Vector3,
  eye: Vector3,
  up: Vector3,
  into: Quaternion,
  scratch: Matrix4
): Quaternion {
  return into.setFromRotationMatrix(scratch.lookAt(eye, at, up))
}

/**
 * The zoom (0 zoomed out, 1 in) around which the icons pass from flat to 3D (the dev, 2026-10-26), and the span over
 * which the one fades into the other — the vassals' reveal does the same (`scene/homageReveal`).
 */
export const ICON_CROSS_FADE = { zoom: 0.45, span: 0.1 }

/**
 * How far the 3D icon is in, at a zoom: 0 the flat icon alone, 1 the 3D icon alone, linear across the span.
 * @param zoom - the camera's zoom
 * @returns the 3D icon's share, the flat icon's being the rest
 */
export function iconCrossFade(zoom: number): number {
  return clamp01((zoom - ICON_CROSS_FADE.zoom) / ICON_CROSS_FADE.span + 0.5)
}

/**
 * How wide a flat icon is, in 3D icon heights. Its drawing is cropped to the swords (`eventIconSvg`), so the sprite
 * is the swords' own width — set so the blades keep the size the dev chose on sight (2026-10-26); the smaller
 * pommels narrowed the crop, and the span with it.
 */
export const ICON_FLAT_SPAN = 1

/** How far above the 3D icon's middle a flat icon is centred, in icon heights — raised a little, on sight. */
export const ICON_FLAT_RAISE = 0.2

/** The fewest pixels a flat icon keeps on screen, so it stays legible zoomed far out. */
export const ICON_FLAT_MIN_PIXELS = 20

/**
 * How wide a flat icon stands in the world: the 3D icon's size, so the cross-fade does not jump (the dev,
 * 2026-10-26), and never fewer than its minimum on screen.
 * @param height - how tall the 3D icon stands
 * @param pixelsPerUnit - screen pixels per world unit where the camera looks
 * @returns its width, in world units
 */
export function flatIconSize(height: number, pixelsPerUnit: number): number {
  return Math.max(height * ICON_FLAT_SPAN, ICON_FLAT_MIN_PIXELS / pixelsPerUnit)
}

/** How wide the halo behind a 3D icon is, in icon heights — 2.2, widened on sight (the dev, 2026-10-26). */
export const ICON_HALO_SPAN = 2.6

/** Rasterise an SVG into a texture — `svgToTexture` on the map, a stub in the tests. */
export type LoadSvgTexture = (svg: string) => Texture

/**
 * The groups the icons sit in: the lights; close up, the halos and the 3D icons; from afar, the flat icons — each
 * group setting the draw order of what it holds, the halos just before the icons, all after the borders.
 * @returns the groups, the flat ones hidden until the zoom asks for them
 */
function iconGroups(): { object: Group; lights: Group; near: Group; halos: Group; far: Group } {
  const object = new Group()
  const lights = createIconLights()
  const near = new Group()
  const halos = new Group()
  halos.renderOrder = EVENT_RENDER_ORDER - 1
  const far = new Group()
  far.renderOrder = EVENT_RENDER_ORDER
  far.visible = false
  near.add(halos)
  object.add(lights, near, far)
  return { object, lights, near, halos, far }
}

/** The sprites' materials, shared: one halo for every icon, one flat drawing per kind. */
interface IconSprites {
  /** The halo behind every 3D icon. */
  halo: SpriteMaterial
  /**
   * Fade the flat drawings, all kinds at once.
   * @param opacity - 0 gone, 1 solid
   * @returns nothing
   */
  setFlatOpacity: (opacity: number) => void
  /**
   * The flat drawing of a kind, rasterised the first time it is asked for.
   * @param kind - which icon
   * @returns its material
   */
  flat: (kind: EventIconKind) => SpriteMaterial
  /** Free every texture and material. */
  dispose(): void
}

/**
 * The sprites' materials.
 * @param loadTexture - how a flat icon's SVG becomes a texture
 * @returns them, built as they are asked for
 */
function iconSprites(loadTexture: LoadSvgTexture): IconSprites {
  const haloTexture = createHaloTexture()
  const halo = new SpriteMaterial({ map: haloTexture, depthWrite: false })
  const flats = new Map<EventIconKind, SpriteMaterial>()
  return {
    halo,
    setFlatOpacity(opacity: number): void {
      for (const material of flats.values()) material.opacity = opacity
    },
    flat(kind: EventIconKind): SpriteMaterial {
      let material = flats.get(kind)
      if (material === undefined) {
        const map = loadTexture(eventIconSvg(kind))
        material = new SpriteMaterial({ map, depthWrite: false })
        flats.set(kind, material)
      }
      return material
    },
    dispose(): void {
      haloTexture.dispose()
      halo.dispose()
      for (const material of flats.values()) {
        material.map?.dispose()
        material.dispose()
      }
    },
  }
}

/** One icon on the map, in its forms, and what keeps it on the relief. */
interface PlacedForms {
  /** The 3D icon. */
  icon: EventIcon
  /** The halo behind it. */
  halo: Sprite
  /** The flat icon, for afar. */
  flat: Sprite
  /** Its place's height, on the relief before exaggeration. */
  ground: number
  /** How far above its place the 3D icon floats. */
  lift: number
}

/**
 * Set an icon's three forms at their heights over the relief, scaled as it is: the 3D icon floating at its lift, the
 * halo at its middle, the flat icon a little above. The one place these heights are written — the forms are built
 * with it and follow the relief's exaggeration with it.
 * @param forms - the icon's forms
 * @param height - how tall the 3D icon stands
 * @param scale - the relief's vertical scale
 * @returns nothing
 */
function standForms(forms: PlacedForms, height: number, scale: number): void {
  const base = forms.ground * scale + forms.lift
  forms.icon.object.position.setY(base)
  forms.halo.position.setY(base + height / 2)
  // About where the 3D icon's middle is, so the one fades into the other in place (the dev, 2026-10-26).
  forms.flat.position.setY(base + height * (0.5 + ICON_FLAT_RAISE))
}

/**
 * Build one icon's forms and put each in its group, standing on the relief at its unscaled height until the first
 * frame scales it (`setReliefScale`).
 * @param at - which icon and where it stands
 * @param height - how tall the 3D icon stands
 * @param sprites - the shared sprite materials
 * @param groups - where each form goes
 * @param groups.near - the close-up group, for the 3D icon
 * @param groups.halos - the halos' group
 * @param groups.far - the flat icons' group
 * @returns the forms
 */
function placeIcon(
  at: PlacedEventIcon,
  height: number,
  sprites: IconSprites,
  groups: { near: Group; halos: Group; far: Group }
): PlacedForms {
  const [x, y, z] = at.ground
  const icon = createEventIcon(at.kind)
  icon.object.scale.setScalar(height)
  icon.object.renderOrder = EVENT_RENDER_ORDER
  const halo = new Sprite(sprites.halo)
  halo.scale.setScalar(height * ICON_HALO_SPAN)
  const flat = new Sprite(sprites.flat(at.kind))
  for (const object of [icon.object, halo, flat]) object.position.set(x, 0, z)
  groups.near.add(icon.object)
  groups.halos.add(halo)
  groups.far.add(flat)
  const forms = { icon, halo, flat, ground: y, lift: ICON_LIFT[at.kind] * height }
  standForms(forms, height, 1)
  return forms
}

/**
 * Stand one icon on each place, in two forms the zoom chooses between (`setZoom`): close up, the 3D icon, turned to
 * the camera and swayed (`faceCamera`) under its own lights, a light halo behind it to detach it from the map; from
 * afar, its flat drawing ringed with light, at a fixed size on screen. The lights are a child of the group, so they
 * come and go with the icons and light nothing else: the relief and the pins are unlit materials.
 * @param placed - each icon and where it stands
 * @param loadTexture - how a flat icon's SVG becomes a texture
 * @param height - how tall a 3D icon stands
 * @returns the icons, shaped like the pins' handle
 */
export function createEventIconMarkers(
  placed: readonly PlacedEventIcon[],
  loadTexture: LoadSvgTexture,
  height: number = EVENT_ICON_HEIGHT
): EventMarkers {
  const groups = iconGroups()
  const { object, lights } = groups
  const sprites = iconSprites(loadTexture)

  const icons = placed.map((at) => placeIcon(at, height, sprites, groups))
  // Worked in at every frame, never reallocated: the sway, the camera's up, the facing matrix.
  const sway = new Quaternion()
  const up = new Vector3()
  const look = new Matrix4()
  return {
    object,
    setReliefScale(scale: number): void {
      for (const forms of icons) standForms(forms, height, scale)
    },
    setZoom(zoom: number, pixelsPerUnit: number): void {
      const near3d = iconCrossFade(zoom)
      groups.near.visible = near3d > 0
      groups.far.visible = near3d < 1
      sprites.halo.opacity = near3d
      sprites.setFlatOpacity(1 - near3d)
      const size = flatIconSize(height, pixelsPerUnit)
      for (const { icon, flat } of icons) {
        icon.setOpacity(near3d)
        flat.scale.setScalar(size)
      }
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      // The group holding the icons is never turned, so an orientation set here is the orientation in the world.
      lights.quaternion.copy(camera.quaternion)
      cameraUp(camera, up)
      icons.forEach(({ icon }, index) => {
        sway.setFromAxisAngle(UPRIGHT, iconSway(seconds, index))
        const { position, quaternion } = icon.object
        facingCamera(position, camera.position, up, quaternion, look).multiply(sway)
      })
    },
    dispose(): void {
      for (const { icon } of icons) icon.dispose()
      sprites.dispose()
    },
  }
}
