/**
 * An icon's three forms on the relief — the 3D icon, the halo behind it, the flat drawing for afar — the groups they
 * sit in, and the sprite materials they share.
 */

import { Group, Sprite, SpriteMaterial } from 'three'

import { EVENT_RENDER_ORDER } from '../markers'

import { eventIconSvg } from './flat/eventIconSvg'
import { createHaloTexture } from './light/halo'
import { createIconLights } from './light/lighting'
import { createEventIcon } from './meshes/eventIcons'
import { ICON_FLAT_RAISE, ICON_HALO_SPAN, ICON_LIFT } from './settings'

import type { EventIconKind } from './kinds'
import type { EventIcon } from './meshes/eventIcons'
import type { WorldPoint } from '../../relief/drapeProjection'
import type { Texture } from 'three'

/** An icon to stand on the relief. */
export interface PlacedEventIcon {
  /** Where it stands, on the relief before exaggeration. */
  ground: WorldPoint
  /** Which shape. */
  kind: EventIconKind
}

/** Rasterise an SVG into a texture — `svgToTexture` on the map, a stub in the tests. */
export type LoadSvgTexture = (svg: string) => Texture

/** The groups the icons sit in. */
export interface IconGroups {
  /** The whole: the lights, then the close-up group, then the far group. */
  object: Group
  /** The icons' own lights, turned with the camera. */
  lights: Group
  /** Close up: the halos, then the 3D icons. */
  near: Group
  /** The halos, inside `near`. */
  halos: Group
  /** From afar: the flat icons. */
  far: Group
}

/**
 * The groups the icons sit in: the lights; close up, the halos and the 3D icons; from afar, the flat icons — all
 * drawn after the borders: the halos and the flat icons take their draw order from their group, the halos just
 * before the icons; each 3D icon sets its own (`placeIcon`).
 * @returns the groups, the flat ones hidden until the zoom asks for them
 */
export function iconGroups(): IconGroups {
  const object = new Group()
  const lights = createIconLights()
  // Close up: the 3D icons, with their halos drawn just before them.
  const near = new Group()
  const halos = new Group()
  halos.renderOrder = EVENT_RENDER_ORDER - 1
  // From afar: the flat icons, hidden until the camera pulls out.
  const far = new Group()
  far.renderOrder = EVENT_RENDER_ORDER
  far.visible = false
  near.add(halos)
  object.add(lights, near, far)
  return { object, lights, near, halos, far }
}

/** The sprites' materials, shared: one halo for every icon, one flat drawing per kind. */
export interface IconSprites {
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
export function iconSprites(loadTexture: LoadSvgTexture): IconSprites {
  // One halo for every icon, made at once.
  const haloTexture = createHaloTexture()
  const halo = new SpriteMaterial({ map: haloTexture, depthWrite: false })
  // The flat drawings, one per kind, made as they are asked for.
  const flats = new Map<EventIconKind, SpriteMaterial>()
  return {
    halo,
    setFlatOpacity(opacity: number): void {
      for (const material of flats.values()) material.opacity = opacity
    },
    flat(kind: EventIconKind): SpriteMaterial {
      let material = flats.get(kind)
      if (material === undefined) {
        // The first icon of this kind: its drawing rasterised once, then shared by every icon of the kind.
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
export interface PlacedForms {
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
export function standForms(forms: PlacedForms, height: number, scale: number): void {
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
export function placeIcon(
  at: PlacedEventIcon,
  height: number,
  sprites: IconSprites,
  groups: { near: Group; halos: Group; far: Group }
): PlacedForms {
  const [x, y, z] = at.ground
  // The 3D icon, built for this place, scaled from one unit to the icon's height.
  const icon = createEventIcon(at.kind)
  icon.object.scale.setScalar(height)
  icon.object.renderOrder = EVENT_RENDER_ORDER
  // The halo and the flat icon: sprites over the shared materials.
  const halo = new Sprite(sprites.halo)
  halo.scale.setScalar(height * ICON_HALO_SPAN)
  const flat = new Sprite(sprites.flat(at.kind))
  // All three over the same point; their heights are set by `standForms`.
  for (const object of [icon.object, halo, flat]) object.position.set(x, 0, z)
  groups.near.add(icon.object)
  groups.halos.add(halo)
  groups.far.add(flat)
  const forms = { icon, halo, flat, ground: y, lift: ICON_LIFT[at.kind] * height }
  standForms(forms, height, 1)
  return forms
}
