/**
 * The plain pins seen from afar (ATLAS-298): each pin's flat drawing (`icons/flat/pin`, « A ») on a square facing the
 * reader, as the icons' drawings are — one dark silhouette for every pin, its type's colour left to the 3D head close up
 * (the dev, 2026-10-27: « pas besoin de colorer l'image de l'épingle ») — one texture, rasterised once, all one draw
 * (`icons/billboards`), each with the icons' halo behind it (ATLAS-306). The 3D pin fades into it as the camera pulls out (`icons/crossFade`).
 */

import { Group, MeshBasicMaterial, Quaternion, Vector3 } from 'three'

import { applyLiveDepthBias } from '../depthBias'

import { createBillboards } from './icons/billboards'
import { EVENT_ICON_SVG_STYLE, drawingSvg } from './icons/flat/eventIconSvg'
import { PIN_DRAWING } from './icons/flat/pin'
import { withHalos } from './icons/light/haloSquares'
import { EVENT_ICON_PALETTE } from './icons/palette'
import { FLAT_HALO_SPAN, ICON_DEPTH_PULL } from './icons/settings'
import { EVENT_RENDER_ORDER } from './markers'

import type { LoadSvgTexture } from './icons/billboardMaterials'
import type { WorldPoint } from '../relief/drapeProjection'

/** The pins' flat drawings, and what places, turns and fades them. */
export interface PinFlats {
  /** The squares, to add to the scene. */
  readonly object: Group
  /**
   * Stand each drawing at its pin's middle, on the scaled ground.
   * @param scale - the relief's `scale.y`
   * @returns nothing
   */
  standAt: (scale: number) => void
  /**
   * Turn every square to the camera and size it.
   * @param facing - the camera's orientation
   * @param size - how wide a drawing stands, in world units (`flatIconSize`)
   * @returns nothing
   */
  pose: (facing: Quaternion, size: number) => void
  /**
   * Fade the drawings, for the cross-fade with the 3D pins.
   * @param opacity - 0 gone, 1 solid
   * @returns nothing
   */
  setOpacity: (opacity: number) => void
  /** Free the squares, their halos, the material and its texture. */
  dispose(): void
}

/**
 * The pins' flat drawings, one square per pin.
 * @param grounds - where each pin stands, on the relief before exaggeration
 * @param height - how tall a 3D pin stands: its drawing is centred at its middle
 * @param loadTexture - how the drawing's SVG becomes a texture
 * @returns the drawings
 */
export function createPinFlats(
  grounds: readonly WorldPoint[],
  height: number,
  loadTexture: LoadSvgTexture
): PinFlats {
  // One drawing for every pin, see-through and writing no depth, pulled toward the camera by its own width.
  const texture = loadTexture(drawingSvg(PIN_DRAWING, EVENT_ICON_PALETTE, EVENT_ICON_SVG_STYLE))
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  const pull = { value: 0 }
  applyLiveDepthBias(material, 'built-in', pull)
  // Each drawing with the icons' halo behind it, so it detaches from what it is drawn over (ATLAS-306).
  const drawings = createBillboards(
    grounds.map(() => 'pin'),
    () => material,
    EVENT_RENDER_ORDER
  )
  const squares = withHalos(drawings, {
    count: grounds.length,
    fade: (opacity) => {
      material.opacity = opacity
    },
    pull,
    span: FLAT_HALO_SPAN,
  })
  const positions = grounds.map(([x, y, z]) => new Vector3(x, y + height / 2, z))
  const object = new Group()
  object.add(squares.object)
  let facing = new Quaternion()
  let size = 0

  return {
    object,
    standAt(scale: number): void {
      grounds.forEach(([, y], index) => positions[index]?.setY(y * scale + height / 2))
      squares.poseAll(positions, facing, size)
    },
    pose(turn: Quaternion, width: number): void {
      facing = turn
      size = width
      pull.value = width * ICON_DEPTH_PULL
      squares.poseAll(positions, facing, size)
    },
    setOpacity(opacity: number): void {
      squares.setOpacity(opacity)
    },
    dispose(): void {
      squares.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}
