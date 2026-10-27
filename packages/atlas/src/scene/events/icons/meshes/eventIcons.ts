/**
 * One 3D icon as a plain object — a mesh per piece of its kind's model — for where a single icon is shown on its
 * own: the icons' bench. On the map, the icons of a kind are drawn as instances of the model (`../iconInstances`).
 */

import { Group, Mesh } from 'three'

import { EVENT_ICON_PALETTE } from '../palette'

import { buildIconModel } from './iconModel'

import type { EventIconKind } from '../kinds'
import type { EventIconPalette } from '../palette'

/** One icon: a group one unit high, standing on its base at the origin. */
export interface EventIcon {
  /** The meshes, to add to a scene and scale to the map. */
  readonly object: Group
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
  const model = buildIconModel(kind, palette)
  const object = new Group()
  for (const { geometry, material } of model.pieces) object.add(new Mesh(geometry, material))
  return {
    object,
    setOpacity(opacity: number): void {
      model.setOpacity(opacity)
    },
    dispose(): void {
      model.dispose()
    },
  }
}
