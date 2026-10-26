import {
  Box3,
  DirectionalLight,
  Euler,
  Group,
  Light,
  Matrix4,
  Quaternion,
  Sprite,
  Texture,
  Vector3,
} from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  EVENT_ICON_HEIGHT,
  ICON_CROSS_FADE,
  ICON_FLAT_MIN_PIXELS,
  ICON_FLAT_RAISE,
  ICON_FLAT_SPAN,
  ICON_LIFT,
  ICON_SWAY,
  cameraUp,
  createEventIconMarkers,
  facingCamera,
  flatIconSize,
  iconCrossFade,
  iconSway,
} from './eventIconMarkers'
import { EVENT_RENDER_ORDER } from './eventMarkers'

import type { PlacedEventIcon } from './eventIconMarkers'
import type { Material, Mesh } from 'three'

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
function pose(position: Vector3, turn: Euler) {
  return { position, quaternion: new Quaternion().setFromEuler(turn) }
}

/** A rasteriser that makes an empty texture, for the flat icons. */
const STUB = vi.fn(() => new Texture())

/**
 * The 3D icons of the markers: the close-up group (after the lights), past its halos.
 * @param object - the markers' group
 * @returns the icons
 */
function icons(object: Group): Group[] {
  return (object.children[1]?.children.slice(1) ?? []).filter(
    (child): child is Group => child instanceof Group
  )
}

/**
 * The flat icons of the markers, shown from afar.
 * @param object - the markers' group
 * @returns the sprites
 */
function flats(object: Group): Sprite[] {
  return (object.children[2]?.children ?? []).filter(
    (child): child is Sprite => child instanceof Sprite
  )
}

/**
 * The halos behind the 3D icons.
 * @param object - the markers' group
 * @returns the sprites
 */
function halos(object: Group): Sprite[] {
  return (object.children[1]?.children[0]?.children ?? []).filter(
    (child): child is Sprite => child instanceof Sprite
  )
}

describe('createEventIconMarkers', () => {
  describe('happy path', () => {
    it('stands one icon on each place', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const placed = icons(markers.object)
      expect(placed).toHaveLength(2)
      // The tower stands on its place; the swords float above theirs (see the edge cases).
      expect(placed[1]?.position.toArray()).toEqual([2, 0.3, 0])
    })

    it('scales each icon to the height given', () => {
      const [icon] = icons(createEventIconMarkers(TWO, STUB, 0.5).object)
      if (icon === undefined) throw new Error('no icon')
      const box = new Box3().setFromObject(icon)
      expect(box.max.y - box.min.y).toBeCloseTo(0.5)
    })
  })

  describe('variants', () => {
    it('stands them the default height when none is given', () => {
      const [icon] = icons(createEventIconMarkers(TWO, STUB).object)
      if (icon === undefined) throw new Error('no icon')
      const box = new Box3().setFromObject(icon)
      expect(box.max.y - box.min.y).toBeCloseTo(EVENT_ICON_HEIGHT)
    })

    it('orders every icon after the borders', () => {
      for (const icon of icons(createEventIconMarkers(TWO, STUB).object)) {
        expect(icon.renderOrder).toBe(EVENT_RENDER_ORDER)
      }
    })

    it('carries its own lights', () => {
      const lights: Light[] = []
      createEventIconMarkers(TWO, STUB).object.traverse((child) => {
        if (child instanceof Light) lights.push(child)
      })
      expect(lights.some((light) => light instanceof DirectionalLight)).toBe(true)
    })
  })

  // L3: N/A — nothing is refused: the places come already on the map
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('turns an icon to face the camera’s position at the still point of its sway', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const camera = pose(new Vector3(4, 3, 6), new Euler(-0.4, 0.3, 0))
      markers.faceCamera(camera, 0)
      // At time 0 only the first icon is at the still point of its sway; the next is out of step.
      const [swords] = icons(markers.object)
      if (swords === undefined) throw new Error('no icon')
      const front = new Vector3(0, 0, 1).applyQuaternion(swords.quaternion)
      const toCamera = camera.position.clone().sub(swords.position).normalize()
      expect(front.angleTo(toCamera)).toBeCloseTo(0)
    })

    it('sways an icon about its own upright, either side of facing the camera', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const [swords] = icons(markers.object)
      if (swords === undefined) throw new Error('no icon')
      // A camera due south of the swords, level with them: facing it is no turn at all.
      const camera = pose(new Vector3(1, swords.position.y, 9), new Euler(0, 0, 0))
      markers.faceCamera(camera, ICON_SWAY.periodSeconds / 4)
      expect(swords.rotation.y).toBeCloseTo(ICON_SWAY.amplitudeRad)
      markers.faceCamera(camera, (3 * ICON_SWAY.periodSeconds) / 4)
      expect(swords.rotation.y).toBeCloseTo(-ICON_SWAY.amplitudeRad)
    })

    it('turns the lights with the camera, so the rim stays behind the icons', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const camera = pose(new Vector3(0, 5, 5), new Euler(-1, 0.5, 0))
      markers.faceCamera(camera, 0)
      expect(markers.object.children[0]?.quaternion.angleTo(camera.quaternion)).toBeCloseTo(0)
    })

    it('floats the crossed swords above their place, and stands the tower on it', () => {
      const [swords, tower] = icons(createEventIconMarkers(TWO, STUB).object)
      expect(swords?.position.y).toBeCloseTo(0.2 + ICON_LIFT.swords * EVENT_ICON_HEIGHT)
      expect(tower?.position.y).toBeCloseTo(0.3)
    })

    it('keeps the swords floating as high above an exaggerated relief', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      markers.setReliefScale(3)
      expect(icons(markers.object)[0]?.position.y).toBeCloseTo(
        0.6 + ICON_LIFT.swords * EVENT_ICON_HEIGHT
      )
    })

    it('keeps an icon planted when the relief is exaggerated', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      markers.setReliefScale(3)
      expect(icons(markers.object)[1]?.position.y).toBeCloseTo(0.9)
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
      expect(flats(markers.object)[0]?.material.opacity).toBeCloseTo(0.5)
      expect(halos(markers.object)[0]?.material.opacity).toBeCloseTo(0.5)
      const [swords] = icons(markers.object)
      const mesh = swords?.children[0] as Mesh<never, Material> | undefined
      expect(mesh?.material.opacity).toBeCloseTo(0.5)
    })

    it('centres a flat icon a little above its 3D twin’s middle, about as wide as the twin', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const [flat] = flats(markers.object)
      const [swords] = icons(markers.object)
      expect(flat?.position.y).toBeCloseTo(
        (swords?.position.y ?? 0) + EVENT_ICON_HEIGHT * (0.5 + ICON_FLAT_RAISE)
      )
      markers.setZoom(ICON_CROSS_FADE.zoom, 10_000)
      expect(flat?.scale.x).toBeCloseTo(EVENT_ICON_HEIGHT * ICON_FLAT_SPAN)
      markers.setReliefScale(3)
      expect(flat?.position.y).toBeCloseTo(
        0.6 + ICON_LIFT.swords * EVENT_ICON_HEIGHT + EVENT_ICON_HEIGHT * (0.5 + ICON_FLAT_RAISE)
      )
    })

    it('rasterises one flat drawing per kind, however many icons share it', () => {
      const load = vi.fn(() => new Texture())
      createEventIconMarkers([...TWO, { ground: [0, 0, 0], kind: 'swords' }], load)
      expect(load).toHaveBeenCalledTimes(2)
    })

    it('sets a halo behind each 3D icon, drawn just before it', () => {
      const markers = createEventIconMarkers(TWO, STUB)
      const [halo] = halos(markers.object)
      const [swords] = icons(markers.object)
      expect(halo?.position.y).toBeCloseTo((swords?.position.y ?? 0) + EVENT_ICON_HEIGHT / 2)
      expect(markers.object.children[1]?.children[0]?.renderOrder).toBe(EVENT_RENDER_ORDER - 1)
    })

    it('frees the halo’s and the flat drawings’ textures on dispose', () => {
      const texture = new Texture()
      const markers = createEventIconMarkers(TWO, () => texture)
      const halo = halos(markers.object)[0]?.material.map
      const spies = [vi.spyOn(texture, 'dispose'), ...(halo ? [vi.spyOn(halo, 'dispose')] : [])]
      markers.dispose()
      expect(spies).toHaveLength(2)
      for (const spy of spies) expect(spy).toHaveBeenCalled()
    })

    it('builds no icon, only the light, for no places', () => {
      expect(icons(createEventIconMarkers([], STUB).object)).toHaveLength(0)
    })
  })
})

describe('iconSway', () => {
  it('is still at the start', () => {
    expect(iconSway(0, 0)).toBeCloseTo(0)
  })

  it('reaches its full swing a quarter of a period in', () => {
    expect(iconSway(ICON_SWAY.periodSeconds / 4, 0)).toBeCloseTo(ICON_SWAY.amplitudeRad)
  })

  it('never swings past its swing', () => {
    for (let second = 0; second < 8; second += 0.1) {
      expect(Math.abs(iconSway(second, 3))).toBeLessThanOrEqual(ICON_SWAY.amplitudeRad + 1e-9)
    }
  })

  it('sways two icons out of step', () => {
    expect(iconSway(1, 1)).not.toBeCloseTo(iconSway(1, 0))
  })
})

/**
 * Face an icon to a camera, the way a frame does.
 * @param at - where the icon stands
 * @param camera - the camera
 * @returns the icon's orientation
 */
function face(at: Vector3, camera: ReturnType<typeof pose>): Quaternion {
  const up = cameraUp(camera, new Vector3())
  return facingCamera(at, camera.position, up, new Quaternion(), new Matrix4())
}

describe('facingCamera', () => {
  it('faces a camera due south, level, with no turn', () => {
    const at = new Vector3(0, 0, 0)
    const turned = face(at, pose(new Vector3(0, 0, 5), new Euler()))
    expect(turned.angleTo(new Quaternion())).toBeCloseTo(0)
  })

  it('leans back toward a camera above it, keeping its top toward the camera’s up', () => {
    const at = new Vector3(0, 0, 0)
    const above = pose(new Vector3(0, 5, 2), new Euler(-1.19, 0, 0))
    const turned = face(at, above)
    const front = new Vector3(0, 0, 1).applyQuaternion(turned)
    expect(front.y).toBeGreaterThan(0.9)
    expect(new Vector3(0, 1, 0).applyQuaternion(turned).z).toBeLessThan(0)
  })

  it('faces the camera’s position, not its orientation, when off the middle of the view', () => {
    const at = new Vector3(3, 0, 0)
    const camera = pose(new Vector3(0, 0, 5), new Euler())
    const front = new Vector3(0, 0, 1).applyQuaternion(face(at, camera))
    expect(front.x).toBeLessThan(-0.4)
  })
})

describe('iconCrossFade', () => {
  it('is the flat icon alone below the span and the 3D icon alone above it', () => {
    expect(iconCrossFade(ICON_CROSS_FADE.zoom - ICON_CROSS_FADE.span)).toBe(0)
    expect(iconCrossFade(ICON_CROSS_FADE.zoom + ICON_CROSS_FADE.span)).toBe(1)
  })

  it('is half and half at its middle, and grows with the zoom', () => {
    expect(iconCrossFade(ICON_CROSS_FADE.zoom)).toBeCloseTo(0.5)
    expect(iconCrossFade(ICON_CROSS_FADE.zoom + 0.02)).toBeGreaterThan(0.5)
  })
})

describe('flatIconSize', () => {
  it('is the 3D icon’s size when that is large enough on screen', () => {
    expect(flatIconSize(0.05, 10_000)).toBeCloseTo(0.05 * ICON_FLAT_SPAN)
  })

  it('keeps its fewest pixels when the 3D icon would be smaller on screen', () => {
    expect(flatIconSize(0.05, 10) * 10).toBeCloseTo(ICON_FLAT_MIN_PIXELS)
  })
})
