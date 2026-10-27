/**
 * What every 3D icon is made of: parts — a geometry and a colour each — and the two steps every icon goes through,
 * whatever its shape: fitted one unit high, then fused per colour, each with one faceted material (`iconModel`). A
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
  /** The build units' scale: the height that became one. */
  scale: number
  /** The build units' floor: the height that became zero. */
  floor: number
}

/**
 * Scale and lift an icon's parts so the whole stands one unit high on the origin — so every kind is built at
 * whatever size reads best, and they all come out alike.
 * @param parts - the parts, their geometries placed
 * @returns the same parts, their geometries fitted, and the fit that did it
 */
export function standUnitHigh(parts: Part[]): { parts: Part[]; fit: Fit } {
  // 1. The box around the whole icon: each part's own box, moved to where the part sits, all joined.
  const box = new Box3()
  for (const part of parts) {
    part.geometry.computeBoundingBox()
    const own = part.geometry.boundingBox
    if (own === null) continue
    const placed = own.clone()
    if (part.at !== undefined) placed.translate(new Vector3(...part.at))
    box.union(placed)
  }

  // 2. The scale that makes that box one unit high.
  const height = box.max.y - box.min.y
  const scale = 1 / height

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
  return { parts, fit: { scale, floor: box.min.y } }
}
