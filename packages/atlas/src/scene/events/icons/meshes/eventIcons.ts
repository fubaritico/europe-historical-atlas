/**
 * One 3D icon as a plain object — a mesh per piece of its kind's model — for where a single icon is shown on its
 * own: the icons' bench. On the map, the icons of a kind are drawn as instances of the model (`../iconInstances`).
 */

import { Group, Mesh } from 'three'

import { EVENT_ICON_PALETTE } from '../palette'

import { buildIconModel } from './iconModel'

import type { IconModel } from './iconModel'
import type { EventIconKind } from '../kinds'
import type { EventIconPalette } from '../palette'

/** One icon: a group one unit high, standing on its base at the origin. */
export interface EventIcon {
  /** The meshes, to add to a scene and scale to the map. */
  readonly object: Group
  /**
   * Stand a model that moves as it is at a moment — a trebuchet's arm; a still model is left as it is.
   * @param seconds - the time since the bench started
   * @returns nothing
   */
  animate(seconds: number): void
  /**
   * Fade the icon, for its cross-fade with its flat drawing.
   * @param opacity - 0 gone, 1 solid
   * @returns nothing
   */
  setOpacity(opacity: number): void
  /** Free its geometries and materials. */
  dispose(): void
}

/**
 * Build one icon: its kind's model, a mesh per piece.
 * @param kind - which shape
 * @param palette - its colours
 * @returns the icon, one unit high, standing at the origin
 */
export function createEventIcon(
  kind: EventIconKind,
  palette: EventIconPalette = EVENT_ICON_PALETTE
): EventIcon {
  return iconOf(buildIconModel(kind, palette))
}

/**
 * One icon from a model already built — a kind's, or a candidate on the icons' bench.
 * @param model - the model, which the icon owns from now on and frees on dispose
 * @returns the icon, one unit high, standing at the origin
 */
export function iconOf(model: IconModel): EventIcon {
  const object = new Group()
  // Each piece a mesh; a moving one placed by its motion at each moment, so its matrix is written, never derived.
  const moving: { mesh: Mesh; motion: string }[] = []
  for (const { geometry, material, motion } of model.pieces) {
    const mesh = new Mesh(geometry, material)
    if (motion !== null) {
      mesh.matrixAutoUpdate = false
      moving.push({ mesh, motion })
    }
    object.add(mesh)
  }
  /**
   * Place every moving piece as its motion has it at a moment.
   * @param seconds - the moment
   * @returns nothing
   */
  const animate = (seconds: number): void => {
    for (const { mesh, motion } of moving) {
      model.placeAt(motion, seconds, mesh.matrix)
      // A matrix written by hand reaches the world only through this flag (`Object3D.updateMatrix` sets it).
      mesh.matrixWorldNeedsUpdate = true
    }
    model.fadeAt(seconds)
  }
  // At rest from the start, so an icon is right before its first frame.
  animate(0)
  return {
    object,
    animate,
    setOpacity(opacity: number): void {
      model.setOpacity(opacity)
    },
    dispose(): void {
      model.dispose()
    },
  }
}
