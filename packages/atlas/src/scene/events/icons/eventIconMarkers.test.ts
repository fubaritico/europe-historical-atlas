import {
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  ShaderLib,
  Texture,
  Vector3,
} from 'three'
import { describe, expect, it, vi } from 'vitest'

import { DEPTH_BIAS_UNIFORM } from '../../depthBias'
import { compileHook } from '../../testing/compileHook'
import { EVENT_RENDER_ORDER } from '../markers'
import { SHADOW_OPACITY } from '../shadows/shadowFootprint'

import { createEventIconMarkers } from './eventIconMarkers'
import {
  EVENT_ICON_HEIGHT,
  ICON_CROSS_FADE,
  ICON_DEPTH_PULL,
  ICON_FLAT_MIN_PIXELS,
  ICON_FLAT_RAISE,
  ICON_FLAT_SPAN,
  ICON_HALO_SPAN,
  ICON_LIFT,
  ICON_SIZE,
  ICON_SWAY,
  ICON_YAW,
} from './settings'

import type { PlacedEventIcon } from './forms'
import type { EventIconKind } from './kinds'
import type { BufferGeometry, Material, MeshBasicMaterial } from 'three'

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
  object.children[0]?.traverse((child) => {
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

/** A flat ground, at zero, for the shadows. */
const FLAT = (): number => 0

/**
 * The icons' shadows' mesh: the one plain mesh among the markers.
 * @param object - the markers' group
 * @returns it
 */
function shadowMesh(object: Group): Mesh<BufferGeometry, MeshBasicMaterial> {
  let found: Mesh<BufferGeometry, MeshBasicMaterial> | undefined
  object.traverse((child) => {
    if (child instanceof Mesh && !(child instanceof InstancedMesh))
      found = child as Mesh<BufferGeometry, MeshBasicMaterial>
  })
  if (found === undefined) throw new Error('no shadow mesh')
  return found
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

/**
 * How far a material pulls toward the camera once compiled.
 * @param material - the material
 * @returns the pull's uniform, or `undefined` for a material not pulled
 */
function pulled(material: Material): unknown {
  return compileHook(material, ShaderLib.basic.vertexShader).uniforms[DEPTH_BIAS_UNIFORM]
}

describe('createEventIconMarkers', () => {
  describe('happy path', () => {
    it('stands one icon on each place', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
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
      const markers = createEventIconMarkers(TWO, STUB, FLAT, 0.5)
      expect(iconPose(markers.object, 'swords').scale.toArray()).toEqual([0.5, 0.5, 0.5])
    })
  })

  describe('variants', () => {
    it('moves the siege’s trebuchet arm with the frame’s time, its frame left still', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const turnOf = (name: string): number => {
        const mesh = instanced(markers.object).find((each) => each.name === name)
        if (mesh === undefined) throw new Error(`no ${name}`)
        const matrix = new Matrix4()
        mesh.getMatrixAt(0, matrix)
        const turn = new Quaternion()
        matrix.decompose(new Vector3(), turn, new Vector3())
        return turn.angleTo(new Quaternion())
      }
      // At the end of the throw, the arm is turned; the frame stands as it was, in its three-quarter.
      markers.faceCamera(cameraAt(new Vector3(0, 5, 5), new Euler(-0.8, 0, 0)), 3.1)
      expect(turnOf('tower wood arm')).toBeGreaterThan(1)
      expect(turnOf('tower wood')).toBeCloseTo(Math.abs(ICON_YAW.tower))
    })

    it('stands them the default height when none is given, each kind at its own size', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      expect(iconPose(markers.object, 'swords').scale.y).toBeCloseTo(EVENT_ICON_HEIGHT)
      expect(iconPose(markers.object, 'tower').scale.y).toBeCloseTo(
        EVENT_ICON_HEIGHT * ICON_SIZE.tower
      )
    })

    it('orders the 3D icons after the borders, and their halos just before them', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const [halosGroup, iconsGroup] = markers.object.children[0]?.children ?? []
      expect(iconsGroup?.renderOrder).toBe(EVENT_RENDER_ORDER)
      expect(halosGroup?.renderOrder).toBe(EVENT_RENDER_ORDER - 1)
    })

    it('pulls the 3D icons and their halo toward the camera alike, by an icon height', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT, 0.5)
      const pull = { value: 0.5 * ICON_DEPTH_PULL }
      for (const mesh of instanced(markers.object))
        expect(pulled(mesh.material as Material)).toEqual(pull)
      expect(pulled(squareMaterial(markers.object, 'halo'))).toEqual(pull)
    })

    it('pulls every kind’s flat drawing toward the camera by its own width', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT, 0.5)
      const pull = { value: 0.5 * ICON_FLAT_SPAN * ICON_DEPTH_PULL }
      expect(pulled(squareMaterial(markers.object, 'swords'))).toEqual(pull)
      expect(pulled(squareMaterial(markers.object, 'tower'))).toEqual(pull)
    })

    it('pulls a flat drawing further as the zoom widens it, with no recompile', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      // Compiled once, as three does at the first frame; the zoom then changes the drawing's width.
      const pull = pulled(squareMaterial(markers.object, 'swords'))
      markers.setZoom(0, 10)
      const width = squarePose(markers.object, 'swords').scale.x
      expect(width).toBeCloseTo(ICON_FLAT_MIN_PIXELS / 10)
      expect(pull).toEqual({ value: width * ICON_DEPTH_PULL })
    })

    it('draws every icon of a kind with one object per colour, however many icons there are', () => {
      // ATLAS-289: the 3D swords' three colours, the halos, the swords' flat drawing — five objects, whatever the count.
      const one = allInstanced(createEventIconMarkers(battles(1), STUB, FLAT).object)
      const hundred = allInstanced(createEventIconMarkers(battles(100), STUB, FLAT).object)
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
        STUB,
        FLAT
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
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const camera = cameraAt(new Vector3(4, 3, 6), new Euler(-0.4, 0.3, 0))
      markers.faceCamera(camera, 0)
      // At time 0 only the first icon is at the still point of its sway; the next is out of step.
      const swords = iconPose(markers.object, 'swords')
      const front = new Vector3(0, 0, 1).applyQuaternion(swords.quaternion)
      const toCamera = camera.position.clone().sub(swords.position).normalize()
      expect(front.angleTo(toCamera)).toBeCloseTo(0)
    })

    it('sways an icon about its own upright, either side of facing the camera', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
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

    it('leaves the siege upright and still in its three-quarter, however the camera turns and time passes', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const camera = cameraAt(new Vector3(4, 3, 6), new Euler(-0.4, 0.3, 0))
      // Its throw, built east, turned to the west and toward the south, where the camera looks from: facing left.
      const threeQuarter = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), ICON_YAW.tower)
      for (const seconds of [0, ICON_SWAY.periodSeconds / 4, 7.3]) {
        markers.faceCamera(camera, seconds)
        const turn = iconPose(markers.object, 'tower').quaternion
        expect(turn.angleTo(threeQuarter)).toBeCloseTo(0)
        const throwsTo = new Vector3(1, 0, 0).applyQuaternion(turn)
        expect(throwsTo.x).toBeLessThan(-0.8)
        expect(throwsTo.z).toBeGreaterThan(0.3)
      }
    })

    it('still turns the swords beside a still tower', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const swords = (): Quaternion => iconPose(markers.object, 'swords').quaternion.clone()
      const before = swords()
      markers.faceCamera(cameraAt(new Vector3(4, 3, 6), new Euler(-0.4, 0.3, 0)), 0)
      expect(swords().angleTo(before)).toBeGreaterThan(0.1)
    })

    it('floats the crossed swords above their place, and stands the tower on it', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      expect(iconPose(markers.object, 'swords').position.y).toBeCloseTo(
        0.2 + ICON_LIFT.swords * EVENT_ICON_HEIGHT
      )
      expect(iconPose(markers.object, 'tower').position.y).toBeCloseTo(0.3)
    })

    it('keeps the swords floating as high above an exaggerated relief', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      markers.setReliefScale(3)
      expect(iconPose(markers.object, 'swords').position.y).toBeCloseTo(
        0.6 + ICON_LIFT.swords * EVENT_ICON_HEIGHT
      )
    })

    it('keeps an icon planted when the relief is exaggerated', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      markers.setReliefScale(3)
      expect(iconPose(markers.object, 'tower').position.y).toBeCloseTo(0.9)
    })

    it('shows only the flat icons far out and only the 3D ones close in', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const [close, afar] = markers.object.children
      markers.setZoom(0, 100)
      expect([close?.visible, afar?.visible]).toEqual([false, true])
      markers.setZoom(1, 100)
      expect([close?.visible, afar?.visible]).toEqual([true, false])
    })

    it('fades the one into the other at the cross-fade’s middle, both half there', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      markers.setZoom(ICON_CROSS_FADE.zoom, 100)
      const [close, afar] = markers.object.children
      expect([close?.visible, afar?.visible]).toEqual([true, true])
      expect(squareMaterial(markers.object, 'swords').opacity).toBeCloseTo(0.5)
      expect(squareMaterial(markers.object, 'halo').opacity).toBeCloseTo(0.5)
      // Every piece but the trebuchet's stone, which fades on its own — gone at rest.
      for (const mesh of instanced(markers.object).filter(({ name }) => !name.endsWith(' stone')))
        expect((mesh.material as Material).opacity).toBeCloseTo(0.5)
      // The shadows fade with the 3D icons, from their own darkness.
      expect(shadowMesh(markers.object).material.opacity).toBeCloseTo(SHADOW_OPACITY * 0.5)
    })

    it('casts every icon’s shadow in one mesh, drawn from its pose as one shape', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      markers.faceCamera(cameraAt(new Vector3(4, 3, 6), new Euler(-0.4, 0.3, 0)), 0)
      const mesh = shadowMesh(markers.object)
      const alpha = (mesh.material.map?.image as { data: Uint8Array }).data.filter(
        (_, k) => k % 4 === 3
      )
      expect(alpha.some((value) => value > 0)).toBe(true)
    })

    it('centres a flat icon a little above its 3D twin’s middle, about as wide as the twin', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
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
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const camera = cameraAt(new Vector3(0, 5, 5), new Euler(-0.8, 0.4, 0))
      markers.faceCamera(camera, 0)
      for (const name of ['halo', 'swords', 'tower'])
        expect(squarePose(markers.object, name).quaternion.angleTo(camera.quaternion)).toBeCloseTo(
          0
        )
    })

    it('keeps a flat drawing its legible size on screen when the camera pulls far out', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      markers.setZoom(0, 10)
      expect(squarePose(markers.object, 'tower').scale.x * 10).toBeCloseTo(ICON_FLAT_MIN_PIXELS)
    })

    it('rasterises one flat drawing per kind, however many icons share it', () => {
      const load = vi.fn(() => new Texture())
      createEventIconMarkers([...TWO, { ground: [0, 0, 0], kind: 'swords' }], load, FLAT)
      expect(load).toHaveBeenCalledTimes(2)
    })

    it('sets a halo behind each 3D icon, at its middle, as wide as its span', () => {
      const markers = createEventIconMarkers(TWO, STUB, FLAT)
      const halo = squarePose(markers.object, 'halo', 1)
      expect(halo.position.y).toBeCloseTo(
        iconPose(markers.object, 'tower').position.y + (EVENT_ICON_HEIGHT * ICON_SIZE.tower) / 2
      )
      expect(halo.scale.x).toBeCloseTo(EVENT_ICON_HEIGHT * ICON_HALO_SPAN)
    })

    it('frees the instances, the halo’s and the flat drawings’ textures on dispose', () => {
      const texture = new Texture()
      const markers = createEventIconMarkers(TWO, () => texture, FLAT)
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
      expect(allInstanced(createEventIconMarkers([], STUB, FLAT).object)).toHaveLength(0)
    })
  })
})
