/**
 * The soft light behind a marker, as squares facing the reader (ATLAS-306): the halo of the 3D icons (the dev,
 * 2026-10-26), laid as well behind the 3D pins and behind every flat drawing seen from afar — the dev, 2026-10-29:
 * *« faire ressortir certaines choses légèrement pour leur donner la lisibilité nécessaire »*, a battle drawn over the
 * name of the Seljuk Empire. One texture (`halo`) and one draw for every halo of a group (`../billboards`).
 */

import { Group, MeshBasicMaterial } from 'three'

import { applyLiveDepthBias } from '../../../depthBias'
import { HALO_RENDER_ORDER } from '../../markers'
import { createBillboards } from '../billboards'

import { ICON_HALO_STYLE, MARKER_HALO_STYLE, createHaloTexture } from './halo'

import type { IconHaloStyle } from './halo'
import type { Billboards } from '../billboards'
import type { Quaternion, Vector3 } from 'three'

/** A group's halos, and what places, fades and frees them. */
export interface HaloSquares {
  /** The squares, to add behind the markers they light. */
  readonly object: Group
  /**
   * Turn every halo to the camera, at its marker's middle, all one size.
   * @param positions - each halo's middle, in the order the markers were given
   * @param facing - the camera's orientation
   * @param size - each halo's side, in world units
   * @returns nothing
   */
  poseAll: (positions: readonly Vector3[], facing: Quaternion, size: number) => void
  /**
   * Fade the halos with their markers' form.
   * @param opacity - 0 gone, 1 whole
   * @returns nothing
   */
  setOpacity: (opacity: number) => void
  /** Free the squares, the material and its texture. */
  dispose: () => void
}

/** What a halo stands behind, and the name its squares carry. */
export const HALO_NAMES = {
  /** A 3D marker seen close up: an icon or a pin. */
  marker: 'halo',
  /** A flat drawing seen from afar. */
  drawing: 'flat halo',
} as const

/** How strong a halo is, by what it stands behind: softer close up than from afar (the dev, 2026-10-29). */
export const HALO_STYLES: Record<keyof typeof HALO_NAMES, IconHaloStyle> = {
  marker: MARKER_HALO_STYLE,
  drawing: ICON_HALO_STYLE,
}

/**
 * One halo per marker of a group, drawn just before the markers ({@link HALO_RENDER_ORDER}).
 * @param count - how many markers
 * @param behind - what the halos stand behind: a 3D marker, or a flat drawing
 * @param pull - how far the halos are pulled toward the camera, read live — the markers' own pull, so a slope cuts
 *   neither
 * @param pull.value - the pull, in world units
 * @returns the halos, whole until faded
 */
export function createHaloSquares(
  count: number,
  behind: keyof typeof HALO_NAMES,
  pull: { value: number }
): HaloSquares {
  const texture = createHaloTexture(HALO_STYLES[behind])
  // Unlit and see-through as a sprite is, writing no depth, so a halo never hides what is drawn after it.
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  applyLiveDepthBias(material, 'built-in', pull)
  const squares = createBillboards(
    Array.from({ length: count }, () => HALO_NAMES[behind]),
    () => material,
    HALO_RENDER_ORDER
  )
  return {
    object: squares.object,
    poseAll(positions: readonly Vector3[], facing: Quaternion, size: number): void {
      squares.poseAll(positions, facing, size)
    },
    setOpacity(opacity: number): void {
      material.opacity = opacity
    },
    dispose(): void {
      squares.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

/** Flat drawings with their halos, posed, faded and freed as one. */
export interface DrawingsWithHalos extends Billboards {
  /**
   * Fade the drawings and their halos together.
   * @param opacity - 0 gone, 1 whole
   * @returns nothing
   */
  setOpacity: (opacity: number) => void
}

/** How the halos follow their drawings. */
export interface DrawingHalos {
  /** How many drawings: one halo each. */
  readonly count: number
  /**
   * How the drawings themselves fade — their materials are theirs.
   * @param opacity - 0 gone, 1 whole
   */
  readonly fade: (opacity: number) => void
  /** The drawings' pull toward the camera, read live, which the halos share. */
  readonly pull: { value: number }
  /** How wide a halo is, in drawing widths. */
  readonly span: number
}

/**
 * Flat drawings with a halo behind each: posing them poses the halos, `span` times as wide, at the same places; fading
 * them fades the halos. The halos are pulled toward the camera with the drawings.
 * @param drawings - the flat drawings
 * @param follow - how many, how they fade, their pull and the halos' span
 * @returns the two as one, freed together
 */
export function withHalos(drawings: Billboards, follow: DrawingHalos): DrawingsWithHalos {
  const { span } = follow
  const halos = createHaloSquares(follow.count, 'drawing', follow.pull)
  // The drawings first among the children; the halos are drawn before them by their order, not their place here.
  const object = new Group()
  object.add(drawings.object, halos.object)
  return {
    object,
    poseAll(positions: readonly Vector3[], facing: Quaternion, size: number): void {
      halos.poseAll(positions, facing, size * span)
      drawings.poseAll(positions, facing, size)
    },
    setOpacity(opacity: number): void {
      follow.fade(opacity)
      halos.setOpacity(opacity)
    },
    dispose(): void {
      halos.dispose()
      drawings.dispose()
    },
  }
}
