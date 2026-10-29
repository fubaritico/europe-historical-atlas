/**
 * The event icons on the map (ATLAS-156): each event's icon stood on its place, and kept right at every frame — its
 * form for the zoom, turned to the camera, following the relief's exaggeration. Everything is drawn as instances
 * (ATLAS-289): the 3D icons one model per kind (`iconInstances`), the halos and the flat drawings as squares facing the
 * reader (`billboards`), so a hundred events cost about as many draws as one. The pieces live beside it: the values
 * tuned on sight (`settings`), the turning (`facing`), the zoom (`crossFade`), an icon's place on the relief
 * (`forms`), the squares' materials (`billboardMaterials`), the models (`meshes/`), the drawing from afar (`flat/`),
 * the halo (`light/`); the lights, shared with the pins, are the events' layer's (`../markerLights`).
 */

import { Group, Quaternion } from 'three'

import { BLUR_LAYERS } from '../../blurLayers'
import { applyDepthBias, applyLiveDepthBias } from '../../depthBias'
import { EVENT_RENDER_ORDER } from '../markers'
import { createIconShadows } from '../shadows/iconShadows'

import { billboardMaterials } from './billboardMaterials'
import { createBillboards } from './billboards'
import { flatIconSize, iconCrossFade } from './crossFade'
import { createIconTurner } from './facing'
import { placeIcon, standForms } from './forms'
import { createIconInstances } from './iconInstances'
import { EVENT_ICON_HEIGHT, ICON_DEPTH_PULL, ICON_FLAT_SPAN, ICON_HALO_SPAN } from './settings'

import type { LoadSvgTexture } from './billboardMaterials'
import type { PlacedEventIcon } from './forms'
import type { BlurMethod, ScreenBlur } from '../../blur/blurMethod'
import type { CameraPose, EventMarkers } from '../markers'
import type { GroundAt } from '../shadows/groundShadows'
import type { Object3D } from 'three'

/**
 * The groups the icons sit in: close up, the halos and the 3D icons; from afar, the flat drawings.
 * @param close - what is drawn close up, the halos first so they lie behind the icons
 * @param afar - what is drawn from afar
 * @returns the whole, and the two groups the zoom shows or hides
 */
function iconGroups(close: Group[], afar: Group): { object: Group; near: Group; far: Group } {
  const object = new Group()
  const near = new Group()
  near.add(...close)
  // From afar: the flat drawings, hidden until the camera pulls out.
  const far = new Group()
  far.add(afar)
  far.visible = false
  object.add(near, far)
  return { object, near, far }
}

/**
 * Each icon's place, then its three forms as instances — the 3D icons, the halos behind them, the drawings afar — in
 * their groups.
 * @param placed - each icon and where it stands
 * @param loadTexture - how a flat icon's SVG becomes a texture
 * @param groundAt - the relief's height under any point, for the icons' shadows
 * @param height - how tall a 3D icon stands
 * @returns the forms, the instances that draw them, their shadows, the squares' materials, the groups and the squares'
 *   places
 */
function buildForms(
  placed: readonly PlacedEventIcon[],
  loadTexture: LoadSvgTexture,
  groundAt: GroundAt,
  height: number
) {
  const icons = placed.map((at) => placeIcon(at, height))
  const kinds = placed.map(({ kind }) => kind)
  // Close up, the icons and their halo pulled toward the camera alike, so the slopes cut neither.
  const depthPull = height * ICON_DEPTH_PULL
  const instances = createIconInstances(kinds, height, depthPull)
  const materials = billboardMaterials(loadTexture)
  applyDepthBias(materials.halo, 'built-in', depthPull)
  // The halos just before the icons, the drawings after the borders, like every marker.
  const halos = createBillboards(
    kinds.map(() => 'halo'),
    () => materials.halo,
    EVENT_RENDER_ORDER - 1
  )
  // From afar, the flat drawings pulled too, by their own width — which the zoom changes, so the pull follows it.
  const flatPull = { value: flatDepthPull(height * ICON_FLAT_SPAN) }
  for (const kind of new Set(kinds)) applyLiveDepthBias(materials.flat(kind), 'built-in', flatPull)
  const flats = createBillboards(kinds, (kind) => materials.flat(kind), EVENT_RENDER_ORDER)
  // Close up, each 3D icon casts its shadow on the relief, drawn from its own pose (ATLAS-298).
  const shadows = createIconShadows(icons, instances, groundAt)
  const groups = iconGroups([halos.object, instances.object, shadows.object], flats.object)
  // Each square's place, gathered once: the forms' own vectors, kept up to date by `standForms`.
  const haloPositions = icons.map(({ haloAt }) => haloAt)
  const flatPositions = icons.map(({ flatAt }) => flatAt)
  return {
    icons,
    instances,
    shadows,
    materials,
    halos,
    flats,
    flatPull,
    groups,
    haloPositions,
    flatPositions,
  }
}

/**
 * Fade the two forms into each other: the 3D icons and their halo by the share given, the flat drawings by the rest —
 * a form fully faded out not drawn at all.
 * @param forms - the forms, as `buildForms` gives them
 * @param near3d - how far in the 3D icons are, 0 to 1 (`iconCrossFade`)
 * @returns nothing
 */
function fadeForms(forms: ReturnType<typeof buildForms>, near3d: number): void {
  forms.groups.near.visible = near3d > 0
  forms.groups.far.visible = near3d < 1
  forms.instances.setOpacity(near3d)
  forms.shadows.setOpacity(near3d)
  forms.materials.halo.opacity = near3d
  forms.materials.setFlatOpacity(1 - near3d)
}

/**
 * How far a flat drawing is pulled toward the camera: as many of its widths as a 3D icon is pulled of its heights.
 * @param flatSize - how wide the drawing stands, in world units
 * @returns the pull, in world units
 */
function flatDepthPull(flatSize: number): number {
  return flatSize * ICON_DEPTH_PULL
}

/**
 * Free the icons' forms, their shadows, their materials and their blur.
 * @param forms - the icons' forms
 * @param blur - their blur, taken out of their group
 */
function disposeIcons(forms: ReturnType<typeof buildForms>, blur: ScreenBlur): void {
  forms.groups.object.remove(blur.object)
  blur.dispose()
  forms.instances.dispose()
  forms.shadows.dispose()
  forms.halos.dispose()
  forms.flats.dispose()
  forms.materials.dispose()
}

/** The layer the 3D icons and their halos move to while blurred — one the camera, nor the other blurs, sees. */
export const EVENT_BLUR_LAYER = BLUR_LAYERS.icons

/**
 * The 3D icons and their halos blurred as the borders are (the dev, 2026-10-29: *« applique le même flou que les
 * frontières sur les icônes 3D. Mais pas leur ombre »*). Drawn from the whole scene, where the markers' lights stand;
 * the shadows, drawn on the CPU from the icons' shapes, stay crisp.
 * @param object - the icons' group, which the blur's quad joins
 * @param blurred - the roots of what is blurred: the 3D icons and their halos
 * @param method - how the map's blurs are drawn
 * @returns the blur
 */
function iconBlur(object: Group, blurred: readonly Object3D[], method: BlurMethod): ScreenBlur {
  // Read at each switch, so an object added under the icons or the halos later is blurred too.
  const members = (): Object3D[] => {
    const found: Object3D[] = []
    for (const root of blurred)
      root.traverse((child) => {
        found.push(child)
      })
    return found
  }
  const blur = method.create(object, {
    layer: EVENT_BLUR_LAYER,
    renderOrder: EVENT_RENDER_ORDER,
    blend: 'normal',
    wholeScene: true,
    members,
  })
  object.add(blur.object)
  return blur
}

/**
 * Stand one icon on each place, in two forms the zoom chooses between (`setZoom`): close up, the 3D icon, turned to
 * the camera and swayed (`faceCamera`) under the markers' lights (`../markerLights`, held beside it by the events'
 * layer), a light halo behind it to detach it from the map; from afar, its flat drawing ringed with light, at a fixed
 * size on screen. Close up, each 3D icon casts its shadow on the relief, as a pin does (`../shadows/iconShadows`).
 * @param placed - each icon and where it stands
 * @param loadTexture - how a flat icon's SVG becomes a texture
 * @param groundAt - the relief's height under any point, for the shadows
 * @param blurMethod - how the map's blurs are drawn (ATLAS-304)
 * @param height - how tall a 3D icon stands
 * @returns the icons, shaped like the pins' handle
 */
export function createEventIconMarkers(
  placed: readonly PlacedEventIcon[],
  loadTexture: LoadSvgTexture,
  groundAt: GroundAt,
  blurMethod: BlurMethod,
  height: number = EVENT_ICON_HEIGHT
): EventMarkers {
  const forms = buildForms(placed, loadTexture, groundAt, height)
  const { icons, instances, shadows, halos, flats, groups, haloPositions, flatPositions } = forms
  const { object } = groups
  const blur = iconBlur(object, [instances.object, halos.object], blurMethod)

  // The camera's orientation, which every square takes; the turner of the 3D icons, and those it turns.
  const facing = new Quaternion()
  const turnIcons = createIconTurner()
  const turning = icons.filter(({ turns }) => turns)
  // How wide a flat drawing stands, set by the zoom.
  let flatSize = height * ICON_FLAT_SPAN
  // The moment of the last frame, for the models that move between frames (a trebuchet's arm).
  let now = 0

  /**
   * Hand every form's pose to its instances: the 3D icons as they are turned, the squares turned as the camera is.
   * @returns nothing
   */
  const poseAll = (): void => {
    instances.poseAll(icons, now)
    halos.poseAll(haloPositions, facing, height * ICON_HALO_SPAN)
    flats.poseAll(flatPositions, facing, flatSize)
  }
  poseAll()

  return {
    object,
    setReliefScale(scale: number): void {
      for (const forms of icons) standForms(forms, scale)
      poseAll()
      shadows.setReliefScale(scale)
    },
    setZoom(zoom: number, pixelsPerUnit: number): void {
      fadeForms(forms, iconCrossFade(zoom))
      // The flat icons keep a legible size on screen, whatever the zoom.
      flatSize = flatIconSize(height, pixelsPerUnit)
      forms.flatPull.value = flatDepthPull(flatSize)
      flats.poseAll(flatPositions, facing, flatSize)
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      facing.copy(camera.quaternion)
      now = seconds
      // The 3D icons whose kind faces the camera turned and swayed, the others left still; then every form posed.
      turnIcons(turning, camera, seconds)
      poseAll()
      // The shadows drawn from the icons as they now stand.
      shadows.faceCamera(camera, seconds)
    },
    setBlur(pixels: number): void {
      blur.setRadius(pixels)
    },
    dispose(): void {
      disposeIcons(forms, blur)
    },
  }
}
