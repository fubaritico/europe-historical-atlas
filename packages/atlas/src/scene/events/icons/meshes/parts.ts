/**
 * What every 3D icon is made of: parts — a geometry and a colour each — and the two steps every icon goes through,
 * whatever its shape: fitted in one box, then fused per colour, each with one faceted material (`iconModel`). A
 * part may move — a trebuchet's arm, its sling, its stone: it names its motion, and its kind says how that motion
 * places it at any moment.
 */

import { Box3, MeshStandardMaterial, Vector3 } from 'three'

import type { EventIconPalette } from '../palette'
import type { BufferGeometry, Matrix4 } from 'three'

/** What a part of an icon is: its geometry, its colour, where it sits. */
export interface Part {
  /** Its geometry, built around its own origin. */
  geometry: BufferGeometry
  /** Its colour, a key of the palette. */
  colour: keyof EventIconPalette
  /** Where its origin goes, `[x, y, z]` — for a moving part, where it stands at rest, for the icon's fit. */
  at?: [number, number, number]
  /** A turn about the vertical axis, in radians. */
  turn?: number
  /**
   * The motion it follows, by name — a trebuchet's `arm`, `sling`, `stone`: its geometry is built about the point the
   * motion places, and that motion (`Motions`) gives its placement at any moment. A part that moves is never fused
   * with one that stands still.
   */
  moves?: string
}

/** How a moving part is placed at a moment — and, if it fades, how much of it shows. */
export interface Motion {
  /**
   * Its placement at a moment, in the units the parts were built in: written into the matrix given, and returned —
   * so a frame allocates nothing. A part hidden at that moment is placed with a scale of zero.
   */
  place: (seconds: number, into: Matrix4) => Matrix4
  /** How much of it shows at a moment, 0 gone to 1 whole — for a part that fades, like a thrown stone. */
  fade?: (seconds: number) => number
}

/** A kind's motions, by the names its parts use. */
export type Motions = Record<string, Motion>

/**
 * A faceted material: `flatShading` gives each face one tone, which is what makes a small low-poly object read as
 * cut rather than smooth.
 * @param colour - its colour
 * @returns the material
 */
export function faceted(colour: string): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: colour,
    flatShading: true,
    // In the transparent pass, so the icons are drawn after the borders, like the pins (`EVENT_RENDER_ORDER`).
    transparent: true,
    roughness: 0.55,
    metalness: 0.1,
  })
}

/** How the parts were fitted: what a placement in their build units goes through to land in the icon's. */
export interface Fit {
  /** The build units' scale: what a length as built is multiplied by. */
  scale: number
  /** The build units' floor: the height that became zero. */
  floor: number
}

/** How far a fitted model reaches, in the units it was fitted to. */
export interface Reach {
  /** Its top above its foot — its own height, which a low model's box is taller than. */
  tall: number
  /** Its widest side on the ground, across or along. */
  wide: number
}

/**
 * The box around a whole icon as built: every point of every part, turned and moved to where the part sits — a
 * moving part where it stands at rest.
 * @param parts - the parts, as built
 * @returns the box, in build units
 */
function boxOf(parts: readonly Part[]): Box3 {
  const box = new Box3()
  const point = new Vector3()
  for (const part of parts) {
    const positions = part.geometry.getAttribute('position')
    const turn = part.turn ?? 0
    const [x, y, z] = part.at ?? [0, 0, 0]
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    for (let index = 0; index < positions.count; index++) {
      const px = positions.getX(index)
      const pz = positions.getZ(index)
      // Turned about the vertical as `placedGeometry` turns it (`Matrix4.makeRotationY`), then moved.
      box.expandByPoint(
        point.set(px * cos + pz * sin + x, positions.getY(index) + y, pz * cos - px * sin + z)
      )
    }
  }
  return box
}

/**
 * Scale and lift an icon's parts so the whole fits a cube standing on the origin, its longest side — its height, or
 * its width for a low and wide model — filling it (the dev, 2026-11-17: *« une boîte qui fait une certaine taille
 * donnée, le modèle est mis dedans avec son maximum de place, et tout le monde a la même échelle, 1 sur 1 »*;
 * ATLAS-469). Fitted one unit **high** before, its width left free, a low open crown came out more than twice as wide
 * as any other icon. The cube's side is the size the model is given: it is written into the points themselves, so
 * no factor stands beside a model.
 * @param parts - the parts, their geometries built
 * @param side - the cube's side: `1`, or the size its kind is given (`ICON_SIZE`)
 * @returns the same parts, their geometries fitted, the fit that did it, and how far the fitted model reaches
 * @throws when the parts hold no point, or all at one — nothing to fit, a defect of the model's construction
 */
export function fitInBox(parts: Part[], side = 1): { parts: Part[]; fit: Fit; reach: Reach } {
  // 1. The box around the whole icon.
  const box = boxOf(parts)

  // 2. The scale that brings that box's longest side to the cube's.
  const height = box.max.y - box.min.y
  const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z)
  const longest = Math.max(height, width)
  if (!(longest > 0)) throw new Error('[atlas] an icon with no extent cannot be fitted in its box')
  const scale = side / longest

  // 3. Each part lifted so the icon's foot is at zero, then scaled.
  for (const part of parts) {
    if (part.at === undefined) {
      part.geometry.translate(0, -box.min.y, 0).scale(scale, scale, scale)
    } else {
      // A placed part is lifted through its position, so its geometry, built about its own origin, is only scaled.
      part.geometry.scale(scale, scale, scale)
      const [x, y, z] = part.at
      part.at = [x * scale, (y - box.min.y) * scale, z * scale]
    }
  }
  return {
    parts,
    fit: { scale, floor: box.min.y },
    reach: { tall: height * scale, wide: width * scale },
  }
}
