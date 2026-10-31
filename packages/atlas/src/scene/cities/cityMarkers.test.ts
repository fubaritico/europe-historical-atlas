import { Euler, Quaternion, Sprite, Texture, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { DETAIL_LEVELS } from '../detail/detailLevels'
import { DETAIL_FADE_SECONDS, viewOf } from '../detail/detailView'
import { EVENT_RENDER_ORDER, HALO_RENDER_ORDER } from '../events/markers'
import { BORDER_RENDER_ORDER } from '../political/borders/mapBorderLayer'
import { NAME_RENDER_ORDER } from '../political/names/nameLayer'

import { layoutLabel } from './cityLabel'
import { CITY_UNDER_NAMES_ORDER, createCityMarkers } from './cityMarkers'

import type { CityLabelImage, DrawCityLabel } from './cityLabel'
import type { PlacedCity } from './cityMarkers'
import type { DetailLevel } from '../detail/detailLevels'

/** A name of 60 × 20 CSS pixels, the city's point 10 pixels left of it. */
const LABEL: CityLabelImage = {
  canvas: document.createElement('canvas'),
  width: 60,
  height: 20,
  anchorX: -10,
}

/** A drawer that answers every name at once. */
const drawn: DrawCityLabel = () => Promise.resolve(LABEL)

/** A texture stub for the marks. */
const loadTexture = (): Texture => new Texture()

const PARIS: PlacedCity = { ground: [1, 0.2, 2], importance: 'capital', name: 'Paris' }
const COLOGNE: PlacedCity = { ground: [3, 0.1, 4], importance: 'large-city', name: 'Cologne' }

/**
 * The view of a level of the pyramid.
 * @param index - the level, furthest first
 * @returns its values
 */
function level(index: number): ReturnType<typeof viewOf> {
  const entry: DetailLevel | undefined = DETAIL_LEVELS[index]
  if (entry === undefined) throw new Error(`no level ${String(index)}`)
  return viewOf(entry, 1, true)
}

/**
 * A city's point and name, in the order they are added.
 * @param object - the markers' group
 * @param index - the city
 * @returns its two sprites
 */
function city(object: { children: unknown[] }, index: number): { point: Sprite; name: Sprite } {
  const sprites = object.children.filter((child): child is Sprite => child instanceof Sprite)
  const point = sprites[index * 2]
  const name = sprites[index * 2 + 1]
  if (point === undefined || name === undefined) throw new Error(`no city ${String(index)}`)
  return { point, name }
}

/** A camera one unit up and one south of the origin, looking down at it at 45°. */
const LOOKING_AT_ORIGIN = {
  position: new Vector3(0, Math.SQRT1_2, Math.SQRT1_2),
  quaternion: new Quaternion().setFromEuler(new Euler(-Math.PI / 4, 0, 0)),
}

/** Paris at the origin, Cologne far off. */
const NEAR: PlacedCity = { ground: [0, 0, 0], importance: 'capital', name: 'Paris' }
const FAR: PlacedCity = { ground: [9, 0, 0], importance: 'capital', name: 'Rome' }

/** Let the names' promises settle. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('createCityMarkers', () => {
  describe('happy path', () => {
    it('shows a capital’s point afar without its name, then its name at the second level', async () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)
      await settle()
      markers.setZoom(0, 100)

      markers.setDetailView(level(0))
      const { point, name } = city(markers.object, 0)
      expect([point.visible, name.visible]).toEqual([true, false])
      markers.setDetailView(level(1))
      expect([point.visible, name.visible]).toEqual([true, true])
    })

    it('sizes the point and the name in screen pixels, the name hung right of the point', async () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)
      await settle()

      markers.setZoom(0, 100)

      const { point, name } = city(markers.object, 0)
      expect(point.scale.x).toBeCloseTo(0.15)
      expect([name.scale.x, name.scale.y]).toEqual([0.6, 0.2])
      expect(name.center.x).toBeCloseTo(-10 / 60)
    })
  })

  describe('variants', () => {
    it('brings a large city’s point at the second level and its name at the third', async () => {
      const markers = createCityMarkers([COLOGNE], loadTexture, drawn)
      await settle()
      const { point, name } = city(markers.object, 0)

      const at = (index: number): boolean[] => {
        markers.setDetailView(level(index))
        return [point.visible, name.visible]
      }

      expect([at(0), at(1), at(2)]).toEqual([
        [false, false],
        [true, false],
        [true, true],
      ])
    })

    it('carries a fade between levels as the opacity', async () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)
      await settle()
      const view = level(1)

      markers.setDetailView({ ...view, cityNames: { ...view.cityNames, capital: 0.5 } })

      expect(city(markers.object, 0).name.material.opacity).toBe(0.5)
    })

    it('multiplies by the startup’s fade', async () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)
      await settle()
      markers.setDetailView(level(0))

      markers.setReveal(0.5)

      expect(city(markers.object, 0).point.material.opacity).toBe(0.5)
    })

    it('stands a city on the exaggerated relief', () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)

      markers.setReliefScale(3)

      const { point, name } = city(markers.object, 0)
      expect(point.position.y).toBeCloseTo(0.6)
      expect(name.position.y).toBeCloseTo(0.6)
    })

    it('draws over the relief, after the events’ shadows and before their halos, pins and icons', () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)

      expect(markers.object.renderOrder).toBeGreaterThan(EVENT_RENDER_ORDER - 2)
      expect(markers.object.renderOrder).toBeLessThan(HALO_RENDER_ORDER)
      expect(city(markers.object, 0).point.material.depthTest).toBe(false)
      expect(city(markers.object, 0).name.material.depthTest).toBe(false)
    })
  })

  describe('the order of the layers', () => {
    it('draws the cities under the countries’ names afar, over them from the second level on', () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)

      markers.setDetailView(level(0))
      const afar = markers.object.renderOrder
      markers.setDetailView(level(1))
      const closer = markers.object.renderOrder

      expect(afar).toBe(CITY_UNDER_NAMES_ORDER)
      expect(afar).toBeGreaterThan(BORDER_RENDER_ORDER)
      expect(afar).toBeLessThan(NAME_RENDER_ORDER)
      expect(closer).toBeGreaterThan(NAME_RENDER_ORDER)
      expect(closer).toBeLessThan(EVENT_RENDER_ORDER)
    })
  })

  describe('the names’ reach', () => {
    it('hides the name of a city far from the camera, its point kept', async () => {
      const markers = createCityMarkers([NEAR, FAR], loadTexture, drawn)
      await settle()
      markers.setDetailView(level(2))

      markers.faceCamera(LOOKING_AT_ORIGIN, 0)

      expect([city(markers.object, 0).name.visible, city(markers.object, 1).name.visible]).toEqual([
        true,
        false,
      ])
      expect(city(markers.object, 1).point.visible).toBe(true)
    })

    it('keeps the name of a city at the bottom of the screen, nearer the camera than the centre', async () => {
      // 1.5 of ground from the centre toward the camera — past a circle of 1.45 around it, which cut it — yet only 1.06
      // from the camera, nearer than the centre itself.
      const below: PlacedCity = { ground: [0, 0, 1.5], importance: 'city', name: 'Tyr' }
      const markers = createCityMarkers([below], loadTexture, drawn)
      await settle()
      markers.setDetailView(level(3))

      markers.faceCamera(LOOKING_AT_ORIGIN, 0)

      expect(city(markers.object, 0).name.visible).toBe(true)
    })

    it('fades a name out in time when its city leaves the reach, never with the distance', async () => {
      const markers = createCityMarkers([FAR], loadTexture, drawn)
      await settle()
      markers.setDetailView(level(2))
      const overFar = {
        position: new Vector3(9, Math.SQRT1_2, Math.SQRT1_2),
        quaternion: LOOKING_AT_ORIGIN.quaternion,
      }
      markers.faceCamera(overFar, 0)

      markers.faceCamera(LOOKING_AT_ORIGIN, DETAIL_FADE_SECONDS / 2)
      expect(city(markers.object, 0).name.material.opacity).toBeCloseTo(0.5)
      markers.faceCamera(LOOKING_AT_ORIGIN, DETAIL_FADE_SECONDS * 2)
      expect(city(markers.object, 0).name.visible).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('keeps a city’s point when its name cannot be drawn, and says so', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const markers = createCityMarkers([PARIS], loadTexture, () =>
        Promise.reject(new Error('no face'))
      )
      await settle()
      markers.setDetailView(level(2))

      const { point, name } = city(markers.object, 0)
      expect([point.visible, name.visible]).toEqual([true, false])
      expect(error).toHaveBeenCalledWith(
        '[Atlas] the name of Paris could not be drawn',
        expect.any(Error)
      )
      error.mockRestore()
    })
  })

  describe('unmanaged errors', () => {
    it('drops a name drawn after the markers were freed', async () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)
      markers.dispose()
      await settle()
      markers.setDetailView(level(2))

      expect(city(markers.object, 0).name.visible).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('shows nothing before the level of detail has spoken', async () => {
      const markers = createCityMarkers([PARIS], loadTexture, drawn)
      await settle()

      markers.setZoom(0, 100)

      const { point, name } = city(markers.object, 0)
      expect([point.visible, name.visible]).toEqual([false, false])
    })

    it('frees each mark’s texture once, shared by every city of its order', () => {
      const textures: Texture[] = []
      const markers = createCityMarkers(
        [PARIS, COLOGNE],
        () => {
          const texture = new Texture()
          textures.push(texture)
          return texture
        },
        drawn
      )
      const spies = textures.map((texture) => vi.spyOn(texture, 'dispose'))

      markers.dispose()

      expect(textures).toHaveLength(3)
      expect(spies.map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1])
    })
  })
})

describe('layoutLabel', () => {
  it('sets the name right of a mark centred on the point, on one middle line', () => {
    expect(layoutLabel(15, 40, 13)).toEqual({ width: 46, height: 25, anchorX: -8.5, textX: 3 })
  })
})
