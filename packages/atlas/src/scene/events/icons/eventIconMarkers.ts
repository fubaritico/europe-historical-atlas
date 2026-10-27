/**
 * The event icons on the map (ATLAS-156): each event's icon stood on its place, and kept right at every frame — its
 * form for the zoom, turned to the camera, following the relief's exaggeration. Everything is drawn as instances
 * (ATLAS-289): the 3D icons one model per kind (`iconInstances`), the halos and the flat drawings as squares facing the
 * reader (`billboards`), so a hundred events cost about as many draws as one. The pieces live beside it: the values
 * tuned on sight (`settings`), the turning (`facing`), the zoom (`crossFade`), an icon's place on the relief
 * (`forms`), the squares' materials (`billboardMaterials`), the models (`meshes/`), the drawing from afar (`flat/`),
 * the lights and the halo (`light/`).
 */

import { Group, Quaternion } from 'three'

import { EVENT_RENDER_ORDER } from '../markers'

import { billboardMaterials } from './billboardMaterials'
import { createBillboards } from './billboards'
import { flatIconSize, iconCrossFade } from './crossFade'
import { createIconTurner } from './facing'
import { placeIcon, standForms } from './forms'
import { createIconInstances } from './iconInstances'
import { createIconLights } from './light/lighting'
import { EVENT_ICON_HEIGHT, ICON_FLAT_SPAN, ICON_HALO_SPAN } from './settings'

import type { LoadSvgTexture } from './billboardMaterials'
import type { PlacedEventIcon } from './forms'
import type { CameraPose, EventMarkers } from '../markers'

/**
 * The groups the icons sit in: the lights; close up, the halos and the 3D icons; from afar, the flat drawings.
 * @param close - what is drawn close up, the halos first so they lie behind the icons
 * @param afar - what is drawn from afar
 * @returns the whole, and the lights and the two groups the zoom shows or hides
 */
function iconGroups(
  close: Group[],
  afar: Group
): { object: Group; lights: Group; near: Group; far: Group } {
  const object = new Group()
  const lights = createIconLights()
  const near = new Group()
  near.add(...close)
  // From afar: the flat drawings, hidden until the camera pulls out.
  const far = new Group()
  far.add(afar)
  far.visible = false
  object.add(lights, near, far)
  return { object, lights, near, far }
}

/**
 * Each icon's place, then its three forms as instances — the 3D icons, the halos behind them, the drawings afar — in
 * their groups.
 * @param placed - each icon and where it stands
 * @param loadTexture - how a flat icon's SVG becomes a texture
 * @param height - how tall a 3D icon stands
 * @returns the forms, the instances that draw them, the squares' materials, the groups and the squares' places
 */
function buildForms(
  placed: readonly PlacedEventIcon[],
  loadTexture: LoadSvgTexture,
  height: number
) {
  const icons = placed.map((at) => placeIcon(at, height))
  const kinds = placed.map(({ kind }) => kind)
  const instances = createIconInstances(kinds, height)
  const materials = billboardMaterials(loadTexture)
  // The halos just before the icons, the drawings after the borders, like every marker.
  const halos = createBillboards(
    kinds.map(() => 'halo'),
    () => materials.halo,
    EVENT_RENDER_ORDER - 1
  )
  const flats = createBillboards(kinds, (kind) => materials.flat(kind), EVENT_RENDER_ORDER)
  const groups = iconGroups([halos.object, instances.object], flats.object)
  // Each square's place, gathered once: the forms' own vectors, kept up to date by `standForms`.
  const haloPositions = icons.map(({ haloAt }) => haloAt)
  const flatPositions = icons.map(({ flatAt }) => flatAt)
  return { icons, instances, materials, halos, flats, groups, haloPositions, flatPositions }
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
  const forms = buildForms(placed, loadTexture, height)
  const { icons, instances, materials, halos, flats, groups, haloPositions, flatPositions } = forms
  const { object, lights } = groups

  // The camera's orientation, which every square takes; the turner of the 3D icons.
  const facing = new Quaternion()
  const turnIcons = createIconTurner()
  // How wide a flat drawing stands, set by the zoom.
  let flatSize = height * ICON_FLAT_SPAN

  /**
   * Hand every form's pose to its instances: the 3D icons as they are turned, the squares turned as the camera is.
   * @returns nothing
   */
  const poseAll = (): void => {
    instances.poseAll(icons)
    halos.poseAll(haloPositions, facing, height * ICON_HALO_SPAN)
    flats.poseAll(flatPositions, facing, flatSize)
  }
  poseAll()

  return {
    object,
    setReliefScale(scale: number): void {
      for (const forms of icons) standForms(forms, height, scale)
      poseAll()
    },
    setZoom(zoom: number, pixelsPerUnit: number): void {
      // How far in the 3D icons are; the flat ones get the rest.
      const near3d = iconCrossFade(zoom)
      // A form fully faded out is not drawn at all.
      groups.near.visible = near3d > 0
      groups.far.visible = near3d < 1
      instances.setOpacity(near3d)
      materials.halo.opacity = near3d
      materials.setFlatOpacity(1 - near3d)
      // The flat icons keep a legible size on screen, whatever the zoom.
      flatSize = flatIconSize(height, pixelsPerUnit)
      flats.poseAll(flatPositions, facing, flatSize)
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      // The group holding the icons is never turned, so an orientation set here is the orientation in the world.
      lights.quaternion.copy(camera.quaternion)
      facing.copy(camera.quaternion)
      // Each 3D icon turned to face the camera and swayed; then every form posed at once.
      turnIcons(icons, camera, seconds)
      poseAll()
    },
    dispose(): void {
      instances.dispose()
      halos.dispose()
      flats.dispose()
      materials.dispose()
    },
  }
}
