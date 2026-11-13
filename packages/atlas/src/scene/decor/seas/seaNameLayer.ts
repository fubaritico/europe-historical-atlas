/**
 * The seas' names on the map (ATLAS-440): each name an image laid flat on its sea, along its axis, at its length —
 * fixed, see-through, never placed by a computation (`core/data/seaNames`). Built as the compass rose is: a flat
 * quad per name, unlit, writing no depth, drawn over whatever lies under it.
 */

import { CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'

import type { Texture } from 'three'

/** A sea's name drawn: the image, and its proportions. */
export interface SeaLabel {
  /** The image. */
  readonly canvas: HTMLCanvasElement
  /** Its width over its height. */
  readonly aspect: number
}

/** A sea's name ready to lay: its image, where its middle falls in the world, its direction and its length. */
export interface PlacedSeaName {
  /** The image. */
  readonly label: SeaLabel
  /** The middle of the name, in world coordinates. */
  readonly position: readonly [number, number, number]
  /** Its direction, in radians counter-clockwise from east, seen from above. */
  readonly angle: number
  /** Its length, in world units. */
  readonly length: number
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
 * Lay the seas' names.
 * @param names - each name, drawn and placed
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
    const geometry = new PlaneGeometry(name.length, name.length / name.label.aspect)
    // Flat on the map, its top toward the north (−Z), then turned to its axis.
    geometry.rotateX(-Math.PI / 2)
    geometry.rotateY(name.angle)
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
    })
    const mesh = new Mesh(geometry, material)
    mesh.position.set(name.position[0], name.position[1], name.position[2])
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
