import { Color, Group, Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { BORDER_RENDER_ORDER } from '../political/borders/mapBorderLayer'

import { EVENT_ICON_SVG_STYLE, drawingSvg } from './icons/flat/eventIconSvg'
import { PIN_DRAWING } from './icons/flat/pin'
import { EVENT_ICON_PALETTE } from './icons/palette'
import { ICON_CROSS_FADE } from './icons/settings'
import { EVENT_RENDER_ORDER } from './markers'
import { EVENT_MARKER_STYLE, createPinMarkers } from './pin'

import type { PlacedPin } from './pin'
import type { WorldPoint } from '../relief/drapeProjection'
import type { Mesh, MeshLambertMaterial } from 'three'

/**
 * A red pin at a point.
 * @param ground - where it stands
 * @param colour - its head's colour
 * @returns the pin to place
 */
function at(ground: WorldPoint, colour = '#e3170a'): PlacedPin {
  return { ground, colour }
}

/** A stand-in for rasterising the flat drawing. */
const STUB = (): Texture => new Texture()

/**
 * The 3D pins' group: the first of the markers', the flat drawings after it.
 * @param markers - the pins
 * @returns the group holding one group per pin
 */
function near(markers: { object: Group }): Group {
  return markers.object.children[0] as Group
}

/**
 * A pin's stem and head.
 * @param markers - the pins
 * @param index - which pin
 * @returns its two meshes
 */
function parts(markers: { object: Group }, index = 0): Mesh<never, MeshLambertMaterial>[] {
  return (near(markers).children[index] as Group).children as Mesh<never, MeshLambertMaterial>[]
}

describe('createPinMarkers', () => {
  describe('happy path', () => {
    it('stands one pin on each place', () => {
      const markers = createPinMarkers([at([1, 0.2, -1]), at([2, 0.3, 0])], STUB)
      expect(near(markers).children).toHaveLength(2)
      expect(near(markers).children[0]?.position.toArray()).toEqual([1, 0.2, -1])
    })
  })

  describe('variants', () => {
    it('gives each pin a stem and a head', () => {
      expect(parts(createPinMarkers([at([0, 0, 0])], STUB))).toHaveLength(2)
    })

    it('paints each head in its own type’s colour, and the stems in the style’s steel', () => {
      // ATLAS-298: a pin says what kind of event it marks.
      const markers = createPinMarkers([at([0, 0, 0], '#0000ff'), at([1, 0, 0], '#00ff00')], STUB, {
        ...EVENT_MARKER_STYLE,
        stemColor: '#ff0000',
      })
      const [stem, blue] = parts(markers, 0)
      const [, green] = parts(markers, 1)
      expect(blue?.material.color.getHexString()).toBe('0000ff')
      expect(green?.material.color.getHexString()).toBe('00ff00')
      expect(stem?.material.color.getHexString()).toBe('ff0000')
    })

    it('shares one head material between the pins of one colour', () => {
      const markers = createPinMarkers(
        [at([0, 0, 0]), at([1, 0, 0]), at([2, 0, 0], '#0000ff')],
        STUB
      )
      expect(parts(markers, 0)[1]?.material).toBe(parts(markers, 1)[1]?.material)
      expect(parts(markers, 0)[1]?.material).not.toBe(parts(markers, 2)[1]?.material)
    })

    it('lights the stem and the head, matt, the head lighter than its colour', () => {
      // ATLAS-298: lit, the stem reads as a cylinder and the head as a sphere — with no highlight, and the head given
      // more light than the rig's so its colour shows where it is lit.
      const [stem, head] = parts(createPinMarkers([at([0, 0, 0], '#404040')], STUB))
      expect(stem?.material.type).toBe('MeshLambertMaterial')
      expect(head?.material.type).toBe('MeshLambertMaterial')
      expect(head?.material.color.r).toBeGreaterThan(new Color('#404040').r)
    })

    it('draws the pins in the transparent pass, ordered after the borders', () => {
      const markers = createPinMarkers([at([0, 0, 0])], STUB)
      const [stem] = parts(markers)
      expect(stem?.material.transparent).toBe(true)
      expect(near(markers).children[0]?.renderOrder).toBe(EVENT_RENDER_ORDER)
      expect(EVENT_RENDER_ORDER).toBeGreaterThan(BORDER_RENDER_ORDER)
    })
  })

  describe('from afar', () => {
    it('shows the 3D pins close in and their flat drawings far out', () => {
      const markers = createPinMarkers([at([0, 0, 0])], STUB)
      const [, flats] = markers.object.children
      markers.setZoom(0, 100)
      expect([near(markers).visible, flats?.visible]).toEqual([false, true])
      markers.setZoom(1, 100)
      expect([near(markers).visible, flats?.visible]).toEqual([true, false])
    })

    it('fades the 3D pins into their drawings at the icons’ zoom, both half there at its middle', () => {
      const markers = createPinMarkers([at([0, 0, 0])], STUB)
      markers.setZoom(ICON_CROSS_FADE.zoom, 100)
      const [stem, head] = parts(markers)
      expect(stem?.material.opacity).toBeCloseTo(0.5)
      expect(head?.material.opacity).toBeCloseTo(0.5)
    })

    it('rasterises the chosen flat drawing once, for every pin', () => {
      const load = vi.fn<(svg: string) => Texture>(() => new Texture())
      createPinMarkers([at([0, 0, 0]), at([1, 0, 0]), at([2, 0, 0], '#0000ff')], load)
      expect(load).toHaveBeenCalledTimes(1)
      expect(load.mock.calls[0]?.[0]).toBe(
        drawingSvg(PIN_DRAWING, EVENT_ICON_PALETTE, EVENT_ICON_SVG_STYLE)
      )
    })
  })

  // L3: N/A — no input the module refuses: the places and colours come already checked by the content's reader
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('keeps a pin planted when the relief is exaggerated', () => {
      const markers = createPinMarkers([at([0, 0.2, 0])], STUB)
      markers.setReliefScale(3)
      expect(near(markers).children[0]?.position.y).toBeCloseTo(0.6)
    })

    it('builds an empty group for no events', () => {
      expect(near(createPinMarkers([], STUB)).children).toHaveLength(0)
    })

    it('frees the shared geometries and every material on dispose', () => {
      const markers = createPinMarkers([at([0, 0, 0]), at([1, 0, 0], '#0000ff')], STUB)
      const [stem, red] = parts(markers, 0)
      const [, blue] = parts(markers, 1)
      const spies = [
        stem?.geometry,
        red?.geometry,
        stem?.material,
        red?.material,
        blue?.material,
      ].map((resource) => vi.spyOn(resource as { dispose: () => void }, 'dispose'))
      markers.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
