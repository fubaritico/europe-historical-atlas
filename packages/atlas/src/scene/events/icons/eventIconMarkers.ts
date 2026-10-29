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
import { applyLiveDepthBias } from '../../depthBias'
import { EVENT_RENDER_ORDER } from '../markers'
import { createIconShadows } from '../shadows/iconShadows'

import { billboardMaterials } from './billboardMaterials'
import { createBillboards } from './billboards'
import { crossFading, flatIconSize, iconCrossFade } from './crossFade'
import { createIconTurner } from './facing'
import { placeIcon, standForms } from './forms'
import { createIconInstances } from './iconInstances'
import { createHaloSquares, withHalos } from './light/haloSquares'
import {
  EVENT_ICON_HEIGHT,
  FLAT_HALO_SPAN,
  ICON_DEPTH_PULL,
  ICON_FLAT_SPAN,
  ICON_HALO_SPAN,
} from './settings'

import type { LoadSvgTexture } from './billboardMaterials'
import type { PlacedEventIcon } from './forms'
import type { BlurMethod, ScreenBlur } from '../../blur/blurMethod'
import type { CameraPose, EventMarkers } from '../markers'
import type { GroundAt } from '../shadows/groundShadows'
import type { Object3D } from 'three'

/**
 * The groups the icons sit in: close up, the halos and the 3D icons; from afar, the flat drawings and their halos.
 * @param close - what is drawn close up, the halos first so they lie behind the icons
 * @param afar - what is drawn from afar: the drawings with their halos
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
  // The halos just before the icons, the drawings after the borders, like every marker.
  const halos = createHaloSquares(kinds.length, 'marker', { value: depthPull })
  // From afar, the flat drawings pulled too, by their own width — which the zoom changes, so the pull follows it —
  // each with its own halo behind it (ATLAS-306).
  const flatPull = { value: flatDepthPull(height * ICON_FLAT_SPAN) }
  for (const kind of new Set(kinds)) applyLiveDepthBias(materials.flat(kind), 'built-in', flatPull)
  const flats = withHalos(
    createBillboards(kinds, (kind) => materials.flat(kind), EVENT_RENDER_ORDER),
    { count: kinds.length, fade: materials.setFlatOpacity, pull: flatPull, span: FLAT_HALO_SPAN }
  )
  // Close up, each 3D icon casts its shadow on the relief, drawn from its own pose (ATLAS-298).
  const shadows = createIconShadows(icons, instances, groundAt)
  const groups = iconGroups([halos.object, instances.object, shadows.object], flats.object)
  // Each square's place, gathered once: the forms' own vectors, kept up to date by `standForms`.
  const haloPositions = icons.map(({ haloAt }) => haloAt)
  const flatPositions = icons.map(({ flatAt }) => flatAt)
  // The two forms faded into each other by the zoom, the whole by the startup's fade.
  const fading = crossFading((near, far) => {
    fadeForms({ groups, instances, shadows, halos, flats }, near, far)
  })
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
    fading,
  }
}

/**
 * Fade the two forms into each other: the 3D icons and their halo by the near share, the flat drawings by the far one
 * — a form fully faded out not drawn at all.
 * @param forms - the forms, as `buildForms` gives them
 * @param near - the 3D icons' share, 0 to 1
 * @param far - the flat drawings' share, 0 to 1
 * @returns nothing
 */
function fadeForms(
  forms: Pick<
    ReturnType<typeof buildForms>,
    'groups' | 'instances' | 'shadows' | 'halos' | 'flats'
  >,
  near: number,
  far: number
): void {
  forms.groups.near.visible = near > 0
  forms.groups.far.visible = far > 0
  forms.instances.setOpacity(near)
  forms.shadows.setOpacity(near)
  forms.halos.setOpacity(near)
  forms.flats.setOpacity(far)
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
 *
 * **The quad is laid in a group of the markers' rank**: three sorts the transparent pass by the nearest group's
 * `renderOrder` first, so the quad's own rank alone, in the icons' group of rank 0, laid the blurred icons before the
 * names, whose ink was then multiplied over the blades (the dev, 2026-10-29, 16:24: *« les noms des pays semblent être
 * devant la couche des icônes »*).
 * @param object - the icons' group, which the blur's quad joins, in its own group
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
  const ranked = new Group()
  ranked.renderOrder = EVENT_RENDER_ORDER
  ranked.add(blur.object)
  object.add(ranked)
  return blur
}

/**
 * The forms at a zoom: the 3D icons faded into the flat ones, and the flat ones kept a legible size on screen.
 * @param forms - the forms, as `buildForms` gives them
 * @param at - the zoom, the screen pixels per world unit, and how tall a 3D icon stands
 * @param at.zoom - the camera's zoom, `0..1`
 * @param at.pixelsPerUnit - screen pixels per world unit where the camera looks
 * @param at.height - how tall a 3D icon stands
 * @param facing - the camera's orientation, which every square takes
 * @returns how wide a flat drawing now stands
 */
function zoomForms(
  forms: ReturnType<typeof buildForms>,
  at: { zoom: number; pixelsPerUnit: number; height: number },
  facing: Quaternion
): number {
  forms.fading.setNear(iconCrossFade(at.zoom))
  const flatSize = flatIconSize(at.height, at.pixelsPerUnit)
  forms.flatPull.value = flatDepthPull(flatSize)
  forms.flats.poseAll(forms.flatPositions, facing, flatSize)
  return flatSize
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
  // How wide a flat drawing stands, set by the zoom; the last frame's moment, for the models that move (a trebuchet).
  let flatSize = height * ICON_FLAT_SPAN
  let now = 0

  // Every form's pose handed to its instances: the 3D icons as they are turned, the squares as the camera is.
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
      flatSize = zoomForms(forms, { zoom, pixelsPerUnit, height }, facing)
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
    setReveal(share: number): void {
      forms.fading.setReveal(share)
    },
    setBlur(pixels: number): void {
      blur.setRadius(pixels)
    },
    dispose(): void {
      disposeIcons(forms, blur)
    },
  }
}
