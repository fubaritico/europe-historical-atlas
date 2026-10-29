/**
 * The materials of the icons' flat drawings (`billboards`), shared: one per kind for the map seen from afar — each rasterised once, however many icons show it. Unlit and see-through, as a
 * sprite's are, and writing no depth. The halos have their own material (`light/haloSquares`).
 */

import { MeshBasicMaterial } from 'three'

import { eventIconSvg } from './flat/eventIconSvg'

import type { EventIconKind } from './kinds'
import type { Texture } from 'three'

/** Rasterise an SVG into a texture — `svgToTexture` on the map, a stub in the tests. */
export type LoadSvgTexture = (svg: string) => Texture

/** The flat drawings' materials, shared: one per kind. */
export interface BillboardMaterials {
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
  flat: (kind: EventIconKind) => MeshBasicMaterial
  /** Free every texture and material. */
  dispose(): void
}

/**
 * A material that draws a texture as a sprite does: unlit, see-through, writing no depth.
 * @param map - the texture
 * @returns the material
 */
function spriteLike(map: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, transparent: true, depthWrite: false })
}

/**
 * The squares' materials.
 * @param loadTexture - how a flat icon's SVG becomes a texture
 * @returns them, built as they are asked for
 */
export function billboardMaterials(loadTexture: LoadSvgTexture): BillboardMaterials {
  // The flat drawings, one per kind, made as they are asked for.
  const flats = new Map<EventIconKind, MeshBasicMaterial>()
  return {
    setFlatOpacity(opacity: number): void {
      for (const material of flats.values()) material.opacity = opacity
    },
    flat(kind: EventIconKind): MeshBasicMaterial {
      let material = flats.get(kind)
      if (material === undefined) {
        // The first icon of this kind: its drawing rasterised once, then shared by every icon of the kind.
        material = spriteLike(loadTexture(eventIconSvg(kind)))
        flats.set(kind, material)
      }
      return material
    },
    dispose(): void {
      for (const material of flats.values()) {
        material.map?.dispose()
        material.dispose()
      }
    },
  }
}
