/**
 * The 3D icons, built in code from three.js shapes — no model file. Each kind's shape is in its own file (`swords`,
 * `tower`, `crown`); this one turns a kind's parts into an object for the map.
 */

import { Group, Mesh } from 'three'

import { EVENT_ICON_PALETTE } from '../palette'

import { crownParts } from './crown'
import { faceted, standUnitHigh } from './parts'
import { swordParts } from './swords'
import { towerParts } from './tower'

import type { EventIconKind } from '../kinds'
import type { EventIconPalette } from '../palette'
import type { Part } from './parts'
import type { MeshStandardMaterial } from 'three'

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
 * Each kind's parts. A new kind is a new file beside this one and a line here — plus its line in `ICON_LIFT`
 * (`../settings`) and in `DRAWINGS` (`../flat/eventIconSvg`), which type-check asks for.
 */
const PARTS: Record<EventIconKind, () => Part[]> = {
  swords: swordParts,
  tower: towerParts,
  crown: crownParts,
}

/**
 * Build one icon. Its parts share one material per colour, so an icon costs a handful of materials however many
 * parts it has.
 * @param kind - which shape
 * @param palette - its colours
 * @returns the icon, one unit high, standing at the origin
 */
export function createEventIcon(
  kind: EventIconKind,
  palette: EventIconPalette = EVENT_ICON_PALETTE
): EventIcon {
  // The kind's parts, fitted one unit high.
  const parts = standUnitHigh(PARTS[kind]())

  // One mesh per part, in one group; a colour's material is made the first time a part asks for it.
  const materials = new Map<keyof EventIconPalette, MeshStandardMaterial>()
  const object = new Group()
  for (const part of parts) {
    let material = materials.get(part.colour)
    if (material === undefined) {
      material = faceted(palette[part.colour])
      materials.set(part.colour, material)
    }
    const mesh = new Mesh(part.geometry, material)
    if (part.at !== undefined) mesh.position.set(...part.at)
    if (part.turn !== undefined) mesh.rotation.y = part.turn
    object.add(mesh)
  }

  return {
    object,
    setOpacity(opacity: number): void {
      // Every part fades together: they share the materials.
      for (const material of materials.values()) material.opacity = opacity
    },
    dispose(): void {
      for (const part of parts) part.geometry.dispose()
      for (const material of materials.values()) material.dispose()
    },
  }
}
