/**
 * The seas' names on the map (ATLAS-440): each name an image stretched along its arc across its sea — a ribbon of
 * quads following the curve, the image's top on the arc's left — fixed, see-through, never placed by a computation
 * (`core/data/seaNames`). Unlit, writing no depth, drawn over whatever lies under it, as the compass rose.
 */

import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three'

import type { Texture } from 'three'

/** A sea's name drawn: the image, and its proportions. */
export interface SeaLabel {
  /** The image. */
  readonly canvas: HTMLCanvasElement
  /** Its width over its height. */
  readonly aspect: number
}

/** A sea's name ready to lay: its image, and its arc in the world. */
export interface PlacedSeaName {
  /** The image. */
  readonly label: SeaLabel
  /** The arc, sampled from its start to its end, as world `[x, z]` — at least two points. */
  readonly arc: readonly (readonly [number, number])[]
  /** The height the name lies at. */
  readonly y: number
}

/** The seas' names on the scene, and their teardown. */
export interface SeaNameLayer {
  /** Every name, as one object. */
  readonly object: Group
  /** Free every geometry, material and texture. */
  dispose(): void
}

/** Drawn over the map's own layers, as the names are: a sea's name is never hidden by the relief near a coast. */
const SEA_NAME_RENDER_ORDER = 20

/**
 * The length of a polyline.
 * @param points - its points
 * @returns the sum of its segments
 */
function lengthOf(points: readonly (readonly [number, number])[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1] ?? [0, 0]
    const [bx, bz] = points[i] ?? [0, 0]
    total += Math.hypot(bx - ax, bz - az)
  }
  return total
}

/**
 * A ribbon along an arc: two vertices at each point of it, half the name's height either side, the image's `u` running
 * along the arc's length and its top (`v = 1`) on the arc's left — the north side for a name read west to east.
 * @param arc - the arc's points, world `[x, z]`
 * @param height - the ribbon's height, world units
 * @param y - the height it lies at
 * @returns the geometry
 */
export function ribbonGeometry(
  arc: readonly (readonly [number, number])[],
  height: number,
  y: number
): BufferGeometry {
  const total = lengthOf(arc)
  const positions: number[] = []
  const uvs: number[] = []
  let along = 0
  arc.forEach(([x, z], i) => {
    if (i > 0) {
      const [px, pz] = arc[i - 1] ?? [x, z]
      along += Math.hypot(x - px, z - pz)
    }
    // The direction here, from the neighbours either side; its left, seen from above, is (dz, −dx).
    const [ax, az] = arc[Math.max(0, i - 1)] ?? [x, z]
    const [bx, bz] = arc[Math.min(arc.length - 1, i + 1)] ?? [x, z]
    const run = Math.hypot(bx - ax, bz - az) || 1
    const lx = (bz - az) / run
    const lz = -(bx - ax) / run
    const u = total === 0 ? 0 : along / total
    positions.push(
      x + (lx * height) / 2,
      y,
      z + (lz * height) / 2,
      x - (lx * height) / 2,
      y,
      z - (lz * height) / 2
    )
    uvs.push(u, 1, u, 0)
  })
  const indices: number[] = []
  for (let i = 0; i + 1 < arc.length; i++) {
    const top = 2 * i
    indices.push(top, top + 1, top + 2, top + 1, top + 3, top + 2)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  return geometry
}

/**
 * Lay the seas' names.
 * @param names - each name, drawn, and its arc
 * @param opacity - how see-through they are
 * @param toTexture - an image to a texture — the browser's canvas texture, a stand-in in a test
 * @returns the layer
 */
export function createSeaNameLayer(
  names: readonly PlacedSeaName[],
  opacity: number,
  toTexture: (canvas: HTMLCanvasElement) => Texture = (canvas) => new CanvasTexture(canvas)
): SeaNameLayer {
  const object = new Group()
  const owned: { dispose: () => void }[] = []
  for (const name of names) {
    const texture = toTexture(name.label.canvas)
    // The name's height follows its length along the arc, so its letters keep their proportions.
    const geometry = ribbonGeometry(name.arc, lengthOf(name.arc) / name.label.aspect, name.y)
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
    })
    const mesh = new Mesh(geometry, material)
    mesh.renderOrder = SEA_NAME_RENDER_ORDER
    object.add(mesh)
    owned.push(geometry, material, texture)
  }
  return {
    object,
    dispose(): void {
      for (const one of owned) one.dispose()
    },
  }
}
