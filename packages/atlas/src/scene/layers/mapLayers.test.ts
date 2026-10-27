// @vitest-environment jsdom
import { DataTexture, InstancedMesh, Matrix4, Quaternion, Scene, ShaderLib, Vector3 } from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createElevationLandMask } from '@europe-historical-atlas/core/data/landMask'
import { TRIBE_FEATHER } from '@europe-historical-atlas/core/editor/tribeFeather'
import * as fillModule from '@europe-historical-atlas/core/pipeline/fillTriangles'

import { createMapSources, refreshReliefSource } from '../../sources/mapSources'
import { createDevState } from '../../tunables/devState'
import { DEPTH_BIAS_UNIFORM } from '../depthBias'
import { DRAPED_DEPTH_BIAS } from '../lines/lineLayer'
import { FILL_RENDER_ORDER } from '../political/fills/fillLayer'
import { TRIBE_RENDER_ORDER } from '../political/tribes/tribeLayer'
import * as patchModule from '../political/tribes/tribePatches'
import { MAP_TITLE_OBJECT } from '../sheet/mapTitle'
import { PAPER_SHEET_RENDER_ORDER } from '../sheet/paperSheet'
import { compileHook } from '../testing/compileHook'

import { createLayerProjection } from './layerProjection'
import { createMapLayers } from './mapLayers'

import type { MapSources } from '../../sources/mapSources'
import type { ContentEvent } from '@europe-historical-atlas/core/data/contentFormat'
import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { Object3D } from 'three'
import type { BufferGeometry, LineBasicMaterial, LineSegments } from 'three'
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js'

// The vellum's bake stands in as a blank sheet of the right size: these tests check how the layers are laid,
// replaced and freed, not the paper's fibre — `core`'s own suite does. Baked for real, every frame rebuild costs a
// 1024 × 1024 pass, which coverage's instrumentation slows past the CI's five-second budget.
vi.mock('@europe-historical-atlas/core/pipeline/sheetCompose', () => ({
  composeSheetRgba: (size: number): Uint8Array => new Uint8Array(size * size * 4),
}))

const META: HeightmapMeta = {
  width: 8,
  height: 8,
  zoom: 5,
  bbox: { west: -10, south: 35, east: 10, north: 60 },
  min: 0,
  max: 1000,
  encoding: 'int16-le-metres',
}

/** A relief with a patch of land in the middle, so the coastline has a contour to trace. */
const DEM = createHeightmap(
  META,
  Int16Array.from({ length: 64 }, (_, i) => {
    const x = i % 8
    const y = (i - x) / 8
    return x > 1 && x < 6 && y > 1 && y < 6 ? 400 : -20
  })
)

const BORDERS: RegionBorders = {
  between: [
    {
      pair: [0, 1],
      lines: [
        [
          { u: 0.2, v: 0.5 },
          { u: 0.8, v: 0.5 },
        ],
      ],
    },
  ],
  frontier: [],
}

const REGIONS = {
  year: 1500,
  regions: [
    { name: 'A', subjectTo: null },
    { name: 'B', subjectTo: null },
  ],
} as unknown as RegionSet

/** An authored year of one square polity in the middle of the map. */
const AUTHORED = {
  year: 1100,
  regions: [
    {
      name: 'A',
      subjectTo: null,
      partOf: null,
      rings: [
        [
          { u: 0.3, v: 0.3 },
          { u: 0.7, v: 0.3 },
          { u: 0.7, v: 0.7 },
          { u: 0.3, v: 0.7 },
        ],
      ],
    },
  ],
  authored: {},
} as unknown as RegionSet

/** A scene with layers over a fully loaded set of sources. */
function build(loaded = true): {
  scene: Scene
  sources: MapSources
  dev: ReturnType<typeof createDevState>
  layers: ReturnType<typeof createMapLayers>
} {
  const scene = new Scene()
  const dev = createDevState()
  // The production default builds the relief at the DEM's 1280 segments: 1.4 s a test here, past the
  // 5 s timeout on the CI's runners. Nothing in this suite depends on the mesh being that fine.
  dev.relief.segments = 16
  const sources = createMapSources()
  if (loaded) {
    sources.heightmap = DEM
    sources.landMask = createElevationLandMask(DEM, 0)
    sources.regionSet = REGIONS
    sources.derivedBorders = BORDERS
    refreshReliefSource(sources, dev.relief, dev.texture.seaLevel)
  }
  return { scene, sources, dev, layers: createMapLayers({ scene, dev, sources }) }
}

/** A tribe's ring in the middle of the map, beside nobody. */
const TRIBE_RING = [
  { u: 0.35, v: 0.35 },
  { u: 0.65, v: 0.35 },
  { u: 0.65, v: 0.65 },
  { u: 0.35, v: 0.65 },
]

/**
 * A scene with an authored year whose one region is filled, and one tribe beside it, laid on the relief.
 * @returns what {@link build} returns, the fills and the tribe built
 */
function withTribe(): ReturnType<typeof build> {
  const built = build()
  built.sources.regionSet = { ...AUTHORED, authored: { bbox: META.bbox } } as unknown as RegionSet
  built.sources.tintLevels = [[{ r: 200, g: 40, b: 10 }]]
  built.sources.tribes = [{ polity: 'prussians', colour: '#41580b', rings: [TRIBE_RING] }]
  built.layers.rebuildRelief()
  built.layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
  built.layers.rebuildFills()
  return built
}

/**
 * The tribe mesh in a scene, found by its draw order.
 * @param scene - the scene
 * @returns the mesh, or `undefined` when none is drawn
 */
function tribeMesh(scene: Scene):
  | {
      renderOrder: number
      geometry: BufferGeometry
      material: { transparent: boolean; uniforms: Record<string, { value: unknown } | undefined> }
    }
  | undefined {
  return scene.children.find((child) => child.renderOrder === TRIBE_RENDER_ORDER) as unknown as
    ReturnType<typeof tribeMesh> | undefined
}

/** Read the geometry of whatever is at a scene slot — a `Mesh` or a line layer's object. */
const geometryOf = (object: unknown): { dispose: () => void } =>
  (object as { geometry: { dispose: () => void } }).geometry

/** Read the material of whatever is at a scene slot. */
const materialOf = (object: unknown): { wireframe: boolean } =>
  (object as { material: { wireframe: boolean } }).material

/**
 * The border passes of the line work at a scene slot: one composed layer per level of homage, each holding
 * its passes.
 * @param scene - the scene
 * @param slot - where the border handle sits
 * @returns every pass, level by level
 */
const borderStrokes = (scene: Scene, slot = 0): LineSegments2[] =>
  (scene.children[slot]?.children ?? []).flatMap((level) => level.children) as LineSegments2[]

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * A child, or the test fails here, naming it.
 * @param parent - where to look
 * @param index - which child
 * @returns the child
 */
function child(parent: Object3D | undefined, index: number): Object3D {
  const found = parent?.children[index]
  if (found === undefined) throw new Error(`no child ${String(index)}`)
  return found
}

/**
 * The event layer's groups: the pins, and the icons' close-up and far-away forms.
 * @param scene - the scene the layers drew into
 * @returns the groups
 */
function eventGroups(scene: Scene): { pins: Object3D; close: Object3D; afar: Object3D } {
  const events = child(scene, 0)
  const icons = child(events, 1)
  return { pins: child(events, 0), close: child(icons, 1), afar: child(icons, 2) }
}

/** A battle in the middle of the map's frame, for the event layer. */
const BATTLE: ContentEvent = {
  id: 'e1',
  title: { fr: 'Bataille', en: null },
  type: { id: 't', name: { fr: 'Bataille', en: null }, icon: 'swords' },
  date: {
    kind: 'instant',
    at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
  },
  place: {
    id: 'p',
    name: { fr: 'Lieu', en: null },
    lon: 0,
    lat: 48,
    wikidata: null,
    existsFrom: null,
    existsTo: null,
  },
  actors: [],
  description: null,
  sources: [],
  wikidata: null,
  engine: null,
}

describe('createMapLayers', () => {
  describe('happy path', () => {
    it('stands an event whose type has the pin as a pin, and a battle as an icon', () => {
      const { scene, sources, layers } = build()
      sources.events = [BATTLE, { ...BATTLE, id: 'e2', type: { ...BATTLE.type, icon: 'pin' } }]
      sources.mapDrawn = true
      layers.rebuildEvents()
      const { pins, afar } = eventGroups(scene)
      expect(pins.children).toHaveLength(1)
      expect(afar.children).toHaveLength(1)
    })

    it('carries each frame’s zoom and camera to the icons', () => {
      const { scene, sources, layers } = build()
      sources.events = [BATTLE]
      sources.mapDrawn = true
      layers.rebuildEvents()
      const { close, afar } = eventGroups(scene)
      layers.frame(0, 100)
      expect([close.visible, afar.visible]).toEqual([false, true])
      layers.frame(1, 100)
      expect([close.visible, afar.visible]).toEqual([true, false])
      // The icon is an instance (ATLAS-289): its pose is read back from its kind's first piece.
      const piece = child(close, 1).children[0] as InstancedMesh
      const poseOf = (): Matrix4 => {
        const matrix = new Matrix4()
        piece.getMatrixAt(0, matrix)
        return matrix
      }
      const before = poseOf()
      layers.faceCamera({ position: new Vector3(3, 2, 5), quaternion: new Quaternion() }, 0)
      expect(poseOf().equals(before)).toBe(false)
    })

    it('stands no event before the map is drawn, and stands them once it is', () => {
      const { scene, sources, layers } = build()
      sources.events = [BATTLE]
      layers.rebuildEvents()
      expect(scene.children).toHaveLength(0)
      sources.mapDrawn = true
      layers.rebuildEvents()
      expect(scene.children).toHaveLength(1)
    })

    it('draws nothing until something is rebuilt', () => {
      expect(build().scene.children).toHaveLength(0)
    })

    it('adds the relief to the scene, with the wall that gives it thickness', () => {
      // Two objects, not one: the wall meets the same surface vertex for vertex, so it is built from
      // the same grid at the same moment. Rebuilt apart it would drift the first time the curve moved.
      const { scene, layers } = build()
      layers.rebuildRelief()
      expect(scene.children).toHaveLength(2)
    })

    it('re-derives the relief grid from the live shaping, so the smoothing and shore sliders apply', () => {
      // Until 2026-10-16 the mesh was rebuilt on the grid derived at startup: the smoothing slider did
      // nothing at all, and a shore ramp would have done nothing either.
      const { sources, dev, layers } = build()
      const before = sources.reliefSource
      dev.relief.shoreRamp = 0
      layers.rebuildRelief()
      expect(sources.reliefSource).not.toBe(before)
      expect(sources.reliefSource).toBe(DEM)
    })

    it('builds the relief at the subdivision the panel asks for', () => {
      const { scene, dev, layers } = build()
      dev.relief.segments = 4
      layers.rebuildRelief()
      // 4 segments on X over a square grid: 5 × 5 vertices.
      const count = (
        scene.children[0] as unknown as { geometry: BufferGeometry }
      ).geometry.getAttribute('position').count
      expect(count).toBe(25)
    })

    it('builds the wall at the same subdivision as the relief it closes', () => {
      const { scene, dev, layers } = build()
      // The wall is a group of two meshes: the section along the land, and the board below it.
      const wallVertices = (): number =>
        (scene.children[1]?.children ?? []).reduce(
          (sum, part) =>
            sum +
            (part as unknown as { geometry: BufferGeometry }).geometry.getAttribute('position')
              .count,
          0
        )
      dev.relief.segments = 4
      layers.rebuildRelief()
      const coarse = wallVertices()
      dev.relief.segments = 8
      layers.rebuildRelief()
      expect(wallVertices()).toBeGreaterThan(coarse)
    })

    it('drapes the lines on the subdivision the panel asks for, read live', () => {
      // The relief is a 400 m plateau on a -20 m sea: between two coarse vertices the surface ramps,
      // so the height under a point next to the plateau depends on where the vertices fall.
      const { sources, dev } = build()
      const projection = createLayerProjection(dev, sources)
      dev.relief.segments = 2
      const coarse = projection.draped(0.3, 0.5)[1]
      dev.relief.segments = 7
      expect(projection.draped(0.3, 0.5)[1]).not.toBeCloseTo(coarse, 6)
    })

    it('leaves the relief alone when the edge is not cut', () => {
      const { scene, dev, layers } = build()
      dev.frame.edgeShow = false
      layers.rebuildRelief()
      expect(scene.children).toHaveLength(1)
    })

    it('adds each overlay exactly once', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      layers.rebuildCoastline()
      layers.rebuildRhumb()
      layers.rebuildBorders()
      // The relief brings its wall, so five objects for four rebuilds.
      expect(scene.children).toHaveLength(5)
    })
  })

  describe('variants', () => {
    it('replaces a layer rather than stacking a second one', () => {
      const { scene, layers } = build()
      layers.rebuildCoastline()
      const first = scene.children[0]
      layers.rebuildCoastline()
      expect(scene.children).toHaveLength(1)
      expect(scene.children[0]).not.toBe(first)
    })

    it('frees the GPU resources of the layer it replaced', () => {
      const { scene, layers } = build()
      layers.rebuildCoastline()
      const freed = vi.spyOn(geometryOf(scene.children[0]), 'dispose')
      layers.rebuildCoastline()
      expect(freed).toHaveBeenCalled()
    })

    it('scales the relief by the exaggeration, eased toward zoomed-in', () => {
      const { scene, dev, layers } = build()
      dev.relief.exaggeration = 2
      dev.relief.exaggZoomIn = 0.5
      layers.rebuildRelief()
      layers.frame(0, 100)
      const out = scene.children[0]?.scale.y ?? 0
      layers.frame(1, 100)
      const inn = scene.children[0]?.scale.y ?? 0
      expect(out).toBeCloseTo(2)
      expect(inn).toBeCloseTo(1)
    })

    it('draws no border stroke for a tribe, whose fading colour is its limit', () => {
      const { scene, sources, layers } = build()
      sources.derivedBorders = { between: [], frontier: [] }
      sources.tribes = [{ polity: 'prussians', colour: '#41580b', rings: [TRIBE_RING] }]
      layers.rebuildBorders()
      expect(borderStrokes(scene)).toHaveLength(0)
    })

    it('lays a tribe on the relief beside the fills, transparent, in the pass after their opaque one', () => {
      const { scene, layers } = withTribe()
      const tribe = tribeMesh(scene)
      const fills = scene.children.find(
        (child) => child.renderOrder === FILL_RENDER_ORDER
      ) as unknown as { material: { transparent: boolean } } | undefined
      expect(tribe?.material.transparent).toBe(true)
      expect(fills?.material.transparent).toBe(false)
      expect(tribe?.geometry.getAttribute('edgeDistance').count).toBeGreaterThan(0)
      layers.dispose()
    })

    // QUAL-001: three sorts the transparent pass by renderOrder before depth, so a tribe ordered after the
    // lines painted over the coast and the rivers.
    it('draws the tribe before the coastline, the rhumbs, the rivers and the borders, after the paper sheet', () => {
      const { scene, sources, layers } = withTribe()
      sources.riverData = [
        {
          rank: 1,
          kind: 'River',
          name: null,
          points: [
            { u: 0.3, v: 0.4 },
            { u: 0.6, v: 0.5 },
          ],
        },
      ]
      sources.derivedBorders = BORDERS
      const lines = new Map<string, number[]>()
      for (const [name, rebuild] of [
        ['coastline', layers.rebuildCoastline],
        ['rhumbs', layers.rebuildRhumb],
        ['rivers', layers.rebuildRivers],
        ['borders', layers.rebuildBorders],
      ] as const) {
        const before = new Set(scene.children)
        rebuild()
        const orders: number[] = []
        for (const added of scene.children.filter((child) => !before.has(child)))
          added.traverse((object) => {
            const material = (object as { material?: { transparent?: boolean } }).material
            if (material?.transparent === true) orders.push(object.renderOrder)
          })
        lines.set(name, orders)
      }
      const tribe = tribeMesh(scene)?.renderOrder ?? Number.NaN
      for (const [name, orders] of lines) {
        expect(orders.length, name).toBeGreaterThan(0)
        for (const order of orders) expect(order, name).toBeGreaterThan(tribe)
      }
      expect(PAPER_SHEET_RENDER_ORDER).toBeLessThan(tribe)
    })

    it('writes the panel’s fade into the tribe’s uniforms each frame, with no rebuild', () => {
      const { scene, dev, layers } = withTribe()
      const tribe = tribeMesh(scene)
      dev.tribes.mode = 'outset'
      dev.tribes.widthKm = 30
      layers.frame(0, 100)
      expect(tribeMesh(scene)).toBe(tribe)
      expect(tribe?.material.uniforms.featherWidth?.value).toBe(30)
      expect(tribe?.material.uniforms.featherShift?.value).toBe(30)
      dev.tribes.mode = 'inset'
      layers.frame(0, 100)
      expect(tribe?.material.uniforms.featherShift?.value).toBe(0)
    })

    it('starts the tribe from core’s default fade', () => {
      const { scene } = withTribe()
      expect(tribeMesh(scene)?.material.uniforms.featherWidth?.value).toBe(TRIBE_FEATHER.widthKm)
    })

    it('hangs a freshly baked texture on the tribe as on the fills', () => {
      const { scene, layers } = withTribe()
      const baked = new DataTexture(new Uint8Array(16), 2, 2)
      layers.setTexture(baked)
      expect(tribeMesh(scene)?.material.uniforms.map?.value).toBe(baked)
    })

    it('re-lays the same patches on a new relief instead of measuring the distances again', () => {
      const measured = vi.spyOn(patchModule, 'tribePatches')
      const { layers } = withTribe()
      layers.rebuildSurface()
      expect(measured).toHaveBeenCalledTimes(1)
    })

    it('re-lays the same patches when a height-curve slider moves, the land mask present', () => {
      const measured = vi.spyOn(patchModule, 'tribePatches')
      const { dev, layers } = withTribe()
      dev.relief.peakTarget *= 1.5
      layers.rebuildSurface()
      expect(measured).toHaveBeenCalledTimes(1)
    })

    // QUAL-007: the fallback mask is derived afresh at every call, so keying on it never hit.
    it('re-lays the same patches on a new relief with the land mask failed, at the same sea level', () => {
      const measured = vi.spyOn(patchModule, 'tribePatches')
      const { sources, layers } = withTribe()
      sources.landMask = null
      layers.rebuildFills()
      layers.rebuildSurface()
      expect(measured).toHaveBeenCalledTimes(2)
    })

    it('measures again when the sea level moves with the land mask failed: the land itself moved', () => {
      const measured = vi.spyOn(patchModule, 'tribePatches')
      const { sources, dev, layers } = withTribe()
      sources.landMask = null
      layers.rebuildFills()
      dev.texture.seaLevel += 50
      layers.rebuildFills()
      expect(measured).toHaveBeenCalledTimes(3)
    })

    // ARCH-003: the regions cut a spill, so a new set of them is a new measure.
    it('measures again when the year’s regions change, the tribes staying the same', () => {
      const measured = vi.spyOn(patchModule, 'tribePatches')
      const { sources, layers } = withTribe()
      sources.regionSet = {
        ...AUTHORED,
        regions: [...AUTHORED.regions],
        authored: { bbox: META.bbox },
      } as unknown as RegionSet
      layers.rebuildFills()
      expect(measured).toHaveBeenCalledTimes(2)
    })

    it('measures again when the year’s frame changes', () => {
      const measured = vi.spyOn(patchModule, 'tribePatches')
      const { sources, layers } = withTribe()
      const regions = sources.regionSet?.regions
      sources.regionSet = {
        ...AUTHORED,
        regions,
        authored: { bbox: { ...META.bbox, north: 61 } },
      } as unknown as RegionSet
      layers.rebuildFills()
      expect(measured).toHaveBeenCalledTimes(2)
    })

    it('draws no tribe mesh for a year without a tribe', () => {
      const { scene, sources, layers } = withTribe()
      sources.tribes = []
      layers.rebuildFills()
      expect(tribeMesh(scene)).toBeUndefined()
    })

    it('frees the tribe mesh it replaces', () => {
      const { scene, layers } = withTribe()
      const freed = vi.spyOn(geometryOf(tribeMesh(scene)), 'dispose')
      layers.rebuildFills()
      expect(freed).toHaveBeenCalled()
    })

    it('builds one border layer per split level, hiding a vassal’s border from afar', () => {
      const { scene, sources, dev, layers } = build()
      sources.regionSet = AUTHORED
      sources.homageDepth = 1
      sources.derivedBorders = {
        between: [
          { pair: [0, 0], lines: BORDERS.between[0]?.lines ?? [] },
          {
            pair: [1, 1],
            lines: [
              [
                { u: 0.5, v: 0.2 },
                { u: 0.5, v: 0.8 },
              ],
            ],
          },
        ],
        frontier: [],
      }
      sources.borderPatterns = new Map([
        ['0:0', 'solid'],
        ['1:1', 'dashed'],
      ])
      sources.borderLevels = new Map([
        ['0:0', 0],
        ['1:1', 1],
      ])
      layers.rebuildBorders()
      const levels = scene.children[0]?.children ?? []
      expect(levels).toHaveLength(2)
      layers.frame(0, 100)
      expect(levels.map((level) => level.visible)).toEqual([true, false])
      layers.frame(1, 100)
      expect(levels.map((level) => level.visible)).toEqual([true, true])
      dev.vassals.enabled = false
      layers.frame(0, 100)
      expect(levels.map((level) => level.visible)).toEqual([true, true])
    })

    it('shows every border level when the texture carries the colour, as the bake shows every polity', () => {
      const { scene, sources, layers } = build()
      sources.homageDepth = 1 // REGIONS: a payload year, never filled as geometry
      sources.derivedBorders = {
        between: [{ pair: [0, 0], lines: BORDERS.between[0]?.lines ?? [] }],
        frontier: [],
      }
      sources.borderPatterns = new Map([['0:0', 'solid']])
      sources.borderLevels = new Map([['0:0', 1]])
      layers.rebuildBorders()
      layers.frame(0, 100)
      expect(scene.children[0]?.children[0]?.visible).toBe(true)
    })

    it('mixes the fills toward the vassals as the zoom comes in, with no rebuild', () => {
      const { scene, sources, dev, layers } = build()
      sources.regionSet = AUTHORED
      sources.homageDepth = 1
      sources.tintLevels = [[{ r: 1, g: 2, b: 3 }], [{ r: 200, g: 40, b: 10 }]]
      layers.rebuildRelief()
      layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
      layers.rebuildFills()
      const fill = scene.children.find(
        (child) => child.renderOrder === FILL_RENDER_ORDER
      ) as unknown as {
        material: { uniforms: { detail: { value: number } } }
      }
      layers.frame(0, 100)
      expect(fill.material.uniforms.detail.value).toBe(0)
      layers.frame(dev.vassals.revealStart, 100)
      expect(fill.material.uniforms.detail.value).toBe(1)
    })

    // Three tint levels, so `revealEnd` — the deepest level's zoom — has a level to move. A frame test,
    // not a call to homageDetail: it proves the live `dev.vassals` reaches the fills' uniform.
    it('moves the fills’ detail at a fixed zoom when the deepest reveal or the fade span changes', () => {
      const { scene, sources, dev, layers } = build()
      sources.regionSet = AUTHORED
      sources.homageDepth = 2
      sources.tintLevels = [
        [{ r: 1, g: 2, b: 3 }],
        [{ r: 100, g: 20, b: 5 }],
        [{ r: 200, g: 40, b: 10 }],
      ]
      Object.assign(dev.vassals, { enabled: true, revealStart: 0.45, revealEnd: 0.8, fade: 0.2 })
      layers.rebuildRelief()
      layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
      layers.rebuildFills()
      const fill = scene.children.find(
        (child) => child.renderOrder === FILL_RENDER_ORDER
      ) as unknown as {
        material: { uniforms: { detail: { value: number } } }
      }
      const detailAt = (zoom: number): number => {
        layers.frame(zoom, 100)
        return fill.material.uniforms.detail.value
      }

      // Level 1 whole, level 2 halfway through its fade [0.6, 0.8] — smoothstep(0.5) = 0.5.
      expect(detailAt(0.7)).toBeCloseTo(1.5)
      dev.vassals.revealEnd = 1
      expect(detailAt(0.7)).toBeCloseTo(1) // level 2 now fades over [0.8, 1]: not begun
      dev.vassals.revealEnd = 0.8
      dev.vassals.fade = 0.4
      // Level 2 fades over [0.4, 0.8]: t = 0.75, smoothstep = 0.84375.
      expect(detailAt(0.7)).toBeCloseTo(1.84375)
    })

    it('reads the border dashes in screen pixels, from the scale the frame passes', () => {
      const { scene, layers } = build()
      layers.rebuildBorders()
      layers.frame(0.5, 640)
      for (const stroke of borderStrokes(scene)) expect(stroke.material.dashScale).toBe(640)
    })

    it('tracks the relief scale on everything draped over it', () => {
      // A draped layer is built against an unexaggerated surface; miss this and it floats by the
      // exaggeration ratio — invisible on a plain, glaring along a crest.
      const { scene, dev, layers } = build()
      dev.relief.exaggeration = 3
      dev.relief.exaggZoomIn = 1
      layers.rebuildRelief()
      layers.rebuildBorders()
      layers.frame(0, 100)
      // The relief adds its wall between itself and the borders, so the borders are the third child.
      const relief = scene.children[0]?.scale.y ?? 0
      const borders = scene.children[2]?.scale.y ?? 0
      expect(borders).toBeCloseTo(relief)
    })

    it('tracks the relief scale on the coastline, now laid on the relief at the shore', () => {
      const { scene, dev, layers } = build()
      dev.relief.exaggeration = 3
      dev.relief.exaggZoomIn = 1
      layers.rebuildRelief()
      layers.rebuildCoastline()
      layers.frame(0, 100)
      const relief = scene.children[0]?.scale.y ?? 0
      const coastline = scene.children[2]?.scale.y ?? 0
      expect(relief).toBeCloseTo(3)
      expect(coastline).toBeCloseTo(relief)
    })

    it('hands the coastline the depth bias from the panel, so the relief never hides it', () => {
      const { scene, dev, layers } = build()
      dev.coast.depthBias = 0.013
      layers.rebuildCoastline()
      const material = (scene.children[0] as LineSegments<BufferGeometry, LineBasicMaterial>)
        .material
      const shader = compileHook(material, ShaderLib.basic.vertexShader)
      expect(shader.uniforms[DEPTH_BIAS_UNIFORM]).toEqual({ value: 0.013 })
    })

    it('pulls the borders toward the camera rather than lifting them off the colours they bound', () => {
      const { scene, layers } = build()
      layers.rebuildBorders()
      const strokes = borderStrokes(scene)
      expect(strokes.length).toBeGreaterThan(0)
      for (const stroke of strokes) {
        const shader = compileHook(stroke.material, new LineMaterial().vertexShader)
        expect(shader.uniforms[DEPTH_BIAS_UNIFORM]).toEqual({ value: DRAPED_DEPTH_BIAS })
      }
    })

    it('pulls the rivers toward the camera rather than lifting them off the valleys they run in', () => {
      const { scene, sources, layers } = build()
      sources.riverData = [
        {
          rank: 1,
          kind: 'River',
          name: null,
          points: [
            { u: 0.3, v: 0.4 },
            { u: 0.6, v: 0.5 },
          ],
        },
      ]
      layers.rebuildRivers()
      const strokes = scene.children[0]?.children ?? []
      expect(strokes.length).toBeGreaterThan(0)
      for (const stroke of strokes) {
        const shader = compileHook(
          (stroke as LineSegments2).material,
          new LineMaterial().vertexShader
        )
        expect(shader.uniforms[DEPTH_BIAS_UNIFORM]).toEqual({ value: DRAPED_DEPTH_BIAS })
      }
    })

    it('cuts rivers and borders on the relief grid, so a long segment follows the surface', () => {
      // One river segment across a third of the map: drawn as one chord it would float over every valley.
      const { scene, sources, layers } = build()
      sources.riverData = [
        {
          rank: 1,
          kind: 'River',
          name: null,
          points: [
            { u: 0.3, v: 0.4 },
            { u: 0.6, v: 0.5 },
          ],
        },
      ]
      layers.rebuildRivers()
      const river = scene.children[0]?.children[0] as LineSegments2
      expect(river.geometry.getAttribute('instanceStart').count).toBeGreaterThan(1)
      scene.clear()
      layers.rebuildBorders()
      const [border] = borderStrokes(scene)
      // BORDERS holds one segment, across six tenths of the map.
      expect(border?.geometry.getAttribute('instanceStart').count).toBeGreaterThan(1)
    })

    it('lays an authored year on the relief as geometry, following the exaggeration and the texture', () => {
      const { scene, sources, dev, layers } = build()
      sources.regionSet = AUTHORED
      sources.tintLevels = [[{ r: 200, g: 40, b: 10 }]]
      dev.relief.exaggeration = 2
      dev.relief.exaggZoomIn = 1
      layers.rebuildRelief()
      layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
      layers.rebuildFills()
      layers.frame(0, 100)
      const fill = scene.children.find((child) => child.renderOrder === 1)
      expect(fill).toBeDefined()
      expect(fill?.scale.y).toBeCloseTo(2)
      const next = new DataTexture(new Uint8Array(16), 2, 2)
      layers.setTexture(next)
      expect(
        (fill as unknown as { material: { uniforms: { map: { value: unknown } } } }).material
          .uniforms.map.value
      ).toBe(next)
    })

    it('replaces the fill on a second build instead of stacking one, and clears it when the switch goes off', () => {
      const { scene, sources, dev, layers } = build()
      sources.regionSet = AUTHORED
      sources.tintLevels = [[{ r: 200, g: 40, b: 10 }]]
      layers.rebuildRelief()
      layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
      layers.rebuildFills()
      const first = scene.children.find((child) => child.renderOrder === FILL_RENDER_ORDER)
      let freed = 0
      ;(first as unknown as { geometry: BufferGeometry }).geometry.addEventListener(
        'dispose',
        () => {
          freed += 1
        }
      )
      layers.rebuildFills()
      expect(
        scene.children.filter((child) => child.renderOrder === FILL_RENDER_ORDER)
      ).toHaveLength(1)
      expect(freed).toBe(1)
      dev.political.exactFills = false
      layers.rebuildFills()
      expect(scene.children.some((child) => child.renderOrder === FILL_RENDER_ORDER)).toBe(false)
    })

    it('cuts the fills once per year and grid, so a height-curve change only re-lays them', () => {
      const { sources, dev, layers } = build()
      sources.regionSet = AUTHORED
      sources.tintLevels = [[{ r: 200, g: 40, b: 10 }]]
      layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
      layers.rebuildSurface()
      const spy = vi.spyOn(fillModule, 'fillTriangles')
      dev.relief.plainsCeiling += 100
      layers.rebuildSurface()
      expect(spy).not.toHaveBeenCalled()
      dev.relief.segments = 4
      layers.rebuildSurface()
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('says so when an authored year cannot be filled yet, rather than leaving it uncoloured in silence', () => {
      const { sources, layers } = build()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      sources.regionSet = AUTHORED
      sources.tintLevels = [[{ r: 200, g: 40, b: 10 }]]
      layers.rebuildRelief()
      layers.rebuildFills() // no texture yet
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('the texture'))
    })

    it('lays no fill for a payload year, nor for an authored one with the switch off', () => {
      const { scene, sources, dev, layers } = build()
      sources.tintLevels = [[{ r: 200, g: 40, b: 10 }]]
      layers.rebuildRelief()
      layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
      const count = scene.children.length
      layers.rebuildFills() // REGIONS, a payload year
      expect(scene.children.length).toBe(count)
      sources.regionSet = AUTHORED
      dev.political.exactFills = false
      layers.rebuildFills()
      expect(scene.children.length).toBe(count)
    })

    it('repaints the coastline without rebuilding it', () => {
      const { scene, layers } = build()
      layers.rebuildCoastline()
      const before = scene.children[0]
      layers.setCoastColor('#123456')
      expect(scene.children[0]).toBe(before)
    })

    it('flips the relief wireframe on the live material', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      layers.setWireframe(true)
      expect(materialOf(scene.children[0]).wireframe).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('builds nothing before the elevation has loaded', () => {
      const { scene, layers } = build(false)
      layers.rebuildRelief()
      layers.rebuildCoastline()
      layers.rebuildRhumb()
      layers.rebuildRivers()
      expect(scene.children).toHaveLength(0)
    })

    it('still traces a coastline without the mask, falling back on elevation', () => {
      // Visibly wrong in the Dutch polders, but a degraded map beats a blank canvas.
      const { scene, sources, layers } = build()
      sources.landMask = null
      layers.rebuildCoastline()
      expect(scene.children).toHaveLength(1)
    })

    it('draws no borders when the reader has turned them off', () => {
      const { scene, dev, layers } = build()
      dev.political.showBorders = false
      layers.rebuildBorders()
      expect(scene.children).toHaveLength(0)
    })

    it('draws no borders before a year has been derived', () => {
      const { scene, sources, layers } = build()
      sources.derivedBorders = null
      layers.rebuildBorders()
      expect(scene.children).toHaveLength(0)
    })
  })

  describe('unmanaged errors', () => {
    it('takes a border pair naming polities it has never heard of', () => {
      // The raster indexes regions; a stale region set must give a plain border, not an exception.
      const { scene, sources, layers } = build()
      sources.regionSet = null
      layers.rebuildBorders()
      expect(scene.children).toHaveLength(1)
    })

    it('frames a map with nothing on it', () => {
      const { layers } = build(false)
      expect(() => {
        layers.frame(0.5, 100)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('empties the scene on teardown', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      layers.rebuildCoastline()
      layers.rebuildRhumb()
      layers.rebuildBorders()
      layers.dispose()
      expect(scene.children).toHaveLength(0)
    })

    it('frees the relief geometry on teardown, not just unparents it', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      const freed = vi.spyOn(geometryOf(scene.children[0]), 'dispose')
      layers.dispose()
      expect(freed).toHaveBeenCalled()
    })

    it('takes a resize with no fat-line layer built yet', () => {
      const { layers } = build()
      expect(() => {
        layers.setResolution(800, 600)
      }).not.toThrow()
    })
  })
})

// The title's centre on Z and its height, after a rebuild with the frame tuned as given.
const titleAt = (tune: (frame: ReturnType<typeof createDevState>['frame']) => void) => {
  const { scene, dev, layers } = build()
  tune(dev.frame)
  layers.rebuildFrame()
  const title = scene.getObjectByName(MAP_TITLE_OBJECT) as unknown as { geometry: BufferGeometry }
  title.geometry.computeBoundingBox()
  const box = title.geometry.boundingBox
  if (box === null) throw new Error('no title geometry')
  return { z: (box.min.z + box.max.z) / 2, y: box.min.y, lift: dev.frame.lift }
}

// QUAL-021: the sheet's and the rose's builders were reached by no test until 2026-10-27.
describe('rebuildFrame and rebuildRose', () => {
  describe('happy path', () => {
    it('lays the sheet, the border, the degrees and the title on the scene', () => {
      const { scene, layers } = build()
      layers.rebuildFrame()
      expect(scene.children).toHaveLength(4)
    })

    it('stands one compass rose on the scene', () => {
      const { scene, layers } = build()
      layers.rebuildRose()
      expect(scene.children).toHaveLength(1)
    })
  })

  describe('variants', () => {
    it('prints no title when the title is switched off', () => {
      const { scene, dev, layers } = build()
      dev.frame.titleShow = false
      layers.rebuildFrame()
      expect(scene.children).toHaveLength(3)
    })

    it('lays nothing when the sheet and border are switched off', () => {
      const { scene, dev, layers } = build()
      layers.rebuildFrame()
      dev.frame.show = false
      layers.rebuildFrame()
      expect(scene.children).toHaveLength(0)
    })
  })

  describe('managed errors', () => {
    it('lays no frame before the elevation is in', () => {
      const { scene, layers } = build(false)
      layers.rebuildFrame()
      expect(scene.children).toHaveLength(0)
    })
  })

  // L4: N/A — nothing asynchronous is awaited; the SVG textures load on their own

  describe('edge cases', () => {
    it('replaces the frame on a rebuild rather than stacking a second one', () => {
      const { scene, layers } = build()
      layers.rebuildFrame()
      layers.rebuildFrame()
      expect(scene.children).toHaveLength(4)
    })

    it('frees the previous vellum when the frame is rebuilt', () => {
      const { layers } = build()
      layers.rebuildFrame()
      const freed = vi.spyOn(DataTexture.prototype, 'dispose')
      layers.rebuildFrame()
      expect(freed).toHaveBeenCalled()
      freed.mockRestore()
    })

    it('replaces the rose on a rebuild rather than stacking a second one', () => {
      const { scene, layers } = build()
      layers.rebuildRose()
      layers.rebuildRose()
      expect(scene.children).toHaveLength(1)
    })

    // The title is placed from the frame's outer edge, so it keeps its distance as the frame grows.
    it('moves the title back by exactly its offset', () => {
      const base = titleAt(() => undefined)
      expect(titleAt((frame) => (frame.titleOffset += 0.1)).z - base.z).toBeCloseTo(0.1)
    })

    it('moves the title back by as much as the graduated band thickens', () => {
      const base = titleAt(() => undefined)
      expect(titleAt((frame) => (frame.bandWidth += 0.05)).z - base.z).toBeCloseTo(0.05)
    })

    it('moves the title back by as much as the degrees’ margin widens', () => {
      const base = titleAt(() => undefined)
      expect(titleAt((frame) => (frame.labelLaneWidth += 0.07)).z - base.z).toBeCloseTo(0.07)
    })

    it('floats the title a hair above the sheet, so the two never contend for a pixel', () => {
      const base = titleAt(() => undefined)
      // Well clear of the float32 rounding the vertex buffer adds (a few 1e-10), and far below a visible step.
      expect(base.y - base.lift).toBeGreaterThan(1e-4)
      expect(base.y - base.lift).toBeLessThan(0.01)
    })

    it('empties the scene of the frame and the rose on teardown', () => {
      const { scene, layers } = build()
      layers.rebuildFrame()
      layers.rebuildRose()
      layers.dispose()
      expect(scene.children).toHaveLength(0)
    })
  })
})
