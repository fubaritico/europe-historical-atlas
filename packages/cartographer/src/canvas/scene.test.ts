import { describe, expect, it } from 'vitest'

import { moveAnchor } from '@europe-historical-atlas/core/editor/documentEdits'
import {
  firstSharedAnchor,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'
import { tribeIds } from '@europe-historical-atlas/core/editor/tribes'

import { DEFAULT_LAYERS } from '../state/layersSlice'
import { lonLatToScreen, projectAnchors, projectToBackdrop } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import {
  backdropRect,
  buildScene,
  editorialZoneRect,
  projectedBorders,
  projectedFills,
  projectedRings,
  projectedTerritories,
  projectedTribeOutlines,
} from './scene'

import type { SceneInputs } from './scene'
import type { BackdropFrame } from '../view/projection'
import type { Viewport } from '../view/viewport'
import type { DerivedBorder } from '@europe-historical-atlas/core/editor/derivedBorders'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The real backdrop, imported rather than re-declared.
 *
 * A first version wrote the literal out here, which is the copy `rules/modular-architecture.md` calls the
 * worst kind: a fixture that can drift from the thing it is meant to verify, with nothing failing.
 */
const FRAME: BackdropFrame = TEST_BACKDROP_FRAME

const NATIVE: Viewport = { scale: 1, originX: 0, originY: 0 }

/** A year without a tribe. */
const NO_TRIBES: ReadonlySet<string> = new Set()

/**
 * Inputs with whatever a test needs.
 * @param overrides - the parts this test cares about
 * @returns complete inputs
 */
function inputs(document: YearDocument, overrides: Partial<SceneInputs> = {}): SceneInputs {
  return {
    anchorsInBackdrop: projectToBackdrop(document.anchors, FRAME),
    backdropImage: null,
    vectorLayers: null,
    frame: FRAME,
    viewport: NATIVE,
    selected: new Set<number>(),
    handles: [],
    snapAnchors: [],
    extentOutline: [],
    borders: [],
    layers: DEFAULT_LAYERS,
    colours: new Map<string, string>(),
    zoneLabel: 'editorial zone',
    ...overrides,
  }
}

describe('scene', () => {
  describe('happy path', () => {
    it('projects every anchor once, in document order', () => {
      const document = sharedBorderDocument()

      const scene = buildScene(document, inputs(document))

      const first = document.anchors[0]
      if (first === undefined) throw new Error('fixture: the document has no anchors')

      expect(scene.anchors).toHaveLength(document.anchors.length)
      expect(scene.anchors[0]).toEqual(lonLatToScreen(first, FRAME, NATIVE))
    })

    it('gives one outline per ring of every claim', () => {
      const document = sharedBorderDocument()

      const scene = buildScene(document, inputs(document))

      // The fixture holds two polities, one ring each.
      expect(scene.rings).toHaveLength(2)
      expect(scene.rings[0]).toHaveLength(4)
    })

    it('projects the extent outline through the same anchors, skipping an index none answers', () => {
      const document = sharedBorderDocument()

      const scene = buildScene(document, inputs(document, { extentOutline: [[0, 1, 999]] }))

      expect(scene.extentOutline).toEqual([[scene.anchors[0], scene.anchors[1]]])
    })

    it('puts the editorial zone where its own corners project', () => {
      const document = sharedBorderDocument()
      const zone = document.editorialZone

      const rect = editorialZoneRect(document, inputs(document))

      expect([rect.x, rect.y]).toEqual(lonLatToScreen([zone.west, zone.north], FRAME, NATIVE))
      expect(rect.width).toBeGreaterThan(0)
      expect(rect.height).toBeGreaterThan(0)
    })

    it('carries the zone’s name and the selection through untouched', () => {
      const selected = new Set([1, 2])

      const document = sharedBorderDocument()

      const scene = buildScene(document, inputs(document, { selected, zoneLabel: 'la planche' }))

      expect(scene.zoneLabel).toBe('la planche')
      expect(scene.selected).toBe(selected)
    })
  })

  describe('variants', () => {
    it('follows the viewport, so panning moves everything together', () => {
      const document = sharedBorderDocument()
      const panned: Viewport = { scale: 1, originX: 100, originY: -40 }

      const still = buildScene(document, inputs(document))
      const moved = buildScene(document, inputs(document, { viewport: panned }))

      expect(moved.anchors[0]?.[0]).toBeCloseTo((still.anchors[0]?.[0] ?? 0) + 100, 9)
      expect(moved.editorialZone.x).toBeCloseTo(still.editorialZone.x + 100, 9)
    })

    it('keeps the zone’s height honest at any zoom, both corners being projected', () => {
      const document = sharedBorderDocument()

      const one = editorialZoneRect(document, inputs(document))
      const two = editorialZoneRect(
        document,
        inputs(document, { viewport: { ...NATIVE, scale: 2 } })
      )

      expect(two.height).toBeCloseTo(one.height * 2, 6)
      expect(two.width).toBeCloseTo(one.width * 2, 6)
    })

    it('marks a selection of any size', () => {
      for (const selected of [new Set<number>(), new Set([0]), new Set([0, 1, 2, 3, 4, 5])]) {
        const document = sharedBorderDocument()

        expect(buildScene(document, inputs(document, { selected })).selected.size).toBe(
          selected.size
        )
      }
    })
  })

  describe('variants — the backdrop', () => {
    it('puts the whole grid on screen, which is the coordinate system itself', () => {
      const document = sharedBorderDocument()

      const rect = backdropRect(FRAME, inputs(document))

      expect(rect).toEqual({ x: 0, y: 0, width: FRAME.size.width, height: FRAME.size.height })
    })

    it('scales and moves the grid with the view', () => {
      const document = sharedBorderDocument()
      const view: Viewport = { scale: 0.5, originX: 30, originY: -20 }

      const rect = backdropRect(FRAME, inputs(document, { viewport: view }))

      expect(rect.x).toBe(30)
      expect(rect.y).toBe(-20)
      expect(rect.width).toBeCloseTo(FRAME.size.width / 2, 9)
      expect(rect.height).toBeCloseTo(FRAME.size.height / 2, 9)
    })

    it('carries an image into the scene, and nothing when there is none', () => {
      const document = sharedBorderDocument()
      const image = {} as CanvasImageSource

      expect(buildScene(document, inputs(document)).backdrop).toBeNull()
      expect(buildScene(document, inputs(document, { backdropImage: image })).backdrop?.image).toBe(
        image
      )
    })
  })

  describe('managed errors', () => {
    it('gives no outline for a document that claims nothing', () => {
      const document = sharedBorderDocument()
      document.claims = []

      expect(buildScene(document, inputs(document)).rings).toEqual([])
    })

    it('gives no anchor for a document with none', () => {
      const document = sharedBorderDocument()
      document.anchors = []
      document.claims = []

      expect(buildScene(document, inputs(document)).anchors).toEqual([])
    })

    it('skips an index no anchor answers, rather than throwing inside a paint', () => {
      const document = sharedBorderDocument()
      const claim = document.claims[0]
      if (claim !== undefined) claim.rings = [[0, 1, 999]]

      const rings = projectedRings(document, projectAnchors(document.anchors, FRAME, NATIVE))

      expect(rings[0]).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. Below is the hostile viewport.
    it('carries a viewport at scale zero through loudly', () => {
      const dead: Viewport = { scale: 0, originX: 0, originY: 0 }

      const document = sharedBorderDocument()
      const scene = buildScene(document, inputs(document, { viewport: dead }))

      expect(scene.anchors[0]?.[0]).toBe(0)
      expect(Number.isFinite(scene.editorialZone.width)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('keeps a shared anchor a single position, so two outlines move together', () => {
      // The format's whole point: anchors 1 and 2 are the shared limit between France and the Empire.
      const document = sharedBorderDocument()
      const shared = firstSharedAnchor(document)
      moveAnchor(document, shared, [1, 47])

      const scene = buildScene(document, inputs(document))
      const moved = scene.anchors[shared]
      const [france, empire] = scene.rings

      expect(moved).toBeDefined()
      expect(france).toContainEqual(moved)
      expect(empire).toContainEqual(moved)
    })

    it('projects a shared anchor once, not once per ring that holds it', () => {
      const document = sharedBorderDocument()
      const shared = firstSharedAnchor(document)

      const scene = buildScene(document, inputs(document))
      const inFrance = scene.rings[0]?.find((point) => point === scene.anchors[shared])
      const inEmpire = scene.rings[1]?.find((point) => point === scene.anchors[shared])

      // The same array, by reference, in both outlines — two copies could drift apart.
      expect(inFrance).toBe(scene.anchors[shared])
      expect(inEmpire).toBe(scene.anchors[shared])
    })

    it('answers for a zone the view has scrolled off, rather than clamping it', () => {
      const far: Viewport = { scale: 1, originX: -5000, originY: -5000 }

      const document = sharedBorderDocument()
      const rect = editorialZoneRect(document, inputs(document, { viewport: far }))

      expect(rect.x).toBeLessThan(0)
      expect(rect.width).toBeGreaterThan(0)
    })
  })

  describe('the vector layers', () => {
    /** One contour and one river, as arrays whose identity can be checked. */
    const COAST = [
      {
        points: [[0, 0] as const, [10, 10] as const],
        closed: true,
        bounds: { left: 0, top: 0, right: 10, bottom: 10 },
      },
    ]
    const RIVERS = [
      {
        points: [[1, 2] as const],
        closed: false,
        bounds: { left: 1, top: 2, right: 1, bottom: 2 },
        name: 'Maas',
        rank: 3,
      },
    ]

    it('hands the layers through untouched, with the view to apply', () => {
      const document = sharedBorderDocument()

      const scene = buildScene(
        document,
        inputs(document, {
          vectorLayers: {
            coast: COAST,
            rivers: RIVERS,
            coastProvenance: { name: 'test coast', licence: 'test' },
            riverProvenance: { name: 'test rivers', licence: 'test' },
          },
          viewport: { scale: 2, originX: 5, originY: -3 },
        })
      )

      // By reference, not by value: the whole point is that these 125 000 points are **not** copied or
      // remapped per frame. A `toEqual` would pass against a `map()` rebuilding them on every repaint.
      expect(scene.vectors?.coast).toBe(COAST)
      expect(scene.vectors?.rivers).toBe(RIVERS)
      // The view travels as three numbers the painter turns into a transform. Pinned rather than merely
      // present: a wiring that swapped an origin for the scale would pass a presence check.
      expect(scene.vectors?.scale).toBe(2)
      expect(scene.vectors?.originX).toBe(5)
      expect(scene.vectors?.originY).toBe(-3)
    })

    it('stays null before they have loaded', () => {
      const document = sharedBorderDocument()

      expect(buildScene(document, inputs(document, { vectorLayers: null })).vectors).toBeNull()
    })
  })
})

describe('projectedFills', () => {
  const anchors = projectAnchors(sharedBorderDocument().anchors, FRAME, NATIVE)

  describe('happy path', () => {
    it('gives each claim its polity’s colour', () => {
      const colours = new Map([
        ['fr-couronne', '#aa0000'],
        ['hre', '#00aa00'],
      ])
      expect(
        projectedFills(sharedBorderDocument(), anchors, colours, NO_TRIBES).map(
          (fill) => fill.colour
        )
      ).toEqual(['#aa0000', '#00aa00'])
    })
  })

  describe('variants', () => {
    it('resolves each ring through the shared anchor table', () => {
      const fills = projectedFills(
        sharedBorderDocument(),
        anchors,
        new Map([['hre', '#00aa00']]),
        NO_TRIBES
      )
      expect(fills[0]?.rings[0]?.[0]).toEqual(anchors[1])
    })
  })

  describe('managed errors', () => {
    // A claim whose polity has no colour names a polity the registry lacks; it is not painted in an
    // invented one.
    it('skips a claim with no colour', () => {
      expect(projectedFills(sharedBorderDocument(), anchors, new Map(), NO_TRIBES)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — pure arithmetic over arrays; an index past the table is dropped by projectedRings.
    it('returns nothing for a document with no claims', () => {
      expect(
        projectedFills({ ...sharedBorderDocument(), claims: [] }, anchors, new Map(), NO_TRIBES)
      ).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('passes the handles through to the scene untouched', () => {
      const document = sharedBorderDocument()
      expect(buildScene(document, inputs(document, { handles: [1, 2] })).handles).toEqual([1, 2])
    })
  })
})

describe('projectedTerritories', () => {
  const anchors = projectAnchors(sharedBorderDocument().anchors, FRAME, NATIVE)

  describe('happy path', () => {
    it('gives each claim its polity and its rings, in painting order', () => {
      expect(projectedTerritories(sharedBorderDocument(), anchors).map((t) => t.polity)).toEqual([
        'fr-couronne',
        'hre',
      ])
    })
  })

  describe('variants', () => {
    it('resolves the rings through the shared anchor table', () => {
      expect(projectedTerritories(sharedBorderDocument(), anchors)[1]?.rings[0]?.[0]).toEqual(
        anchors[1]
      )
    })

    // s16 — the paint order is the polities list's, not the claims': the click lands on the fill seen.
    it('orders the territories by the polities list, whatever the claims order', () => {
      const document = sharedBorderDocument()
      document.polities.reverse()
      expect(projectedTerritories(document, anchors).map((t) => t.polity)).toEqual([
        'hre',
        'fr-couronne',
      ])
    })

    // s16 — a vassal over its suzerain, even listed and claimed before it.
    it('puts a vassal after its suzerain', () => {
      const document = sharedBorderDocument()
      const [france, empire] = document.polities
      if (france === undefined || empire === undefined) throw new Error('fixture changed')
      document.polities = [{ ...france, suzerain: 'hre' }, empire]
      expect(projectedTerritories(document, anchors).map((t) => t.polity)).toEqual([
        'hre',
        'fr-couronne',
      ])
    })
  })

  describe('managed errors', () => {
    // QUAL-002: what is not painted cannot be selected.
    it('leaves out a claim whose polity the registry does not hold', () => {
      const document = sharedBorderDocument()
      document.polities.pop()
      expect(projectedTerritories(document, anchors).map((t) => t.polity)).toEqual(['fr-couronne'])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — pure arithmetic over arrays.
    it('gives nothing for a year with no claims', () => {
      expect(projectedTerritories({ ...sharedBorderDocument(), claims: [] }, anchors)).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('keeps a polity’s several rings together', () => {
      const document = sharedBorderDocument()
      document.claims[0]?.rings.push([1, 4, 5])
      expect(projectedTerritories(document, anchors)[0]?.rings).toHaveLength(2)
    })
  })
})

/** The fixture with the Empire ranked a tribe. */
const withTribe = (): YearDocument => {
  const document = sharedBorderDocument()
  const hre = document.polities.find((polity) => polity.id === 'hre')
  if (hre) hre.rank = 'tribe'
  return document
}

const border = (between: string[]): DerivedBorder => ({
  run: [1, 2],
  between,
  relation: 'sovereign',
  degree: 0,
  hand: null,
  dressedBy: 'rule',
})

// A tribe has no fill and its outline dashed in its colour, standing in for its borders (the dev,
// 2026-10-15; `core/editor/tribes`).
describe('tribes in the scene', () => {
  const COLOURS = new Map([
    ['fr-couronne', '#aa0000'],
    ['hre', '#8a2be2'],
  ])
  const anchors = projectAnchors(sharedBorderDocument().anchors, FRAME, NATIVE)

  describe('happy path', () => {
    it('fills every polity but the tribe', () => {
      expect(
        projectedFills(withTribe(), anchors, COLOURS, tribeIds(withTribe().polities)).map(
          (fill) => fill.colour
        )
      ).toEqual(['#aa0000'])
    })

    it('gives the tribe an outline in its colour', () => {
      expect(
        projectedTribeOutlines(withTribe(), anchors, COLOURS, tribeIds(withTribe().polities)).map(
          (o) => o.colour
        )
      ).toEqual(['#8a2be2'])
    })
  })

  describe('variants', () => {
    it('leaves out a border with the tribe on one side', () => {
      const kept = projectedBorders(
        [border(['fr-couronne', 'hre']), border(['fr-couronne'])],
        anchors,
        new Set(['hre'])
      )
      expect(kept).toHaveLength(1)
    })

    it('outlines nobody when the year has no tribe', () => {
      expect(projectedTribeOutlines(sharedBorderDocument(), anchors, COLOURS, NO_TRIBES)).toEqual(
        []
      )
    })

    it('puts the outline and the filtered borders into the scene', () => {
      const document = withTribe()
      const built = buildScene(
        document,
        inputs(document, { colours: COLOURS, borders: [border(['fr-couronne', 'hre'])] })
      )
      expect([built.tribeOutlines.length, built.borders.length]).toEqual([1, 0])
    })
  })

  describe('managed errors', () => {
    it('outlines no tribe that has no colour', () => {
      expect(
        projectedTribeOutlines(withTribe(), anchors, new Map(), tribeIds(withTribe().polities))
      ).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — pure arithmetic over arrays.
    it('keeps every border when no polity is a tribe', () => {
      expect(projectedBorders([border(['fr-couronne', 'hre'])], anchors, new Set())).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    // It has no fill, but a click inside its outline still selects it (review QUAL-004).
    it('keeps the tribe selectable by a click inside its outline', () => {
      expect(projectedTerritories(withTribe(), anchors).map((t) => t.polity)).toContain('hre')
    })

    it('resolves the tribe’s ring through the shared anchor table', () => {
      expect(
        projectedTribeOutlines(withTribe(), anchors, COLOURS, tribeIds(withTribe().polities))[0]
          ?.rings[0]?.[0]
      ).toEqual(anchors[1])
    })
  })
})
