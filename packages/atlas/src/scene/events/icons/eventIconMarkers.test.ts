import {
  DirectionalLight,
  Euler,
  Group,
  InstancedMesh,
  Light,
  Matrix4,
  Quaternion,
  Texture,
  Vector3,
} from 'three'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_RENDER_ORDER } from '../markers'

import { createEventIconMarkers } from './eventIconMarkers'
import {
  EVENT_ICON_HEIGHT,
  ICON_CROSS_FADE,
  ICON_FLAT_MIN_PIXELS,
  ICON_FLAT_RAISE,
  ICON_FLAT_SPAN,
  ICON_HALO_SPAN,
  ICON_LIFT,
  ICON_SWAY,
} from './settings'

import type { PlacedEventIcon } from './forms'
import type { EventIconKind } from './kinds'
import type { Material } from 'three'

const TWO: PlacedEventIcon[] = [
  { ground: [1, 0.2, -1], kind: 'swords' },
  { ground: [2, 0.3, 0], kind: 'tower' },
]

/**
 * A camera standing somewhere, turned some way.
 * @param position - where it stands
 * @param turn - how it is turned
 * @returns its pose
 */
function cameraAt(position: Vector3, turn: Euler) {
  return { position, quaternion: new Quaternion().setFromEuler(turn) }
}

/** A rasteriser that makes an empty texture, for the flat icons. */
const STUB = vi.fn(() => new Texture())

/**
 * The instanced meshes the 3D icons are drawn with: inside the close-up group, past the halos.
 * @param object - the markers' group
 * @returns them
 */
function instanced(object: Group): InstancedMesh[] {
  const meshes: InstancedMesh[] = []
  object.children[1]?.traverse((child) => {
    if (child instanceof InstancedMesh) meshes.push(child as InstancedMesh)
  })
  return meshes
}

/**
 * Where one 3D icon stands, how it is turned and how tall it is, read back from its kind's first piece.
 * @param object - the markers' group
 * @param kind - the icon's kind
 * @param slot - its rank among the icons of its kind
 * @returns its position, orientation and scale
 */
function iconPose(
  object: Group,
  kind: EventIconKind,
  slot = 0
): { position: Vector3; quaternion: Quaternion; scale: Vector3 } {
  const mesh = instanced(object).find((each) => each.name.startsWith(`${kind} `))
  if (mesh === undefined) throw new Error(`no ${kind} instances`)
  const matrix = new Matrix4()
  mesh.getMatrixAt(slot, matrix)
  const pose = { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3() }
  matrix.decompose(pose.position, pose.quaternion, pose.scale)
  return pose
}

/**
 * Every instanced mesh of the markers, close up and from afar.
 * @param object - the markers' group
 * @returns them
 */
function allInstanced(object: Group): InstancedMesh[] {
  const meshes: InstancedMesh[] = []
  object.traverse((child) => {
    if (child instanceof InstancedMesh) meshes.push(child as InstancedMesh)
  })
  return meshes
}

/**
 * Where a facing square stands, how it is turned and how wide it is — a halo (`'halo'`) or a kind's flat drawing.
 * @param object - the markers' group
 * @param name - `'halo'`, or the drawing's kind
 * @param slot - its rank among the squares of that name
 * @returns its position, orientation and scale
 */
function squarePose(
  object: Group,
  name: string,
  slot = 0
): { position: Vector3; quaternion: Quaternion; scale: Vector3 } {
  const mesh = allInstanced(object).find((each) => each.name === name)
  if (mesh === undefined) throw new Error(`no ${name} squares`)
  const matrix = new Matrix4()
  mesh.getMatrixAt(slot, matrix)
  const pose = { position: new Vector3(), quaternion: new Quaternion(), scale: new Vector3() }
  matrix.decompose(pose.position, pose.quaternion, pose.scale)
  return pose
}

/**
 * The material a facing square shows.
 * @param object - the markers' group
 * @param name - `'halo'`, or the drawing's kind
 * @returns it
 */
function squareMaterial(object: Group, name: string): Material {
  const mesh = allInstanced(object).find((each) => each.name === name)
  if (mesh === undefined) throw new Error(`no ${name} squares`)
  return mesh.material as Material
}

/**
 * As many battles as asked, side by side.
 * @param count - how many
 * @returns their places
 */
function battles(count: number): PlacedEventIcon[] {
  return Array.from({ length: count }, (_, i) => ({ ground: [i, 0, 0], kind: 'swords' }))
}

describe('createEventIconMarkers', () => {
  describe('happy path', () => {
    it('stands one icon on each place', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      // The tower stands on its place; the swords float above theirs (see the edge cases).
      // Read back from a float32 instance buffer, so compared to its precision.
      const tower = iconPose(markers.object, 'tower').position
      expect(tower.x).toBeCloseTo(2)
      expect(tower.y).toBeCloseTo(0.3)
      expect(tower.z).toBeCloseTo(0)
      const swords = iconPose(markers.object, 'swords').position
      expect([swords.x, swords.z]).toEqual([1, -1])
    })

    it('scales each icon to the height given', () => {
      const markers = createEventIconMarkers(TWO, STUB, 0.5)
      expect(iconPose(markers.object, 'swords').scale.toArray()).toEqual([0.5, 0.5, 0.5])
    })
  })

  describe('variants', () => {
    it('stands them the default height when none is given', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      expect(iconPose(markers.object, 'tower').scale.y).toBeCloseTo(EVENT_ICON_HEIGHT)
    })

    it('orders the 3D icons after the borders, and their halos just before them', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const [halosGroup, iconsGroup] = markers.object.children[1]?.children ?? []
      expect(iconsGroup?.renderOrder).toBe(EVENT_RENDER_ORDER)
      expect(halosGroup?.renderOrder).toBe(EVENT_RENDER_ORDER - 1)
    })

    it('carries its own lights', () => {
      const lights: Light[] = []
      createEventIconMarkers(TWO, STUB).object.traverse((child) => {
        if (child instanceof Light) lights.push(child)
      })
      expect(lights.some((light) => light instanceof DirectionalLight)).toBe(true)
    })

    it('draws every icon of a kind with one object per colour, however many icons there are', () => {
      // ATLAS-289: the 3D swords' three colours, the halos, the swords' flat drawing — five objects, whatever the count.
      const one = allInstanced(createEventIconMarkers(battles(1), STUB).object)
      const hundred = allInstanced(createEventIconMarkers(battles(100), STUB).object)
      expect(hundred).toHaveLength(one.length)
      expect(hundred.map((mesh) => mesh.count)).toEqual([100, 100, 100, 100, 100])
    })

    it('poses the icons of one kind each in its own slot', () => {
      const markers = createEventIconMarkers(
        [
          { ground: [1, 0, 0], kind: 'swords' },
          { ground: [5, 0, 0], kind: 'tower' },
          { ground: [3, 0, 0], kind: 'swords' },
        ],
        STUB
      )
      expect(iconPose(markers.object, 'swords', 0).position.x).toBe(1)
      expect(iconPose(markers.object, 'swords', 1).position.x).toBe(3)
      expect(iconPose(markers.object, 'tower', 0).position.x).toBe(5)
    })
  })

  // L3: N/A — nothing is refused: the places come already on the map
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('turns an icon to face the camera’s position at the still point of its sway', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const camera = cameraAt(new Vector3(4, 3, 6), new Euler(-0.4, 0.3, 0))
      markers.faceCamera(camera, 0)
      // At time 0 only the first icon is at the still point of its sway; the next is out of step.
      const swords = iconPose(markers.object, 'swords')
      const front = new Vector3(0, 0, 1).applyQuaternion(swords.quaternion)
      const toCamera = camera.position.clone().sub(swords.position).normalize()
      expect(front.angleTo(toCamera)).toBeCloseTo(0)
    })

    it('sways an icon about its own upright, either side of facing the camera', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const height = iconPose(markers.object, 'swords').position.y
      // A camera due south of the swords, level with them: facing it is no turn at all.
      const camera = cameraAt(new Vector3(1, height, 9), new Euler(0, 0, 0))
      const yaw = (): number =>
        new Euler().setFromQuaternion(iconPose(markers.object, 'swords').quaternion).y
      markers.faceCamera(camera, ICON_SWAY.periodSeconds / 4)
      expect(yaw()).toBeCloseTo(ICON_SWAY.amplitudeRad)
      markers.faceCamera(camera, (3 * ICON_SWAY.periodSeconds) / 4)
      expect(yaw()).toBeCloseTo(-ICON_SWAY.amplitudeRad)
    })

    it('turns the lights with the camera, so the rim stays behind the icons', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const camera = cameraAt(new Vector3(0, 5, 5), new Euler(-1, 0.5, 0))
      markers.faceCamera(camera, 0)
      expect(markers.object.children[0]?.quaternion.angleTo(camera.quaternion)).toBeCloseTo(0)
    })

    it('floats the crossed swords above their place, and stands the tower on it', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      expect(iconPose(markers.object, 'swords').position.y).toBeCloseTo(
        0.2 + ICON_LIFT.swords * EVENT_ICON_HEIGHT
      )
      expect(iconPose(markers.object, 'tower').position.y).toBeCloseTo(0.3)
    })

    it('keeps the swords floating as high above an exaggerated relief', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      markers.setReliefScale(3)
      expect(iconPose(markers.object, 'swords').position.y).toBeCloseTo(
        0.6 + ICON_LIFT.swords * EVENT_ICON_HEIGHT
      )
    })

    it('keeps an icon planted when the relief is exaggerated', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      markers.setReliefScale(3)
      expect(iconPose(markers.object, 'tower').position.y).toBeCloseTo(0.9)
    })

    it('shows only the flat icons far out and only the 3D ones close in', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const [, close, afar] = markers.object.children
      markers.setZoom(0, 100)
      expect([close?.visible, afar?.visible]).toEqual([false, true])
      markers.setZoom(1, 100)
      expect([close?.visible, afar?.visible]).toEqual([true, false])
    })

    it('fades the one into the other at the cross-fade’s middle, both half there', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      markers.setZoom(ICON_CROSS_FADE.zoom, 100)
      const [, close, afar] = markers.object.children
      expect([close?.visible, afar?.visible]).toEqual([true, true])
      expect(squareMaterial(markers.object, 'swords').opacity).toBeCloseTo(0.5)
      expect(squareMaterial(markers.object, 'halo').opacity).toBeCloseTo(0.5)
      for (const mesh of instanced(markers.object))
        expect((mesh.material as Material).opacity).toBeCloseTo(0.5)
    })

    it('centres a flat icon a little above its 3D twin’s middle, about as wide as the twin', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const flatAt = (): number => squarePose(markers.object, 'swords').position.y
      const swordsAt = (): number => iconPose(markers.object, 'swords').position.y
      expect(flatAt()).toBeCloseTo(swordsAt() + EVENT_ICON_HEIGHT * (0.5 + ICON_FLAT_RAISE))
      markers.setZoom(ICON_CROSS_FADE.zoom, 10_000)
      expect(squarePose(markers.object, 'swords').scale.x).toBeCloseTo(
        EVENT_ICON_HEIGHT * ICON_FLAT_SPAN
      )
      markers.setReliefScale(3)
      expect(flatAt()).toBeCloseTo(swordsAt() + EVENT_ICON_HEIGHT * (0.5 + ICON_FLAT_RAISE))
    })

    it('turns the halos and the flat drawings as the camera is, as a sprite would', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const camera = cameraAt(new Vector3(0, 5, 5), new Euler(-0.8, 0.4, 0))
      markers.faceCamera(camera, 0)
      for (const name of ['halo', 'swords', 'tower'])
        expect(squarePose(markers.object, name).quaternion.angleTo(camera.quaternion)).toBeCloseTo(
          0
        )
    })

    it('keeps a flat drawing its legible size on screen when the camera pulls far out', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      markers.setZoom(0, 10)
      expect(squarePose(markers.object, 'tower').scale.x * 10).toBeCloseTo(ICON_FLAT_MIN_PIXELS)
    })

    it('rasterises one flat drawing per kind, however many icons share it', () => {
      const load = vi.fn(() => new Texture())
      createEventIconMarkers([...TWO, { ground: [0, 0, 0], kind: 'swords' }], load)
      expect(load).toHaveBeenCalledTimes(2)
    })

    it('sets a halo behind each 3D icon, at its middle, as wide as its span', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const halo = squarePose(markers.object, 'halo', 1)
      expect(halo.position.y).toBeCloseTo(
        iconPose(markers.object, 'tower').position.y + EVENT_ICON_HEIGHT / 2
      )
      expect(halo.scale.x).toBeCloseTo(EVENT_ICON_HEIGHT * ICON_HALO_SPAN)
    })

    it('frees the instances, the halo’s and the flat drawings’ textures on dispose', () => {
      const texture = new Texture()
      const markers = createEventIconMarkers(TWO, () => texture)
      const halo = (squareMaterial(markers.object, 'halo') as Material & { map: Texture | null })
        .map
      const spies = [
        vi.spyOn(texture, 'dispose'),
        ...(halo ? [vi.spyOn(halo, 'dispose')] : []),
        ...allInstanced(markers.object).map((mesh) => vi.spyOn(mesh, 'dispose')),
      ]
      markers.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalled()
    })

    it('builds no icon, only the light, for no places', () => {
      expect(allInstanced(createEventIconMarkers([], STUB).object)).toHaveLength(0)
    })
  })
})
