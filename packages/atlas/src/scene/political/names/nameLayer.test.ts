import { MultiplyBlending, NormalBlending } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createSeparateImagesBlur } from '../../blur/separateImages'
import { createSharedImagesBlur } from '../../blur/sharedImages'

import {
  NAME_BLUR_LAYER,
  NAME_RENDER_ORDER,
  createNameLayer,
  haloAtZoom,
  levelWeight,
  watermarkAtZoom,
} from './nameLayer'

import type { NameLayerOptions } from './nameLayer'
import type { PlacedYearName } from '@europe-historical-atlas/core/pipeline/yearNames'
import type { Mesh, ShaderMaterial } from 'three'

/**
 * A name of one letter for a polity.
 * @param polity - whose
 * @returns the name, placed
 */
const name = (polity: string): PlacedYearName => ({
  polity,
  text: 'A',
  form: 'short',
  piece: 0,
  size: 2,
  glyphs: [{ x: 5, y: 5, angle: 0 }],
})

/**
 * A layer of two levels, one letter each.
 * @returns its options
 */
function options(): NameLayerOptions {
  return {
    names: {
      levels: [
        { placed: [name('king')], tooSmall: [] },
        { placed: [name('duke')], tooSmall: [] },
      ],
      gridWidth: 11,
      gridHeight: 11,
      unnamed: [],
    },
    sheet: {
      image: document.createElement('canvas'),
      halo: document.createElement('canvas'),
      cells: new Map([['A', { u0: 0, u1: 1, v0: 0, v1: 1, advance: 0.5 }]]),
      ascent: 0.75,
      descent: 0.25,
    },
    draped: (u, v) => [u, 0, v],
    ink: '#3b2614',
    opacity: 0.5,
    haloOpacity: 0.25,
    haloCells: 1,
    blurMethod: createSeparateImagesBlur(),
  }
}

/**
 * The layer's meshes: each level's white edge, then its ink.
 * @param layer - the layer
 * @param layer.object - its group
 * @param layer.object.children - two meshes per level
 * @returns them, typed
 */
const meshes = (layer: { object: { children: unknown[] } }): Mesh<never, ShaderMaterial>[] =>
  // The blur's quad, never culled, left out: the letters' meshes alone.
  (layer.object.children as Mesh<never, ShaderMaterial>[]).filter((mesh) => mesh.frustumCulled)

/**
 * Each level's ink mesh.
 * @param layer - the layer
 * @param layer.object - its group
 * @param layer.object.children - two meshes per level
 * @returns the inks, by level
 */
const inks = (layer: { object: { children: unknown[] } }): Mesh<never, ShaderMaterial>[] =>
  meshes(layer).filter((_, at) => at % 2 === 1)

/**
 * Each level's white-edge mesh.
 * @param layer - the layer
 * @param layer.object - its group
 * @param layer.object.children - two meshes per level
 * @returns the edges, by level
 */
const edges = (layer: { object: { children: unknown[] } }): Mesh<never, ShaderMaterial>[] =>
  meshes(layer).filter((_, at) => at % 2 === 0)

describe('levelWeight', () => {
  it('shows a level fully at its own detail, half at half a level, none a level away', () => {
    expect([
      levelWeight(1, 1),
      levelWeight(1, 1.5),
      levelWeight(1, 0),
      levelWeight(1, 2.2),
    ]).toEqual([1, 0.5, 0, 0])
  })
})

describe('haloAtZoom', () => {
  const screen = { haloWholeZoom: 0.2, haloGoneZoom: 0.6, watermarkZoom: 0.85, watermarkShare: 0.5 }

  it('keeps the white edge whole up to its zoom, gone from the other, half-way between', () => {
    expect(haloAtZoom(0, screen)).toBe(1)
    expect(haloAtZoom(0.4, screen)).toBeCloseTo(0.5, 9)
    expect(haloAtZoom(0.9, screen)).toBe(0)
  })

  it('steps at one zoom when the two are set alike, rather than dividing by nothing', () => {
    const step = { ...screen, haloWholeZoom: 0.5, haloGoneZoom: 0.5 }
    expect([haloAtZoom(0.49, step), haloAtZoom(0.5, step)]).toEqual([1, 0])
  })
})

describe('watermarkAtZoom', () => {
  const screen = { haloWholeZoom: 0.1, haloGoneZoom: 0.4, watermarkZoom: 0.8, watermarkShare: 0.5 }

  // The dev, 2026-10-29: « lorsqu'on est complètement zoomé, les noms deviennent à 50 % transparents. Tous ».
  it('keeps the names whole until the watermark’s zoom, and at its share at the closest', () => {
    expect([
      watermarkAtZoom(0.5, screen),
      watermarkAtZoom(0.8, screen),
      watermarkAtZoom(1, screen),
    ]).toEqual([1, 1, 0.5])
  })

  it('fades between the two, half-way at half the span', () => {
    expect(watermarkAtZoom(0.9, screen)).toBeCloseTo(0.75, 9)
  })

  it('steps at the closest zoom when the fade starts there, rather than dividing by nothing', () => {
    const late = { ...screen, watermarkZoom: 1 }
    expect([watermarkAtZoom(0.99, late), watermarkAtZoom(1, late)]).toEqual([1, 0.5])
  })
})

describe('createNameLayer', () => {
  describe('happy path', () => {
    it('builds each level’s white edge and its ink, hidden until a detail is set, the ink over the edge', () => {
      const layer = createNameLayer(options())
      expect(meshes(layer)).toHaveLength(4)
      expect(meshes(layer).every((mesh) => !mesh.visible)).toBe(true)
      expect(edges(layer)[0]?.renderOrder).toBe(NAME_RENDER_ORDER)
      expect(inks(layer)[0]?.renderOrder).toBe(NAME_RENDER_ORDER + 1)
      expect(edges(layer)[0]?.geometry).toBe(inks(layer)[0]?.geometry)
    })

    it('inks in multiply, with the premultiplied alpha three needs for it, over the relief', () => {
      const material = inks(createNameLayer(options()))[0]?.material
      expect(material?.blending).toBe(MultiplyBlending)
      expect(material?.premultipliedAlpha).toBe(true)
      expect([material?.depthWrite, material?.depthTest]).toEqual([false, false])
    })

    it('draws the edge from the sheet’s field, off the letters, in the ordinary blend', () => {
      const material = edges(createNameLayer(options()))[0]?.material
      expect(material?.blending).toBe(NormalBlending)
      expect(Object.keys(material?.uniforms ?? {}).sort()).toEqual([
        'edge',
        'field',
        'fieldEm',
        'letters',
        'opacity',
      ])
    })
  })

  describe('variants', () => {
    it('shows the level the detail is at, the ink and the edge at their opacities', () => {
      const layer = createNameLayer(options())
      layer.setDetail(0)
      expect(inks(layer).map((mesh) => mesh.visible)).toEqual([true, false])
      expect([
        inks(layer)[0]?.material.uniforms.opacity?.value,
        edges(layer)[0]?.material.uniforms.opacity?.value,
      ]).toEqual([0.5, 0.25])
    })

    // The dev, 2026-10-29: the names fade in with the countries and the events at startup.
    it('shows the names by the share they have come in, ink and edge alike', () => {
      const layer = createNameLayer(options())
      layer.setDetail(0)
      layer.setReveal(0.5)
      expect([
        inks(layer)[0]?.material.uniforms.opacity?.value,
        edges(layer)[0]?.material.uniforms.opacity?.value,
      ]).toEqual([0.25, 0.125])
    })

    it('crosses from one level to the next as the detail moves between them', () => {
      const layer = createNameLayer(options())
      layer.setDetail(0.5)
      expect(
        inks(layer).map((mesh) => mesh.material.uniforms.opacity?.value as number | undefined)
      ).toEqual([0.25, 0.25])
    })

    it('gives the white edge whole from afar and gone close up', () => {
      const layer = createNameLayer(options())
      const screen = {
        haloWholeZoom: 0.1,
        haloGoneZoom: 0.4,
        watermarkZoom: 0.85,
        watermarkShare: 0.5,
      }
      const edge = (): number | undefined =>
        edges(layer)[0]?.material.uniforms.edge?.value as number | undefined
      layer.setZoom(0, screen)
      expect(edge()).toBe(1)
      layer.setZoom(0.6, screen)
      expect(edge()).toBe(0)
    })
  })

  // L3: N/A — it refuses nothing itself; the geometry refuses a letter with no cell (`nameGeometry`).
  // L4: N/A — no async work.

  describe('watermark', () => {
    it('halves every name’s ink and white edge at the closest zoom, the level’s weight kept', () => {
      const layer = createNameLayer(options())
      layer.setDetail(0)
      layer.setZoom(1, {
        haloWholeZoom: 0.1,
        haloGoneZoom: 0.4,
        watermarkZoom: 0.85,
        watermarkShare: 0.5,
      })
      expect([
        inks(layer)[0]?.material.uniforms.opacity?.value,
        edges(layer)[0]?.material.uniforms.opacity?.value,
      ]).toEqual([0.25, 0.125])
    })
  })

  // The dev, 2026-10-29: « applique le même flou sur les noms ». The ink is drawn into the blur's image in the
  // ordinary blend, then multiplied into the map by the blur's quad; the white edge stays crisp.
  describe('blur', () => {
    it('moves the ink to its own layer in the ordinary blend once blurred, and back in multiply once not', () => {
      const layer = createNameLayer(options())
      layer.setBlur(1)
      expect(
        inks(layer).map((ink) => [ink.layers.isEnabled(NAME_BLUR_LAYER), ink.material.blending])
      ).toEqual([
        [true, NormalBlending],
        [true, NormalBlending],
      ])
      expect(edges(layer).every((edge) => edge.layers.isEnabled(0))).toBe(true)
      layer.setBlur(0)
      expect(inks(layer).map((ink) => [ink.layers.isEnabled(0), ink.material.blending])).toEqual([
        [true, MultiplyBlending],
        [true, MultiplyBlending],
      ])
    })

    // ATLAS-304: where the method draws no blur (under the lighter method's threshold), the ink stays on the camera's
    // layer, so it must keep its own multiply.
    it('keeps the ink crisp in multiply for a reach its blur method does not draw', () => {
      const layer = createNameLayer({ ...options(), blurMethod: createSharedImagesBlur() })
      layer.setBlur(0.2)
      expect(inks(layer).map((ink) => [ink.layers.isEnabled(0), ink.material.blending])).toEqual([
        [true, MultiplyBlending],
        [true, MultiplyBlending],
      ])
    })

    it('multiplies the blurred ink into the map, at the ink’s rank', () => {
      const layer = createNameLayer(options())
      const quad = (layer.object.children as Mesh<never, ShaderMaterial>[]).find(
        (mesh) => !mesh.frustumCulled
      )
      expect([quad?.material.blending, quad?.renderOrder]).toEqual([
        MultiplyBlending,
        NAME_RENDER_ORDER + 1,
      ])
    })
  })

  describe('edge cases', () => {
    it('frees every level’s geometry, both materials, and both sheets’ textures, on disposal', () => {
      const layer = createNameLayer(options())
      const [edge] = edges(layer)
      const [ink] = inks(layer)
      const letters = ink?.material.uniforms.letters?.value as { dispose: () => void } | undefined
      const halo = edge?.material.uniforms.field?.value as { dispose: () => void } | undefined
      if (edge === undefined || ink === undefined || !letters || !halo) throw new Error('no level')
      const spies = [
        vi.spyOn(ink.geometry, 'dispose'),
        vi.spyOn(ink.material, 'dispose'),
        vi.spyOn(edge.material, 'dispose'),
        vi.spyOn(letters, 'dispose'),
        vi.spyOn(halo, 'dispose'),
      ]
      layer.dispose()
      expect(spies.map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1, 1, 1])
    })

    it('builds an empty layer for a year with no level', () => {
      const empty = options()
      expect(meshes(createNameLayer({ ...empty, names: { ...empty.names, levels: [] } }))).toEqual(
        []
      )
    })
  })
})
