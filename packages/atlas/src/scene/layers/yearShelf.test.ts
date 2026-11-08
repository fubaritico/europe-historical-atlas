import { Object3D, Scene } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createMapSources } from '../../sources/mapSources'
import { createDevState } from '../../tunables/devState'

import { createObjectIds, createYearShelf, yearStamp } from './yearShelf'

import type { LayerHandles } from './layerContext'
import type { MapSources } from '../../sources/mapSources'

/** A layer that only records being freed. */
function fakeLayer(): { object: Object3D; dispose: ReturnType<typeof vi.fn> } {
  return { object: new Object3D(), dispose: vi.fn() }
}

/** The handles of a map with no layer yet. */
function emptyHandles(): LayerHandles {
  return {
    relief: null,
    edge: null,
    texture: null,
    coastline: null,
    rhumb: null,
    rivers: null,
    borders: null,
    fills: null,
    fillCut: null,
    tribes: null,
    tribeCut: null,
    names: null,
    events: null,
    compass: null,
    sheet: null,
    frame: null,
    labels: null,
    title: null,
    sheetTexture: null,
  }
}

/**
 * A map showing a year: its polities in the sources, its fills and borders on the scene.
 * @param capacity - how many years the shelf keeps
 * @returns the scene, the sources, the handles, the shelf, and a way to draw a year on screen
 */
function map(capacity = 2) {
  const scene = new Scene()
  const sources: MapSources = createMapSources()
  const handles = emptyHandles()
  const shelf = createYearShelf({ scene, sources, handles, capacity })
  const draw = (year: number) => {
    const fills = fakeLayer()
    const borders = fakeLayer()
    const events = fakeLayer()
    handles.fills = fills as unknown as LayerHandles['fills']
    handles.borders = borders as unknown as LayerHandles['borders']
    handles.events = events as unknown as LayerHandles['events']
    scene.add(fills.object, borders.object, events.object)
    sources.regionSet = { year, regions: [] }
    sources.homageDepth = 2
    return { fills, borders, events }
  }
  return { scene, sources, handles, shelf, draw }
}

// ATLAS-333, the dev, 2026-11-08: « il faut un système de cache » — a year left comes back in a frame.
describe('createYearShelf', () => {
  describe('happy path', () => {
    it('sets 1100 aside off the scene, then puts it back whole', () => {
      const { scene, sources, handles, shelf, draw } = map()
      const { fills, borders, events } = draw(1100)
      shelf.shelve(1100, 'same')
      expect(scene.children).toEqual([])
      expect([handles.fills, sources.regionSet, sources.homageDepth]).toEqual([null, null, 0])

      expect(shelf.restore(1100, 'same')).toBe(true)
      expect(scene.children).toEqual([fills.object, borders.object, events.object])
      expect(sources.regionSet?.year).toBe(1100)
      expect(sources.homageDepth).toBe(2)
      expect(fills.dispose).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('holds a year under its own stamp only', () => {
      const { shelf, draw } = map()
      draw(1100)
      shelf.shelve(1100, 'before')
      expect([
        shelf.holds(1100, 'before'),
        shelf.holds(1100, 'after'),
        shelf.holds(1200, 'before'),
      ]).toEqual([true, false, false])
    })

    it('frees a year built under other settings rather than show it', () => {
      const { scene, sources, shelf, draw } = map()
      const { fills } = draw(1100)
      shelf.shelve(1100, 'before')
      expect(shelf.restore(1100, 'after')).toBe(false)
      expect(fills.dispose).toHaveBeenCalledOnce()
      expect([scene.children, sources.regionSet]).toEqual([[], null])
      expect(shelf.holds(1100, 'before')).toBe(false)
    })

    it('past its capacity, frees the year left longest ago', () => {
      const { shelf, draw } = map(2)
      const first = draw(1100)
      shelf.shelve(1100, 's')
      draw(1200)
      shelf.shelve(1200, 's')
      draw(1214)
      shelf.shelve(1214, 's')
      expect(first.fills.dispose).toHaveBeenCalledOnce()
      expect([shelf.holds(1100, 's'), shelf.holds(1200, 's'), shelf.holds(1214, 's')]).toEqual([
        false,
        true,
        true,
      ])
    })

    // The dev, 2026-11-08 evening: three maps, like a video player's buffer.
    it('frees every year aside outside the window, keeping those in it', () => {
      const { shelf, draw } = map(3)
      const far = draw(1000)
      shelf.shelve(1000, 's')
      const before = draw(1100)
      shelf.shelve(1100, 's')
      shelf.keepOnly([1200, 1300, 1100])
      expect([far.fills.dispose.mock.calls.length, before.fills.dispose.mock.calls.length]).toEqual(
        [1, 0]
      )
      expect([shelf.holds(1000, 's'), shelf.holds(1100, 's')]).toEqual([false, true])
    })
  })

  describe('managed errors', () => {
    it('refuses a capacity of nought', () => {
      expect(() =>
        createYearShelf({
          scene: new Scene(),
          sources: createMapSources(),
          handles: emptyHandles(),
          capacity: 0,
        })
      ).toThrow('at least one year')
    })

    it('refuses to set aside a year with none of its layers on screen, keeping the one already aside', () => {
      const { shelf, draw } = map()
      const first = draw(1100)
      shelf.shelve(1100, 's')
      expect(() => {
        shelf.shelve(1100, 's')
      }).toThrow('none of its layers on screen')
      expect(first.fills.dispose).not.toHaveBeenCalled()
      expect(shelf.holds(1100, 's')).toBe(true)
    })

    it('refuses to put a year back over layers still on screen', () => {
      const { shelf, draw } = map()
      draw(1100)
      shelf.shelve(1100, 's')
      draw(1200)
      expect(() => shelf.restore(1100, 's')).toThrow('set the year aside first')
    })
  })

  describe('unmanaged errors', () => {
    it('answers false for a year never set aside', () => {
      expect(map().shelf.restore(1300, 's')).toBe(false)
    })

    // Review ARCH-004: a map half laid in the background and failing is freed whatever of it is on screen.
    it('frees what is on screen and empties the year, leaving the years aside alone', () => {
      const { scene, sources, handles, shelf, draw } = map()
      const kept = draw(1100)
      shelf.shelve(1100, 's')
      const half = draw(1200)
      handles.borders = null
      shelf.discard()
      expect([half.fills.dispose.mock.calls.length, kept.fills.dispose.mock.calls.length]).toEqual([
        1, 0,
      ])
      expect([handles.fills, sources.regionSet, shelf.holds(1100, 's')]).toEqual([null, null, true])
      expect(scene.children).not.toContain(half.fills.object)
    })
  })

  describe('edge cases', () => {
    it('replaces a year set aside twice, freeing the first copy', () => {
      const { shelf, draw } = map()
      const first = draw(1100)
      shelf.shelve(1100, 's')
      draw(1100)
      shelf.shelve(1100, 's')
      expect(first.fills.dispose).toHaveBeenCalledOnce()
      expect(shelf.holds(1100, 's')).toBe(true)
    })

    it('frees every year set aside at teardown', () => {
      const { shelf, draw } = map()
      const a = draw(1100)
      shelf.shelve(1100, 's')
      const b = draw(1200)
      shelf.shelve(1200, 's')
      shelf.dispose()
      expect([a.borders.dispose.mock.calls.length, b.borders.dispose.mock.calls.length]).toEqual([
        1, 1,
      ])
    })
  })
})

describe('yearStamp', () => {
  const ground = { relief: {}, texture: {} }

  describe('happy path', () => {
    it('is the same for 1100 and 1200 under the same settings and relief', () => {
      const ids = createObjectIds()
      const dev = createDevState()
      const at1100 = yearStamp(dev, ground, ids)
      dev.political.year = 1200
      expect(yearStamp(dev, ground, ids)).toBe(at1100)
    })
  })

  describe('variants', () => {
    it('changes with a setting the countries are built under', () => {
      const ids = createObjectIds()
      const dev = createDevState()
      const before = yearStamp(dev, ground, ids)
      dev.names.capitals = !dev.names.capitals
      expect(yearStamp(dev, ground, ids)).not.toBe(before)
    })

    it('changes with a new relief mesh or texture, the settings the same', () => {
      const ids = createObjectIds()
      const dev = createDevState()
      const before = yearStamp(dev, ground, ids)
      expect(yearStamp(dev, { ...ground, relief: {} }, ids)).not.toBe(before)
      expect(yearStamp(dev, { ...ground, texture: {} }, ids)).not.toBe(before)
    })
  })

  describe('edge cases', () => {
    it('numbers no relief as nought', () => {
      expect(createObjectIds()(null)).toBe(0)
    })
  })

  // L3, L4: N/A — settings in, a string out.
})
